import { API_URL, apiGet } from "./http.js";

export async function listMyTickets() {
  const response = await apiGet("/tickets/my");
  return response.data.tickets;
}

export async function getTicket(ticketId) {
  const response = await apiGet(`/tickets/${ticketId}`);
  return response.data.ticket;
}

export async function downloadTicketPdf(ticketId) {
  const response = await fetch(`${API_URL}/tickets/${ticketId}/download`, {
    credentials: "include"
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json") ? await response.json() : null;
    throw new Error(payload?.message ?? `Ticket download failed with status ${response.status}`);
  }

  return response.blob();
}
