import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPublicEvent, listPublicEventTicketTypes } from "../api/events.js";
import { formatCurrency } from "../utils/formatCurrency.js";
import { formatDateTime } from "../utils/formatDate.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

const fallbackImage =
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80";

export function EventDetailPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useDocumentTitle(event ? `${event.title} | EventFlow` : "Event | EventFlow");

  useEffect(() => {
    async function loadEvent() {
      setIsLoading(true);
      setError("");

      try {
        const [eventData, ticketTypeData] = await Promise.all([
          getPublicEvent(slug),
          listPublicEventTicketTypes(slug)
        ]);
        setEvent(eventData);
        setTicketTypes(ticketTypeData);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadEvent();
  }, [slug]);

  return (
    <AppLayout>
      {isLoading ? (
        <section className="mx-auto w-full max-w-6xl px-5 py-10">
          <p className="rounded-lg border border-ink/10 bg-white p-5 text-sm font-semibold text-ink/60">
            Loading event...
          </p>
        </section>
      ) : error ? (
        <section className="mx-auto w-full max-w-6xl px-5 py-10">
          <div className="rounded-lg border border-ember/20 bg-ember/10 p-5">
            <p className="text-sm font-semibold text-ember">{error}</p>
            <Link
              className="mt-4 inline-flex rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-ember"
              to="/events"
            >
              Back to events
            </Link>
          </div>
        </section>
      ) : (
        <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-14">
          <img
            alt=""
            className="h-[320px] w-full rounded-lg object-cover shadow-soft"
            src={event.bannerImage || fallbackImage}
          />

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-mint">
                {event.category?.name ?? event.eventType}
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-normal text-ink">
                {event.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-ink/70">
                {event.description || "Event details will be updated soon."}
              </p>

              <div className="mt-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-mint">
                  Tickets
                </p>
                {ticketTypes.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-ink/10 bg-white p-5 text-sm font-semibold text-ink/60">
                    Ticket types are not available yet.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {ticketTypes.map((ticketType) => (
                      <div
                        className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm"
                        key={ticketType.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-bold text-ink">{ticketType.name}</p>
                            {ticketType.description ? (
                              <p className="mt-2 text-sm leading-6 text-ink/65">
                                {ticketType.description}
                              </p>
                            ) : null}
                          </div>
                          <p className="rounded-lg bg-mint/10 px-3 py-1 text-sm font-bold text-mint">
                            {formatCurrency(ticketType.price, ticketType.currency)}
                          </p>
                        </div>
                        <p className="mt-4 text-sm font-semibold text-ink/65">
                          {ticketType.availableQuantity} available - Max {ticketType.maxPerUser} per
                          user
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <aside className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-mint">
                Schedule
              </p>
              <p className="mt-3 text-sm font-bold text-ink">Starts</p>
              <p className="mt-1 text-sm text-ink/70">{formatDateTime(event.startAt)}</p>
              <p className="mt-4 text-sm font-bold text-ink">Ends</p>
              <p className="mt-1 text-sm text-ink/70">{formatDateTime(event.endAt)}</p>
              <p className="mt-4 text-sm font-bold text-ink">Location</p>
              <p className="mt-1 text-sm text-ink/70">
                {[event.venueName, event.city, event.country].filter(Boolean).join(", ") ||
                  event.onlineUrl ||
                  "To be announced"}
              </p>
              <button
                className="mt-6 w-full rounded-lg bg-ember px-5 py-3 text-sm font-bold text-white hover:bg-ink"
                type="button"
              >
                Book Now
              </button>
              <p className="mt-3 text-xs font-semibold text-ink/50">
                Booking will be connected in the next checkout step.
              </p>
            </aside>
          </div>
        </section>
      )}
    </AppLayout>
  );
}
