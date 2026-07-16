import { useEffect, useState } from "react";
import { listPublicEvents } from "../api/events.js";
import { EventCard } from "../components/EventCard.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

export function EventsPage() {
  useDocumentTitle("Events | EventFlow");

  const [events, setEvents] = useState([]);
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

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-14">
        <p className="text-sm font-semibold uppercase tracking-wide text-mint">
          Published events
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-normal text-ink">
          Explore upcoming events
        </h1>

        {isLoading ? (
          <p className="mt-6 rounded-lg border border-ink/10 bg-white p-5 text-sm font-semibold text-ink/60">
            Loading events...
          </p>
        ) : error ? (
          <div className="mt-6 rounded-lg border border-ember/20 bg-ember/10 p-5">
            <p className="text-sm font-semibold text-ember">{error}</p>
            <button
              className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-ember"
              onClick={loadEvents}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : events.length === 0 ? (
          <p className="mt-6 rounded-lg border border-ink/10 bg-white p-5 text-sm font-semibold text-ink/60">
            No published events are available yet.
          </p>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
}
