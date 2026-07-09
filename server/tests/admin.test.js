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

const adminDescribe = hasDatabaseUrl ? describe : describe.skip;
const createdEmails = new Set();
const createdCategoryNames = new Set();
const password = "StrongPass123";

function uniqueEmail(prefix) {
  const email = `${prefix}-${randomUUID()}@example.com`;
  createdEmails.add(email);
  return email;
}

function uniqueCategoryName(prefix) {
  const name = `${prefix} ${randomUUID()}`;
  createdCategoryNames.add(name);
  return name;
}

function assertDoesNotExposePasswordHash(user) {
  assert.equal(Object.hasOwn(user, "passwordHash"), false);
}

async function createUser({
  email = uniqueEmail("admin-core"),
  role = "USER",
  status = "ACTIVE",
  name = "Admin Core Test User"
} = {}) {
  createdEmails.add(email);
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      status
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

adminDescribe("admin core management", () => {
  after(async () => {
    if (createdCategoryNames.size > 0) {
      await prisma.category.deleteMany({
        where: {
          name: {
            in: [...createdCategoryNames]
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

  it("admin can list users", async () => {
    const admin = await createUser({ email: uniqueEmail("list-admin"), role: "ADMIN" });
    await createUser({ email: uniqueEmail("list-user"), role: "USER" });
    const agent = await loginAgent(admin);

    const response = await agent.get("/api/admin/users").expect(200);

    assert.equal(response.body.status, "success");
    assert.ok(Array.isArray(response.body.data.users));
    assert.ok(response.body.data.users.length >= 2);
    assertDoesNotExposePasswordHash(response.body.data.users[0]);
  });

  it("normal user cannot list users", async () => {
    const user = await createUser({ email: uniqueEmail("normal-list"), role: "USER" });
    const agent = await loginAgent(user);

    const response = await agent.get("/api/admin/users").expect(403);

    assert.equal(response.body.status, "error");
  });

  it("admin can create category", async () => {
    const admin = await createUser({ email: uniqueEmail("category-admin"), role: "ADMIN" });
    const agent = await loginAgent(admin);
    const name = uniqueCategoryName("Admin Category");

    const response = await agent
      .post("/api/admin/categories")
      .send({
        name,
        description: "Created by admin core tests"
      })
      .expect(201);

    assert.equal(response.body.status, "success");
    assert.equal(response.body.data.category.name, name);
    assert.ok(response.body.data.category.slug);
  });

  it("normal user cannot create category", async () => {
    const user = await createUser({ email: uniqueEmail("normal-category"), role: "USER" });
    const agent = await loginAgent(user);
    const name = uniqueCategoryName("Blocked Category");

    const response = await agent
      .post("/api/admin/categories")
      .send({
        name
      })
      .expect(403);

    assert.equal(response.body.status, "error");
  });

  it("duplicate category name is rejected", async () => {
    const admin = await createUser({ email: uniqueEmail("duplicate-admin"), role: "ADMIN" });
    const agent = await loginAgent(admin);
    const name = uniqueCategoryName("Duplicate Category");

    await agent.post("/api/admin/categories").send({ name }).expect(201);
    const response = await agent.post("/api/admin/categories").send({ name }).expect(409);

    assert.equal(response.body.status, "error");
  });

  it("public category list works", async () => {
    const name = uniqueCategoryName("Public Category");
    await prisma.category.create({
      data: {
        name,
        slug: `public-category-${randomUUID()}`,
        description: "Visible publicly"
      }
    });

    const response = await request(app).get("/api/categories").expect(200);

    assert.equal(response.body.status, "success");
    assert.ok(Array.isArray(response.body.data.categories));
    assert.ok(response.body.data.categories.some((category) => category.name === name));
  });
});
