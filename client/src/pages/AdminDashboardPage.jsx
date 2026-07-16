import { Link } from "react-router-dom";
import { AdminNav } from "../components/AdminNav.jsx";
import { useAuth } from "../features/auth/index.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

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
    status: "Next",
    body: "Booking review and ticket operations will connect here.",
    to: "/admin/dashboard#bookings"
  },
  {
    id: "payments",
    title: "Payments",
    status: "Next",
    body: "Razorpay payment monitoring can plug into this area.",
    to: "/admin/dashboard#payments"
  }
];

export function AdminDashboardPage() {
  useDocumentTitle("Admin Dashboard | EventFlow");

  const { currentUser } = useAuth();

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-16">
        <AdminNav />

        <div className="mt-8 rounded-lg bg-ink p-6 text-white shadow-soft">
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

        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {dashboardCards.map((card) => (
            <Link
              className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm transition hover:border-mint hover:shadow-soft"
              id={card.id}
              key={card.title}
              to={card.to}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-mint">
                  {card.title}
                </p>
                <span className="rounded-lg bg-linen px-3 py-1 text-xs font-bold text-ink/60">
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
      </section>
    </AppLayout>
  );
}
