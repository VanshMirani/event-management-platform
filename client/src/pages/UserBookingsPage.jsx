import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMyBookings } from "../api/bookings.js";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatCurrency } from "../utils/formatCurrency.js";
import { formatDateTime } from "../utils/formatDate.js";

function getBookingAction(booking) {
  if (booking.status === "PENDING") {
    return {
      label: "Continue checkout",
      to: `/checkout/${booking.id}`
    };
  }

  if (booking.status === "CONFIRMED") {
    return {
      label: "View tickets",
      to: "/user/tickets"
    };
  }

  return {
    label: "Browse events",
    to: "/events"
  };
}

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
      <section className="site-shell py-10 lg:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">
              My bookings
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-normal text-ink">
              Your event reservations
            </h1>
          </div>
          <Link
            className="action-primary px-4 py-2 text-sm font-bold"
            to="/events"
          >
            Browse events
          </Link>
        </div>

        {isLoading ? (
          <p className="state-card mt-6 p-5 text-sm font-semibold text-ink/60">
            Loading bookings...
          </p>
        ) : error ? (
          <div className="mt-6 rounded-lg border border-ember/20 bg-ember/10 p-5 shadow-lift">
            <p className="text-sm font-semibold text-ember">{error}</p>
            <button
              className="action-primary mt-4 px-4 py-2 text-sm font-bold"
              onClick={loadBookings}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="state-card mt-6 p-6">
            <p className="text-lg font-extrabold text-ink">No bookings yet.</p>
            <p className="mt-2 text-sm font-semibold text-ink/60">
              Browse events and reserve tickets when you are ready.
            </p>
          </div>
        ) : (
          <div className="surface-card mt-6 overflow-hidden rounded-lg">
            <div className="divide-y divide-ink/10">
              {bookings.map((booking) => {
                const bookingItem = booking.items?.[0] ?? null;
                const bookingAction = getBookingAction(booking);

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
                        <StatusBadge status={booking.status} />
                      </div>
                      <p className="mt-2 text-sm text-ink/65">
                        {bookingItem?.ticketType?.name ?? "Ticket"} - Quantity{" "}
                        {booking.quantity}
                      </p>
                      <p className="mt-1 text-sm text-ink/65">
                        {formatDateTime(booking.event?.startsAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 lg:justify-end">
                      <p className="text-lg font-extrabold text-ink">
                        {formatCurrency(booking.totalAmount, booking.currency)}
                      </p>
                      <Link
                        className="action-secondary px-4 py-2 text-sm font-bold"
                        to={bookingAction.to}
                      >
                        {bookingAction.label}
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
