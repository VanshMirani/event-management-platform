import assert from "node:assert/strict";
import test from "node:test";
import { createTicketLookupPayload } from "./ticketLookup.js";

test("extracts a QR token from an EventFlow check-in URL", () => {
  assert.deepEqual(
    createTicketLookupPayload(
      "https://eventflow-event-management.vercel.app/admin/check-in?token=secure-token%2Fvalue"
    ),
    { qrToken: "secure-token/value" }
  );
});

test("accepts raw scanner tokens", () => {
  assert.deepEqual(createTicketLookupPayload("  raw-scanner-token  "), {
    qrToken: "raw-scanner-token"
  });
});

test("normalizes a manually entered ticket code prefix", () => {
  assert.deepEqual(createTicketLookupPayload("  tck-1234-abcd  "), {
    ticketCode: "TCK-1234-abcd"
  });
});
