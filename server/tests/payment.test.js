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
let runtimeEnv;

if (hasDatabaseUrl) {
  ({ default: app } = await import("../src/app.js"));
  ({ prisma } = await import("../src/config/db.js"));
  ({ env: runtimeEnv } = await import("../src/config/env.js"));
}

const paymentDescribe = hasDatabaseUrl ? describe : describe.skip;
const createdEmails = new Set();
const createdCategoryIds = new Set();
const createdEventIds = new Set();
const createdTicketTypeIds = new Set();
const createdBookingIds = new Set();
const password = "StrongPass123";
let lastRazorpayOrderRequest = null;
let razorpayOrderRequestCount = 0;
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

function createWebhookSignature(payload) {
  return crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
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

async function createFixture({ ticketOverrides = {} } = {}) {
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
  const ticketType = await createTicketType(event, ticketOverrides);

  return {
    admin,
    user,
    category,
    event,
    ticketType
  };
}

async function createDirectBooking({
  user,
  event,
  ticketType,
  status = "PENDING",
  quantity = 2,
  expiresAt
}) {
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
      expiresAt:
        expiresAt ??
        (status === "PENDING" ? new Date(Date.now() + 10 * 60 * 1000) : null),
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
    runtimeEnv.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
    runtimeEnv.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
    runtimeEnv.RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
    lastRazorpayOrderRequest = null;
    razorpayOrderRequestCount = 0;
    global.fetch = async (_url, options) => {
      const body = JSON.parse(options.body);
      lastRazorpayOrderRequest = body;
      razorpayOrderRequestCount += 1;

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
      await prisma.ticket.deleteMany({
        where: {
          bookingId: {
            in: [...createdBookingIds]
          }
        }
      });

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
    assert.equal(response.body.data.reused, false);
    assert.equal(lastRazorpayOrderRequest.amount, 50000);
    assert.equal(lastRazorpayOrderRequest.currency, "INR");
    assert.equal(razorpayOrderRequestCount, 1);

    const payment = await prisma.payment.findUnique({
      where: {
        bookingId: booking.id
      }
    });
    assert.equal(payment.providerOrderId, response.body.data.order.id);
    assert.equal(payment.status, "CREATED");
  });

  it("reuses the active local Razorpay order on repeated requests", async () => {
    const { user, event, ticketType } = await createFixture();
    const booking = await createDirectBooking({ user, event, ticketType });
    const agent = await loginAgent(user);

    const firstResponse = await createOrder(agent, booking.id);
    const secondResponse = await createOrder(agent, booking.id);

    assert.equal(secondResponse.body.data.order.id, firstResponse.body.data.order.id);
    assert.equal(secondResponse.body.data.order.amount, firstResponse.body.data.order.amount);
    assert.equal(secondResponse.body.data.reused, true);
    assert.equal(razorpayOrderRequestCount, 1);
  });

  it(
    "serializes concurrent create-order requests for the same booking",
    { timeout: 15_000 },
    async () => {
      const { user, event, ticketType } = await createFixture();
      const booking = await createDirectBooking({ user, event, ticketType });
      const firstAgent = await loginAgent(user);
      const secondAgent = await loginAgent(user);
      let releaseProviderRequest;
      let markProviderRequestStarted;
      const providerRequestStarted = new Promise((resolve) => {
        markProviderRequestStarted = resolve;
      });
      const providerRequestCanFinish = new Promise((resolve) => {
        releaseProviderRequest = resolve;
      });

      global.fetch = async (_url, options) => {
        const body = JSON.parse(options.body);
        lastRazorpayOrderRequest = body;
        razorpayOrderRequestCount += 1;
        markProviderRequestStarted();
        await providerRequestCanFinish;

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

      const responsesPromise = Promise.all([
        createOrder(firstAgent, booking.id),
        createOrder(secondAgent, booking.id)
      ]);

      await providerRequestStarted;
      releaseProviderRequest();
      const responses = await responsesPromise;
      const [firstResponse, secondResponse] = responses;

      assert.equal(firstResponse.body.data.order.id, secondResponse.body.data.order.id);
      assert.equal(razorpayOrderRequestCount, 1);
      assert.equal(
        responses.filter((response) => response.body.data.reused === false).length,
        1
      );
      assert.equal(
        responses.filter((response) => response.body.data.reused === true).length,
        1
      );
    }
  );

  it("rejects live Razorpay credentials before contacting the provider", async () => {
    const { user, event, ticketType } = await createFixture();
    const booking = await createDirectBooking({ user, event, ticketType });
    const agent = await loginAgent(user);
    runtimeEnv.RAZORPAY_KEY_ID = "rzp_live_key_id";

    const response = await agent
      .post("/api/payments/razorpay/create-order")
      .send({ bookingId: booking.id })
      .expect(500);

    assert.match(response.body.message, /only razorpay test credentials/i);
    assert.equal(lastRazorpayOrderRequest, null);
  });

  it("rejects live credentials instead of returning a reusable test order", async () => {
    const { user, event, ticketType } = await createFixture();
    const booking = await createDirectBooking({ user, event, ticketType });
    const agent = await loginAgent(user);

    await createOrder(agent, booking.id);
    runtimeEnv.RAZORPAY_KEY_ID = "rzp_live_key_id";

    const response = await agent
      .post("/api/payments/razorpay/create-order")
      .send({ bookingId: booking.id })
      .expect(500);

    assert.match(response.body.message, /only razorpay test credentials/i);
    assert.equal(razorpayOrderRequestCount, 1);
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

  it("cancels an active order hold when the event becomes unavailable", async () => {
    const { user, event, ticketType } = await createFixture();
    const booking = await createDirectBooking({ user, event, ticketType });
    const agent = await loginAgent(user);

    await createOrder(agent, booking.id);
    await prisma.ticketType.update({
      where: { id: ticketType.id },
      data: {
        availableQuantity: {
          decrement: booking.quantity
        }
      }
    });
    await prisma.event.update({
      where: { id: event.id },
      data: { startsAt: new Date(Date.now() - 1_000) }
    });

    const response = await agent
      .post("/api/payments/razorpay/create-order")
      .send({ bookingId: booking.id })
      .expect(409);
    await agent
      .post("/api/payments/razorpay/create-order")
      .send({ bookingId: booking.id })
      .expect(400);

    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: { payment: true }
    });
    const updatedTicketType = await prisma.ticketType.findUnique({
      where: { id: ticketType.id }
    });
    const ticketCount = await prisma.ticket.count({
      where: { bookingId: booking.id }
    });

    assert.match(response.body.message, /event is no longer available/i);
    assert.equal(updatedBooking.status, "CANCELLED");
    assert.equal(updatedBooking.payment.status, "FAILED");
    assert.match(updatedBooking.payment.failureReason, /event is no longer available/i);
    assert.equal(updatedTicketType.availableQuantity, ticketType.totalQuantity);
    assert.equal(ticketCount, 0);
    assert.equal(razorpayOrderRequestCount, 1);
  });

  it("rejects the free confirmation route for a paid booking", async () => {
    const { user, event, ticketType } = await createFixture();
    const booking = await createDirectBooking({ user, event, ticketType });
    const agent = await loginAgent(user);

    const response = await agent
      .post("/api/payments/free-confirm")
      .send({ bookingId: booking.id })
      .expect(400);

    assert.match(response.body.message, /payment is required/i);
    assert.equal(lastRazorpayOrderRequest, null);
  });

  it("cancels a free hold when its event is no longer available", async () => {
    const { user, event, ticketType } = await createFixture({
      ticketOverrides: {
        price: "0.00"
      }
    });
    const booking = await createDirectBooking({ user, event, ticketType });
    const agent = await loginAgent(user);

    await prisma.ticketType.update({
      where: { id: ticketType.id },
      data: {
        availableQuantity: {
          decrement: booking.quantity
        }
      }
    });
    await prisma.event.update({
      where: { id: event.id },
      data: { status: "CANCELLED" }
    });

    const response = await agent
      .post("/api/payments/free-confirm")
      .send({ bookingId: booking.id })
      .expect(409);
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id }
    });
    const updatedTicketType = await prisma.ticketType.findUnique({
      where: { id: ticketType.id }
    });
    const ticketCount = await prisma.ticket.count({
      where: { bookingId: booking.id }
    });

    assert.match(response.body.message, /event is no longer available/i);
    assert.equal(updatedBooking.status, "CANCELLED");
    assert.equal(updatedTicketType.availableQuantity, ticketType.totalQuantity);
    assert.equal(ticketCount, 0);
  });

  it("confirms a free booking without contacting Razorpay", async () => {
    const { user, event, ticketType } = await createFixture({
      ticketOverrides: {
        price: "0.00"
      }
    });
    const booking = await createDirectBooking({ user, event, ticketType });
    const agent = await loginAgent(user);

    const response = await agent
      .post("/api/payments/free-confirm")
      .send({ bookingId: booking.id })
      .expect(200);
    const payment = await prisma.payment.findUnique({
      where: { bookingId: booking.id }
    });
    const ticketCount = await prisma.ticket.count({
      where: { bookingId: booking.id }
    });

    assert.equal(response.body.data.booking.totalAmount, 0);
    assert.equal(response.body.data.booking.payment.provider, "free");
    assert.equal(payment.amount.toString(), "0");
    assert.equal(ticketCount, 2);
    assert.equal(lastRazorpayOrderRequest, null);
  });

  it("does not expose the removed paid demo confirmation route", async () => {
    const { user, event, ticketType } = await createFixture();
    const booking = await createDirectBooking({ user, event, ticketType });
    const agent = await loginAgent(user);
    const response = await agent
      .post("/api/payments/demo-confirm")
      .send({ bookingId: booking.id })
      .expect(404);

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

  it("rejects direct verification when the event becomes unavailable", async () => {
    const { user, event, ticketType } = await createFixture();
    const booking = await createDirectBooking({ user, event, ticketType });
    const agent = await loginAgent(user);
    const orderResponse = await createOrder(agent, booking.id);
    const orderId = orderResponse.body.data.order.id;
    const paymentId = `pay_${randomUUID()}`;

    await prisma.ticketType.update({
      where: { id: ticketType.id },
      data: {
        availableQuantity: {
          decrement: booking.quantity
        }
      }
    });
    await prisma.event.update({
      where: { id: event.id },
      data: { status: "CANCELLED" }
    });

    const response = await verifyPayment(agent, {
      bookingId: booking.id,
      orderId,
      paymentId,
      signature: createRazorpaySignature(orderId, paymentId)
    }).expect(409);
    await verifyPayment(agent, {
      bookingId: booking.id,
      orderId,
      paymentId,
      signature: createRazorpaySignature(orderId, paymentId)
    }).expect(409);

    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: { payment: true }
    });
    const updatedTicketType = await prisma.ticketType.findUnique({
      where: { id: ticketType.id }
    });
    const ticketCount = await prisma.ticket.count({
      where: { bookingId: booking.id }
    });

    assert.match(response.body.message, /event is no longer available/i);
    assert.equal(updatedBooking.status, "CANCELLED");
    assert.equal(updatedBooking.payment.status, "FAILED");
    assert.match(updatedBooking.payment.failureReason, /event is no longer available/i);
    assert.equal(updatedTicketType.availableQuantity, ticketType.totalQuantity);
    assert.equal(ticketCount, 0);
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

  it("rejects direct payment verification when a live key is configured", async () => {
    const { user, event, ticketType } = await createFixture();
    const booking = await createDirectBooking({ user, event, ticketType });
    const agent = await loginAgent(user);
    runtimeEnv.RAZORPAY_KEY_ID = "rzp_live_key_id";

    const response = await verifyPayment(agent, {
      bookingId: booking.id,
      orderId: `order_${randomUUID()}`,
      paymentId: `pay_${randomUUID()}`,
      signature: "test-signature"
    }).expect(500);

    assert.match(response.body.message, /only razorpay test credentials/i);
  });

  it("rejects Razorpay webhooks when a live key is configured", async () => {
    runtimeEnv.RAZORPAY_KEY_ID = "rzp_live_key_id";

    const response = await request(app)
      .post("/api/webhooks/razorpay")
      .set("x-razorpay-signature", "test-signature")
      .send({ event: "payment.captured", payload: {} })
      .expect(500);

    assert.match(response.body.message, /only razorpay test credentials/i);
  });

  it("rejects direct verification after expiry and restores reserved stock", async () => {
    const { user, event, ticketType } = await createFixture();
    const booking = await createDirectBooking({ user, event, ticketType });
    const agent = await loginAgent(user);
    const orderResponse = await createOrder(agent, booking.id);
    const orderId = orderResponse.body.data.order.id;
    const paymentId = `pay_${randomUUID()}`;

    await prisma.ticketType.update({
      where: { id: ticketType.id },
      data: {
        availableQuantity: {
          decrement: booking.quantity
        }
      }
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: { expiresAt: new Date(Date.now() - 1_000) }
    });

    const response = await verifyPayment(agent, {
      bookingId: booking.id,
      orderId,
      paymentId,
      signature: createRazorpaySignature(orderId, paymentId)
    }).expect(410);
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: { payment: true }
    });
    const updatedTicketType = await prisma.ticketType.findUnique({
      where: { id: ticketType.id }
    });

    assert.match(response.body.message, /expired/i);
    assert.equal(updatedBooking.status, "CANCELLED");
    assert.equal(updatedBooking.payment.status, "FAILED");
    assert.equal(updatedTicketType.availableQuantity, ticketType.totalQuantity);
  });

  it("refuses an expired booking webhook and restores reserved stock", async () => {
    const { user, event, ticketType } = await createFixture();
    const booking = await createDirectBooking({ user, event, ticketType });
    const agent = await loginAgent(user);
    const orderResponse = await createOrder(agent, booking.id);
    const orderId = orderResponse.body.data.order.id;
    const payload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: `pay_${randomUUID()}`,
            order_id: orderId
          }
        }
      }
    };

    await prisma.ticketType.update({
      where: { id: ticketType.id },
      data: {
        availableQuantity: {
          decrement: booking.quantity
        }
      }
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: { expiresAt: new Date(Date.now() - 1_000) }
    });

    const response = await request(app)
      .post("/api/webhooks/razorpay")
      .set("x-razorpay-signature", createWebhookSignature(payload))
      .send(payload)
      .expect(200);
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id }
    });
    const updatedTicketType = await prisma.ticketType.findUnique({
      where: { id: ticketType.id }
    });

    assert.equal(response.body.data.processed, false);
    assert.equal(response.body.data.reason, "booking_expired");
    assert.equal(updatedBooking.status, "CANCELLED");
    assert.equal(updatedTicketType.availableQuantity, ticketType.totalQuantity);
  });

  it("refuses captured-payment webhooks when the event becomes unavailable", async () => {
    const { user, event, ticketType } = await createFixture();
    const booking = await createDirectBooking({ user, event, ticketType });
    const agent = await loginAgent(user);
    const orderResponse = await createOrder(agent, booking.id);
    const orderId = orderResponse.body.data.order.id;
    const payload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: `pay_${randomUUID()}`,
            order_id: orderId
          }
        }
      }
    };
    const webhookSignature = createWebhookSignature(payload);

    await prisma.ticketType.update({
      where: { id: ticketType.id },
      data: {
        availableQuantity: {
          decrement: booking.quantity
        }
      }
    });
    await prisma.event.update({
      where: { id: event.id },
      data: { status: "CANCELLED" }
    });

    const response = await request(app)
      .post("/api/webhooks/razorpay")
      .set("x-razorpay-signature", webhookSignature)
      .send(payload)
      .expect(200);
    const retryResponse = await request(app)
      .post("/api/webhooks/razorpay")
      .set("x-razorpay-signature", webhookSignature)
      .send(payload)
      .expect(200);

    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: { payment: true }
    });
    const updatedTicketType = await prisma.ticketType.findUnique({
      where: { id: ticketType.id }
    });
    const ticketCount = await prisma.ticket.count({
      where: { bookingId: booking.id }
    });

    assert.equal(response.body.data.processed, false);
    assert.equal(response.body.data.reason, "event_unavailable");
    assert.equal(retryResponse.body.data.processed, false);
    assert.equal(retryResponse.body.data.reason, "not_pending");
    assert.equal(updatedBooking.status, "CANCELLED");
    assert.equal(updatedBooking.payment.status, "FAILED");
    assert.match(updatedBooking.payment.failureReason, /event is no longer available/i);
    assert.equal(updatedTicketType.availableQuantity, ticketType.totalQuantity);
    assert.equal(ticketCount, 0);
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
