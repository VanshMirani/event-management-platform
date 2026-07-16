import {
  createTicketPdf,
  findTicketForCheckIn,
  getUserTicket,
  listUserTickets,
  markTicketUsedForCheckIn
} from "../services/ticket.service.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function getMyTickets(req, res, next) {
  try {
    const tickets = await listUserTickets(req.user.id);
    return sendSuccess(res, { tickets }, "Tickets fetched");
  } catch (error) {
    return next(error);
  }
}

export async function getTicketById(req, res, next) {
  try {
    const ticket = await getUserTicket(req.validated.params.id, req.user.id);
    return sendSuccess(res, { ticket }, "Ticket fetched");
  } catch (error) {
    return next(error);
  }
}

export async function downloadTicket(req, res, next) {
  try {
    const ticket = await getUserTicket(req.validated.params.id, req.user.id);
    const pdf = await createTicketPdf(ticket);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${ticket.ticketCode}.pdf"`
    );
    return res.status(200).send(pdf);
  } catch (error) {
    return next(error);
  }
}

export async function verifyTicketForCheckIn(req, res, next) {
  try {
    const ticket = await findTicketForCheckIn(req.validated.body);
    return sendSuccess(res, { ticket }, "Ticket verified");
  } catch (error) {
    return next(error);
  }
}

export async function markTicketUsed(req, res, next) {
  try {
    const ticket = await markTicketUsedForCheckIn(req.validated.body);
    return sendSuccess(res, { ticket }, "Ticket checked in");
  } catch (error) {
    return next(error);
  }
}
