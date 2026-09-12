import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getBooking } from "../api/bookings.js";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

export function PaymentFailedPage() {
  const location = useLocation();
  const bookingId =
    new URLSearchParams(location.search).get("bookingId") ??
    location.state?.bookingId ??
    "";
  const paymentMessage =
    location.state?.message ?? "Payment could not be completed.";
  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(bookingId));
  const [statusError, setStatusError] = useState("");

  useDocumentTitle("Payment Status | EventFlow");

  const loadBooking = useCallback(async () => {
    if (!bookingId) {
      return;
    }

    setIsLoading(true);
    setStatusError("");

    try {
      setBooking(await getBooking(bookingId));
    } catch (loadError) {
      setBooking(null);
      setStatusError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const bookingStatus = booking?.status ?? null;
  const isPending = bookingStatus === "PENDING";
  const isConfirmed = bookingStatus === "CONFIRMED";
  const isCancelled = bookingStatus === "CANCELLED";

  const heading = isConfirmed
    ? "Your booking is already confirmed."
    : isPending
      ? "Your booking is still pending."
      : isCancelled
        ? "This booking can no longer be paid."
        : bookingStatus
          ? `This booking is ${bookingStatus.toLowerCase()}.`
          : "Payment could not be completed.";

  return (
    <AppLayout>
      <section className="site-shell max-w-3xl py-16">
        {isLoading ? (
          <p className="state-card p-5 text-sm font-semibold text-ink/60" role="status">
            Checking the latest booking status...
          </p>
        ) : statusError ? (
          <div className="surface-card rounded-lg p-8">
            <p className="text-sm font-extrabold uppercase tracking-wide text-ember">
              Status unavailable
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-normal text-ink">
              We could not verify the latest booking status.
            </h1>
            <p
              className="mt-4 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember"
              role="alert"
            >
              {statusError}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="action-primary px-5 py-3 text-sm font-bold"
                onClick={loadBooking}
                type="button"
              >
                Check again
              </button>
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p
                className={`text-sm font-extrabold uppercase tracking-wide ${
                  isConfirmed ? "text-mint" : "text-ember"
                }`}
              >
                {isConfirmed ? "Booking confirmed" : "Payment not completed"}
              </p>
              {bookingStatus ? <StatusBadge status={bookingStatus} /> : null}
            </div>
            <h1 className="mt-3 text-4xl font-extrabold tracking-normal text-ink">
              {heading}
            </h1>
            <p
              className={`mt-4 rounded-lg border px-4 py-3 text-sm font-semibold ${
                isConfirmed
                  ? "border-mint/20 bg-mint/10 text-mint"
                  : "border-ember/20 bg-ember/10 text-ember"
              }`}
              role={isConfirmed ? "status" : "alert"}
            >
              {isConfirmed
                ? "This booking is confirmed, so no payment retry is needed."
                : isPending
                  ? paymentMessage
                  : isCancelled
                    ? "The reservation expired or was cancelled. You can start a new booking if tickets remain."
                    : paymentMessage}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {isPending ? (
                <Link
                  className="action-primary px-5 py-3 text-sm font-bold"
                  to={`/checkout/${bookingId}`}
                >
                  Try again
                </Link>
              ) : null}
              {isConfirmed ? (
                <Link
                  className="action-primary px-5 py-3 text-sm font-bold"
                  to="/user/tickets"
                >
                  My tickets
                </Link>
              ) : null}
              {!isPending && !isConfirmed ? (
                <Link
                  className="action-primary px-5 py-3 text-sm font-bold"
                  to="/events"
                >
                  Browse events
                </Link>
              ) : null}
              <Link className="action-secondary px-5 py-3 text-sm font-bold" to="/user/bookings">
                My bookings
              </Link>
            </div>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
