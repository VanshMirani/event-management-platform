import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listPublicEvents } from "../api/events.js";
import { EventCard } from "../components/EventCard.jsx";
import { FeaturePill } from "../components/FeaturePill.jsx";
import { ResilientImage } from "../components/ResilientImage.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatDateTime } from "../utils/formatDate.js";

const heroFallbackImage =
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80";

const platformHighlights = [
  {
    title: "Thoughtful event discovery",
    body: "Browse curated experiences by category and location, with the important details easy to find."
  },
  {
    title: "Straightforward booking",
    body: "Choose a ticket, review the total, and complete a Razorpay Test Mode payment when required."
  },
  {
    title: "Quick, reliable entry",
    body: "Every confirmed booking includes a unique QR ticket that can be verified once at the venue."
  }
];

const workflowSteps = [
  {
    label: "01",
    title: "Discover",
    body: "Explore upcoming events and open any listing for schedules, location details, and ticket options."
  },
  {
    label: "02",
    title: "Reserve",
    body: "Choose your ticket type and quantity, then review the complete booking before checkout."
  },
  {
    label: "03",
    title: "Attend",
    body: "Keep the QR ticket on your phone or download the PDF, then show it at the entrance."
  }
];

export function HomePage() {
  useDocumentTitle("EventFlow | Event Management Platform");

  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventError, setEventError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function loadEvents() {
      try {
        const nextEvents = await listPublicEvents();

        if (isCurrent) {
          setEvents(nextEvents);
        }
      } catch (loadError) {
        if (isCurrent) {
          setEventError(loadError.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoadingEvents(false);
        }
      }
    }

    loadEvents();

    return () => {
      isCurrent = false;
    };
  }, []);

  const metricsUnavailable = isLoadingEvents || Boolean(eventError);
  const featuredEvents = events.filter((event) => event.isFeatured);
  const displayedFeaturedEvents = featuredEvents.slice(0, 6);
  const heroEvent = featuredEvents[0] ?? null;
  const metrics = [
    { label: "Upcoming events", value: metricsUnavailable ? "—" : events.length },
    {
      label: "Cities represented",
      value: metricsUnavailable
        ? "—"
        : new Set(events.map((event) => event.city).filter(Boolean)).size
    },
    { label: "Featured picks", value: metricsUnavailable ? "—" : featuredEvents.length }
  ];
  const featuredGridClassName =
    displayedFeaturedEvents.length === 1
      ? "mx-auto grid max-w-2xl gap-5"
      : displayedFeaturedEvents.length === 2
        ? "mx-auto grid max-w-5xl gap-5 md:grid-cols-2"
        : "grid gap-5 md:grid-cols-2 xl:grid-cols-3";

  return (
    <AppLayout>
      <section className="site-shell grid gap-8 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-12 lg:py-16 xl:gap-16 xl:py-20">
        <div>
          <p className="section-kicker">
            Discover what is happening next
          </p>
          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Find experiences worth <span className="gradient-text">showing up for</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/70">
            From workshops and conferences to live music and community gatherings,
            EventFlow keeps discovery, booking, and entry in one simple journey.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="action-primary px-5 py-3 text-sm font-extrabold"
              to="/events"
            >
              Browse events
            </Link>
            <a
              className="action-secondary px-5 py-3 text-sm font-extrabold"
              href="#operations"
            >
              How it works
            </a>
          </div>
        </div>

        <div className="surface-card relative h-[300px] overflow-hidden rounded-lg shadow-glow sm:h-[360px] lg:h-[420px]">
          <ResilientImage
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            fallbackSrc={heroFallbackImage}
            src={heroEvent?.bannerImage}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-slate-100/90" />
          <div className="relative flex h-full flex-col justify-end p-5 sm:p-6">
            {heroEvent ? (
              <Link
                className="group rounded-lg border border-white/70 bg-white/[0.88] p-5 shadow-lift backdrop-blur transition hover:bg-white"
                to={`/events/${heroEvent.slug}`}
              >
                <p className="text-sm font-extrabold uppercase tracking-wide text-cyan">
                  Featured event
                </p>
                <p className="mt-2 max-w-sm text-2xl font-bold tracking-normal text-ink transition group-hover:text-cyan sm:text-3xl">
                  {heroEvent.title}
                </p>
                <p className="mt-2 text-sm font-semibold text-ink/65">
                  {formatDateTime(heroEvent.startAt)} · View details →
                </p>
              </Link>
            ) : (
              <div className="rounded-lg border border-white/70 bg-white/[0.88] p-5 shadow-lift backdrop-blur">
                <p className="text-sm font-extrabold uppercase tracking-wide text-cyan">
                  Find your next event
                </p>
                <p className="mt-2 max-w-sm text-2xl font-bold tracking-normal text-ink sm:text-3xl">
                  Browse the latest experiences from EventFlow.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section
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

      <section className="site-shell scroll-mt-24 py-14 lg:py-20" id="operations">
        <div className="mb-6">
          <p className="section-kicker">EventFlow essentials</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
            Everything connected from booking to entry
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

      <section className="site-shell py-14 lg:py-20" id="events">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="section-kicker">Featured events</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
              Selected upcoming events
            </h2>
          </div>
          <Link className="action-secondary px-4 py-2 text-sm font-extrabold" to="/events">
            View all events
          </Link>
        </div>

        {isLoadingEvents ? (
          <p className="state-card p-5 text-sm font-semibold text-ink/60">
            Loading featured events...
          </p>
        ) : eventError ? (
          <p className="rounded-lg border border-ember/20 bg-ember/10 p-5 text-sm font-semibold text-ember shadow-lift">
            Featured events are temporarily unavailable. Browse the full event list to try again.
          </p>
        ) : featuredEvents.length === 0 ? (
          <p className="state-card p-5 text-sm font-semibold text-ink/60">
            New featured events will appear here soon.
          </p>
        ) : (
          <div className={featuredGridClassName}>
            {displayedFeaturedEvents.map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>
        )}
      </section>

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
              Ready when you are
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-ink">
              Choose an event, reserve your place, and keep every ticket in one account.
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
