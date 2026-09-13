import assert from "node:assert/strict";
import { after, afterEach, describe, it } from "node:test";

process.env.NODE_ENV = "test";
process.env.PUBLIC_APP_URL = "https://eventflow.test";

const { prisma } = await import("../src/config/db.js");
const { listTicketsForEventCheckIn } = await import(
  "../src/services/ticket.service.js"
);
const eventDelegate = prisma.event;
const ticketDelegate = prisma.ticket;
const originalFindEvent = eventDelegate.findUnique;
const originalFindTickets = ticketDelegate.findMany;

afterEach(() => {
  eventDelegate.findUnique = originalFindEvent;
  ticketDelegate.findMany = originalFindTickets;
});

after(async () => {
  await prisma.$disconnect();
});

describe("event check-in ticket list service", () => {
  it("returns safe, dropdown-ready attendee and ticket details", async () => {
    const event = {
      id: "event-1",
      title: "Design Leadership Summit",
      status: "PUBLISHED",
      type: "OFFLINE",
      startsAt: new Date("2026-09-20T04:30:00.000Z"),
      endsAt: new Date("2026-09-20T11:30:00.000Z"),
      venueName: "The Convention Centre",
      city: "Mumbai"
    };
    const usedAt = new Date("2026-09-20T05:00:00.000Z");
    let receivedTicketQuery;

    eventDelegate.findUnique = async () => event;
    ticketDelegate.findMany = async (query) => {
      receivedTicketQuery = query;
      return [
        {
          id: "ticket-valid",
          ticketNumber: "TCK-1001",
          status: "VALID",
          usedAt: null,
          user: {
            id: "user-1",
            name: "Aarav Mehta",
            email: "aarav@example.com",
            phone: null
          },
          booking: {
            id: "booking-1",
            bookingNumber: "BK-1001",
            status: "CONFIRMED",
            confirmedAt: new Date("2026-09-10T09:00:00.000Z")
          },
          bookingItem: {
            ticketType: {
              id: "ticket-type-1",
              name: "General Admission"
            }
          }
        },
        {
          id: "ticket-used",
          ticketNumber: "TCK-1002",
          status: "USED",
          usedAt,
          user: {
            id: "user-2",
            name: "Meera Kapoor",
            email: "meera@example.com",
            phone: "+91 98765 43210"
          },
          booking: {
            id: "booking-2",
            bookingNumber: "BK-1002",
            status: "CONFIRMED",
            confirmedAt: new Date("2026-09-11T09:00:00.000Z")
          },
          bookingItem: {
            ticketType: {
              id: "ticket-type-2",
              name: "VIP"
            }
          }
        }
      ];
    };

    const result = await listTicketsForEventCheckIn(event.id, {
      status: "ALL",
      search: "aarav"
    });

    assert.equal(receivedTicketQuery.where.eventId, event.id);
    assert.deepEqual(receivedTicketQuery.where.status, {
      in: ["VALID", "USED"]
    });
    assert.equal(receivedTicketQuery.where.OR.length, 4);
    assert.equal(result.event.startAt, event.startsAt);
    assert.equal(result.event.endAt, event.endsAt);
    assert.equal(result.tickets[0].ticketCode, "TCK-1001");
    assert.equal(result.tickets[0].ticketType.name, "General Admission");
    assert.equal(result.tickets[1].checkedInAt, usedAt);
    assert.equal(Object.hasOwn(result.tickets[0], "qrCodeHash"), false);
    assert.equal(Object.hasOwn(result.tickets[0], "qrCodeUrl"), false);
    assert.deepEqual(result.summary, {
      total: 2,
      ready: 1,
      checkedIn: 1
    });
  });

  it("returns a not-found error when the selected event does not exist", async () => {
    eventDelegate.findUnique = async () => null;

    await assert.rejects(
      listTicketsForEventCheckIn("missing-event"),
      (error) => error.statusCode === 404 && error.message === "Event not found"
    );
  });
});
