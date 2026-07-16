import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { after, describe, it } from "node:test";
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

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
let app;
let prisma;

if (hasDatabaseUrl) {
  ({ default: app } = await import("../src/app.js"));
  ({ prisma } = await import("../src/config/db.js"));
}

const adminOperationsDescribe = hasDatabaseUrl ? describe : describe.skip;
const createdEmails = new Set();
const createdCategoryIds = new Set();
const createdEventIds = new Set();
const createdTicketTypeIds = new Set();
const createdBookingIds = new Set();
const password = "StrongPass123";

function uniqueEmail(prefix) {
  const email = `${prefix}-${randomUUID()}@example.com`;
  createdEmails.add(email);
  return email;
}

async function createUser({
  email = uniqueEmail("admin-ops-user"),
  role = "USER",
  name = "Admin Ops Test User"
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
      name: `Admin Ops Category ${randomUUID()}`,
      slug: `admin-ops-category-${randomUUID()}`,
      description: "Created by admin operations tests"
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
      title: `Admin Ops Event ${randomUUID()}`,
      slug: `admin-ops-event-${randomUUID()}`,
      description: "Created by admin operations tests",
      status: "PUBLISHED",
      type: "OFFLINE",
      startsAt,
      endsAt,
      venueName: "Admin Ops Venue",
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
      name: `Admin Ops Ticket ${randomUUID()}`,
      description: "Created by admin operations tests",
      price: "300.00",
      currency: "INR",
      totalQuantity: 50,
      availableQuantity: 48,
      maxPerBooking: 5,
      isActive: true
    }
  });
  createdTicketTypeIds.add(ticketType.id);
  return ticketType;
}

async function createBooking({ user, event, ticketType, status = "CONFIRMED" }) {
  const quantity = 2;
  const totalAmount = Number(ticketType.price) * quantity;
  const booking = await prisma.booking.create({
    data: {
      bookingNumber: `BK-ADMIN-${randomUUID()}`,
      userId: user.id,
      eventId: event.id,
      status,
      quantity,
      subtotalAmount: totalAmount,
      discountAmount: 0,
      totalAmount,
      currency: ticketType.currency,
      confirmedAt: status === "CONFIRMED" ? new Date() : null,
      expiresAt: status === "PENDING" ? new Date(Date.now() + 10 * 60 * 1000) : null,
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

async function createPayment(booking) {
  return prisma.payment.create({
    data: {
      bookingId: booking.id,
      provider: "razorpay",
      providerOrderId: `order_${randomUUID()}`,
      providerPaymentId: `pay_${randomUUID()}`,
      providerSignature: "hidden-admin-test-signature",
      status: "SUCCESS",
      amount: booking.totalAmount,
      currency: booking.currency,
      rawPayload: {
        test: true,
        orderId: booking.bookingNumber
      },
      paidAt: new Date()
    }
  });
}

async function createFixture() {
  const admin = await createUser({
    role: "ADMIN",
    email: uniqueEmail("admin-ops-admin"),
    name: "Admin Ops Admin"
  });
  const user = await createUser({
    role: "USER",
    email: uniqueEmail("admin-ops-customer"),
    name: "Admin Ops Customer"
  });
  const category = await createCategory();
  const event = await createEvent({ admin, category });
  const ticketType = await createTicketType(event);
  const booking = await createBooking({ user, event, ticketType });
  const payment = await createPayment(booking);

  return {
    admin,
    user,
    category,
    event,
    ticketType,
    booking,
    payment
  };
}

adminOperationsDescribe("admin bookings and payments", () => {
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
  });

  it("admin can list bookings", async () => {
    const { admin, booking } = await createFixture();
    const agent = await loginAgent(admin);

    const response = await agent
      .get(`/api/admin/bookings?search=${booking.bookingNumber}`)
      .expect(200);

    assert.equal(response.body.status, "success");
    assert.equal(response.body.data.bookings.length, 1);
    assert.equal(response.body.data.bookings[0].id, booking.id);
    assert.equal(response.body.data.bookings[0].bookingCode, booking.bookingNumber);
    assert.equal(response.body.data.bookings[0].paymentStatus, "SUCCESS");
  });

  it("normal user cannot list bookings", async () => {
    const { user } = await createFixture();
    const agent = await loginAgent(user);

    const response = await agent.get("/api/admin/bookings").expect(403);

    assert.equal(response.body.status, "error");
  });

  it("admin can view booking detail", async () => {
    const { admin, booking } = await createFixture();
    const agent = await loginAgent(admin);

    const response = await agent.get(`/api/admin/bookings/${booking.id}`).expect(200);
    const responseBooking = response.body.data.booking;

    assert.equal(responseBooking.id, booking.id);
    assert.equal(responseBooking.items.length, 1);
    assert.equal(responseBooking.payment.status, "SUCCESS");
    assert.ok(responseBooking.user.email);
    assert.equal("passwordHash" in responseBooking.user, false);
    assert.equal("providerSignature" in responseBooking.payment, false);
  });

  it("admin can list payments", async () => {
    const { admin, payment } = await createFixture();
    const agent = await loginAgent(admin);

    const response = await agent
      .get(`/api/admin/payments?search=${payment.providerPaymentId}`)
      .expect(200);

    assert.equal(response.body.status, "success");
    assert.equal(response.body.data.payments.length, 1);
    assert.equal(response.body.data.payments[0].id, payment.id);
    assert.equal(response.body.data.payments[0].status, "SUCCESS");
  });

  it("normal user cannot list payments", async () => {
    const { user } = await createFixture();
    const agent = await loginAgent(user);

    const response = await agent.get("/api/admin/payments").expect(403);

    assert.equal(response.body.status, "error");
  });

  it("admin can view payment detail", async () => {
    const { admin, payment, booking } = await createFixture();
    const agent = await loginAgent(admin);

    const response = await agent.get(`/api/admin/payments/${payment.id}`).expect(200);
    const responsePayment = response.body.data.payment;

    assert.equal(responsePayment.id, payment.id);
    assert.equal(responsePayment.booking.id, booking.id);
    assert.equal(responsePayment.booking.user.email.includes("@"), true);
    assert.equal("passwordHash" in responsePayment.booking.user, false);
    assert.equal("providerSignature" in responsePayment, false);
    assert.equal(responsePayment.rawPayload.test, true);
  });

  it("dashboard stats include booking and payment counts", async () => {
    const { admin } = await createFixture();
    const agent = await loginAgent(admin);

    const response = await agent.get("/api/admin/dashboard").expect(200);
    const { stats, recentBookings, recentPayments } = response.body.data.dashboard;

    assert.ok(stats.totalUsers >= 1);
    assert.ok(stats.totalEvents >= 1);
    assert.ok(stats.totalBookings >= 1);
    assert.ok(stats.confirmedBookings >= 1);
    assert.ok(stats.totalPayments >= 1);
    assert.ok(stats.successfulPayments >= 1);
    assert.ok(stats.totalRevenue >= 600);
    assert.ok(Array.isArray(recentBookings));
    assert.ok(Array.isArray(recentPayments));
  });
});
