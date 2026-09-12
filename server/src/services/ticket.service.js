import crypto from "node:crypto";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
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

function createCheckInUrl(qrToken) {
  const appUrl = env.PUBLIC_APP_URL.replace(/\/+$/, "");
  return `${appUrl}/admin/check-in?token=${encodeURIComponent(qrToken)}`;
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
      const qrCodeUrl = await QRCode.toDataURL(createCheckInUrl(qrToken), {
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
    const document = new PDFDocument({
      info: {
        Author: "EventFlow",
        Subject: `Ticket ${ticket.ticketCode}`,
        Title: `${ticket.event?.title ?? "Event"} ticket`
      },
      margin: 0,
      size: "A4"
    });
    const chunks = [];
    const pageWidth = document.page.width;
    const ink = "#10182B";
    const muted = "#5C6475";
    const violet = "#5B3DF5";
    const cyan = "#24B6D2";
    const cardX = 42;
    const cardY = 104;
    const cardWidth = pageWidth - cardX * 2;
    const contentX = cardX + 28;
    const contentWidth = cardWidth - 56;

    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    const eventDate = new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata"
    }).format(new Date(ticket.event?.startsAt));
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
        : ticket.event?.type === "HYBRID"
          ? `${physicalLocation || "Venue to be announced"} - online access is also available`
          : physicalLocation || "Venue to be announced";

    document.rect(0, 0, pageWidth, document.page.height).fill("#F4F6FB");
    document.rect(0, 0, pageWidth, 154).fill(violet);
    document
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(24)
      .text("EventFlow", 42, 34);
    document
      .fillColor("#E8F9FC")
      .font("Helvetica")
      .fontSize(10)
      .text("YOUR EVENT. YOUR TICKET.", 42, 68, { characterSpacing: 1.1 });
    document.roundedRect(pageWidth - 132, 35, 90, 28, 14).fill(cyan);
    document
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("ADMIT ONE", pageWidth - 132, 45, { align: "center", width: 90 });

    document.roundedRect(cardX, cardY, cardWidth, 684, 14).fill("#FFFFFF");

    let cursorY = cardY + 28;
    document
      .fillColor(violet)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("EVENT ADMISSION", contentX, cursorY, { characterSpacing: 1.2 });
    cursorY += 19;
    document
      .fillColor(ink)
      .font("Helvetica-Bold")
      .fontSize(23)
      .text(ticket.event?.title ?? "Event", contentX, cursorY, {
        lineGap: 2,
        width: contentWidth
      });
    cursorY = document.y + 17;

    document.fillColor(muted).font("Helvetica-Bold").fontSize(8).text("DATE AND TIME", contentX, cursorY);
    document
      .fillColor(ink)
      .font("Helvetica")
      .fontSize(11)
      .text(`${eventDate} IST`, contentX, cursorY + 13, { width: contentWidth });
    cursorY += 43;
    document.fillColor(muted).font("Helvetica-Bold").fontSize(8).text("LOCATION", contentX, cursorY);
    document
      .fillColor(ink)
      .font("Helvetica")
      .fontSize(10.5)
      .text(eventLocation, contentX, cursorY + 13, {
        ellipsis: true,
        height: 31,
        lineGap: 2,
        width: contentWidth
      });
    cursorY += 58;

    document.moveTo(contentX, cursorY).lineTo(contentX + contentWidth, cursorY).lineWidth(1).stroke("#E3E7F0");
    cursorY += 22;

    const detailColumnWidth = (contentWidth - 20) / 2;
    const drawDetail = (label, value, x, y) => {
      document.fillColor(muted).font("Helvetica-Bold").fontSize(8).text(label, x, y);
      document
        .fillColor(ink)
        .font("Helvetica")
        .fontSize(10.5)
        .text(value || "-", x, y + 13, {
          ellipsis: true,
          height: 28,
          width: detailColumnWidth
        });
    };

    drawDetail("ATTENDEE", ticket.user?.name ?? "Guest", contentX, cursorY);
    drawDetail("TICKET TYPE", ticket.ticketType?.name ?? "-", contentX + detailColumnWidth + 20, cursorY);
    cursorY += 50;
    drawDetail("EMAIL", ticket.user?.email ?? "-", contentX, cursorY);
    drawDetail("BOOKING", ticket.booking?.bookingNumber ?? "-", contentX + detailColumnWidth + 20, cursorY);
    cursorY += 49;

    const statusLabel = ticket.status === "VALID" ? "VALID FOR ENTRY" : ticket.status;
    const statusWidth = Math.max(82, document.widthOfString(statusLabel) + 24);
    document.roundedRect(contentX, cursorY, statusWidth, 24, 12).fill(ticket.status === "VALID" ? "#DDF7EA" : "#EEF0F5");
    document
      .fillColor(ticket.status === "VALID" ? "#16734A" : muted)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(statusLabel, contentX, cursorY + 8, { align: "center", width: statusWidth });
    cursorY += 38;

    const isEntryReady = ticket.status === "VALID";

    if (ticket.qrCodeUrl && isEntryReady) {
      const qrSize = 170;
      const qrX = (pageWidth - qrSize) / 2;
      document.roundedRect(qrX - 8, cursorY - 8, qrSize + 16, qrSize + 16, 10).fill("#F7F8FC");
      document.image(dataUrlToBuffer(ticket.qrCodeUrl), qrX, cursorY, {
        fit: [qrSize, qrSize]
      });
      cursorY += qrSize + 13;
    } else {
      document.roundedRect(contentX, cursorY, contentWidth, 86, 10).fill("#F4F6FB");
      document
        .fillColor(ink)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("ENTRY UNAVAILABLE", contentX, cursorY + 20, {
          align: "center",
          width: contentWidth
        });
      document
        .fillColor(muted)
        .font("Helvetica")
        .fontSize(9)
        .text(
          ticket.status === "USED"
            ? "This ticket has already been checked in and cannot be accepted again."
            : `This ticket is ${ticket.status.toLowerCase()} and is not valid for entry.`,
          contentX + 24,
          cursorY + 43,
          { align: "center", width: contentWidth - 48 }
        );
      cursorY += 103;
    }

    document
      .fillColor(muted)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("TICKET CODE", contentX, cursorY, { align: "center", width: contentWidth });
    document
      .fillColor(ink)
      .font("Courier-Bold")
      .fontSize(9)
      .text(ticket.ticketCode, contentX, cursorY + 13, {
        align: "center",
        width: contentWidth
      });
    cursorY += 42;
    document
      .fillColor(muted)
      .font("Helvetica")
      .fontSize(8.5)
      .text(
        isEntryReady
          ? "Show this QR code at check-in. It opens EventFlow verification, contains no personal details, and can be accepted only once."
          : "Keep this document for your records. It cannot be used for event entry.",
        contentX,
        cursorY,
        { align: "center", lineGap: 2, width: contentWidth }
      );
    document.end();
  });
}
