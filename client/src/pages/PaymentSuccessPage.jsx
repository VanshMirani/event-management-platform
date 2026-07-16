import { Link, useLocation } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

export function PaymentSuccessPage() {
  const location = useLocation();
  const bookingId = location.state?.bookingId;

  useDocumentTitle("Payment Successful | EventFlow");

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-3xl px-5 py-16">
        <div className="surface-card rounded-lg p-8">
          <p className="text-sm font-extrabold uppercase tracking-wide text-mint">
            Payment successful
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-normal text-ink">
            Your booking is confirmed.
          </h1>
          <p className="mt-4 text-sm leading-6 text-ink/65">
            We verified the payment with Razorpay and confirmed your booking.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {bookingId ? (
              <Link
                className="action-primary px-5 py-3 text-sm font-bold"
                to={`/checkout/${bookingId}`}
              >
                View booking
              </Link>
            ) : null}
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
      </section>
    </AppLayout>
  );
}
