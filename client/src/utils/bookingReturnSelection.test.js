import assert from "node:assert/strict";
import test from "node:test";
import {
  createBookingReturnLocation,
  getValidBookingSelection
} from "./bookingReturnSelection.js";

const availableTicket = {
  id: "ticket-vip",
  saleStatus: "AVAILABLE",
  availableQuantity: 8,
  maxPerUser: 4
};

test("builds an event return location containing the selected ticket and quantity", () => {
  assert.deepEqual(
    createBookingReturnLocation(
      {
        pathname: "/events/product-forum",
        search: "?source=featured"
      },
      {
        ticketTypeId: "ticket-vip",
        quantity: 3
      }
    ),
    {
      pathname: "/events/product-forum",
      search: "?source=featured&ticketType=ticket-vip&quantity=3",
      hash: "#booking"
    }
  );
});

test("restores a selection only while the ticket and quantity remain available", () => {
  assert.deepEqual(
    getValidBookingSelection("?ticketType=ticket-vip&quantity=3", [availableTicket]),
    {
      ticketTypeId: "ticket-vip",
      quantity: "3"
    }
  );

  assert.equal(
    getValidBookingSelection("?ticketType=ticket-vip&quantity=5", [availableTicket]),
    null
  );
  assert.equal(
    getValidBookingSelection("?ticketType=ticket-vip&quantity=2", [
      { ...availableTicket, saleStatus: "SOLD_OUT" }
    ]),
    null
  );
  assert.equal(
    getValidBookingSelection("?ticketType=unknown&quantity=2", [availableTicket]),
    null
  );
});

test("rejects malformed booking quantities from the URL", () => {
  assert.equal(
    getValidBookingSelection("?ticketType=ticket-vip&quantity=1.5", [availableTicket]),
    null
  );
  assert.equal(
    getValidBookingSelection("?ticketType=ticket-vip&quantity=-1", [availableTicket]),
    null
  );
  assert.equal(
    getValidBookingSelection("?ticketType=ticket-vip&quantity=Infinity", [availableTicket]),
    null
  );
});
