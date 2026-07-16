import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAdminPayment } from "../api/admin.js";
import { AdminNav } from "../components/AdminNav.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatCurrency } from "../utils/formatCurrency.js";
import { formatDateTime } from "../utils/formatDate.js";

export function AdminPaymentDetailPage() {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useDocumentTitle("Admin Payment Detail | EventFlow");

  async function loadPayment() {
    setIsLoading(true);
    setError("");

    try {
      setPayment(await getAdminPayment(id));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPayment();
  }, [id]);

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-14">
        <AdminNav />

        {isLoading ? (
          <p className="mt-6 rounded-lg border border-ink/10 bg-white p-5 text-sm font-semibold text-ink/60">
            Loading payment...
          </p>
        ) : error ? (
          <div className="mt-6 rounded-lg border border-ember/20 bg-ember/10 p-5">
            <p className="text-sm font-semibold text-ember">{error}</p>
            <button
              className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-ember"
              onClick={loadPayment}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-mint">
                Payment
              </p>
              <h1 className="mt-2 break-all text-3xl font-extrabold tracking-normal text-ink">
                {payment.id}
              </h1>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
                    Status
                  </p>
                  <p className="mt-1 font-bold text-ink">{payment.status}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
                    Amount
                  </p>
                  <p className="mt-1 font-bold text-ink">
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
                    Provider
                  </p>
                  <p className="mt-1 font-bold text-ink">{payment.provider}</p>
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-linen p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-mint">
                  Provider ids
                </p>
                <p className="mt-3 break-all text-sm text-ink/70">
                  Order: {payment.providerOrderId ?? "-"}
                </p>
                <p className="mt-2 break-all text-sm text-ink/70">
                  Payment: {payment.providerPaymentId ?? "-"}
                </p>
              </div>

              <p className="mt-5 text-sm text-ink/65">
                Paid at {formatDateTime(payment.paidAt)}. Created at{" "}
                {formatDateTime(payment.createdAt)}.
              </p>
            </div>

            <aside className="space-y-6">
              <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-mint">
                  Booking
                </p>
                <p className="mt-3 font-bold text-ink">{payment.booking?.bookingCode}</p>
                <p className="mt-1 text-sm text-ink/65">{payment.booking?.status}</p>
                {payment.booking ? (
                  <Link
                    className="mt-4 inline-flex text-sm font-bold text-mint hover:text-ember"
                    to={`/admin/bookings/${payment.booking.id}`}
                  >
                    View booking
                  </Link>
                ) : null}
              </div>

              <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-mint">
                  User
                </p>
                <p className="mt-3 font-bold text-ink">{payment.booking?.user?.name}</p>
                <p className="mt-1 text-sm text-ink/65">{payment.booking?.user?.email}</p>
              </div>

              <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-mint">
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
