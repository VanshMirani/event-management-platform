import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

process.env.NODE_ENV = "test";

const { default: app } = await import("../src/app.js");

test("GET /api/health returns API health", async () => {
  const response = await request(app).get("/api/health").expect(200);

  assert.equal(response.body.status, "success");
  assert.equal(response.body.data.status, "ok");
  assert.match(response.headers["content-security-policy"], /checkout\.razorpay\.com/);
  assert.match(response.headers["content-security-policy"], /api\.razorpay\.com/);
});
