import { apiGet } from "./http.js";

export async function listPublicEvents() {
  const response = await apiGet("/events");
  return response.data.events;
}

export async function listFeaturedEvents() {
  const response = await apiGet("/events/featured");
  return response.data.events;
}

export async function getPublicEvent(slug) {
  const response = await apiGet(`/events/${slug}`);
  return response.data.event;
}
