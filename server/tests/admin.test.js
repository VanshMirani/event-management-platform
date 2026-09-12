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
const createdUserIds = new Set();
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

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      status
    }
  });

  createdUserIds.add(user.id);
  return user;
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

    if (createdUserIds.size > 0) {
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            {
              adminId: {
                in: [...createdUserIds]
              }
            },
            {
              entityId: {
                in: [...createdUserIds]
              }
            }
          ]
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

  it("admin can block and unblock a user with transactional audit logs", async () => {
    const admin = await createUser({ email: uniqueEmail("status-admin"), role: "ADMIN" });
    const user = await createUser({ email: uniqueEmail("status-user") });
    const agent = await loginAgent(admin);

    const blockedResponse = await agent
      .patch(`/api/admin/users/${user.id}/status`)
      .set("User-Agent", "EventFlow admin integration test")
      .send({ status: "BLOCKED" })
      .expect(200);

    assert.equal(blockedResponse.body.data.user.status, "BLOCKED");
    assertDoesNotExposePasswordHash(blockedResponse.body.data.user);

    let auditLogs = await prisma.auditLog.findMany({
      where: {
        action: "USER_STATUS_UPDATED",
        entityId: user.id
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].adminId, admin.id);
    assert.equal(auditLogs[0].entityType, "User");
    assert.deepEqual(auditLogs[0].metadata, {
      previousStatus: "ACTIVE",
      nextStatus: "BLOCKED"
    });
    assert.equal(auditLogs[0].userAgent, "EventFlow admin integration test");
    assert.ok(auditLogs[0].ipAddress);

    await agent
      .patch(`/api/admin/users/${user.id}/status`)
      .send({ status: "BLOCKED" })
      .expect(200);

    assert.equal(
      await prisma.auditLog.count({
        where: {
          action: "USER_STATUS_UPDATED",
          entityId: user.id
        }
      }),
      1
    );

    const activeResponse = await agent
      .patch(`/api/admin/users/${user.id}/status`)
      .send({ status: "ACTIVE" })
      .expect(200);

    assert.equal(activeResponse.body.data.user.status, "ACTIVE");
    auditLogs = await prisma.auditLog.findMany({
      where: {
        action: "USER_STATUS_UPDATED",
        entityId: user.id
      },
      orderBy: {
        createdAt: "asc"
      }
    });
    assert.equal(auditLogs.length, 2);
    assert.deepEqual(auditLogs[1].metadata, {
      previousStatus: "BLOCKED",
      nextStatus: "ACTIVE"
    });
  });

  it("admin can promote and demote a user while reserved roles are rejected", async () => {
    const admin = await createUser({ email: uniqueEmail("role-admin"), role: "ADMIN" });
    const user = await createUser({ email: uniqueEmail("role-user") });
    const agent = await loginAgent(admin);

    const promotedResponse = await agent
      .patch(`/api/admin/users/${user.id}/role`)
      .send({ role: "ADMIN" })
      .expect(200);

    assert.equal(promotedResponse.body.data.user.role, "ADMIN");
    assertDoesNotExposePasswordHash(promotedResponse.body.data.user);

    await agent
      .patch(`/api/admin/users/${user.id}/role`)
      .send({ role: "ADMIN" })
      .expect(200);

    let auditLogs = await prisma.auditLog.findMany({
      where: {
        action: "USER_ROLE_UPDATED",
        entityId: user.id
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].adminId, admin.id);
    assert.deepEqual(auditLogs[0].metadata, {
      previousRole: "USER",
      nextRole: "ADMIN"
    });

    const demotedResponse = await agent
      .patch(`/api/admin/users/${user.id}/role`)
      .send({ role: "USER" })
      .expect(200);

    assert.equal(demotedResponse.body.data.user.role, "USER");
    auditLogs = await prisma.auditLog.findMany({
      where: {
        action: "USER_ROLE_UPDATED",
        entityId: user.id
      },
      orderBy: {
        createdAt: "asc"
      }
    });
    assert.equal(auditLogs.length, 2);
    assert.deepEqual(auditLogs[1].metadata, {
      previousRole: "ADMIN",
      nextRole: "USER"
    });

    const reservedRoleResponse = await agent
      .patch(`/api/admin/users/${user.id}/role`)
      .send({ role: "ORGANIZER" })
      .expect(400);

    assert.equal(reservedRoleResponse.body.status, "error");
    assert.equal(reservedRoleResponse.body.message, "Validation failed");
  });

  it("admin cannot block or demote their own account, while unchanged values are no-ops", async () => {
    const admin = await createUser({ email: uniqueEmail("self-admin"), role: "ADMIN" });
    const agent = await loginAgent(admin);

    await agent
      .patch(`/api/admin/users/${admin.id}/status`)
      .send({ status: "ACTIVE" })
      .expect(200);
    await agent
      .patch(`/api/admin/users/${admin.id}/role`)
      .send({ role: "ADMIN" })
      .expect(200);

    assert.equal(
      await prisma.auditLog.count({
        where: {
          entityId: admin.id,
          action: {
            in: ["USER_STATUS_UPDATED", "USER_ROLE_UPDATED"]
          }
        }
      }),
      0
    );

    const blockResponse = await agent
      .patch(`/api/admin/users/${admin.id}/status`)
      .send({ status: "BLOCKED" })
      .expect(400);
    const demoteResponse = await agent
      .patch(`/api/admin/users/${admin.id}/role`)
      .send({ role: "USER" })
      .expect(400);

    assert.match(blockResponse.body.message, /cannot block their own account/i);
    assert.match(demoteResponse.body.message, /cannot remove their own admin role/i);

    const unchangedAdmin = await prisma.user.findUnique({ where: { id: admin.id } });
    assert.equal(unchangedAdmin.status, "ACTIVE");
    assert.equal(unchangedAdmin.role, "ADMIN");
  });

  it("normal users cannot change another user's status or role", async () => {
    const normalUser = await createUser({ email: uniqueEmail("mutation-normal") });
    const target = await createUser({ email: uniqueEmail("mutation-target") });
    const agent = await loginAgent(normalUser);

    await agent
      .patch(`/api/admin/users/${target.id}/status`)
      .send({ status: "BLOCKED" })
      .expect(403);
    await agent
      .patch(`/api/admin/users/${target.id}/role`)
      .send({ role: "ADMIN" })
      .expect(403);

    const unchangedTarget = await prisma.user.findUnique({ where: { id: target.id } });
    assert.equal(unchangedTarget.status, "ACTIVE");
    assert.equal(unchangedTarget.role, "USER");
    assert.equal(
      await prisma.auditLog.count({
        where: {
          entityId: target.id
        }
      }),
      0
    );
  });

  it("serializes concurrent role and status updates without duplicate audit entries", async () => {
    const admin = await createUser({ email: uniqueEmail("concurrent-admin"), role: "ADMIN" });
    const roleTarget = await createUser({ email: uniqueEmail("concurrent-role") });
    const statusTarget = await createUser({ email: uniqueEmail("concurrent-status") });
    const agent = await loginAgent(admin);

    const roleResponses = await Promise.all([
      agent
        .patch(`/api/admin/users/${roleTarget.id}/role`)
        .send({ role: "ADMIN" })
        .expect(200),
      agent
        .patch(`/api/admin/users/${roleTarget.id}/role`)
        .send({ role: "ADMIN" })
        .expect(200)
    ]);
    const statusResponses = await Promise.all([
      agent
        .patch(`/api/admin/users/${statusTarget.id}/status`)
        .send({ status: "BLOCKED" })
        .expect(200),
      agent
        .patch(`/api/admin/users/${statusTarget.id}/status`)
        .send({ status: "BLOCKED" })
        .expect(200)
    ]);

    assert.ok(roleResponses.every((response) => response.body.data.user.role === "ADMIN"));
    assert.ok(
      statusResponses.every((response) => response.body.data.user.status === "BLOCKED")
    );
    assert.equal(
      await prisma.auditLog.count({
        where: {
          action: "USER_ROLE_UPDATED",
          entityId: roleTarget.id
        }
      }),
      1
    );
    assert.equal(
      await prisma.auditLog.count({
        where: {
          action: "USER_STATUS_UPDATED",
          entityId: statusTarget.id
        }
      }),
      1
    );
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
