import crypto from "node:crypto";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { prisma } from "../config/db.js";
import { createHttpError } from "../utils/httpError.js";

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  phone: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true
};

const EVENT_SELECT = {
  id: true,
  title: true,
  slug: true,
  status: true,
  type: true,
  startsAt: true,
  endsAt: true,
  venueName: true,
  address: true,
  city: true,
  state: true,
  country: true,
  onlineUrl: true
};

const TICKET_SELECT = {
  id: true,
  ticketNumber: true,
  qrCodeUrl: true,
  status: true,
  userId: true,
  eventId: true,
  bookingId: true,
  bookingItemId: true,
  usedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: SAFE_USER_SELECT
  },
  event: {
    select: EVENT_SELECT
  },
  booking: {
    select: {
      id: true,
      bookingNumber: true,
      status: true,
      quantity: true,
      totalAmount: true,
      currency: true,
      confirmedAt: true
    }
  },
  bookingItem: {
    select: {
      id: true,
      ticketTypeId: true,
      quantity: true,
      unitPrice: true,
      totalAmount: true,
      ticketType: {
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          currency: true
        }
      }
    }
  }
};

const BOOKING_FOR_TICKETS_SELECT = {
  id: true,
  bookingNumber: true,
  userId: true,
  eventId: true,
  status: true,
  user: {
    select: SAFE_USER_SELECT
  },
  event: {
    select: EVENT_SELECT
  },
  items: {
    select: {
      id: true,
      quantity: true,
      ticketType: {
        select: {
          id: true,
          name: true
        }
      }
    }
  },
  tickets: {
    select: {
      id: true
    }
  }
};

function createTicketCode() {
  return `TCK-${crypto.randomUUID()}`;
}

function createQrToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashQrToken(qrToken) {
  return crypto.createHash("sha256").update(qrToken).digest("hex");
}

function ensureEventAcceptsCheckIn(ticket) {
  if (ticket.event?.status !== "PUBLISHED") {
    throw createHttpError(400, "Tickets can only be checked in for published events");
  }
}

function toMoney(value) {
  return Number(value);
}

function toTicketResponse(ticket) {
  return {
    id: ticket.id,
    ticketCode: ticket.ticketNumber,
    qrCodeUrl: ticket.qrCodeUrl,
    status: ticket.status,
    userId: ticket.userId,
    eventId: ticket.eventId,
    bookingId: ticket.bookingId,
    bookingItemId: ticket.bookingItemId,
    checkedInAt: ticket.usedAt,
    usedAt: ticket.usedAt,
    cancelledAt: ticket.cancelledAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    user: ticket.user,
    event: ticket.event,
    booking: ticket.booking
      ? {
          ...ticket.booking,
          totalAmount: toMoney(ticket.booking.totalAmount)
        }
      : null,
    ticketType: ticket.bookingItem?.ticketType
      ? {
          ...ticket.bookingItem.ticketType,
          price: toMoney(ticket.bookingItem.ticketType.price)
        }
      : null,
    bookingItem: ticket.bookingItem
      ? {
          ...ticket.bookingItem,
          unitPrice: toMoney(ticket.bookingItem.unitPrice),
          totalAmount: toMoney(ticket.bookingItem.totalAmount),
          ticketType: ticket.bookingItem.ticketType
            ? {
                ...ticket.bookingItem.ticketType,
                price: toMoney(ticket.bookingItem.ticketType.price)
              }
            : null
        }
      : null
  };
}

function dataUrlToBuffer(dataUrl) {
  const [, base64 = ""] = dataUrl.split(",");
  return Buffer.from(base64, "base64");
}

async function getBookingForTicketGeneration(bookingId, client) {
  const booking = await client.booking.findUnique({
    where: { id: bookingId },
    select: BOOKING_FOR_TICKETS_SELECT
  });

  if (!booking) {
    throw createHttpError(404, "Booking not found");
  }

  if (booking.status !== "CONFIRMED") {
    throw createHttpError(400, "Tickets can only be generated for confirmed bookings");
  }

  return booking;
}

export async function generateTicketsForBooking(bookingId, client = prisma) {
  const booking = await getBookingForTicketGeneration(bookingId, client);

  if (booking.tickets.length > 0) {
    return client.ticket.findMany({
      where: { bookingId },
      orderBy: {
        createdAt: "asc"
      },
      select: TICKET_SELECT
    });
  }

  const ticketData = [];

  for (const item of booking.items) {
    for (let index = 0; index < item.quantity; index += 1) {
      const qrToken = createQrToken();
      const qrCodeUrl = await QRCode.toDataURL(qrToken, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 280
      });

      ticketData.push({
        ticketNumber: createTicketCode(),
        qrCodeHash: hashQrToken(qrToken),
        qrCodeUrl,
        status: "VALID",
        userId: booking.userId,
        eventId: booking.eventId,
        bookingId: booking.id,
        bookingItemId: item.id
      });
    }
  }

  if (ticketData.length > 0) {
    await client.ticket.createMany({
      data: ticketData
    });
  }

  return client.ticket.findMany({
    where: { bookingId },
    orderBy: {
      createdAt: "asc"
    },
    select: TICKET_SELECT
  });
}

export async function listUserTickets(userId) {
  const tickets = await prisma.ticket.findMany({
    where: { userId },
    orderBy: {
      createdAt: "desc"
    },
    select: TICKET_SELECT
  });

  return tickets.map(toTicketResponse);
}

export async function getUserTicket(ticketId, userId) {
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      userId
    },
    select: TICKET_SELECT
  });

  if (!ticket) {
    throw createHttpError(404, "Ticket not found");
  }

  return toTicketResponse(ticket);
}

export async function findTicketForCheckIn({ ticketCode, qrToken }) {
  const ticket = await prisma.ticket.findFirst({
    where: qrToken
      ? {
          qrCodeHash: hashQrToken(qrToken.trim())
        }
      : {
          ticketNumber: ticketCode.trim()
        },
    select: TICKET_SELECT
  });

  if (!ticket) {
    throw createHttpError(404, "Ticket not found");
  }

  ensureEventAcceptsCheckIn(ticket);

  return toTicketResponse(ticket);
}

export async function markTicketUsedForCheckIn({ ticketCode, qrToken }) {
  const ticket = await prisma.ticket.findFirst({
    where: qrToken
      ? {
          qrCodeHash: hashQrToken(qrToken.trim())
        }
      : {
          ticketNumber: ticketCode.trim()
        },
    select: {
      id: true,
      status: true,
      event: {
        select: {
          status: true
        }
      }
    }
  });

  if (!ticket) {
    throw createHttpError(404, "Ticket not found");
  }

  ensureEventAcceptsCheckIn(ticket);

  const markedUsed = await prisma.ticket.updateMany({
    where: {
      id: ticket.id,
      status: "VALID",
      event: {
        is: {
          status: "PUBLISHED"
        }
      }
    },
    data: {
      status: "USED",
      usedAt: new Date()
    }
  });

  if (markedUsed.count !== 1) {
    const currentTicket = await prisma.ticket.findUnique({
      where: {
        id: ticket.id
      },
      select: {
        status: true,
        event: {
          select: {
            status: true
          }
        }
      }
    });

    if (!currentTicket) {
      throw createHttpError(404, "Ticket not found");
    }

    ensureEventAcceptsCheckIn(currentTicket);

    if (currentTicket.status === "USED") {
      throw createHttpError(409, "Ticket is already used");
    }

    throw createHttpError(
      400,
      `Ticket cannot be checked in with status ${currentTicket.status}`
    );
  }

  const updatedTicket = await prisma.ticket.findUnique({
    where: {
      id: ticket.id
    },
    select: TICKET_SELECT
  });

  return toTicketResponse(updatedTicket);
}

export async function createTicketPdf(ticket) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 48, size: "A4" });
    const chunks = [];

    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    document.fontSize(22).text("Event Management Platform Ticket", { align: "center" });
    document.moveDown();
    document.fontSize(16).text(ticket.event?.title ?? "Event");
    document.moveDown(0.5);
    document.fontSize(11).text(`Date: ${new Date(ticket.event?.startsAt).toLocaleString("en-IN")}`);
    const physicalLocation = [
      ticket.event?.venueName,
      ticket.event?.address,
      ticket.event?.city,
      ticket.event?.state,
      ticket.event?.country
    ]
      .filter(Boolean)
      .join(", ");
    const eventLocation =
      ticket.event?.type === "ONLINE"
        ? ticket.event?.onlineUrl || "Online event"
        : [physicalLocation, ticket.event?.type === "HYBRID" ? ticket.event?.onlineUrl : null]
            .filter(Boolean)
            .join(" / ") || "To be announced";

    document.text(`Location: ${eventLocation}`);
    document.moveDown();
    document.text(`Attendee: ${ticket.user?.name ?? "Guest"}`);
    document.text(`Email: ${ticket.user?.email ?? "-"}`);
    document.text(`Ticket code: ${ticket.ticketCode}`);
    document.text(`Ticket type: ${ticket.ticketType?.name ?? "-"}`);
    document.text(`Status: ${ticket.status}`);
    document.moveDown();

    if (ticket.qrCodeUrl) {
      document.image(dataUrlToBuffer(ticket.qrCodeUrl), {
        fit: [180, 180],
        align: "center"
      });
    }

    document.moveDown();
    document.fontSize(9).fillColor("#666666").text(
      "Present this ticket at check-in. The QR token contains no personal details.",
      { align: "center" }
    );
    document.end();
  });
}
