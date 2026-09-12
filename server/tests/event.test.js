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

const eventDescribe = hasDatabaseUrl ? describe : describe.skip;
const createdEmails = new Set();
const createdCategoryIds = new Set();
const createdEventIds = new Set();
const password = "StrongPass123";

function uniqueEmail(prefix) {
  const email = `${prefix}-${randomUUID()}@example.com`;
  createdEmails.add(email);
  return email;
}

async function createUser({
  email = uniqueEmail("event"),
  role = "USER",
  name = "Event Test User"
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
      name: `Event Category ${randomUUID()}`,
      slug: `event-category-${randomUUID()}`,
      description: "Created by event tests"
    }
  });
  createdCategoryIds.add(category.id);
  return category;
}

function eventPayload(categoryId, overrides = {}) {
  const startAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const endAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString();

  return {
    title: `Event Test ${randomUUID()}`,
    description: "Created by event API tests",
    categoryId,
    eventType: "OFFLINE",
    venueName: "Test Venue",
    address: "123 Test Street",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    startAt,
    endAt,
    status: "DRAFT",
    isFeatured: false,
    ...overrides
  };
}

async function createEventRecord({
  admin,
  category,
  status = "DRAFT",
  isFeatured = false,
  title = `Public Event ${randomUUID()}`,
  overrides = {}
}) {
  const startsAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
  const event = await prisma.event.create({
    data: {
      title,
      slug: `event-${randomUUID()}`,
      description: "Created directly by event tests",
      status,
      type: "OFFLINE",
      startsAt,
      endsAt,
      venueName: "Public Test Venue",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      onlineUrl: "https://example.com/private-event-room",
      isFeatured,
      categoryId: category.id,
      organizerId: admin.id,
      ...overrides
    }
  });

  createdEventIds.add(event.id);
  return event;
}

eventDescribe("event management", () => {
  after(async () => {
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

  it("admin can create event", async () => {
    const admin = await createUser({ role: "ADMIN", email: uniqueEmail("event-admin") });
    const category = await createCategory();
    const agent = await loginAgent(admin);

    const response = await agent
      .post("/api/admin/events")
      .send(eventPayload(category.id, { capacity: 250 }))
      .expect(201);

    createdEventIds.add(response.body.data.event.id);
    assert.equal(response.body.status, "success");
    assert.equal(response.body.data.event.categoryId, category.id);
    assert.equal(response.body.data.event.organizerId, admin.id);
    assert.equal(response.body.data.event.status, "DRAFT");
    assert.equal(response.body.data.event.capacity, 250);
    assert.ok(response.body.data.event.slug);
  });

  it("normal user cannot create event", async () => {
    const user = await createUser({ role: "USER", email: uniqueEmail("event-user") });
    const category = await createCategory();
    const agent = await loginAgent(user);

    const response = await agent
      .post("/api/admin/events")
      .send(eventPayload(category.id))
      .expect(403);

    assert.equal(response.body.status, "error");
  });

  it("admin can update event", async () => {
    const admin = await createUser({ role: "ADMIN", email: uniqueEmail("event-update-admin") });
    const category = await createCategory();
    const agent = await loginAgent(admin);
    const createResponse = await agent
      .post("/api/admin/events")
      .send(eventPayload(category.id))
      .expect(201);
    const eventId = createResponse.body.data.event.id;
    createdEventIds.add(eventId);

    const response = await agent
      .patch(`/api/admin/events/${eventId}`)
      .send({
        title: "Updated Event Title",
        city: "Bengaluru"
      })
      .expect(200);

    assert.equal(response.body.data.event.title, "Updated Event Title");
    assert.equal(response.body.data.event.city, "Bengaluru");

    const clearedResponse = await agent
      .patch(`/api/admin/events/${eventId}`)
      .send({ description: null, city: null })
      .expect(200);

    assert.equal(clearedResponse.body.data.event.description, null);
    assert.equal(clearedResponse.body.data.event.city, null);
  });

  it("admin can publish event", async () => {
    const admin = await createUser({ role: "ADMIN", email: uniqueEmail("event-publish-admin") });
    const category = await createCategory();
    const agent = await loginAgent(admin);
    const createResponse = await agent
      .post("/api/admin/events")
      .send(eventPayload(category.id))
      .expect(201);
    const eventId = createResponse.body.data.event.id;
    createdEventIds.add(eventId);

    const response = await agent.patch(`/api/admin/events/${eventId}/publish`).expect(200);

    assert.equal(response.body.data.event.status, "PUBLISHED");
  });

  it("keeps published events upcoming when publish races a start-date update", async () => {
    const admin = await createUser({ role: "ADMIN", email: uniqueEmail("event-race-admin") });
    const category = await createCategory();
    const agent = await loginAgent(admin);
    const createResponse = await agent
      .post("/api/admin/events")
      .send(eventPayload(category.id))
      .expect(201);
    const eventId = createResponse.body.data.event.id;
    createdEventIds.add(eventId);
    const pastStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const pastEnd = new Date(pastStart.getTime() + 60 * 60 * 1000);

    const [dateUpdateResponse, publishResponse] = await Promise.all([
      agent.patch(`/api/admin/events/${eventId}`).send({
        startAt: pastStart.toISOString(),
        endAt: pastEnd.toISOString()
      }),
      agent.patch(`/api/admin/events/${eventId}/publish`)
    ]);
    const responseStatuses = [dateUpdateResponse.status, publishResponse.status].sort(
      (left, right) => left - right
    );
    const savedEvent = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        status: true,
        startsAt: true
      }
    });

    assert.deepEqual(responseStatuses, [200, 400]);
    assert.equal(
      savedEvent.status === "PUBLISHED" && savedEvent.startsAt <= new Date(),
      false
    );
  });

  it("public list only shows published events", async () => {
    const admin = await createUser({ role: "ADMIN", email: uniqueEmail("public-list-admin") });
    const category = await createCategory();
    const publishedEvent = await createEventRecord({
      admin,
      category,
      status: "PUBLISHED",
      title: "Visible Published Event"
    });
    const draftEvent = await createEventRecord({
      admin,
      category,
      status: "DRAFT",
      title: "Hidden Draft Event"
    });

    const response = await request(app).get("/api/events").expect(200);
    const eventIds = response.body.data.events.map((event) => event.id);

    assert.ok(eventIds.includes(publishedEvent.id));
    assert.equal(eventIds.includes(draftEvent.id), false);
  });

  it("featured endpoint returns published featured events", async () => {
    const admin = await createUser({ role: "ADMIN", email: uniqueEmail("featured-admin") });
    const category = await createCategory();
    const featuredEvent = await createEventRecord({
      admin,
      category,
      status: "PUBLISHED",
      isFeatured: true,
      title: "Featured Published Event"
    });
    const nonFeaturedEvent = await createEventRecord({
      admin,
      category,
      status: "PUBLISHED",
      isFeatured: false,
      title: "Regular Published Event"
    });

    const response = await request(app).get("/api/events/featured").expect(200);
    const eventIds = response.body.data.events.map((event) => event.id);

    assert.ok(eventIds.includes(featuredEvent.id));
    assert.equal(eventIds.includes(nonFeaturedEvent.id), false);
  });

  it("does not list a published event that has already started", async () => {
    const admin = await createUser({ role: "ADMIN", email: uniqueEmail("past-admin") });
    const category = await createCategory();
    const pastStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const pastEvent = await createEventRecord({
      admin,
      category,
      status: "PUBLISHED",
      overrides: {
        startsAt: pastStart,
        endsAt: new Date(pastStart.getTime() + 60 * 60 * 1000)
      }
    });

    const response = await request(app).get("/api/events").expect(200);
    const eventIds = response.body.data.events.map((event) => event.id);

    assert.equal(eventIds.includes(pastEvent.id), false);
  });

  it("public event detail returns published event by slug", async () => {
    const admin = await createUser({ role: "ADMIN", email: uniqueEmail("detail-admin") });
    const category = await createCategory();
    const publishedEvent = await createEventRecord({
      admin,
      category,
      status: "PUBLISHED",
      title: "Detail Published Event"
    });

    const response = await request(app).get(`/api/events/${publishedEvent.slug}`).expect(200);

    assert.equal(response.body.data.event.id, publishedEvent.id);
    assert.equal(response.body.data.event.status, "PUBLISHED");
    assert.equal(response.body.data.event.onlineUrl, null);
    assert.equal(Object.hasOwn(response.body.data.event.organizer, "email"), false);
  });

  it("draft events are not public", async () => {
    const admin = await createUser({ role: "ADMIN", email: uniqueEmail("draft-admin") });
    const category = await createCategory();
    const draftEvent = await createEventRecord({
      admin,
      category,
      status: "DRAFT",
      title: "Draft Detail Event"
    });

    await request(app).get(`/api/events/${draftEvent.slug}`).expect(404);
  });
});
