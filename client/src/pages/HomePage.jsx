import { FeaturePill } from "../components/FeaturePill.jsx";
import { EventHighlights } from "../features/events/EventHighlights.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { Link } from "react-router-dom";

const metrics = [
  { label: "Live events", value: "42" },
  { label: "Bookings", value: "8.7k" },
  { label: "Cities", value: "12" }
];

const platformHighlights = [
  {
    title: "Premium admin cockpit",
    body: "Manage users, categories, events, tickets, bookings, payments, and check-in from one focused workspace."
  },
  {
    title: "Cookie-secure auth",
    body: "Access stays in httpOnly cookies, keeping the browser client clean and reducing token exposure."
  },
  {
    title: "QR-ready operations",
    body: "Confirmed payments generate QR tickets that admins can verify and mark used at the venue."
  }
];

const workflowSteps = [
  {
    label: "01",
    title: "Publish",
    body: "Create an event, attach a category, define ticket inventory, then publish it for discovery."
  },
  {
    label: "02",
    title: "Book",
    body: "Users choose tickets, create a pending booking, and continue through Razorpay checkout."
  },
  {
    label: "03",
    title: "Check in",
    body: "Successful payments confirm bookings and unlock QR tickets for fast event entry."
  }
];

export function HomePage() {
  useDocumentTitle("EventFlow | Event Management Platform");

  return (
    <AppLayout>
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
        <div>
          <p className="section-kicker">
            Event management platform
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-normal text-ink sm:text-6xl">
            Plan, publish, and manage <span className="gradient-text">memorable events</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/70">
            A JavaScript workspace for event discovery, bookings, admin
            operations, secure cookies, and Razorpay payments.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="action-primary px-5 py-3 text-sm font-extrabold"
              to="/events"
            >
              Explore events
            </Link>
            <a
              className="action-secondary px-5 py-3 text-sm font-extrabold"
              href="#operations"
            >
              View workspace
            </a>
          </div>
        </div>

        <div
          aria-label="Event audience"
          className="surface-card min-h-[390px] overflow-hidden rounded-lg bg-cover bg-center shadow-glow"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(248,250,252,0.92)), url('https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80')"
          }}
        >
          <div className="flex h-full min-h-[390px] flex-col justify-end p-6">
            <div className="rounded-lg border border-white/70 bg-white/86 p-5 shadow-lift backdrop-blur">
            <p className="text-sm font-extrabold uppercase tracking-wide text-cyan">
              Live workspace
            </p>
            <p className="mt-2 max-w-sm text-3xl font-bold tracking-normal text-ink">
              Conference operations from discovery to check-in
            </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="operations"
        className="border-y border-indigo-100/80 bg-white/60 py-8 backdrop-blur"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-5 sm:grid-cols-3">
          {metrics.map((metric) => (
            <FeaturePill
              key={metric.label}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-14">
        <div className="mb-6">
          <p className="section-kicker">Platform highlights</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
            Built for fast-moving event teams
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {platformHighlights.map((item) => (
            <div className="surface-card rounded-lg p-5" key={item.title}>
              <div className="h-1.5 w-20 rounded-full bg-gradient-to-r from-cyan via-aurora to-ember" />
              <h3 className="mt-5 text-xl font-extrabold text-ink">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink/65">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <EventHighlights />

      <section className="mx-auto w-full max-w-6xl px-5 pb-14">
        <div className="surface-card rounded-lg p-6">
          <div className="mb-6">
            <p className="section-kicker">How it works</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
              From event launch to verified entry
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {workflowSteps.map((step) => (
              <div
                className="rounded-lg border border-indigo-100 bg-white/78 p-5 shadow-lift"
                key={step.label}
              >
                <span className="inline-flex rounded-lg border border-cyan/25 bg-cyan/10 px-3 py-1 text-sm font-extrabold text-cyan">
                  {step.label}
                </span>
                <h3 className="mt-4 text-lg font-extrabold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink/65">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="bookings" className="mx-auto w-full max-w-6xl px-5 pb-14">
        <div className="hero-panel grid gap-5 rounded-lg p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-wide text-cyan">
              Booking pipeline
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-ink">
              Ticket inventory, checkout, QR tickets, and admin review are wired together.
            </h2>
          </div>
          <Link
            className="action-secondary inline-flex justify-center px-5 py-3 text-sm font-extrabold"
            to="/events"
          >
            Browse events
          </Link>
        </div>
      </section>
    </AppLayout>
  );
}
