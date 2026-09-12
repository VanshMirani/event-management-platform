import assert from "node:assert/strict";
import test from "node:test";
import { getTicketStatusDetails } from "./ticketStatus.js";

test("only valid tickets can be checked in", () => {
  assert.equal(getTicketStatusDetails("VALID").canCheckIn, true);

  for (const status of ["USED", "CANCELLED", "REFUNDED", "UNKNOWN", null]) {
    assert.equal(getTicketStatusDetails(status).canCheckIn, false);
  }
});

test("uses status-specific user and admin guidance", () => {
  assert.match(getTicketStatusDetails("USED").userSummary, /already been used/i);
  assert.match(getTicketStatusDetails("CANCELLED").adminMessage, /cancelled/i);
  assert.match(getTicketStatusDetails("REFUNDED").userDetail, /refunded/i);
});

test("normalizes ticket status values and safely handles unknown statuses", () => {
  assert.equal(getTicketStatusDetails(" valid ").canCheckIn, true);
  assert.equal(
    getTicketStatusDetails("pending").adminActionLabel,
    "Cannot check in"
  );
});
