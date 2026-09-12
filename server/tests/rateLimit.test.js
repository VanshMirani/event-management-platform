import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRateLimiter } from "../src/middlewares/rateLimit.js";

function createRequest({
  ip = "::ffff:127.0.0.1",
  method = "POST",
  baseUrl = "/api/auth",
  path = "/login",
  originalUrl = `${baseUrl}${path}`
} = {}) {
  return {
    ip,
    method,
    baseUrl,
    path,
    originalUrl,
    route: {
      path
    },
    socket: {
      remoteAddress: ip
    }
  };
}

function createResponse() {
  return {
    body: null,
    headers: new Map(),
    statusCode: 200,
    set(name, value) {
      this.headers.set(name, value);
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

function invoke(limiter, request) {
  const response = createResponse();
  let nextCalled = false;
  limiter(request, response, () => {
    nextCalled = true;
  });

  return { response, nextCalled };
}

describe("rate limiter", () => {
  it("allows exactly max requests and returns rate limit headers", () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 1_000 });

    assert.equal(invoke(limiter, createRequest()).nextCalled, true);
    const second = invoke(limiter, createRequest());
    const blocked = invoke(limiter, createRequest());

    assert.equal(second.nextCalled, true);
    assert.equal(second.response.headers.get("RateLimit-Remaining"), "0");
    assert.equal(blocked.nextCalled, false);
    assert.equal(blocked.response.statusCode, 429);
    assert.equal(blocked.response.headers.get("Retry-After"), "1");
  });

  it("does not let query-string variants create new auth buckets", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
    const firstRequest = createRequest({ originalUrl: "/api/auth/login?attempt=one" });
    const secondRequest = createRequest({ originalUrl: "/api/auth/login?attempt=two" });

    assert.equal(invoke(limiter, firstRequest).nextCalled, true);
    assert.equal(invoke(limiter, secondRequest).response.statusCode, 429);
  });

  it("keeps canonical routes and client IPs in separate buckets", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });

    assert.equal(invoke(limiter, createRequest()).nextCalled, true);
    assert.equal(
      invoke(limiter, createRequest({ path: "/register", originalUrl: "/api/auth/register" }))
        .nextCalled,
      true
    );
    assert.equal(
      invoke(limiter, createRequest({ ip: "127.0.0.2" })).nextCalled,
      true
    );
  });

  it("fails closed at store capacity and admits a key after expired cleanup", () => {
    let now = 0;
    const limiter = createRateLimiter({
      max: 5,
      maxEntries: 1,
      windowMs: 1_000,
      cleanupIntervalMs: 10_000,
      clock: () => now
    });

    assert.equal(invoke(limiter, createRequest({ ip: "127.0.0.1" })).nextCalled, true);
    assert.equal(
      invoke(limiter, createRequest({ ip: "127.0.0.2" })).response.statusCode,
      429
    );

    now = 1_001;
    assert.equal(invoke(limiter, createRequest({ ip: "127.0.0.2" })).nextCalled, true);
  });
});
