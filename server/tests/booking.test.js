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

const bookingDescribe = hasDatabaseUrl ? describe : describe.skip;
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
  email = uniqueEmail("booking-user"),
  role = "USER",
  name = "Booking Test User"
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
      name: `Booking Category ${randomUUID()}`,
      slug: `booking-category-${randomUUID()}`,
      description: "Created by booking tests"
    }
  });
  createdCategoryIds.add(category.id);
  return category;
}

async function createEvent({ admin, category, status = "PUBLISHED", overrides = {} }) {
  const startsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
  const event = await prisma.event.create({
    data: {
      title: `Booking Event ${randomUUID()}`,
      slug: `booking-event-${randomUUID()}`,
      description: "Created by booking tests",
      status,
      type: "OFFLINE",
      startsAt,
      endsAt,
      venueName: "Booking Test Venue",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      categoryId: category.id,
      organizerId: admin.id,
      ...overrides
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
      name: `Booking Ticket ${randomUUID()}`,
      description: "Created by booking tests",
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

async function createFixture({
  eventStatus = "PUBLISHED",
  eventOverrides = {},
  ticketOverrides = {}
} = {}) {
  const admin = await createUser({
    role: "ADMIN",
    email: uniqueEmail("booking-admin")
  });
  const user = await createUser({
    role: "USER",
    email: uniqueEmail("booking-customer")
  });
  const category = await createCategory();
  const event = await createEvent({
    admin,
    category,
    status: eventStatus,
    overrides: eventOverrides
  });
  const ticketType = await createTicketType(event, ticketOverrides);

  return {
    admin,
    user,
    category,
    event,
    ticketType
  };
}

function bookingPayload(event, ticketType, overrides = {}) {
  return {
    eventId: event.id,
    ticketTypeId: ticketType.id,
    quantity: 2,
    ...overrides
  };
}

async function createDirectBooking({ user, event, ticketType, quantity = 1 }) {
  const totalAmount = Number(ticketType.price) * quantity;
  const booking = await prisma.booking.create({
    data: {
      bookingNumber: `BK-TEST-${randomUUID()}`,
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

bookingDescribe("booking backend", () => {
  after(async () => {
    if (createdBookingIds.size > 0) {
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

  it("authenticated user can create pending booking", async () => {
    const { user, event, ticketType } = await createFixture();
    const agent = await loginAgent(user);

    const response = await agent
      .post("/api/bookings")
      .send(bookingPayload(event, ticketType))
      .expect(201);

    const booking = response.body.data.booking;
    createdBookingIds.add(booking.id);

    assert.equal(response.body.status, "success");
    assert.equal(booking.userId, user.id);
    assert.equal(booking.eventId, event.id);
    assert.equal(booking.status, "PENDING");
    assert.equal(booking.quantity, 2);
    assert.equal(booking.totalAmount, 500);
    assert.equal(booking.items[0].ticketTypeId, ticketType.id);
    assert.ok(booking.expiresAt);

    const updatedTicketType = await prisma.ticketType.findUnique({
      where: { id: ticketType.id },
      select: { availableQuantity: true }
    });
    assert.equal(updatedTicketType.availableQuantity, ticketType.availableQuantity - 2);
  });

  it("reveals an online event link only after the booking is confirmed", async () => {
    const onlineUrl = "https://meet.jit.si/EventManagementPlatform-Booking-Test";
    const { user, event, ticketType } = await createFixture({
      eventOverrides: {
        type: "ONLINE",
        onlineUrl
      }
    });
    const agent = await loginAgent(user);
    const createResponse = await agent
      .post("/api/bookings")
      .send(bookingPayload(event, ticketType, { quantity: 1 }))
      .expect(201);
    const bookingId = createResponse.body.data.booking.id;
    createdBookingIds.add(bookingId);

    assert.equal(createResponse.body.data.booking.event.onlineUrl, null);

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        expiresAt: null
      }
    });

    const confirmedResponse = await agent.get(`/api/bookings/${bookingId}`).expect(200);
    assert.equal(confirmedResponse.body.data.booking.event.onlineUrl, onlineUrl);
  });

  it("unauthenticated user cannot create booking", async () => {
    const { event, ticketType } = await createFixture();

    const response = await request(app)
      .post("/api/bookings")
      .send(bookingPayload(event, ticketType))
      .expect(401);

    assert.equal(response.body.status, "error");
  });

  it("cannot book unpublished event", async () => {
    const { user, event, ticketType } = await createFixture({ eventStatus: "DRAFT" });
    const agent = await loginAgent(user);

    const response = await agent
      .post("/api/bookings")
      .send(bookingPayload(event, ticketType))
      .expect(400);

    assert.equal(response.body.status, "error");
  });

  it("cannot book inactive ticket type", async () => {
    const { user, event, ticketType } = await createFixture({
      ticketOverrides: {
        isActive: false
      }
    });
    const agent = await loginAgent(user);

    const response = await agent
      .post("/api/bookings")
      .send(bookingPayload(event, ticketType))
      .expect(400);

    assert.equal(response.body.status, "error");
  });

  it("cannot book unavailable ticket quantity", async () => {
    const { user, event, ticketType } = await createFixture({
      ticketOverrides: {
        totalQuantity: 1,
        availableQuantity: 1
      }
    });
    const agent = await loginAgent(user);

    const response = await agent
      .post("/api/bookings")
      .send(bookingPayload(event, ticketType, { quantity: 2 }))
      .expect(409);

    assert.equal(response.body.status, "error");
  });

  it("cannot exceed maxPerUser", async () => {
    const { user, event, ticketType } = await createFixture({
      ticketOverrides: {
        maxPerBooking: 1
      }
    });
    const agent = await loginAgent(user);

    const response = await agent
      .post("/api/bookings")
      .send(bookingPayload(event, ticketType, { quantity: 2 }))
      .expect(400);

    assert.equal(response.body.status, "error");
  });

  it("enforces maxPerUser cumulatively across active bookings", async () => {
    const { user, event, ticketType } = await createFixture({
      ticketOverrides: {
        maxPerBooking: 5
      }
    });
    const agent = await loginAgent(user);

    const firstResponse = await agent
      .post("/api/bookings")
      .send(bookingPayload(event, ticketType, { quantity: 3 }))
      .expect(201);
    createdBookingIds.add(firstResponse.body.data.booking.id);

    const response = await agent
      .post("/api/bookings")
      .send(bookingPayload(event, ticketType, { quantity: 3 }))
      .expect(400);

    assert.match(response.body.message, /cumulative quantity/i);
  });

  it("releases an expired pending reservation exactly once", async () => {
    const { user, event, ticketType } = await createFixture();
    const agent = await loginAgent(user);
    const createResponse = await agent
      .post("/api/bookings")
      .send(bookingPayload(event, ticketType, { quantity: 2 }))
      .expect(201);
    const bookingId = createResponse.body.data.booking.id;
    createdBookingIds.add(bookingId);

    await prisma.booking.update({
      where: { id: bookingId },
      data: { expiresAt: new Date(Date.now() - 1_000) }
    });

    const firstResponse = await agent.get(`/api/bookings/${bookingId}`).expect(200);
    const secondResponse = await agent.get(`/api/bookings/${bookingId}`).expect(200);
    const updatedTicketType = await prisma.ticketType.findUnique({
      where: { id: ticketType.id },
      select: { availableQuantity: true }
    });

    assert.equal(firstResponse.body.data.booking.status, "CANCELLED");
    assert.ok(firstResponse.body.data.booking.cancelledAt);
    assert.equal(secondResponse.body.data.booking.status, "CANCELLED");
    assert.equal(updatedTicketType.availableQuantity, ticketType.totalQuantity);
  });

  it("rejects booking an event that has already started", async () => {
    const pastStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const pastEnd = new Date(Date.now() - 60 * 60 * 1000);
    const { user, event, ticketType } = await createFixture({
      eventOverrides: {
        startsAt: pastStart,
        endsAt: pastEnd
      }
    });
    const agent = await loginAgent(user);

    const response = await agent
      .post("/api/bookings")
      .send(bookingPayload(event, ticketType, { quantity: 1 }))
      .expect(400);

    assert.match(response.body.message, /already started or ended/i);
  });

  it("enforces event capacity across users and ticket types", async () => {
    const { user, event, ticketType } = await createFixture({
      eventOverrides: {
        capacity: 2
      }
    });
    const otherUser = await createUser({ email: uniqueEmail("booking-capacity-other") });
    const firstAgent = await loginAgent(user);
    const secondAgent = await loginAgent(otherUser);
    const firstResponse = await firstAgent
      .post("/api/bookings")
      .send(bookingPayload(event, ticketType, { quantity: 2 }))
      .expect(201);
    createdBookingIds.add(firstResponse.body.data.booking.id);

    const response = await secondAgent
      .post("/api/bookings")
      .send(bookingPayload(event, ticketType, { quantity: 1 }))
      .expect(409);

    assert.match(response.body.message, /event capacity/i);
  });

  it("rejects booking before the ticket sale window opens", async () => {
    const { user, event, ticketType } = await createFixture({
      ticketOverrides: {
        salesStartAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });
    const agent = await loginAgent(user);

    const response = await agent
      .post("/api/bookings")
      .send(bookingPayload(event, ticketType, { quantity: 1 }))
      .expect(400);

    assert.match(response.body.message, /not started/i);
  });

  it("backend calculates amount from ticket type price", async () => {
    const { user, event, ticketType } = await createFixture({
      ticketOverrides: {
        price: "123.45"
      }
    });
    const agent = await loginAgent(user);

    const response = await agent
      .post("/api/bookings")
      .send(bookingPayload(event, ticketType, { quantity: 3 }))
      .expect(201);

    const booking = response.body.data.booking;
    createdBookingIds.add(booking.id);

    assert.equal(booking.subtotalAmount, 370.35);
    assert.equal(booking.discountAmount, 0);
    assert.equal(booking.totalAmount, 370.35);
    assert.equal(booking.items[0].unitPrice, 123.45);
    assert.equal(booking.items[0].totalAmount, 370.35);
  });

  it("user can list own bookings", async () => {
    const { user, event, ticketType } = await createFixture();
    const otherUser = await createUser({
      role: "USER",
      email: uniqueEmail("booking-other")
    });
    const ownBooking = await createDirectBooking({ user, event, ticketType });
    const otherBooking = await createDirectBooking({
      user: otherUser,
      event,
      ticketType
    });
    const agent = await loginAgent(user);

    const response = await agent.get("/api/bookings/my").expect(200);
    const bookingIds = response.body.data.bookings.map((booking) => booking.id);

    assert.ok(bookingIds.includes(ownBooking.id));
    assert.equal(bookingIds.includes(otherBooking.id), false);
  });

  it("user cannot view another user's booking", async () => {
    const { user, event, ticketType } = await createFixture();
    const otherUser = await createUser({
      role: "USER",
      email: uniqueEmail("booking-owner")
    });
    const otherBooking = await createDirectBooking({
      user: otherUser,
      event,
      ticketType
    });
    const agent = await loginAgent(user);

    const response = await agent.get(`/api/bookings/${otherBooking.id}`).expect(404);

    assert.equal(response.body.status, "error");
  });
});
