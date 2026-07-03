import { useAuth } from "../features/auth/index.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

export function AdminDashboardPage() {
  useDocumentTitle("Admin Dashboard | EventFlow");

  const { currentUser } = useAuth();

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-16">
        <div className="rounded-lg bg-ink p-6 text-white shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/60">
            Admin dashboard
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-normal sm:text-4xl">
            Welcome back, {currentUser?.name ?? "admin"}.
          </h1>
          <p className="mt-3 max-w-2xl text-white/70">
            Manage events, bookings, users, and platform operations from this
            workspace.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-4">
          {["Events", "Bookings", "Users", "Payments"].map((item) => (
            <div
              className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm"
              key={item}
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-mint">
                {item}
              </p>
              <p className="mt-2 text-lg font-bold text-ink">Admin-ready</p>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                Operational controls can be connected here as the admin API grows.
              </p>
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
