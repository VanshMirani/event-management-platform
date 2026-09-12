import assert from "node:assert/strict";
import test from "node:test";
import { formatCurrency } from "./formatCurrency.js";

test("formats Indian rupee amounts", () => {
  assert.equal(formatCurrency(2499), "₹2,499");
});

test("preserves paise when an amount has a fractional value", () => {
  assert.equal(formatCurrency(2499.5), "₹2,499.50");
});
