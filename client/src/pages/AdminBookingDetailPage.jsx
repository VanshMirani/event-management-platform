import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAdminBooking } from "../api/admin.js";
import { AdminNav } from "../components/AdminNav.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatCurrency } from "../utils/formatCurrency.js";
import { formatDateTime } from "../utils/formatDate.js";

export function AdminBookingDetailPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useDocumentTitle("Admin Booking Detail | EventFlow");

  async function loadBooking() {
    setIsLoading(true);
    setError("");

    try {
      setBooking(await getAdminBooking(id));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadBooking();
  }, [id]);

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-14">
        <AdminNav />

        {isLoading ? (
          <p className="state-card mt-6 p-5 text-sm font-semibold text-ink/60">
            Loading booking...
          </p>
        ) : error ? (
          <div className="mt-6 rounded-lg border border-ember/20 bg-ember/10 p-5 shadow-lift">
            <p className="text-sm font-semibold text-ember">{error}</p>
            <button
              className="action-primary mt-4 px-4 py-2 text-sm font-bold"
              onClick={loadBooking}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <div className="surface-card rounded-lg p-6">
                <p className="section-kicker">
                  Booking
                </p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
                  {booking.bookingCode}
                </h1>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
                      Status
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={booking.status} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
                      Final amount
                    </p>
                    <p className="mt-1 font-bold text-ink">
                      {formatCurrency(booking.finalAmount, booking.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
                      Created
                    </p>
                    <p className="mt-1 font-bold text-ink">
                      {formatDateTime(booking.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="surface-card rounded-lg p-6">
                <p className="section-kicker">
                  Booking items
                </p>
                <div className="mt-4 divide-y divide-ink/10">
                  {booking.items.map((item) => (
                    <div
                      className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center"
                      key={item.id}
                    >
                      <div>
                        <p className="font-bold text-ink">{item.ticketType?.name}</p>
                        <p className="mt-1 text-sm text-ink/65">
                          Quantity {item.quantity} at{" "}
                          {formatCurrency(item.unitPrice, booking.currency)}
                        </p>
                      </div>
                      <p className="font-bold text-ink">
                        {formatCurrency(item.totalAmount, booking.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="surface-card rounded-lg p-5">
                <p className="section-kicker">
                  User
                </p>
                <p className="mt-3 font-bold text-ink">{booking.user?.name}</p>
                <p className="mt-1 text-sm text-ink/65">{booking.user?.email}</p>
              </div>

              <div className="surface-card rounded-lg p-5">
                <p className="section-kicker">
                  Event
                </p>
                <p className="mt-3 font-bold text-ink">{booking.event?.title}</p>
                <p className="mt-1 text-sm text-ink/65">
                  {formatDateTime(booking.event?.startsAt)}
                </p>
              </div>

              <div className="surface-card rounded-lg p-5">
                <p className="section-kicker">
                  Payment
                </p>
                {booking.payment ? (
                  <>
                    <div className="mt-3">
                      <StatusBadge status={booking.payment.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink/65">
                      {booking.payment.providerOrderId}
                    </p>
                    <Link
                      className="mt-4 inline-flex text-sm font-bold text-mint hover:text-ember"
                      to={`/admin/payments/${booking.payment.id}`}
                    >
                      View payment
                    </Link>
                  </>
                ) : (
                  <p className="mt-3 text-sm font-semibold text-ink/55">No payment yet.</p>
                )}
              </div>
            </aside>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
