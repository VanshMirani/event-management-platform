import { apiGet } from "./http.js";

export async function listMyTickets() {
  const response = await apiGet("/tickets/my");
  return response.data.tickets;
}

export async function getTicket(ticketId) {
  const response = await apiGet(`/tickets/${ticketId}`);
  return response.data.ticket;
}

export async function downloadTicketPdf(ticketId) {
  return apiGet(`/tickets/${ticketId}/download`, {
    responseType: "blob"
  });
}
