import { useEffect, useState } from "react";
import { listPublicEvents } from "../api/events.js";
import { FeaturePill } from "../components/FeaturePill.jsx";
import { EventHighlights } from "../features/events/EventHighlights.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { Link } from "react-router-dom";

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
    body: "Confirmed bookings generate QR tickets that admins can verify and mark used at the venue."
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
    body: "Users choose tickets, create a pending booking, and continue through secure checkout."
  },
  {
    label: "03",
    title: "Check in",
    body: "Confirmed bookings unlock QR tickets for fast event entry."
  }
];

export function HomePage() {
  useDocumentTitle("EventFlow | Event Management Platform");

  const [eventStats, setEventStats] = useState(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadEventStats() {
      try {
        const events = await listPublicEvents();

        if (isCurrent) {
          setEventStats({
            published: events.length,
            cities: new Set(events.map((event) => event.city).filter(Boolean)).size,
            featured: events.filter((event) => event.isFeatured).length
          });
        }
      } catch {
        if (isCurrent) {
          setEventStats({ published: "—", cities: "—", featured: "—" });
        }
      }
    }

    loadEventStats();

    return () => {
      isCurrent = false;
    };
  }, []);

  const metrics = [
    { label: "Published events", value: eventStats?.published ?? "—" },
    { label: "Cities represented", value: eventStats?.cities ?? "—" },
    { label: "Featured picks", value: eventStats?.featured ?? "—" }
  ];

  return (
    <AppLayout>
      <section className="site-shell grid gap-8 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-12 lg:py-16 xl:gap-16 xl:py-20">
        <div>
          <p className="section-kicker">
            Event management platform
          </p>
          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Plan, publish, and manage <span className="gradient-text">memorable events</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/70">
            A JavaScript workspace for event discovery, bookings, admin
            operations, secure cookies, and verified booking confirmations.
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
          className="surface-card h-[300px] overflow-hidden rounded-lg bg-cover bg-center shadow-glow sm:h-[360px] lg:h-[420px]"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(248,250,252,0.92)), url('https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80')"
          }}
        >
          <div className="flex h-full flex-col justify-end p-5 sm:p-6">
            <div className="rounded-lg border border-white/70 bg-white/[0.86] p-5 shadow-lift backdrop-blur">
              <p className="text-sm font-extrabold uppercase tracking-wide text-cyan">
                Live workspace
              </p>
              <p className="mt-2 max-w-sm text-2xl font-bold tracking-normal text-ink sm:text-3xl">
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
        <div className="site-shell grid gap-4 sm:grid-cols-3">
          {metrics.map((metric) => (
            <FeaturePill
              key={metric.label}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </div>
      </section>

      <section className="site-shell py-14 lg:py-20">
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

      <section className="site-shell pb-14 lg:pb-20">
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
                className="rounded-lg border border-indigo-100 bg-white/[0.78] p-5 shadow-lift"
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

      <section id="bookings" className="site-shell pb-14 lg:pb-20">
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
