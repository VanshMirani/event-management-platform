import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDateTime,
  fromDateTimeLocalValue,
  toDateTimeLocalValue
} from "./formatDate.js";

test("formats timestamps consistently in India Standard Time", () => {
  assert.match(formatDateTime("2026-10-03T04:30:00.000Z"), /3 Oct 2026, 10:00 am IST/);
});

test("converts stored timestamps to India-time form values", () => {
  assert.equal(toDateTimeLocalValue("2026-10-03T04:30:00.000Z"), "2026-10-03T10:00");
});

test("converts India-time form values back to UTC timestamps", () => {
  assert.equal(fromDateTimeLocalValue("2026-10-03T10:00"), "2026-10-03T04:30:00.000Z");
});
