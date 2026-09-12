import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { createBooking } from "../api/bookings.js";
import { getPublicEvent, listPublicEventTicketTypes } from "../api/events.js";
import { EventLocation } from "../components/EventLocation.jsx";
import { useAuth } from "../features/auth/index.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatCurrency } from "../utils/formatCurrency.js";
import { formatDateTime } from "../utils/formatDate.js";

const fallbackImage =
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80";

function getTicketLimit(ticketType) {
  if (!ticketType) {
    return 0;
  }

  return Math.min(ticketType.availableQuantity, ticketType.maxPerUser);
}

function validateBookingSelection(ticketType, quantity) {
  if (!ticketType) {
    return "Select a ticket type.";
  }

  if (ticketType.availableQuantity <= 0) {
    return "This ticket type is sold out.";
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return "Choose a valid quantity.";
  }

  if (quantity > ticketType.maxPerUser) {
    return `You can book up to ${ticketType.maxPerUser} tickets per user.`;
  }

  if (quantity > ticketType.availableQuantity) {
    return "That quantity is not available.";
  }

  return "";
}

export function EventDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isCheckingAuth } = useAuth();
  const [event, setEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState("");
  const [bookingError, setBookingError] = useState("");

  const selectedTicketType = useMemo(
    () => ticketTypes.find((ticketType) => ticketType.id === selectedTicketTypeId) ?? null,
    [selectedTicketTypeId, ticketTypes]
  );
  const numericQuantity = Number(quantity);
  const ticketLimit = getTicketLimit(selectedTicketType);
  const estimatedTotal = selectedTicketType
    ? selectedTicketType.price * (Number.isFinite(numericQuantity) ? numericQuantity : 0)
    : 0;

  useDocumentTitle(event ? `${event.title} | EventFlow` : "Event | EventFlow");

  useEffect(() => {
    async function loadEvent() {
      setIsLoading(true);
      setError("");
      setBookingError("");

      try {
        const [eventData, ticketTypeData] = await Promise.all([
          getPublicEvent(slug),
          listPublicEventTicketTypes(slug)
        ]);
        setEvent(eventData);
        setTicketTypes(ticketTypeData);
        setSelectedTicketTypeId(ticketTypeData[0]?.id ?? "");
        setQuantity(ticketTypeData[0]?.availableQuantity > 0 ? "1" : "0");
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadEvent();
  }, [slug]);

  function selectTicketType(ticketTypeId) {
    const nextTicketType = ticketTypes.find((ticketType) => ticketType.id === ticketTypeId);
    const nextLimit = getTicketLimit(nextTicketType);

    setSelectedTicketTypeId(ticketTypeId);
    setQuantity(nextLimit > 0 ? "1" : "0");
    setBookingError("");
  }

  function updateQuantity(inputEvent) {
    setQuantity(inputEvent.target.value);
    setBookingError("");
  }

  async function handleBooking() {
    const validationError = validateBookingSelection(selectedTicketType, numericQuantity);

    if (validationError) {
      setBookingError(validationError);
      return;
    }

    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: location
        }
      });
      return;
    }

    setIsBooking(true);
    setBookingError("");

    try {
      const booking = await createBooking({
        eventId: event.id,
        ticketTypeId: selectedTicketType.id,
        quantity: numericQuantity
      });
      navigate(`/checkout/${booking.id}`);
    } catch (submitError) {
      setBookingError(submitError.message);
    } finally {
      setIsBooking(false);
    }
  }

  return (
    <AppLayout>
      {isLoading ? (
        <section className="mx-auto w-full max-w-6xl px-5 py-10">
          <p className="state-card p-5 text-sm font-semibold text-ink/60">
            Loading event...
          </p>
        </section>
      ) : error ? (
        <section className="mx-auto w-full max-w-6xl px-5 py-10">
          <div className="rounded-lg border border-ember/20 bg-ember/10 p-5 shadow-lift">
            <p className="text-sm font-semibold text-ember">{error}</p>
            <Link
              className="action-secondary mt-4 inline-flex px-4 py-2 text-sm font-bold"
              to="/events"
            >
              Back to events
            </Link>
          </div>
        </section>
      ) : (
        <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-14">
          <img
            alt={`${event.title} event banner`}
            className="h-[320px] w-full rounded-lg border border-slate-200 object-cover shadow-glow"
            src={event.bannerImage || fallbackImage}
          />

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
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
                <p className="section-kicker">
                  Tickets
                </p>
                {ticketTypes.length === 0 ? (
                  <p className="state-card mt-3 p-5 text-sm font-semibold text-ink/60">
                    Ticket types are not available yet.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {ticketTypes.map((ticketType) => {
                      const isSelected = ticketType.id === selectedTicketTypeId;

                      return (
                        <button
                          className={`rounded-lg border p-5 text-left shadow-lift transition hover:-translate-y-1 ${
                            isSelected
                              ? "border-cyan bg-cyan/10 ring-2 ring-cyan/20"
                              : "border-slate-200 bg-white/90 hover:border-cyan"
                          }`}
                          key={ticketType.id}
                          onClick={() => selectTicketType(ticketType.id)}
                          type="button"
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
                            <p className="rounded-lg border border-mint/20 bg-mint/10 px-3 py-1 text-sm font-extrabold text-mint">
                              {formatCurrency(ticketType.price, ticketType.currency)}
                            </p>
                          </div>
                          <p className="mt-4 text-sm font-semibold text-ink/65">
                            {ticketType.availableQuantity} available - Max{" "}
                            {ticketType.maxPerUser} per user
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <aside className="surface-card rounded-lg p-5">
              <p className="section-kicker">
                Schedule
              </p>
              <p className="mt-3 text-sm font-bold text-ink">Starts</p>
              <p className="mt-1 text-sm text-ink/70">{formatDateTime(event.startAt)}</p>
              <p className="mt-4 text-sm font-bold text-ink">Ends</p>
              <p className="mt-1 text-sm text-ink/70">{formatDateTime(event.endAt)}</p>
              <p className="mt-4 text-sm font-bold text-ink">Location</p>
              <div className="mt-1 text-sm">
                <EventLocation event={event} />
              </div>

              <div className="mt-6 border-t border-ink/10 pt-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-mint">
                  Booking
                </p>
                {ticketTypes.length === 0 ? (
                  <p className="mt-3 text-sm font-semibold text-ink/55">
                    Booking opens after tickets are added.
                  </p>
                ) : (
                  <>
                    <label className="mt-4 block text-sm font-bold text-ink" htmlFor="ticketType">
                      Ticket type
                    </label>
                    <select
                      className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
                      id="ticketType"
                      onChange={(selectEvent) => selectTicketType(selectEvent.target.value)}
                      value={selectedTicketTypeId}
                    >
                      {ticketTypes.map((ticketType) => (
                        <option key={ticketType.id} value={ticketType.id}>
                          {ticketType.name}
                        </option>
                      ))}
                    </select>

                    <label className="mt-4 block text-sm font-bold text-ink" htmlFor="quantity">
                      Quantity
                    </label>
                    <input
                      className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
                      id="quantity"
                      max={ticketLimit || 1}
                      min="1"
                      onChange={updateQuantity}
                      type="number"
                      value={quantity}
                    />

                    <div className="mt-5 rounded-lg border border-cyan/10 bg-cyan/5 p-4">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="font-semibold text-ink/65">Estimated total</span>
                        <span className="text-lg font-extrabold text-ink">
                          {formatCurrency(
                            estimatedTotal,
                            selectedTicketType?.currency ?? "INR"
                          )}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-ink/45">
                        Final amount is calculated by the backend.
                      </p>
                    </div>
                  </>
                )}

                {bookingError ? (
                  <p className="mt-4 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember">
                    {bookingError}
                  </p>
                ) : null}

                <button
                  className="action-primary mt-5 w-full px-5 py-3 text-sm font-extrabold disabled:cursor-not-allowed"
                  disabled={
                    isBooking ||
                    isCheckingAuth ||
                    ticketTypes.length === 0 ||
                    !selectedTicketType ||
                    ticketLimit <= 0
                  }
                  onClick={handleBooking}
                  type="button"
                >
                  {isBooking ? "Creating booking..." : "Book Now"}
                </button>
                {!isAuthenticated ? (
                  <p className="mt-3 text-xs font-semibold text-ink/50">
                    You will be asked to sign in before checkout.
                  </p>
                ) : null}
              </div>
            </aside>
          </div>
        </section>
      )}
    </AppLayout>
  );
}
