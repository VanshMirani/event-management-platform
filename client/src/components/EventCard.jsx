import { Link } from "react-router-dom";
import { formatDateTime } from "../utils/formatDate.js";

const fallbackImage =
  "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=80";

export function EventCard({ event }) {
  return (
    <Link
      className="group surface-card overflow-hidden rounded-lg transition duration-200 hover:-translate-y-1 hover:border-cyan/40 hover:shadow-glow"
      to={`/events/${event.slug}`}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
          src={event.bannerImage || fallbackImage}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/35 to-transparent" />
        <span className="absolute left-4 top-4 rounded-lg border border-cyan/20 bg-white/90 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-cyan shadow-lift backdrop-blur">
          {event.category?.name ?? "Event"}
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3 text-sm font-semibold text-ink/55">
          <span>{event.city || event.eventType}</span>
          <span>{formatDateTime(event.startAt)}</span>
        </div>
        <h3 className="mt-3 text-xl font-extrabold tracking-normal text-ink transition group-hover:text-cyan">
          {event.title}
        </h3>
        <p className="mt-4 inline-flex text-sm font-extrabold text-ember">
          View details
        </p>
      </div>
    </Link>
  );
}
