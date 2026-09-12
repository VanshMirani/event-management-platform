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
process.env.DEMO_MODE = "false";

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
let app;
let prisma;

if (hasDatabaseUrl) {
  ({ default: app } = await import("../src/app.js"));
  ({ prisma } = await import("../src/config/db.js"));
}

const ticketDescribe = hasDatabaseUrl ? describe : describe.skip;
const createdEmails = new Set();
const createdCategoryIds = new Set();
const createdEventIds = new Set();
const createdTicketTypeIds = new Set();
const createdBookingIds = new Set();
const password = "StrongPass123";
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
  email = uniqueEmail("ticket-user"),
  role = "USER",
  name = "Ticket Test User"
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
      name: `QR Category ${randomUUID()}`,
      slug: `qr-category-${randomUUID()}`,
      description: "Created by QR ticket tests"
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
      title: `QR Event ${randomUUID()}`,
      slug: `qr-event-${randomUUID()}`,
      description: "Created by QR ticket tests",
      status: "PUBLISHED",
      type: "OFFLINE",
      startsAt,
      endsAt,
      venueName: "QR Test Venue",
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

async function createTicketType(event) {
  const ticketType = await prisma.ticketType.create({
    data: {
      eventId: event.id,
      name: `QR Ticket ${randomUUID()}`,
      description: "Created by QR ticket tests",
      price: "250.00",
      currency: "INR",
      totalQuantity: 50,
      availableQuantity: 47,
      maxPerBooking: 5,
      isActive: true
    }
  });
  createdTicketTypeIds.add(ticketType.id);
  return ticketType;
}

async function createBooking({ user, event, ticketType, quantity = 3 }) {
  const totalAmount = Number(ticketType.price) * quantity;
  const booking = await prisma.booking.create({
    data: {
      bookingNumber: `BK-QR-${randomUUID()}`,
      userId: user.id,
      eventId: event.id,
      status: "PENDING",
      quantity,
      subtotalAmount: totalAmount,
      discountAmount: 0,
      totalAmount,
      currency: ticketType.currency,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
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

async function createFixture({ quantity = 3 } = {}) {
  const admin = await createUser({
    role: "ADMIN",
    email: uniqueEmail("qr-admin"),
    name: "QR Admin"
  });
  const user = await createUser({
    role: "USER",
    email: uniqueEmail("qr-customer"),
    name: "QR Customer"
  });
  const category = await createCategory();
  const event = await createEvent({ admin, category });
  const ticketType = await createTicketType(event);
  const booking = await createBooking({ user, event, ticketType, quantity });

  return {
    admin,
    user,
    category,
    event,
    ticketType,
    booking
  };
}

async function confirmBookingWithPayment(agent, bookingId) {
  const orderResponse = await agent
    .post("/api/payments/razorpay/create-order")
    .send({ bookingId })
    .expect(201);
  const orderId = orderResponse.body.data.order.id;
  const paymentId = `pay_${randomUUID()}`;
  const signature = createRazorpaySignature(orderId, paymentId);

  await agent
    .post("/api/payments/razorpay/verify")
    .send({
      bookingId,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    })
    .expect(200);

  return {
    orderId,
    paymentId,
    signature
  };
}

ticketDescribe("QR tickets", () => {
  beforeEach(() => {
    global.fetch = async (_url, options) => {
      const body = JSON.parse(options.body);

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

  it("confirmed booking generates one ticket per booked quantity", async () => {
    const { user, booking } = await createFixture({ quantity: 3 });
    const agent = await loginAgent(user);

    await confirmBookingWithPayment(agent, booking.id);

    const tickets = await prisma.ticket.findMany({
      where: {
        bookingId: booking.id
      }
    });

    assert.equal(tickets.length, 3);
    assert.ok(tickets.every((ticket) => ticket.status === "VALID"));
    assert.ok(tickets.every((ticket) => ticket.ticketNumber.startsWith("TCK-")));
    assert.ok(tickets.every((ticket) => ticket.qrCodeHash.length === 64));
  });

  it("duplicate payment verification does not duplicate tickets", async () => {
    const { user, booking } = await createFixture({ quantity: 2 });
    const agent = await loginAgent(user);
    const payment = await confirmBookingWithPayment(agent, booking.id);

    await agent
      .post("/api/payments/razorpay/verify")
      .send({
        bookingId: booking.id,
        razorpay_order_id: payment.orderId,
        razorpay_payment_id: payment.paymentId,
        razorpay_signature: payment.signature
      })
      .expect(200);

    const ticketCount = await prisma.ticket.count({
      where: {
        bookingId: booking.id
      }
    });

    assert.equal(ticketCount, 2);
  });

  it("user can list and view own tickets", async () => {
    const { user, booking } = await createFixture({ quantity: 1 });
    const agent = await loginAgent(user);

    await confirmBookingWithPayment(agent, booking.id);

    const listResponse = await agent.get("/api/tickets/my").expect(200);
    const ticket = listResponse.body.data.tickets.find(
      (currentTicket) => currentTicket.bookingId === booking.id
    );

    assert.ok(ticket);
    assert.equal(ticket.ticketCode.startsWith("TCK-"), true);
    assert.equal(ticket.qrCodeUrl.startsWith("data:image/png;base64,"), true);

    const detailResponse = await agent.get(`/api/tickets/${ticket.id}`).expect(200);
    assert.equal(detailResponse.body.data.ticket.id, ticket.id);
  });

  it("user cannot view another user's ticket", async () => {
    const { user, booking } = await createFixture({ quantity: 1 });
    const otherUser = await createUser({
      role: "USER",
      email: uniqueEmail("qr-other")
    });
    const agent = await loginAgent(user);
    const otherAgent = await loginAgent(otherUser);

    await confirmBookingWithPayment(agent, booking.id);

    const ticket = await prisma.ticket.findFirst({
      where: {
        bookingId: booking.id
      }
    });

    const response = await otherAgent.get(`/api/tickets/${ticket.id}`).expect(404);
    assert.equal(response.body.status, "error");
  });

  it("ticket PDF endpoint returns a valid PDF", async () => {
    const { user, booking } = await createFixture({ quantity: 1 });
    const agent = await loginAgent(user);

    await confirmBookingWithPayment(agent, booking.id);

    const ticket = await prisma.ticket.findFirst({
      where: {
        bookingId: booking.id
      }
    });
    const response = await agent
      .get(`/api/tickets/${ticket.id}/download`)
      .buffer()
      .parse((res, callback) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    assert.equal(response.headers["content-type"], "application/pdf");
    assert.equal(response.body.subarray(0, 4).toString(), "%PDF");
  });

  it("admin can verify and mark ticket as used", async () => {
    const { admin, user, booking } = await createFixture({ quantity: 1 });
    const userAgent = await loginAgent(user);
    const adminAgent = await loginAgent(admin);

    await confirmBookingWithPayment(userAgent, booking.id);

    const ticket = await prisma.ticket.findFirst({
      where: {
        bookingId: booking.id
      }
    });

    const verifyResponse = await adminAgent
      .post("/api/admin/check-in/verify")
      .send({ ticketCode: ticket.ticketNumber })
      .expect(200);

    assert.equal(verifyResponse.body.data.ticket.ticketCode, ticket.ticketNumber);
    assert.equal(verifyResponse.body.data.ticket.status, "VALID");

    const usedResponse = await adminAgent
      .post("/api/admin/check-in/mark-used")
      .send({ ticketCode: ticket.ticketNumber })
      .expect(200);

    assert.equal(usedResponse.body.data.ticket.status, "USED");
    assert.ok(usedResponse.body.data.ticket.checkedInAt);
  });

  it("rejects check-in while the event is not published", async () => {
    const { admin, user, event, booking } = await createFixture({ quantity: 1 });
    const userAgent = await loginAgent(user);
    const adminAgent = await loginAgent(admin);

    await confirmBookingWithPayment(userAgent, booking.id);

    const ticket = await prisma.ticket.findFirst({
      where: {
        bookingId: booking.id
      }
    });

    await adminAgent.patch(`/api/admin/events/${event.id}/unpublish`).expect(200);

    const verifyResponse = await adminAgent
      .post("/api/admin/check-in/verify")
      .send({ ticketCode: ticket.ticketNumber })
      .expect(400);
    const markUsedResponse = await adminAgent
      .post("/api/admin/check-in/mark-used")
      .send({ ticketCode: ticket.ticketNumber })
      .expect(400);
    const savedTicket = await prisma.ticket.findUnique({
      where: { id: ticket.id }
    });

    assert.match(verifyResponse.body.message, /published event/i);
    assert.match(markUsedResponse.body.message, /published event/i);
    assert.equal(savedTicket.status, "VALID");
  });

  it("cancels valid tickets with a cancelled event without claiming a refund", async () => {
    const { admin, user, event, booking } = await createFixture({ quantity: 2 });
    const userAgent = await loginAgent(user);
    const adminAgent = await loginAgent(admin);

    await confirmBookingWithPayment(userAgent, booking.id);

    const tickets = await prisma.ticket.findMany({
      where: {
        bookingId: booking.id
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    await adminAgent
      .post("/api/admin/check-in/mark-used")
      .send({ ticketCode: tickets[0].ticketNumber })
      .expect(200);

    await adminAgent
      .patch(`/api/admin/events/${event.id}`)
      .send({ status: "CANCELLED" })
      .expect(200);

    const savedTickets = await prisma.ticket.findMany({
      where: { bookingId: booking.id },
      orderBy: {
        createdAt: "asc"
      }
    });
    const savedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        payment: true
      }
    });

    assert.equal(savedTickets[0].status, "USED");
    assert.ok(savedTickets[0].usedAt);
    assert.equal(savedTickets[0].cancelledAt, null);
    assert.equal(savedTickets[1].status, "CANCELLED");
    assert.equal(savedTickets[1].usedAt, null);
    assert.ok(savedTickets[1].cancelledAt);
    assert.equal(savedBooking.status, "CONFIRMED");
    assert.equal(savedBooking.payment.status, "SUCCESS");
    assert.equal(savedBooking.payment.refundedAt, null);
  });

  it("duplicate check-in is rejected", async () => {
    const { admin, user, booking } = await createFixture({ quantity: 1 });
    const userAgent = await loginAgent(user);
    const adminAgent = await loginAgent(admin);

    await confirmBookingWithPayment(userAgent, booking.id);

    const ticket = await prisma.ticket.findFirst({
      where: {
        bookingId: booking.id
      }
    });

    await adminAgent
      .post("/api/admin/check-in/mark-used")
      .send({ ticketCode: ticket.ticketNumber })
      .expect(200);
    const response = await adminAgent
      .post("/api/admin/check-in/mark-used")
      .send({ ticketCode: ticket.ticketNumber })
      .expect(409);

    assert.equal(response.body.status, "error");
  });

  it("allows only one of two concurrent check-in attempts", async () => {
    const { admin, user, booking } = await createFixture({ quantity: 1 });
    const userAgent = await loginAgent(user);
    const adminAgent = await loginAgent(admin);

    await confirmBookingWithPayment(userAgent, booking.id);

    const ticket = await prisma.ticket.findFirst({
      where: {
        bookingId: booking.id
      }
    });
    const attempts = await Promise.all([
      adminAgent
        .post("/api/admin/check-in/mark-used")
        .send({ ticketCode: ticket.ticketNumber }),
      adminAgent
        .post("/api/admin/check-in/mark-used")
        .send({ ticketCode: ticket.ticketNumber })
    ]);
    const statuses = attempts.map((response) => response.status).sort();

    assert.deepEqual(statuses, [200, 409]);
  });

  it("invalid qrToken returns 404", async () => {
    const { admin } = await createFixture({ quantity: 1 });
    const adminAgent = await loginAgent(admin);

    const response = await adminAgent
      .post("/api/admin/check-in/verify")
      .send({ qrToken: "not-a-valid-token" })
      .expect(404);

    assert.equal(response.body.status, "error");
  });

  it("normal user cannot access admin check-in APIs", async () => {
    const { user } = await createFixture({ quantity: 1 });
    const agent = await loginAgent(user);

    const response = await agent
      .post("/api/admin/check-in/verify")
      .send({ ticketCode: "TCK-invalid" })
      .expect(403);

    assert.equal(response.body.status, "error");
  });
});
