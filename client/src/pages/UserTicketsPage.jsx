import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMyTickets } from "../api/tickets.js";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatDateTime } from "../utils/formatDate.js";

export function UserTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useDocumentTitle("My Tickets | Event Management Platform");

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
      <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">
              My tickets
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-normal text-ink">
              QR tickets
            </h1>
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
              Confirmed bookings generate QR tickets automatically.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {tickets.map((ticket) => (
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
                </div>
                {ticket.qrCodeUrl ? (
                  <img
                    alt={`QR code for ticket ${ticket.ticketCode}`}
                    className="h-32 w-32 rounded-lg border border-cyan/20 bg-white object-contain p-2 shadow-lift"
                    src={ticket.qrCodeUrl}
                  />
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
}
