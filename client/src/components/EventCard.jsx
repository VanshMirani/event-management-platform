import { Link } from "react-router-dom";
import { formatDateTime } from "../utils/formatDate.js";

const fallbackImage =
  "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=80";

export function EventCard({ event }) {
  return (
    <Link
      className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm transition hover:border-mint hover:shadow-soft"
      to={`/events/${event.slug}`}
    >
      <img
        alt=""
        className="h-44 w-full object-cover"
        loading="lazy"
        src={event.bannerImage || fallbackImage}
      />
      <div className="p-5">
        <div className="flex items-center justify-between gap-3 text-sm text-ink/60">
          <span>{event.city || event.eventType}</span>
          <span>{formatDateTime(event.startAt)}</span>
        </div>
        <h3 className="mt-3 text-xl font-bold tracking-normal text-ink">
          {event.title}
        </h3>
        <p className="mt-3 text-sm font-semibold text-mint">
          {event.category?.name ?? "Event"}
        </p>
      </div>
    </Link>
  );
}
