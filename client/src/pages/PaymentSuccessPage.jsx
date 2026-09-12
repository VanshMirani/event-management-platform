import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getBooking } from "../api/bookings.js";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

export function PaymentSuccessPage() {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const bookingId = query.get("bookingId") ?? location.state?.bookingId ?? "";
  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(bookingId));
  const [error, setError] = useState(
    bookingId ? "" : "No booking was provided, so payment confirmation could not be verified."
  );

  useDocumentTitle(booking ? "Booking Confirmed | Event Management Platform" : "Payment Status | Event Management Platform");

  const loadBooking = useCallback(async () => {
    if (!bookingId) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const nextBooking = await getBooking(bookingId);

      if (nextBooking.status !== "CONFIRMED") {
        throw new Error(
          `This booking is ${String(nextBooking.status).toLowerCase()}, not confirmed.`
        );
      }

      setBooking(nextBooking);
    } catch (loadError) {
      setBooking(null);
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-3xl px-5 py-16">
        {isLoading ? (
          <p className="state-card p-5 text-sm font-semibold text-ink/60" role="status">
            Verifying your booking...
          </p>
        ) : error ? (
          <div className="surface-card rounded-lg p-8">
            <p className="text-sm font-extrabold uppercase tracking-wide text-ember">
              Confirmation unavailable
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-normal text-ink">
              We could not verify a confirmed booking.
            </h1>
            <p
              className="mt-4 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember"
              role="alert"
            >
              {error}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {bookingId ? (
                <button
                  className="action-primary px-5 py-3 text-sm font-bold"
                  onClick={loadBooking}
                  type="button"
                >
                  Check again
                </button>
              ) : null}
              <Link
                className="action-secondary px-5 py-3 text-sm font-bold"
                to="/user/bookings"
              >
                My bookings
              </Link>
            </div>
          </div>
        ) : (
          <div className="surface-card rounded-lg p-8">
            <p className="text-sm font-extrabold uppercase tracking-wide text-mint">
              Booking confirmed
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-normal text-ink">
              Your booking is confirmed.
            </h1>
            <p className="mt-4 text-sm leading-6 text-ink/65">
              {booking.payment?.provider === "demo" || booking.payment?.provider === "free"
                ? "This demo booking was confirmed without a real payment or charge."
                : booking.payment?.provider === "razorpay"
                  ? "The backend verified your payment and confirmed your booking."
                  : "The backend verified and confirmed your booking."}
            </p>
            <div className="mt-5 rounded-lg border border-cyan/15 bg-cyan/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
                    Booking
                  </p>
                  <p className="mt-1 font-extrabold text-ink">
                    {booking.bookingNumber ?? booking.id}
                  </p>
                  <p className="mt-1 text-sm text-ink/65">
                    {booking.event?.title ?? "Event booking"}
                  </p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="action-primary px-5 py-3 text-sm font-bold"
                to={`/checkout/${booking.id}`}
              >
                View booking
              </Link>
              <Link
                className="action-secondary px-5 py-3 text-sm font-bold"
                to="/user/tickets"
              >
                My tickets
              </Link>
              <Link
                className="action-secondary px-5 py-3 text-sm font-bold"
                to="/user/bookings"
              >
                My bookings
              </Link>
            </div>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
