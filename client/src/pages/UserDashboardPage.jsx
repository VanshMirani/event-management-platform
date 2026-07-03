import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/index.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

export function UserDashboardPage() {
  useDocumentTitle("User Dashboard | EventFlow");

  const { currentUser } = useAuth();

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-16">
        <div className="rounded-lg bg-ink p-6 text-white shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/60">
            User dashboard
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-normal sm:text-4xl">
            Welcome, {currentUser?.name ?? "EventFlow user"}.
          </h1>
          <p className="mt-3 max-w-2xl text-white/70">
            {currentUser?.email}
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-mint">
              Bookings
            </p>
            <p className="mt-2 text-lg font-bold text-ink">No bookings yet</p>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              Confirmed tickets and upcoming event details will appear here.
            </p>
          </div>

          <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-mint">
              Tickets
            </p>
            <p className="mt-2 text-lg font-bold text-ink">Ready for QR tickets</p>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              Ticket delivery will connect here once booking checkout is active.
            </p>
          </div>

          <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-mint">
              Events
            </p>
            <p className="mt-2 text-lg font-bold text-ink">Explore featured events</p>
            <Link
              className="mt-4 inline-flex rounded-lg bg-ember px-4 py-2 text-sm font-bold text-white hover:bg-ink"
              to="/"
            >
              Browse events
            </Link>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
