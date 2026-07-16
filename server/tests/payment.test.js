import assert from "node:assert/strict";
import crypto, { randomUUID } from "node:crypto";
import path from "node:path";
import { after, beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import request from "supertest";

process.env.NODE_ENV = "test";

const testDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(testDir, "../.env") });

process.env.JWT_ACCESS_SECRET = "test-access-secret-with-enough-length";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-enough-length";
process.env.CLIENT_ORIGIN ||= "http://localhost:5173";
process.env.COOKIE_DOMAIN = "";
process.env.RAZORPAY_KEY_ID = "rzp_test_key_id";
process.env.RAZORPAY_KEY_SECRET = "test_razorpay_secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "test_razorpay_webhook_secret";

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
let app;
let prisma;

if (hasDatabaseUrl) {
  ({ default: app } = await import("../src/app.js"));
  ({ prisma } = await import("../src/config/db.js"));
}

const paymentDescribe = hasDatabaseUrl ? describe : describe.skip;
const createdEmails = new Set();
const createdCategoryIds = new Set();
const createdEventIds = new Set();
const createdTicketTypeIds = new Set();
const createdBookingIds = new Set();
const password = "StrongPass123";
let lastRazorpayOrderRequest = null;
const originalFetch = global.fetch;

function uniqueEmail(prefix) {
  const email = `${prefix}-${randomUUID()}@example.com`;
  createdEmails.add(email);
  return email;
}

function createRazorpaySignature(orderId, paymentId) {
  return crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

async function createUser({
  email = uniqueEmail("payment-user"),
  role = "USER",
  name = "Payment Test User"
} = {}) {
  createdEmails.add(email);
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      status: "ACTIVE"
    }
  });
}

async function loginAgent(user) {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({
      email: user.email,
      password
    })
    .expect(200);
  return agent;
}

async function createCategory() {
  const category = await prisma.category.create({
    data: {
      name: `Payment Category ${randomUUID()}`,
      slug: `payment-category-${randomUUID()}`,
      description: "Created by payment tests"
    }
  });
  createdCategoryIds.add(category.id);
  return category;
}

async function createEvent({ admin, category }) {
  const startsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
  const event = await prisma.event.create({
    data: {
      title: `Payment Event ${randomUUID()}`,
      slug: `payment-event-${randomUUID()}`,
      description: "Created by payment tests",
      status: "PUBLISHED",
      type: "OFFLINE",
      startsAt,
      endsAt,
      venueName: "Payment Test Venue",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      categoryId: category.id,
      organizerId: admin.id
    }
  });
  createdEventIds.add(event.id);
  return event;
}

async function createTicketType(event, overrides = {}) {
  const totalQuantity = overrides.totalQuantity ?? 20;
  const ticketType = await prisma.ticketType.create({
    data: {
      eventId: event.id,
      name: `Payment Ticket ${randomUUID()}`,
      description: "Created by payment tests",
      price: "250.00",
      currency: "INR",
      totalQuantity,
      availableQuantity: overrides.availableQuantity ?? totalQuantity,
      maxPerBooking: 5,
      isActive: true,
      ...overrides
    }
  });
  createdTicketTypeIds.add(ticketType.id);
  return ticketType;
}

async function createFixture() {
  const admin = await createUser({
    role: "ADMIN",
    email: uniqueEmail("payment-admin")
  });
  const user = await createUser({
    role: "USER",
    email: uniqueEmail("payment-customer")
  });
  const category = await createCategory();
  const event = await createEvent({ admin, category });
  const ticketType = await createTicketType(event);

  return {
    admin,
    user,
    category,
    event,
    ticketType
  };
}

async function createDirectBooking({ user, event, ticketType, status = "PENDING" }) {
  const quantity = 2;
  const totalAmount = Number(ticketType.price) * quantity;
  const booking = await prisma.booking.create({
    data: {
      bookingNumber: `BK-PAY-${randomUUID()}`,
      userId: user.id,
      eventId: event.id,
      status,
      quantity,
      subtotalAmount: totalAmount,
      discountAmount: 0,
      totalAmount,
      currency: ticketType.currency,
      expiresAt: status === "PENDING" ? new Date(Date.now() + 10 * 60 * 1000) : null,
      confirmedAt: status === "CONFIRMED" ? new Date() : null,
      items: {
        create: {
          ticketTypeId: ticketType.id,
          quantity,
          unitPrice: ticketType.price,
          totalAmount
        }
      }
    }
  });
  createdBookingIds.add(booking.id);
  return booking;
}

async function createOrder(agent, bookingId) {
  return agent
    .post("/api/payments/razorpay/create-order")
    .send({ bookingId })
    .expect(201);
}

function verifyPayment(agent, { bookingId, orderId, paymentId, signature }) {
  return agent.post("/api/payments/razorpay/verify").send({
    bookingId,
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature
  });
}

paymentDescribe("razorpay payments", () => {
  beforeEach(() => {
    lastRazorpayOrderRequest = null;
    global.fetch = async (_url, options) => {
      const body = JSON.parse(options.body);
      lastRazorpayOrderRequest = body;

      return {
        ok: true,
        async json() {
          return {
            id: `order_${randomUUID()}`,
            amount: body.amount,
            currency: body.currency,
            receipt: body.receipt,
            status: "created"
          };
        }
      };
    };
  });

  after(async () => {
    if (createdBookingIds.size > 0) {
      await prisma.payment.deleteMany({
        where: {
          bookingId: {
            in: [...createdBookingIds]
          }
        }
      });

      await prisma.bookingItem.deleteMany({
        where: {
          bookingId: {
            in: [...createdBookingIds]
          }
        }
      });

      await prisma.booking.deleteMany({
        where: {
          id: {
            in: [...createdBookingIds]
          }
        }
      });
    }

    if (createdTicketTypeIds.size > 0) {
      await prisma.ticketType.deleteMany({
        where: {
          id: {
            in: [...createdTicketTypeIds]
          }
        }
      });
    }

    if (createdEventIds.size > 0) {
      await prisma.event.deleteMany({
        where: {
          id: {
            in: [...createdEventIds]
          }
        }
      });
    }

    if (createdCategoryIds.size > 0) {
      await prisma.category.deleteMany({
        where: {
          id: {
            in: [...createdCategoryIds]
          }
        }
      });
    }

    if (createdEmails.size > 0) {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [...createdEmails]
          }
        }
      });
    }

    await prisma.$disconnect();
    global.fetch = originalFetch;
  });

  it("creates order for valid pending booking", async () => {
    const { user, event, ticketType } = await createFixture();
    const booking = await createDirectBooking({ user, event, ticketType });
    const agent = await loginAgent(user);

    const response = await createOrder(agent, booking.id);

    assert.equal(response.body.status, "success");
    assert.equal(response.body.data.keyId, process.env.RAZORPAY_KEY_ID);
    assert.equal(response.body.data.bookingId, booking.id);
    assert.equal(response.body.data.order.amount, 50000);
    assert.equal(lastRazorpayOrderRequest.amount, 50000);
    assert.equal(lastRazorpayOrderRequest.currency, "INR");

    const payment = await prisma.payment.findUnique({
      where: {
        bookingId: booking.id
      }
    });
    assert.equal(payment.providerOrderId, response.body.data.order.id);
    assert.equal(payment.status, "CREATED");
  });

  it("rejects order creation for another user's booking", async () => {
    const { user, event, ticketType } = await createFixture();
    const otherUser = await createUser({
      role: "USER",
      email: uniqueEmail("payment-other")
    });
    const booking = await createDirectBooking({ user: otherUser, event, ticketType });
    const agent = await loginAgent(user);

    const response = await agent
      .post("/api/payments/razorpay/create-order")
      .send({ bookingId: booking.id })
      .expect(404);

    assert.equal(response.body.status, "error");
  });

  it("rejects order creation for non-pending booking", async () => {
    const { user, event, ticketType } = await createFixture();
    const booking = await createDirectBooking({
      user,
      event,
      ticketType,
      status: "CONFIRMED"
    });
    const agent = await loginAgent(user);

    const response = await agent
      .post("/api/payments/razorpay/create-order")
      .send({ bookingId: booking.id })
      .expect(400);

    assert.equal(response.body.status, "error");
  });

  it("verifies valid Razorpay signature", async () => {
    const { user, event, ticketType } = await createFixture();
    const booking = await createDirectBooking({ user, event, ticketType });
    const agent = await loginAgent(user);
    const orderResponse = await createOrder(agent, booking.id);
    const orderId = orderResponse.body.data.order.id;
    const paymentId = `pay_${randomUUID()}`;
    const signature = createRazorpaySignature(orderId, paymentId);

    const response = await verifyPayment(agent, {
      bookingId: booking.id,
      orderId,
      paymentId,
      signature
    }).expect(200);

    assert.equal(response.body.status, "success");
    assert.equal(response.body.data.booking.status, "CONFIRMED");
    assert.equal(response.body.data.booking.payment.status, "SUCCESS");
    assert.equal(response.body.data.booking.payment.providerPaymentId, paymentId);
  });

  it("rejects invalid signature", async () => {
    const { user, event, ticketType } = await createFixture();
    const booking = await createDirectBooking({ user, event, ticketType });
    const agent = await loginAgent(user);
    const orderResponse = await createOrder(agent, booking.id);

    const response = await verifyPayment(agent, {
      bookingId: booking.id,
      orderId: orderResponse.body.data.order.id,
      paymentId: `pay_${randomUUID()}`,
      signature: "invalid-signature"
    }).expect(400);

    assert.equal(response.body.status, "error");
  });

  it("confirms booking after verified payment", async () => {
    const { user, event, ticketType } = await createFixture();
    const booking = await createDirectBooking({ user, event, ticketType });
    const agent = await loginAgent(user);
    const orderResponse = await createOrder(agent, booking.id);
    const orderId = orderResponse.body.data.order.id;
    const paymentId = `pay_${randomUUID()}`;

    await verifyPayment(agent, {
      bookingId: booking.id,
      orderId,
      paymentId,
      signature: createRazorpaySignature(orderId, paymentId)
    }).expect(200);

    const updatedBooking = await prisma.booking.findUnique({
      where: {
        id: booking.id
      },
      include: {
        payment: true
      }
    });

    assert.equal(updatedBooking.status, "CONFIRMED");
    assert.ok(updatedBooking.confirmedAt);
    assert.equal(updatedBooking.expiresAt, null);
    assert.equal(updatedBooking.payment.status, "SUCCESS");
  });

  it("does not double-confirm duplicate verification", async () => {
    const { user, event, ticketType } = await createFixture();
    const booking = await createDirectBooking({ user, event, ticketType });
    const agent = await loginAgent(user);
    const orderResponse = await createOrder(agent, booking.id);
    const orderId = orderResponse.body.data.order.id;
    const paymentId = `pay_${randomUUID()}`;
    const signature = createRazorpaySignature(orderId, paymentId);

    await verifyPayment(agent, {
      bookingId: booking.id,
      orderId,
      paymentId,
      signature
    }).expect(200);
    const firstBooking = await prisma.booking.findUnique({
      where: {
        id: booking.id
      },
      select: {
        confirmedAt: true
      }
    });

    const response = await verifyPayment(agent, {
      bookingId: booking.id,
      orderId,
      paymentId,
      signature
    }).expect(200);
    const secondBooking = await prisma.booking.findUnique({
      where: {
        id: booking.id
      },
      select: {
        confirmedAt: true
      }
    });

    assert.equal(response.body.data.booking.status, "CONFIRMED");
    assert.equal(secondBooking.confirmedAt.toISOString(), firstBooking.confirmedAt.toISOString());
  });
});
