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

const ticketTypeDescribe = hasDatabaseUrl ? describe : describe.skip;
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
  email = uniqueEmail("ticket-type"),
  role = "USER",
  name = "Ticket Type Test User"
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
      name: `Ticket Category ${randomUUID()}`,
      slug: `ticket-category-${randomUUID()}`,
      description: "Created by ticket type tests"
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
      title: `Ticket Event ${randomUUID()}`,
      slug: `ticket-event-${randomUUID()}`,
      description: "Created by ticket type tests",
      status,
      type: "OFFLINE",
      startsAt,
      endsAt,
      venueName: "Ticket Test Venue",
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

function ticketTypePayload(eventId, overrides = {}) {
  return {
    eventId,
    name: `General ${randomUUID()}`,
    description: "General admission",
    price: 499,
    currency: "INR",
    totalQuantity: 100,
    maxPerUser: 5,
    status: "ACTIVE",
    ...overrides
  };
}

ticketTypeDescribe("ticket type management", () => {
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

  it("admin can create ticket type", async () => {
    const admin = await createUser({ role: "ADMIN", email: uniqueEmail("ticket-admin") });
    const category = await createCategory();
    const event = await createEvent({ admin, category });
    const agent = await loginAgent(admin);

    const response = await agent
      .post("/api/admin/ticket-types")
      .send(ticketTypePayload(event.id))
      .expect(201);

    createdTicketTypeIds.add(response.body.data.ticketType.id);
    assert.equal(response.body.status, "success");
    assert.equal(response.body.data.ticketType.eventId, event.id);
    assert.equal(response.body.data.ticketType.soldQuantity, 0);
    assert.equal(response.body.data.ticketType.availableQuantity, 100);
    assert.equal(response.body.data.ticketType.maxPerUser, 5);
    assert.equal(response.body.data.ticketType.status, "ACTIVE");

    const clearedResponse = await agent
      .patch(`/api/admin/ticket-types/${response.body.data.ticketType.id}`)
      .send({ description: null, saleStartAt: null, saleEndAt: null })
      .expect(200);

    assert.equal(clearedResponse.body.data.ticketType.description, null);
    assert.equal(clearedResponse.body.data.ticketType.saleStartAt, null);
    assert.equal(clearedResponse.body.data.ticketType.saleEndAt, null);
  });

  it("normal user cannot create ticket type", async () => {
    const admin = await createUser({ role: "ADMIN", email: uniqueEmail("ticket-owner") });
    const user = await createUser({ role: "USER", email: uniqueEmail("ticket-user") });
    const category = await createCategory();
    const event = await createEvent({ admin, category });
    const agent = await loginAgent(user);

    const response = await agent
      .post("/api/admin/ticket-types")
      .send(ticketTypePayload(event.id))
      .expect(403);

    assert.equal(response.body.status, "error");
  });

  it("invalid price is rejected", async () => {
    const admin = await createUser({ role: "ADMIN", email: uniqueEmail("price-admin") });
    const category = await createCategory();
    const event = await createEvent({ admin, category });
    const agent = await loginAgent(admin);

    const response = await agent
      .post("/api/admin/ticket-types")
      .send(ticketTypePayload(event.id, { price: -1 }))
      .expect(400);

    assert.equal(response.body.status, "error");
  });

  it("rejects non-INR ticket currencies", async () => {
    const admin = await createUser({ role: "ADMIN", email: uniqueEmail("currency-admin") });
    const category = await createCategory();
    const event = await createEvent({ admin, category });
    const agent = await loginAgent(admin);

    const response = await agent
      .post("/api/admin/ticket-types")
      .send(ticketTypePayload(event.id, { currency: "USD" }))
      .expect(400);

    assert.equal(response.body.status, "error");
  });

  it("invalid quantity is rejected", async () => {
    const admin = await createUser({ role: "ADMIN", email: uniqueEmail("quantity-admin") });
    const category = await createCategory();
    const event = await createEvent({ admin, category });
    const agent = await loginAgent(admin);

    const response = await agent
      .post("/api/admin/ticket-types")
      .send(ticketTypePayload(event.id, { totalQuantity: 0 }))
      .expect(400);

    assert.equal(response.body.status, "error");
  });

  it("rejects ticket inventory above event capacity", async () => {
    const admin = await createUser({ role: "ADMIN", email: uniqueEmail("capacity-admin") });
    const category = await createCategory();
    const event = await createEvent({
      admin,
      category,
      overrides: {
        capacity: 25
      }
    });
    const agent = await loginAgent(admin);

    const response = await agent
      .post("/api/admin/ticket-types")
      .send(ticketTypePayload(event.id, { totalQuantity: 26 }))
      .expect(400);

    assert.match(response.body.message, /capacity/i);
  });

  it("rejects a ticket sale window extending past event start", async () => {
    const admin = await createUser({ role: "ADMIN", email: uniqueEmail("sale-window-admin") });
    const category = await createCategory();
    const event = await createEvent({ admin, category });
    const agent = await loginAgent(admin);

    const response = await agent
      .post("/api/admin/ticket-types")
      .send(
        ticketTypePayload(event.id, {
          saleEndAt: new Date(event.startsAt.getTime() + 60 * 60 * 1000).toISOString()
        })
      )
      .expect(400);

    assert.match(response.body.message, /event starts/i);
  });

  it("public event ticket types endpoint returns active ticket types", async () => {
    const admin = await createUser({ role: "ADMIN", email: uniqueEmail("public-ticket-admin") });
    const category = await createCategory();
    const event = await createEvent({ admin, category, status: "PUBLISHED" });
    const activeTicketType = await prisma.ticketType.create({
      data: {
        eventId: event.id,
        name: `Active ${randomUUID()}`,
        description: "Visible ticket",
        price: "999.00",
        currency: "INR",
        totalQuantity: 50,
        availableQuantity: 50,
        maxPerBooking: 5,
        isActive: true
      }
    });
    const inactiveTicketType = await prisma.ticketType.create({
      data: {
        eventId: event.id,
        name: `Inactive ${randomUUID()}`,
        description: "Hidden ticket",
        price: "499.00",
        currency: "INR",
        totalQuantity: 25,
        availableQuantity: 25,
        maxPerBooking: 5,
        isActive: false
      }
    });
    const futureSaleTicketType = await prisma.ticketType.create({
      data: {
        eventId: event.id,
        name: `Future sale ${randomUUID()}`,
        description: "Not on sale yet",
        price: "499.00",
        currency: "INR",
        totalQuantity: 25,
        availableQuantity: 25,
        maxPerBooking: 5,
        salesStartAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isActive: true
      }
    });
    createdTicketTypeIds.add(activeTicketType.id);
    createdTicketTypeIds.add(inactiveTicketType.id);
    createdTicketTypeIds.add(futureSaleTicketType.id);

    const response = await request(app)
      .get(`/api/events/${event.slug}/ticket-types`)
      .expect(200);
    const ticketTypeIds = response.body.data.ticketTypes.map((ticketType) => ticketType.id);

    assert.ok(ticketTypeIds.includes(activeTicketType.id));
    assert.equal(ticketTypeIds.includes(inactiveTicketType.id), false);
    assert.equal(ticketTypeIds.includes(futureSaleTicketType.id), false);
  });

  it("releases an expired sold-out hold before listing public ticket types", async () => {
    const admin = await createUser({ role: "ADMIN", email: uniqueEmail("expiry-admin") });
    const category = await createCategory();
    const event = await createEvent({ admin, category, status: "PUBLISHED" });
    const ticketType = await prisma.ticketType.create({
      data: {
        eventId: event.id,
        name: `Held ${randomUUID()}`,
        description: "Temporarily sold out by an expired hold",
        price: "499.00",
        currency: "INR",
        totalQuantity: 1,
        availableQuantity: 0,
        maxPerBooking: 1,
        isActive: true
      }
    });
    createdTicketTypeIds.add(ticketType.id);
    const booking = await prisma.booking.create({
      data: {
        bookingNumber: `BK-EXPIRED-${randomUUID()}`,
        userId: admin.id,
        eventId: event.id,
        status: "PENDING",
        quantity: 1,
        subtotalAmount: "499.00",
        discountAmount: "0.00",
        totalAmount: "499.00",
        currency: "INR",
        expiresAt: new Date(Date.now() - 1_000),
        items: {
          create: {
            ticketTypeId: ticketType.id,
            quantity: 1,
            unitPrice: "499.00",
            totalAmount: "499.00"
          }
        }
      }
    });
    createdBookingIds.add(booking.id);

    const response = await request(app)
      .get(`/api/events/${event.slug}/ticket-types`)
      .expect(200);
    const listedTicketType = response.body.data.ticketTypes.find(
      (item) => item.id === ticketType.id
    );
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id }
    });

    assert.equal(listedTicketType.availableQuantity, 1);
    assert.equal(updatedBooking.status, "CANCELLED");
  });
});
