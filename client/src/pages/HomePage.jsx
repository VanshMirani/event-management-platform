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

export function HomePage() {
  useDocumentTitle("EventFlow | Event Management Platform");

  return (
    <AppLayout>
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-mint">
            Event management platform
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-normal text-ink sm:text-5xl">
            Plan, publish, and manage memorable events.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/70">
            A JavaScript workspace for event discovery, bookings, admin
            operations, secure cookies, and Razorpay payments.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="rounded-lg bg-ember px-5 py-3 text-sm font-bold text-white shadow-soft hover:bg-ink"
              to="/events"
            >
              Explore events
            </Link>
            <a
              className="rounded-lg border border-ink/15 bg-white px-5 py-3 text-sm font-bold text-ink hover:border-mint hover:text-mint"
              href="#operations"
            >
              View workspace
            </a>
          </div>
        </div>

        <div
          aria-label="Event audience"
          className="min-h-[360px] overflow-hidden rounded-lg bg-cover bg-center shadow-soft"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(23,32,42,0.12), rgba(23,32,42,0.62)), url('https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80')"
          }}
        >
          <div className="flex h-full min-h-[360px] flex-col justify-end p-6 text-white">
            <p className="text-sm font-semibold uppercase tracking-wide text-white/75">
              Next launch
            </p>
            <p className="mt-2 max-w-sm text-3xl font-bold tracking-normal">
              Conference operations dashboard
            </p>
          </div>
        </div>
      </section>

      <section
        id="operations"
        className="border-y border-ink/10 bg-white/70 py-8"
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

      <EventHighlights />

      <section id="bookings" className="mx-auto w-full max-w-6xl px-5 pb-14">
        <div className="grid gap-5 rounded-lg bg-ink p-6 text-white md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-white/60">
              Booking pipeline
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal">
              Ready for ticket inventory, checkout, and admin review.
            </h2>
          </div>
          <a
            className="inline-flex justify-center rounded-lg bg-white px-5 py-3 text-sm font-bold text-ink hover:bg-linen"
            href="http://localhost:5000/api/health"
          >
            API health
          </a>
        </div>
      </section>
    </AppLayout>
  );
}
