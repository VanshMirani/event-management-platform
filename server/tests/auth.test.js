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

const authDescribe = hasDatabaseUrl ? describe : describe.skip;
const createdEmails = new Set();
const password = "StrongPass123";

function uniqueEmail(prefix) {
  const email = `${prefix}-${randomUUID()}@example.com`;
  createdEmails.add(email);
  return email;
}

function assertSetsAuthCookies(response) {
  const cookies = response.headers["set-cookie"] ?? [];

  assert.ok(
    cookies.some((cookie) => cookie.startsWith("accessToken=") && cookie.includes("HttpOnly"))
  );
  assert.ok(
    cookies.some((cookie) => cookie.startsWith("refreshToken=") && cookie.includes("HttpOnly"))
  );
}

function assertDoesNotExposePasswordHash(user) {
  assert.equal(Object.hasOwn(user, "passwordHash"), false);
}

async function createUser({
  email = uniqueEmail("auth"),
  role = "USER",
  status = "ACTIVE",
  name = "Auth Test User"
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

authDescribe("auth routes", () => {
  after(async () => {
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

  it("register user", async () => {
    const email = uniqueEmail("register");
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Register User",
        email,
        password
      })
      .expect(201);

    assert.equal(response.body.status, "success");
    assert.equal(response.body.data.user.email, email);
    assert.equal(response.body.data.user.role, "USER");
    assertDoesNotExposePasswordHash(response.body.data.user);
    assertSetsAuthCookies(response);
  });

  it("reject duplicate email", async () => {
    const email = uniqueEmail("duplicate");
    await createUser({ email });

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Duplicate User",
        email,
        password
      })
      .expect(409);

    assert.equal(response.body.status, "error");
  });

  it("login user", async () => {
    const email = uniqueEmail("login");
    await createUser({ email });

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email,
        password
      })
      .expect(200);

    assert.equal(response.body.status, "success");
    assert.equal(response.body.data.user.email, email);
    assertDoesNotExposePasswordHash(response.body.data.user);
    assertSetsAuthCookies(response);
  });

  it("reject invalid password", async () => {
    const email = uniqueEmail("bad-password");
    await createUser({ email });

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email,
        password: "WrongPass123"
      })
      .expect(401);

    assert.equal(response.body.status, "error");
  });

  it("get current user", async () => {
    const email = uniqueEmail("me");
    await createUser({ email });
    const agent = request.agent(app);

    await agent.post("/api/auth/login").send({ email, password }).expect(200);
    const response = await agent.get("/api/auth/me").expect(200);

    assert.equal(response.body.status, "success");
    assert.equal(response.body.data.user.email, email);
    assertDoesNotExposePasswordHash(response.body.data.user);
  });

  it("logout user", async () => {
    const email = uniqueEmail("logout");
    await createUser({ email });
    const agent = request.agent(app);

    await agent.post("/api/auth/login").send({ email, password }).expect(200);
    const logoutResponse = await agent.post("/api/auth/logout").expect(200);
    const cookies = logoutResponse.headers["set-cookie"] ?? [];

    assert.equal(logoutResponse.body.status, "success");
    assert.ok(cookies.some((cookie) => cookie.startsWith("accessToken=;")));
    assert.ok(cookies.some((cookie) => cookie.startsWith("refreshToken=;")));
    await agent.get("/api/auth/me").expect(401);
  });

  it("protected route rejects unauthenticated user", async () => {
    const response = await request(app).get("/api/auth/me").expect(401);

    assert.equal(response.body.status, "error");
  });

  it("admin middleware rejects normal user", async () => {
    const email = uniqueEmail("admin-reject");
    await createUser({ email, role: "USER" });
    const agent = request.agent(app);

    await agent.post("/api/auth/login").send({ email, password }).expect(200);
    const response = await agent.get("/api/admin/status").expect(403);

    assert.equal(response.body.status, "error");
  });
});
