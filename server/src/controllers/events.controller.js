import {
  createAdminEvent,
  deleteAdminEvent,
  getAdminEvent,
  getPublishedEventBySlug,
  listAdminEvents,
  listFeaturedPublishedEvents,
  listPublishedEvents,
  publishAdminEvent,
  unpublishAdminEvent,
  updateAdminEvent
} from "../services/event.service.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function getPublicEvents(_req, res, next) {
  try {
    const events = await listPublishedEvents();
    return sendSuccess(res, { events }, "Events fetched");
  } catch (error) {
    return next(error);
  }
}

export async function getFeaturedEvents(_req, res, next) {
  try {
    const events = await listFeaturedPublishedEvents();
    return sendSuccess(res, { events }, "Featured events fetched");
  } catch (error) {
    return next(error);
  }
}

export async function getPublicEventBySlug(req, res, next) {
  try {
    const event = await getPublishedEventBySlug(req.validated.params.slug);
    return sendSuccess(res, { event }, "Event fetched");
  } catch (error) {
    return next(error);
  }
}

export async function postAdminEvent(req, res, next) {
  try {
    const event = await createAdminEvent(req.validated.body, req.user.id);
    return sendSuccess(res, { event }, "Event created", 201);
  } catch (error) {
    return next(error);
  }
}

export async function getAdminEvents(_req, res, next) {
  try {
    const events = await listAdminEvents();
    return sendSuccess(res, { events }, "Admin events fetched");
  } catch (error) {
    return next(error);
  }
}

export async function getAdminEventById(req, res, next) {
  try {
    const event = await getAdminEvent(req.validated.params.id);
    return sendSuccess(res, { event }, "Admin event fetched");
  } catch (error) {
    return next(error);
  }
}

export async function patchAdminEvent(req, res, next) {
  try {
    const event = await updateAdminEvent(req.validated.params.id, req.validated.body);
    return sendSuccess(res, { event }, "Event updated");
  } catch (error) {
    return next(error);
  }
}

export async function removeAdminEvent(req, res, next) {
  try {
    await deleteAdminEvent(req.validated.params.id);
    return sendSuccess(res, null, "Event deleted");
  } catch (error) {
    return next(error);
  }
}

export async function publishEvent(req, res, next) {
  try {
    const event = await publishAdminEvent(req.validated.params.id);
    return sendSuccess(res, { event }, "Event published");
  } catch (error) {
    return next(error);
  }
}

export async function unpublishEvent(req, res, next) {
  try {
    const event = await unpublishAdminEvent(req.validated.params.id);
    return sendSuccess(res, { event }, "Event unpublished");
  } catch (error) {
    return next(error);
  }
}
