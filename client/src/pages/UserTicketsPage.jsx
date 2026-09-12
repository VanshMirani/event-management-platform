import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMyTickets } from "../api/tickets.js";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatDateTime } from "../utils/formatDate.js";
import { getTicketStatusDetails } from "../utils/ticketStatus.js";

export function UserTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useDocumentTitle("My Tickets | EventFlow");

  async function loadTickets() {
    setIsLoading(true);
    setError("");

    try {
      setTickets(await listMyTickets());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  return (
    <AppLayout>
      <section className="site-shell py-10 lg:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">
              My tickets
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-normal text-ink">
              Your event tickets
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">
              Open a valid ticket to show its QR code at the entrance or download a PDF copy.
            </p>
          </div>
          <Link
            className="action-secondary px-4 py-2 text-sm font-bold"
            to="/user/bookings"
          >
            View bookings
          </Link>
        </div>

        {isLoading ? (
          <p className="state-card mt-6 p-5 text-sm font-semibold text-ink/60">
            Loading tickets...
          </p>
        ) : error ? (
          <div className="mt-6 rounded-lg border border-ember/20 bg-ember/10 p-5 shadow-lift">
            <p className="text-sm font-semibold text-ember">{error}</p>
            <button
              className="action-primary mt-4 px-4 py-2 text-sm font-bold"
              onClick={loadTickets}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="state-card mt-6 p-6">
            <p className="text-lg font-extrabold text-ink">No tickets yet.</p>
            <p className="mt-2 text-sm font-semibold text-ink/60">
              Complete a booking and its entry ticket will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {tickets.map((ticket) => {
              const statusDetails = getTicketStatusDetails(ticket.status);

              return (
                <Link
                  className="surface-card grid gap-4 rounded-lg p-5 transition hover:-translate-y-1 hover:border-cyan/40 hover:shadow-glow sm:grid-cols-[1fr_132px]"
                  key={ticket.id}
                  to={`/user/tickets/${ticket.id}`}
                >
                  <div>
                    <StatusBadge status={ticket.status} />
                    <h2 className="mt-2 text-xl font-bold text-ink">
                      {ticket.event?.title ?? "Event"}
                    </h2>
                    <p className="mt-2 text-sm text-ink/65">
                      {formatDateTime(ticket.event?.startsAt)}
                    </p>
                    <p className="mt-3 text-sm font-bold text-ink">
                      {ticket.ticketCode}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-ink/65">
                      {statusDetails.userSummary}
                    </p>
                  </div>
                  {statusDetails.canCheckIn && ticket.qrCodeUrl ? (
                    <img
                      alt={`QR code for ticket ${ticket.ticketCode}`}
                      className="h-32 w-32 rounded-lg border border-cyan/20 bg-white object-contain p-2 shadow-lift"
                      src={ticket.qrCodeUrl}
                    />
                  ) : (
                    <div className="flex min-h-24 items-center rounded-lg border border-ink/10 bg-ink/[0.03] p-4 sm:min-h-32">
                      <p className="text-sm font-bold leading-5 text-ink/65">
                        {statusDetails.userHeading}
                      </p>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppLayout>
  );
}
