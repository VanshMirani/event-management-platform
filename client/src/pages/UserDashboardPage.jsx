import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/index.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

export function UserDashboardPage() {
  useDocumentTitle("User Dashboard | EventFlow");

  const { currentUser } = useAuth();

  return (
    <AppLayout>
      <section className="site-shell py-10 lg:py-16">
        <div className="hero-panel rounded-lg p-6">
          <p className="text-sm font-extrabold uppercase tracking-wide text-cyan">
            Your EventFlow
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-normal sm:text-4xl">
            Welcome, {currentUser?.name ?? "EventFlow user"}.
          </h1>
          <p className="mt-3 max-w-2xl text-ink/70">
            Find your reservations and entry passes here, or discover something
            new to attend.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div className="surface-card rounded-lg p-5">
            <p className="text-sm font-extrabold uppercase tracking-wide text-mint">
              Bookings
            </p>
            <p className="mt-2 text-lg font-bold text-ink">Your bookings</p>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              Review pending and confirmed reservations in one place.
            </p>
            <Link
              className="mt-4 inline-flex rounded-lg border border-ink/15 px-4 py-2 text-sm font-bold text-ink hover:border-mint hover:text-mint"
              to="/user/bookings"
            >
              View bookings
            </Link>
          </div>

          <div className="surface-card rounded-lg p-5">
            <p className="text-sm font-extrabold uppercase tracking-wide text-mint">
              Tickets
            </p>
            <p className="mt-2 text-lg font-bold text-ink">QR tickets</p>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              Open confirmed tickets on your phone or download a copy before you go.
            </p>
            <Link
              className="mt-4 inline-flex rounded-lg border border-ink/15 px-4 py-2 text-sm font-bold text-ink hover:border-mint hover:text-mint"
              to="/user/tickets"
            >
              View tickets
            </Link>
          </div>

          <div className="surface-card rounded-lg p-5">
            <p className="text-sm font-extrabold uppercase tracking-wide text-mint">
              Events
            </p>
            <p className="mt-2 text-lg font-bold text-ink">Explore featured events</p>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              Browse upcoming experiences by category, city, and format.
            </p>
            <Link
              className="action-primary mt-4 inline-flex px-4 py-2 text-sm font-bold"
              to="/events"
            >
              Browse events
            </Link>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
