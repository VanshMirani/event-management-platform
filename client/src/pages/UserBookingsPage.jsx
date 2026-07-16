import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMyBookings } from "../api/bookings.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatCurrency } from "../utils/formatCurrency.js";
import { formatDateTime } from "../utils/formatDate.js";

export function UserBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useDocumentTitle("My Bookings | EventFlow");

  async function loadBookings() {
    setIsLoading(true);
    setError("");

    try {
      setBookings(await listMyBookings());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-mint">
              My bookings
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-normal text-ink">
              Your event reservations
            </h1>
          </div>
          <Link
            className="rounded-lg bg-ember px-4 py-2 text-sm font-bold text-white hover:bg-ink"
            to="/events"
          >
            Browse events
          </Link>
        </div>

        {isLoading ? (
          <p className="mt-6 rounded-lg border border-ink/10 bg-white p-5 text-sm font-semibold text-ink/60">
            Loading bookings...
          </p>
        ) : error ? (
          <div className="mt-6 rounded-lg border border-ember/20 bg-ember/10 p-5">
            <p className="text-sm font-semibold text-ember">{error}</p>
            <button
              className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-ember"
              onClick={loadBookings}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <p className="mt-6 rounded-lg border border-ink/10 bg-white p-5 text-sm font-semibold text-ink/60">
            No bookings yet.
          </p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm">
            <div className="divide-y divide-ink/10">
              {bookings.map((booking) => {
                const bookingItem = booking.items?.[0] ?? null;

                return (
                  <div
                    className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center"
                    key={booking.id}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-lg font-bold text-ink">
                          {booking.event?.title ?? "Event"}
                        </p>
                        <span className="rounded-lg bg-ember/10 px-3 py-1 text-xs font-bold text-ember">
                          {booking.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-ink/65">
                        {bookingItem?.ticketType?.name ?? "Ticket"} - Quantity{" "}
                        {booking.quantity}
                      </p>
                      <p className="mt-1 text-sm text-ink/55">
                        {formatDateTime(booking.event?.startsAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 lg:justify-end">
                      <p className="text-lg font-extrabold text-ink">
                        {formatCurrency(booking.totalAmount, booking.currency)}
                      </p>
                      <Link
                        className="rounded-lg border border-ink/15 px-4 py-2 text-sm font-bold text-ink hover:border-mint hover:text-mint"
                        to={`/checkout/${booking.id}`}
                      >
                        View
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
