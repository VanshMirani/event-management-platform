import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { createBooking } from "../api/bookings.js";
import { getPublicEvent, listPublicEventTicketTypes } from "../api/events.js";
import { EventLocation } from "../components/EventLocation.jsx";
import { ResilientImage } from "../components/ResilientImage.jsx";
import { useAuth } from "../features/auth/index.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import {
  createBookingReturnLocation,
  getValidBookingSelection
} from "../utils/bookingReturnSelection.js";
import { formatCurrency } from "../utils/formatCurrency.js";
import { formatDateTime } from "../utils/formatDate.js";

const fallbackImage =
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80";

function getTicketLimit(ticketType) {
  if (!ticketType || ticketType.saleStatus !== "AVAILABLE") {
    return 0;
  }

  return Math.min(ticketType.availableQuantity, ticketType.maxPerUser);
}

function validateBookingSelection(ticketType, quantity) {
  if (!ticketType) {
    return "Select a ticket type.";
  }

  if (ticketType.saleStatus === "UPCOMING") {
    return "Sales have not opened for this ticket yet.";
  }

  if (ticketType.saleStatus === "ENDED") {
    return "Sales have ended for this ticket.";
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
        const firstAvailableTicketType = ticketTypeData.find(
          (ticketType) => ticketType.saleStatus === "AVAILABLE"
        );
        const restoredSelection = getValidBookingSelection(
          location.search,
          ticketTypeData
        );
        setEvent(eventData);
        setTicketTypes(ticketTypeData);
        setSelectedTicketTypeId(
          restoredSelection?.ticketTypeId ?? firstAvailableTicketType?.id ?? ""
        );
        setQuantity(restoredSelection?.quantity ?? (firstAvailableTicketType ? "1" : "0"));
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadEvent();
  }, [location.search, slug]);

  useEffect(() => {
    if (isLoading || location.hash !== "#booking") {
      return undefined;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const bookingPanel = document.getElementById("booking");

      if (bookingPanel) {
        bookingPanel.scrollIntoView({ block: "start" });
        bookingPanel.setAttribute("tabindex", "-1");
        bookingPanel.focus({ preventScroll: true });
      }
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isLoading, location.hash]);

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
          from: createBookingReturnLocation(location, {
            ticketTypeId: selectedTicketType.id,
            quantity: numericQuantity
          })
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
        <section className="site-shell py-10">
          <p className="state-card p-5 text-sm font-semibold text-ink/60">
            Loading event...
          </p>
        </section>
      ) : error ? (
        <section className="site-shell py-10">
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
        <section className="site-shell py-10 lg:py-14">
          <ResilientImage
            alt={`${event.title} event banner`}
            className="h-52 w-full rounded-lg border border-slate-200 object-cover shadow-glow sm:h-72 lg:h-80"
            fallbackSrc={fallbackImage}
            src={event.bannerImage}
          />

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-mint">
                {event.category?.name ?? event.eventType}
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-normal text-ink">
                {event.title}
              </h1>
              {event.shortDescription ? (
                <p className="mt-4 max-w-3xl text-lg font-semibold leading-8 text-ink/80">
                  {event.shortDescription}
                </p>
              ) : null}
              <p className="mt-5 max-w-3xl whitespace-pre-line text-base leading-8 text-ink/70">
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
                      const isAvailable = ticketType.saleStatus === "AVAILABLE";
                      const availabilityText =
                        ticketType.saleStatus === "SOLD_OUT"
                          ? "Sold out"
                          : ticketType.saleStatus === "UPCOMING"
                            ? `Sales open ${formatDateTime(ticketType.saleStartAt)}`
                            : ticketType.saleStatus === "ENDED"
                              ? "Sales ended"
                              : `${ticketType.availableQuantity} available · Maximum ${ticketType.maxPerUser} per account`;

                      return (
                        <button
                          aria-pressed={isSelected}
                          className={`rounded-lg border p-5 text-left shadow-lift transition ${
                            isSelected
                              ? "border-cyan bg-cyan/10 ring-2 ring-cyan/20"
                              : !isAvailable
                                ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-65"
                                : "border-slate-200 bg-white/90 hover:-translate-y-1 hover:border-cyan"
                          }`}
                          disabled={!isAvailable}
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
                            {availabilityText}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <aside className="surface-card rounded-lg p-5" id="booking">
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
                  <p className="mt-3 text-sm font-semibold text-ink/65">
                    Tickets are not currently available for this event.
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
                      {!selectedTicketTypeId ? (
                        <option disabled value="">
                          No tickets available
                        </option>
                      ) : null}
                      {ticketTypes.map((ticketType) => (
                        <option
                          disabled={ticketType.saleStatus !== "AVAILABLE"}
                          key={ticketType.id}
                          value={ticketType.id}
                        >
                          {ticketType.name}
                          {ticketType.saleStatus === "SOLD_OUT" ? " — Sold out" : ""}
                          {ticketType.saleStatus === "UPCOMING" ? " — Sales opening soon" : ""}
                          {ticketType.saleStatus === "ENDED" ? " — Sales ended" : ""}
                        </option>
                      ))}
                    </select>

                    <label className="mt-4 block text-sm font-bold text-ink" htmlFor="quantity">
                      Quantity
                    </label>
                    <input
                      className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
                      id="quantity"
                      disabled={!selectedTicketType || ticketLimit <= 0}
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
                      <p className="mt-2 text-xs font-semibold text-ink/60">
                        The final total is confirmed before payment.
                      </p>
                    </div>
                  </>
                )}

                {bookingError ? (
                  <p className="mt-4 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember" role="alert">
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
                  {isBooking ? "Creating booking..." : "Book now"}
                </button>
                {!isAuthenticated ? (
                  <p className="mt-3 text-xs font-semibold text-ink/60">
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
