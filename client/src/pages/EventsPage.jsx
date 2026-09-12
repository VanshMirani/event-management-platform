import { useEffect, useMemo, useState } from "react";
import { listPublicEvents } from "../api/events.js";
import { EventCard } from "../components/EventCard.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

export function EventsPage() {
  useDocumentTitle("Events | Event Management Platform");

  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEvents() {
    setIsLoading(true);
    setError("");

    try {
      setEvents(await listPublicEvents());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(events.map((event) => event.category?.name).filter(Boolean))
      ).sort((first, second) => first.localeCompare(second)),
    [events]
  );

  const visibleEvents = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return events.filter((event) => {
      const matchesCategory =
        !categoryFilter || event.category?.name === categoryFilter;
      const searchableText = [
        event.title,
        event.city,
        event.country,
        event.eventType,
        event.category?.name
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesCategory && searchableText.includes(normalizedSearch);
    });
  }, [categoryFilter, events, searchQuery]);

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-14">
        <div className="hero-panel rounded-lg p-6 md:p-8">
          <p className="text-sm font-extrabold uppercase tracking-wide text-cyan">
            Published events
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-normal sm:text-5xl">
            Explore upcoming events
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink/70">
            Browse live experiences, choose your ticket type, and continue into secure checkout.
          </p>
        </div>

        <div className="surface-card mt-6 grid gap-3 rounded-lg p-4 md:grid-cols-[1fr_220px_auto] md:items-end">
          <div>
            <label className="text-sm font-bold text-ink" htmlFor="event-search">
              Search events
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-ink outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20"
              id="event-search"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by title, city, or type"
              type="search"
              value={searchQuery}
            />
          </div>
          <div>
            <label className="text-sm font-bold text-ink" htmlFor="event-category">
              Category
            </label>
            <select
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-ink outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20"
              id="event-category"
              onChange={(event) => setCategoryFilter(event.target.value)}
              value={categoryFilter}
            >
              <option value="">All categories</option>
              {categoryOptions.map((categoryName) => (
                <option key={categoryName} value={categoryName}>
                  {categoryName}
                </option>
              ))}
            </select>
          </div>
          <button
            className="action-secondary px-5 py-3 text-sm font-bold"
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("");
            }}
            type="button"
          >
            Reset
          </button>
        </div>

        {isLoading ? (
          <p className="state-card mt-6 p-5 text-sm font-semibold text-ink/60">
            Loading events...
          </p>
        ) : error ? (
          <div className="mt-6 rounded-lg border border-ember/20 bg-ember/10 p-5 shadow-lift">
            <p className="text-sm font-semibold text-ember">{error}</p>
            <button
              className="action-primary mt-4 px-4 py-2 text-sm font-bold"
              onClick={loadEvents}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : events.length === 0 ? (
          <p className="state-card mt-6 p-5 text-sm font-semibold text-ink/60">
            No published events are available yet.
          </p>
        ) : visibleEvents.length === 0 ? (
          <p className="state-card mt-6 p-5 text-sm font-semibold text-ink/60">
            No events match those filters.
          </p>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleEvents.map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
}
