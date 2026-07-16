import {
  createAdminTicketType,
  deleteAdminTicketType,
  listAdminTicketTypesForEvent,
  listPublicTicketTypesForEventSlug,
  updateAdminTicketType
} from "../services/ticketType.service.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function postAdminTicketType(req, res, next) {
  try {
    const ticketType = await createAdminTicketType(req.validated.body);
    return sendSuccess(res, { ticketType }, "Ticket type created", 201);
  } catch (error) {
    return next(error);
  }
}

export async function getAdminTicketTypesForEvent(req, res, next) {
  try {
    const ticketTypes = await listAdminTicketTypesForEvent(req.validated.params.eventId);
    return sendSuccess(res, { ticketTypes }, "Ticket types fetched");
  } catch (error) {
    return next(error);
  }
}

export async function patchAdminTicketType(req, res, next) {
  try {
    const ticketType = await updateAdminTicketType(
      req.validated.params.id,
      req.validated.body
    );
    return sendSuccess(res, { ticketType }, "Ticket type updated");
  } catch (error) {
    return next(error);
  }
}

export async function removeAdminTicketType(req, res, next) {
  try {
    await deleteAdminTicketType(req.validated.params.id);
    return sendSuccess(res, null, "Ticket type deleted");
  } catch (error) {
    return next(error);
  }
}

export async function getPublicTicketTypesForEvent(req, res, next) {
  try {
    const ticketTypes = await listPublicTicketTypesForEventSlug(req.validated.params.slug);
    return sendSuccess(res, { ticketTypes }, "Ticket types fetched");
  } catch (error) {
    return next(error);
  }
}
