import { apiDelete, apiGet, apiPatch, apiPost } from "./http.js";

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function getAdminDashboard() {
  const response = await apiGet("/admin/dashboard");
  return response.data.dashboard;
}

export async function listAdminUsers(params = {}) {
  const response = await apiGet(`/admin/users${buildQuery(params)}`);
  return response.data;
}

export async function updateAdminUserStatus(userId, status) {
  const response = await apiPatch(`/admin/users/${userId}/status`, { status });
  return response.data.user;
}

export async function listAdminCategories() {
  const response = await apiGet("/admin/categories");
  return response.data.categories;
}

export async function createAdminCategory(data) {
  const response = await apiPost("/admin/categories", data);
  return response.data.category;
}

export async function updateAdminCategory(categoryId, data) {
  const response = await apiPatch(`/admin/categories/${categoryId}`, data);
  return response.data.category;
}

export async function deleteAdminCategory(categoryId) {
  await apiDelete(`/admin/categories/${categoryId}`);
}

export async function listAdminEvents() {
  const response = await apiGet("/admin/events");
  return response.data.events;
}

export async function getAdminEvent(eventId) {
  const response = await apiGet(`/admin/events/${eventId}`);
  return response.data.event;
}

export async function createAdminEvent(data) {
  const response = await apiPost("/admin/events", data);
  return response.data.event;
}

export async function updateAdminEvent(eventId, data) {
  const response = await apiPatch(`/admin/events/${eventId}`, data);
  return response.data.event;
}

export async function deleteAdminEvent(eventId) {
  await apiDelete(`/admin/events/${eventId}`);
}

export async function publishAdminEvent(eventId) {
  const response = await apiPatch(`/admin/events/${eventId}/publish`);
  return response.data.event;
}

export async function unpublishAdminEvent(eventId) {
  const response = await apiPatch(`/admin/events/${eventId}/unpublish`);
  return response.data.event;
}

export async function listAdminEventTicketTypes(eventId) {
  const response = await apiGet(`/admin/events/${eventId}/ticket-types`);
  return response.data.ticketTypes;
}

export async function createAdminTicketType(data) {
  const response = await apiPost("/admin/ticket-types", data);
  return response.data.ticketType;
}

export async function updateAdminTicketType(ticketTypeId, data) {
  const response = await apiPatch(`/admin/ticket-types/${ticketTypeId}`, data);
  return response.data.ticketType;
}

export async function deleteAdminTicketType(ticketTypeId) {
  await apiDelete(`/admin/ticket-types/${ticketTypeId}`);
}

export async function listAdminBookings(params = {}) {
  const response = await apiGet(`/admin/bookings${buildQuery(params)}`);
  return response.data;
}

export async function getAdminBooking(bookingId) {
  const response = await apiGet(`/admin/bookings/${bookingId}`);
  return response.data.booking;
}

export async function listAdminPayments(params = {}) {
  const response = await apiGet(`/admin/payments${buildQuery(params)}`);
  return response.data;
}

export async function getAdminPayment(paymentId) {
  const response = await apiGet(`/admin/payments/${paymentId}`);
  return response.data.payment;
}

export async function verifyAdminTicket(data) {
  const response = await apiPost("/admin/check-in/verify", data);
  return response.data.ticket;
}

export async function markAdminTicketUsed(data) {
  const response = await apiPost("/admin/check-in/mark-used", data);
  return response.data.ticket;
}
