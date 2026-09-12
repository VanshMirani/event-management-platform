import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminDashboard } from "../api/admin.js";
import { AdminNav } from "../components/AdminNav.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useAuth } from "../features/auth/index.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatCurrency } from "../utils/formatCurrency.js";
import { formatDateTime } from "../utils/formatDate.js";

const dashboardCards = [
  {
    id: "users",
    title: "Users",
    status: "Live",
    body: "Review platform users and block or unblock accounts.",
    to: "/admin/users"
  },
  {
    id: "categories",
    title: "Categories",
    status: "Live",
    body: "Create, edit, and delete event discovery categories.",
    to: "/admin/categories"
  },
  {
    id: "events",
    title: "Events",
    status: "Live",
    body: "Create, edit, delete, publish, and unpublish events.",
    to: "/admin/events"
  },
  {
    id: "create-event",
    title: "Create event",
    status: "Live",
    body: "Open the event form and publish a new experience.",
    to: "/admin/events/create"
  },
  {
    id: "bookings",
    title: "Bookings",
    status: "Live",
    body: "Review pending, confirmed, and failed booking records.",
    to: "/admin/bookings"
  },
  {
    id: "payments",
    title: "Payments",
    status: "Live",
    body: "Review payment records, including clearly identified demo confirmations.",
    to: "/admin/payments"
  },
  {
    id: "check-in",
    title: "Check-in",
    status: "Live",
    body: "Verify QR tickets and mark attendees as checked in.",
    to: "/admin/check-in"
  }
];

export function AdminDashboardPage() {
  useDocumentTitle("Admin Dashboard | Event Management Platform");

  const { currentUser } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setIsLoading(true);
    setError("");

    try {
      setDashboard(await getAdminDashboard());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = dashboard?.stats;

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-16">
        <AdminNav />

        <div className="hero-panel mt-8 rounded-lg p-6">
          <p className="text-sm font-extrabold uppercase tracking-wide text-cyan">
            Admin dashboard
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-normal sm:text-4xl">
            Welcome back, {currentUser?.name ?? "admin"}.
          </h1>
          <p className="mt-3 max-w-2xl text-ink/70">
            Manage events, bookings, users, and platform operations from this
            workspace.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {dashboardCards.map((card) => (
            <Link
              className="surface-card rounded-lg p-5 transition hover:-translate-y-1 hover:border-cyan/40 hover:shadow-glow"
              id={card.id}
              key={card.title}
              to={card.to}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-extrabold uppercase tracking-wide text-mint">
                  {card.title}
                </p>
                <span className="rounded-lg border border-mint/20 bg-mint/10 px-3 py-1 text-xs font-extrabold text-mint">
                  {card.status}
                </span>
              </div>
              <p className="mt-3 text-lg font-bold text-ink">{card.title}</p>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                {card.body}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-kicker">
                Live operations
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-normal text-ink">
                Platform snapshot
              </h2>
            </div>
            {error ? (
              <button
                className="action-primary px-4 py-2 text-sm font-bold"
                onClick={loadDashboard}
                type="button"
              >
                Retry
              </button>
            ) : null}
          </div>

          {isLoading ? (
            <p className="state-card mt-5 p-5 text-sm font-semibold text-ink/60">
              Loading dashboard stats...
            </p>
          ) : error ? (
            <p className="mt-5 rounded-lg border border-ember/20 bg-ember/10 p-5 text-sm font-semibold text-ember shadow-lift">
              {error}
            </p>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="surface-card rounded-lg p-5">
                  <p className="text-sm font-extrabold uppercase tracking-wide text-mint">
                    Users
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-ink">
                    {stats.totalUsers}
                  </p>
                </div>
                <div className="surface-card rounded-lg p-5">
                  <p className="text-sm font-extrabold uppercase tracking-wide text-mint">
                    Events
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-ink">
                    {stats.totalEvents}
                  </p>
                </div>
                <div className="surface-card rounded-lg p-5">
                  <p className="text-sm font-extrabold uppercase tracking-wide text-mint">
                    Bookings
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-ink">
                    {stats.totalBookings}
                  </p>
                  <p className="mt-1 text-xs font-bold text-ink/50">
                    {stats.confirmedBookings} confirmed, {stats.pendingBookings} pending
                  </p>
                </div>
                <div className="surface-card rounded-lg p-5">
                  <p className="text-sm font-extrabold uppercase tracking-wide text-mint">
                    Confirmed booking value
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-ink">
                    {formatCurrency(stats.totalConfirmedValue)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-ink/50">
                    {stats.successfulPayments} successful confirmations
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="surface-card min-w-0 rounded-lg p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-extrabold text-ink">Recent bookings</h3>
                    <Link className="text-sm font-bold text-mint hover:text-ember" to="/admin/bookings">
                      View all
                    </Link>
                  </div>
                  <div className="mt-4 divide-y divide-ink/10">
                    {dashboard.recentBookings.length === 0 ? (
                      <p className="py-4 text-sm font-semibold text-ink/60">
                        No bookings yet.
                      </p>
                    ) : (
                      dashboard.recentBookings.map((booking) => (
                        <div className="py-4" key={booking.id}>
                          <p className="break-all font-bold text-ink">{booking.bookingCode}</p>
                          <p className="mt-1 break-words text-sm text-ink/65">
                            {booking.user?.email} <StatusBadge className="mx-2" status={booking.status} />{" "}
                            {formatCurrency(booking.finalAmount, booking.currency)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="surface-card min-w-0 rounded-lg p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-extrabold text-ink">Recent payments</h3>
                    <Link className="text-sm font-bold text-mint hover:text-ember" to="/admin/payments">
                      View all
                    </Link>
                  </div>
                  <div className="mt-4 divide-y divide-ink/10">
                    {dashboard.recentPayments.length === 0 ? (
                      <p className="py-4 text-sm font-semibold text-ink/60">
                        No payments yet.
                      </p>
                    ) : (
                      dashboard.recentPayments.map((payment) => (
                        <div className="py-4" key={payment.id}>
                          <p className="break-all font-bold text-ink">
                            {payment.providerPaymentId ?? payment.id}
                          </p>
                          <p className="mt-1 text-sm text-ink/65">
                            <StatusBadge className="mr-2" status={payment.status} />{" "}
                            {formatCurrency(payment.amount, payment.currency)} -{" "}
                            {formatDateTime(payment.createdAt)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </AppLayout>
  );
}
