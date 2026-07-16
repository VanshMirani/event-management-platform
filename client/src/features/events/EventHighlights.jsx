import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listFeaturedEvents } from "../../api/events.js";
import { EventCard } from "../../components/EventCard.jsx";

export function EventHighlights() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadFeaturedEvents() {
      setIsLoading(true);
      setError("");

      try {
        setEvents(await listFeaturedEvents());
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadFeaturedEvents();
  }, []);

  return (
    <section id="events" className="mx-auto w-full max-w-6xl px-5 py-12">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-mint">
            Featured events
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-normal text-ink">
            Upcoming experiences
          </h2>
        </div>
        <Link className="text-sm font-semibold text-ember hover:text-ink" to="/events">
          View all
        </Link>
      </div>

      {isLoading ? (
        <p className="rounded-lg border border-ink/10 bg-white p-5 text-sm font-semibold text-ink/60">
          Loading featured events...
        </p>
      ) : error ? (
        <p className="rounded-lg border border-ember/20 bg-ember/10 p-5 text-sm font-semibold text-ember">
          {error}
        </p>
      ) : events.length === 0 ? (
        <p className="rounded-lg border border-ink/10 bg-white p-5 text-sm font-semibold text-ink/60">
          No featured events are published yet.
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {events.map((event) => (
            <EventCard event={event} key={event.id} />
          ))}
        </div>
      )}
    </section>
  );
}
