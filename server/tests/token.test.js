import assert from "node:assert/strict";
import { it } from "node:test";
import { env } from "../src/config/env.js";
import { setAuthCookies } from "../src/utils/token.js";

it("uses secure host-only SameSite=Lax auth cookies in production", () => {
  const originalNodeEnv = env.NODE_ENV;
  const originalCookieDomain = env.COOKIE_DOMAIN;
  const cookies = [];
  const response = {
    cookie(name, value, options) {
      cookies.push({ name, value, options });
    }
  };

  env.NODE_ENV = "production";
  env.COOKIE_DOMAIN = "";

  try {
    setAuthCookies(response, {
      accessToken: "access-token",
      refreshToken: "refresh-token"
    });

    assert.equal(cookies.length, 2);
    assert.ok(cookies.every((cookie) => cookie.options.httpOnly));
    assert.ok(cookies.every((cookie) => cookie.options.secure));
    assert.ok(cookies.every((cookie) => cookie.options.sameSite === "lax"));
    assert.ok(cookies.every((cookie) => !Object.hasOwn(cookie.options, "domain")));
  } finally {
    env.NODE_ENV = originalNodeEnv;
    env.COOKIE_DOMAIN = originalCookieDomain;
  }
});
