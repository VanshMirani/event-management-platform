import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAdminPayment } from "../api/admin.js";
import { AdminNav } from "../components/AdminNav.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatCurrency } from "../utils/formatCurrency.js";
import { formatDateTime } from "../utils/formatDate.js";

function formatProvider(provider) {
  if (provider === "razorpay") {
    return "Razorpay Test Mode";
  }

  if (provider === "free") {
    return "Free booking";
  }

  return provider || "Not recorded";
}

export function AdminPaymentDetailPage() {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useDocumentTitle("Admin Payment Detail | EventFlow");

  const loadPayment = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      setPayment(await getAdminPayment(id));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPayment();
  }, [loadPayment]);

  return (
    <AppLayout>
      <section className="site-shell py-10 lg:py-14">
        <AdminNav />

        {isLoading ? (
          <p className="state-card mt-6 p-5 text-sm font-semibold text-ink/60">
            Loading payment...
          </p>
        ) : error ? (
          <div className="mt-6 rounded-lg border border-ember/20 bg-ember/10 p-5 shadow-lift">
            <p className="text-sm font-semibold text-ember">{error}</p>
            <button
              className="action-primary mt-4 px-4 py-2 text-sm font-bold"
              onClick={loadPayment}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="surface-card rounded-lg p-6">
              <p className="section-kicker">
                Payment record
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
                Payment details
              </h1>
              <p className="mt-2 break-all text-sm font-semibold text-ink/65">
                Reference: {payment.id}
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink/65">
                    Status
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={payment.status} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink/65">
                    Amount
                  </p>
                  <p className="mt-1 font-bold text-ink">
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink/65">
                    Provider
                  </p>
                  <p className="mt-1 font-bold text-ink">
                    {formatProvider(payment.provider)}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-cyan/10 bg-cyan/5 p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-mint">
                  Provider references
                </p>
                <p className="mt-3 break-all text-sm text-ink/70">
                  Order: {payment.providerOrderId ?? "-"}
                </p>
                <p className="mt-2 break-all text-sm text-ink/70">
                  Payment: {payment.providerPaymentId ?? "-"}
                </p>
              </div>

              <div className="mt-5 space-y-1 text-sm text-ink/65">
                <p>Created {formatDateTime(payment.createdAt)}</p>
                <p>
                  {payment.paidAt
                    ? `Paid ${formatDateTime(payment.paidAt)}`
                    : "Payment has not been completed."}
                </p>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="surface-card rounded-lg p-5">
                <p className="section-kicker">
                  Booking
                </p>
                <p className="mt-3 font-bold text-ink">{payment.booking?.bookingCode}</p>
                {payment.booking?.status ? (
                  <div className="mt-2">
                    <StatusBadge status={payment.booking.status} />
                  </div>
                ) : null}
                {payment.booking ? (
                  <Link
                    className="mt-4 inline-flex text-sm font-bold text-mint hover:text-ember"
                    to={`/admin/bookings/${payment.booking.id}`}
                  >
                    View booking
                  </Link>
                ) : null}
              </div>

              <div className="surface-card rounded-lg p-5">
                <p className="section-kicker">
                  User
                </p>
                <p className="mt-3 font-bold text-ink">{payment.booking?.user?.name}</p>
                <p className="mt-1 text-sm text-ink/65">{payment.booking?.user?.email}</p>
              </div>

              <div className="surface-card rounded-lg p-5">
                <p className="section-kicker">
                  Event
                </p>
                <p className="mt-3 font-bold text-ink">{payment.booking?.event?.title}</p>
                <p className="mt-1 text-sm text-ink/65">
                  {formatDateTime(payment.booking?.event?.startsAt)}
                </p>
              </div>
            </aside>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
