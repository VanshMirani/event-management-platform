import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatStatusLabel } from "./formatStatusLabel.js";

describe("formatStatusLabel", () => {
  it("turns enum values into readable labels", () => {
    assert.equal(formatStatusLabel("SOLD_OUT"), "Sold out");
    assert.equal(formatStatusLabel("PAYMENT_PENDING"), "Payment pending");
  });

  it("preserves common initialisms", () => {
    assert.equal(formatStatusLabel("QR_READY"), "QR ready");
  });

  it("handles missing and already readable values", () => {
    assert.equal(formatStatusLabel(), "Unknown");
    assert.equal(formatStatusLabel("in progress"), "In progress");
  });
});
