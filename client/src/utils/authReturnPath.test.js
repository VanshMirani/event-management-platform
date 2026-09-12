import assert from "node:assert/strict";
import test from "node:test";
import {
  getAuthNavigationState,
  getAuthReturnPath
} from "./authReturnPath.js";

test("returns a protected event route after authentication", () => {
  const from = {
    pathname: "/events/javascript-summit",
    search: "?ticket=vip",
    hash: "#tickets"
  };

  assert.equal(
    getAuthReturnPath({ state: { from } }, { role: "USER" }),
    "/events/javascript-summit?ticket=vip#tickets"
  );
  assert.deepEqual(getAuthNavigationState({ state: { from } }), { from });
});

test("falls back to the role dashboard for unsafe or recursive routes", () => {
  assert.equal(
    getAuthReturnPath({ state: { from: { pathname: "//example.com" } } }, { role: "USER" }),
    "/user/dashboard"
  );
  assert.equal(
    getAuthReturnPath({ state: { from: { pathname: "/register" } } }, { role: "ADMIN" }),
    "/admin/dashboard"
  );
});

test("does not return a user to a route for a different role", () => {
  assert.equal(
    getAuthReturnPath(
      { state: { from: { pathname: "/user/tickets/ticket-123" } } },
      { role: "ADMIN" }
    ),
    "/admin/dashboard"
  );
  assert.equal(
    getAuthReturnPath(
      { state: { from: { pathname: "/admin/payments" } } },
      { role: "USER" }
    ),
    "/user/dashboard"
  );
});

test("preserves a return route when the signed-in role can access it", () => {
  assert.equal(
    getAuthReturnPath(
      { state: { from: { pathname: "/admin/events", search: "?page=2" } } },
      { role: "ADMIN" }
    ),
    "/admin/events?page=2"
  );
  assert.equal(
    getAuthReturnPath(
      { state: { from: { pathname: "/checkout/booking-123" } } },
      { role: "USER" }
    ),
    "/checkout/booking-123"
  );
});
