import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMyTickets } from "../api/tickets.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatDateTime } from "../utils/formatDate.js";

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
      <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-mint">
              My tickets
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-normal text-ink">
              QR tickets
            </h1>
          </div>
          <Link
            className="rounded-lg border border-ink/15 px-4 py-2 text-sm font-bold text-ink hover:border-mint hover:text-mint"
            to="/user/bookings"
          >
            View bookings
          </Link>
        </div>

        {isLoading ? (
          <p className="mt-6 rounded-lg border border-ink/10 bg-white p-5 text-sm font-semibold text-ink/60">
            Loading tickets...
          </p>
        ) : error ? (
          <div className="mt-6 rounded-lg border border-ember/20 bg-ember/10 p-5">
            <p className="text-sm font-semibold text-ember">{error}</p>
            <button
              className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-ember"
              onClick={loadTickets}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <p className="mt-6 rounded-lg border border-ink/10 bg-white p-5 text-sm font-semibold text-ink/60">
            No tickets yet.
          </p>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {tickets.map((ticket) => (
              <Link
                className="grid gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-sm transition hover:border-mint hover:shadow-soft sm:grid-cols-[1fr_132px]"
                key={ticket.id}
                to={`/user/tickets/${ticket.id}`}
              >
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-mint">
                    {ticket.status}
                  </p>
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
                    alt=""
                    className="h-32 w-32 rounded-lg border border-ink/10 bg-white object-contain p-2"
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
