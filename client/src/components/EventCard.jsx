import { Link } from "react-router-dom";
import { formatDateTime } from "../utils/formatDate.js";
import { ResilientImage } from "./ResilientImage.jsx";

const fallbackImage =
  "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=80";

export function EventCard({ event }) {
  return (
    <Link
      className="group surface-card flex h-full flex-col overflow-hidden rounded-lg transition duration-200 hover:-translate-y-1 hover:border-cyan/40 hover:shadow-glow"
      to={`/events/${event.slug}`}
    >
      <div className="relative h-48 overflow-hidden">
        <ResilientImage
          alt={`${event.title} event`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          fallbackSrc={fallbackImage}
          loading="lazy"
          src={event.bannerImage}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/35 to-transparent" />
        <span className="absolute left-4 top-4 rounded-lg border border-cyan/20 bg-white/90 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-cyan shadow-lift backdrop-blur">
          {event.category?.name ?? "Event"}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-col items-start gap-1 text-sm font-semibold text-ink/65 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span>{event.eventType === "ONLINE" ? "Online" : event.city || "Location TBA"}</span>
          <span>{formatDateTime(event.startAt)}</span>
        </div>
        <h3 className="mt-3 text-xl font-extrabold tracking-normal text-ink transition group-hover:text-cyan">
          {event.title}
        </h3>
        {event.shortDescription ? (
          <p className="mt-3 text-sm leading-6 text-ink/65">
            {event.shortDescription}
          </p>
        ) : null}
        <p className="mt-auto inline-flex pt-4 text-sm font-extrabold text-ember">
          View details
        </p>
      </div>
    </Link>
  );
}
