import { Link, useLocation } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

export function PaymentFailedPage() {
  const location = useLocation();
  const bookingId = location.state?.bookingId;
  const message = location.state?.message ?? "Payment could not be completed.";

  useDocumentTitle("Payment Failed | EventFlow");

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-3xl px-5 py-16">
        <div className="rounded-lg border border-ember/20 bg-white p-8 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-wide text-ember">
            Payment failed
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-normal text-ink">
            Your booking is still pending.
          </h1>
          <p className="mt-4 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember">
            {message}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {bookingId ? (
              <Link
                className="rounded-lg bg-ember px-5 py-3 text-sm font-bold text-white hover:bg-ink"
                to={`/checkout/${bookingId}`}
              >
                Try again
              </Link>
            ) : null}
            <Link
              className="rounded-lg border border-ink/15 px-5 py-3 text-sm font-bold text-ink hover:border-mint hover:text-mint"
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
