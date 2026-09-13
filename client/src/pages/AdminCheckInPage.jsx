import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  listAdminEventCheckInTickets,
  listAdminEvents,
  markAdminTicketUsed,
  verifyAdminTicket
} from "../api/admin.js";
import { AdminNav } from "../components/AdminNav.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatDateTime } from "../utils/formatDate.js";
import { formatStatusLabel } from "../utils/formatStatusLabel.js";
import { getTicketStatusDetails } from "../utils/ticketStatus.js";

const messageStyles = {
  success: "border-mint/20 bg-mint/10 text-mint",
  warning: "border-gold/30 bg-gold/15 text-ink",
  danger: "border-ember/20 bg-ember/10 text-ember"
};

function createLookupPayload(value) {
  const normalizedValue = value.trim();

  try {
    const scannedUrl = new URL(normalizedValue);
    const qrToken = scannedUrl.searchParams.get("token");

    if (qrToken) {
      return { qrToken };
    }
  } catch {
    // Manual ticket codes and raw scanner tokens are not URLs.
  }

  return /^TCK-/i.test(normalizedValue)
    ? { ticketCode: `TCK-${normalizedValue.slice(4)}` }
    : { qrToken: normalizedValue };
}

function getEventOptionLabel(event) {
  const location = event.city ? ` - ${event.city}` : "";
  return `${event.title} - ${formatDateTime(event.startAt)}${location}`;
}

function getTicketOptionLabel(ticket) {
  const attendee = ticket.user?.name || "Unnamed attendee";
  const email = ticket.user?.email || "No email";
  const ticketType = ticket.ticketType?.name || "Ticket";
  return `${attendee} - ${email} - ${ticketType} - ${ticket.ticketCode} - ${formatStatusLabel(ticket.status)}`;
}

export function AdminCheckInPage() {
  useDocumentTitle("Admin Check-In | EventFlow");

  const [searchParams, setSearchParams] = useSearchParams();
  const lookupInputRef = useRef(null);
  const manualDetailsRef = useRef(null);
  const ticketSelectRef = useRef(null);
  const handledQrTokenRef = useRef("");
  const ticketRequestIdRef = useRef(0);
  const verifyRequestIdRef = useRef(0);
  const [lookup, setLookup] = useState("");
  const [ticket, setTicket] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventTickets, setEventTickets] = useState([]);
  const [selectedTicketCode, setSelectedTicketCode] = useState("");
  const [ticketSummary, setTicketSummary] = useState(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");
  const [error, setError] = useState("");
  const [eventError, setEventError] = useState("");
  const [ticketListError, setTicketListError] = useState("");
  const statusDetails = getTicketStatusDetails(ticket?.status);
  const publishedEvents = useMemo(
    () =>
      events
        .filter((event) => event.status === "PUBLISHED")
        .sort((first, second) => {
          const dateDifference =
            new Date(first.startAt).getTime() - new Date(second.startAt).getTime();
          return dateDifference || first.title.localeCompare(second.title);
        }),
    [events]
  );
  const selectedTicket = eventTickets.find(
    (currentTicket) => currentTicket.ticketCode === selectedTicketCode
  );

  const loadEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setEventError("");

    try {
      setEvents(await listAdminEvents());
    } catch (loadError) {
      setEventError(loadError.message);
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  const loadEventTickets = useCallback(async (eventId, preserveTicketCode = "") => {
    const requestId = ticketRequestIdRef.current + 1;
    ticketRequestIdRef.current = requestId;
    setIsLoadingTickets(true);
    setTicketListError("");

    try {
      const data = await listAdminEventCheckInTickets(eventId);

      if (ticketRequestIdRef.current !== requestId) {
        return;
      }

      setEventTickets(data.tickets);
      setTicketSummary(data.summary);
      setSelectedTicketCode(
        preserveTicketCode &&
          data.tickets.some((currentTicket) => currentTicket.ticketCode === preserveTicketCode)
          ? preserveTicketCode
          : ""
      );
    } catch (loadError) {
      if (ticketRequestIdRef.current !== requestId) {
        return;
      }

      setEventTickets([]);
      setTicketSummary(null);
      setSelectedTicketCode("");
      setTicketListError(loadError.message);
    } finally {
      if (ticketRequestIdRef.current === requestId) {
        setIsLoadingTickets(false);
      }
    }
  }, []);

  const verifyLookup = useCallback(async (value) => {
    const requestId = verifyRequestIdRef.current + 1;
    verifyRequestIdRef.current = requestId;
    setIsVerifying(true);
    setTicket(null);
    setError("");
    setMessage("");

    try {
      const verifiedTicket = await verifyAdminTicket(createLookupPayload(value));

      if (verifyRequestIdRef.current !== requestId) {
        return;
      }

      const verifiedStatusDetails = getTicketStatusDetails(verifiedTicket.status);
      setTicket(verifiedTicket);
      setMessage(verifiedStatusDetails.adminMessage);
      setMessageTone(verifiedStatusDetails.adminTone);
    } catch (verifyError) {
      if (verifyRequestIdRef.current !== requestId) {
        return;
      }

      setTicket(null);
      setError(verifyError.message);
    } finally {
      if (verifyRequestIdRef.current === requestId) {
        setIsVerifying(false);
      }
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const qrToken = searchParams.get("token")?.trim();

    if (!qrToken || handledQrTokenRef.current === qrToken) {
      return;
    }

    handledQrTokenRef.current = qrToken;
    setLookup(qrToken);
    setSelectedTicketCode("");
    setSearchParams({}, { replace: true });
    verifyLookup(qrToken);
  }, [searchParams, setSearchParams, verifyLookup]);

  async function handleVerify(event) {
    event.preventDefault();

    if (!lookup.trim()) {
      setError("Enter a ticket code or QR token.");
      return;
    }

    setSelectedTicketCode("");
    await verifyLookup(lookup);
  }

  async function handleEventChange(event) {
    const eventId = event.target.value;
    setSelectedEventId(eventId);
    setSelectedTicketCode("");
    setEventTickets([]);
    setTicketSummary(null);
    setTicket(null);
    setMessage("");
    setError("");
    setTicketListError("");
    verifyRequestIdRef.current += 1;
    setIsVerifying(false);

    if (eventId) {
      await loadEventTickets(eventId);
    } else {
      ticketRequestIdRef.current += 1;
      setIsLoadingTickets(false);
    }
  }

  async function handleTicketChange(event) {
    const ticketCode = event.target.value;
    verifyRequestIdRef.current += 1;
    setIsVerifying(false);
    setSelectedTicketCode(ticketCode);
    setTicket(null);
    setMessage("");
    setError("");

    if (ticketCode) {
      await verifyLookup(ticketCode);
    }
  }

  async function handleMarkUsed() {
    const ticketCode = ticket.ticketCode;
    setIsMarking(true);
    setError("");
    setMessage("");

    try {
      const usedTicket = await markAdminTicketUsed({ ticketCode });
      setTicket(usedTicket);
      setMessage("Ticket checked in successfully.");
      setMessageTone("success");

      if (selectedEventId && usedTicket.eventId === selectedEventId) {
        setEventTickets((currentTickets) =>
          currentTickets.map((currentTicket) =>
            currentTicket.ticketCode === usedTicket.ticketCode
              ? {
                  ...currentTicket,
                  checkedInAt: usedTicket.checkedInAt,
                  status: usedTicket.status
                }
              : currentTicket
          )
        );
        setTicketSummary((currentSummary) =>
          currentSummary
            ? {
                ...currentSummary,
                checkedIn: currentSummary.checkedIn + 1,
                ready: Math.max(currentSummary.ready - 1, 0)
              }
            : currentSummary
        );
        await loadEventTickets(selectedEventId, usedTicket.ticketCode);
      }
    } catch (markError) {
      if (markError.status === 409) {
        try {
          const latestTicket = await verifyAdminTicket({ ticketCode });
          const latestStatusDetails = getTicketStatusDetails(latestTicket.status);

          setTicket(latestTicket);
          setMessage(latestStatusDetails.adminMessage);
          setMessageTone(latestStatusDetails.adminTone);

          if (selectedEventId && latestTicket.eventId === selectedEventId) {
            await loadEventTickets(selectedEventId, ticketCode);
          }

          return;
        } catch (refreshError) {
          setError(refreshError.message);
          return;
        }
      }

      setError(markError.message);
    } finally {
      setIsMarking(false);
    }
  }

  function prepareNextAttendee() {
    setLookup("");
    setTicket(null);
    setSelectedTicketCode("");
    setMessage("");
    setMessageTone("success");
    setError("");
    verifyRequestIdRef.current += 1;
    setIsVerifying(false);

    window.requestAnimationFrame(() => {
      if (selectedEventId) {
        ticketSelectRef.current?.focus();
      } else {
        if (manualDetailsRef.current) {
          manualDetailsRef.current.open = true;
        }
        lookupInputRef.current?.focus();
      }
    });
  }

  return (
    <AppLayout>
      <section className="site-shell py-10 lg:py-14">
        <AdminNav />

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="surface-card rounded-lg p-5 sm:p-6">
            <p className="section-kicker">
              Check-in
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
              Find an attendee
            </h1>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              Select the event and booked ticket, confirm the attendee details,
              then check them in.
            </p>

            <label className="mt-5 block text-sm font-bold text-ink" htmlFor="check-in-event">
              Event
            </label>
            <select
              aria-describedby="check-in-event-help"
              className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
              disabled={
                isLoadingEvents ||
                isMarking ||
                Boolean(eventError) ||
                publishedEvents.length === 0
              }
              id="check-in-event"
              onChange={handleEventChange}
              value={selectedEventId}
            >
              <option value="">
                {isLoadingEvents
                  ? "Loading published events..."
                  : publishedEvents.length === 0
                    ? "No published events available"
                    : "Select an event"}
              </option>
              {publishedEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {getEventOptionLabel(event)}
                </option>
              ))}
            </select>
            <p
              aria-live="polite"
              className="mt-2 text-xs leading-5 text-ink/60"
              id="check-in-event-help"
            >
              {isLoadingEvents
                ? "Loading the published event list."
                : "Only published events can accept ticket check-ins."}
            </p>

            {eventError ? (
              <div className="mt-4 rounded-lg border border-ember/20 bg-ember/10 p-4" role="alert">
                <p className="text-sm font-semibold text-ember">{eventError}</p>
                <button
                  className="action-secondary mt-3 px-4 py-2 text-sm font-bold"
                  onClick={loadEvents}
                  type="button"
                >
                  Retry events
                </button>
              </div>
            ) : null}

            {selectedEventId ? (
              <div className="mt-5 border-t border-ink/10 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-bold text-ink" htmlFor="check-in-ticket">
                    Booked ticket
                  </label>
                  {ticketSummary && !isLoadingTickets ? (
                    <span className="text-xs font-bold text-ink/60">
                      {ticketSummary.ready} ready · {ticketSummary.checkedIn} checked in
                    </span>
                  ) : null}
                </div>
                <select
                  aria-describedby="check-in-ticket-help"
                  className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
                  disabled={
                    isLoadingTickets ||
                    isMarking ||
                    Boolean(ticketListError) ||
                    eventTickets.length === 0
                  }
                  id="check-in-ticket"
                  onChange={handleTicketChange}
                  ref={ticketSelectRef}
                  value={selectedTicketCode}
                >
                  <option value="">
                    {isLoadingTickets
                      ? "Loading booked tickets..."
                      : eventTickets.length === 0
                        ? "No booked tickets for this event"
                        : "Select an attendee ticket"}
                  </option>
                  {eventTickets.map((currentTicket) => (
                    <option key={currentTicket.id} value={currentTicket.ticketCode}>
                      {getTicketOptionLabel(currentTicket)}
                    </option>
                  ))}
                </select>
                <p
                  aria-live="polite"
                  className="mt-2 text-xs leading-5 text-ink/60"
                  id="check-in-ticket-help"
                >
                  {isLoadingTickets
                    ? "Loading the attendee list."
                    : eventTickets.length === 0
                      ? "No valid or already checked-in tickets were found for this event."
                      : "The ticket is verified when selected; review the details before check-in."}
                </p>

                {ticketListError ? (
                  <div className="mt-4 rounded-lg border border-ember/20 bg-ember/10 p-4" role="alert">
                    <p className="text-sm font-semibold text-ember">{ticketListError}</p>
                    <button
                      className="action-secondary mt-3 px-4 py-2 text-sm font-bold"
                      onClick={() => loadEventTickets(selectedEventId)}
                      type="button"
                    >
                      Retry tickets
                    </button>
                  </div>
                ) : null}

                {selectedTicket ? (
                  <div className="mt-4 rounded-lg border border-cyan/15 bg-cyan/5 p-4">
                    <p className="font-extrabold text-ink">{selectedTicket.user?.name}</p>
                    <p className="mt-1 break-words text-sm text-ink/65">
                      {selectedTicket.user?.email}
                      {selectedTicket.user?.phone ? ` · ${selectedTicket.user.phone}` : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-ink/60">
                      <span>{selectedTicket.ticketType?.name ?? "Ticket"}</span>
                      <span aria-hidden="true">·</span>
                      <span className="break-all">{selectedTicket.ticketCode}</span>
                      <StatusBadge status={selectedTicket.status} />
                    </div>
                  </div>
                ) : null}

              </div>
            ) : null}

            <details
              className="mt-6 rounded-lg border border-ink/10 bg-white/60 p-4"
              ref={manualDetailsRef}
            >
              <summary className="cursor-pointer text-sm font-extrabold text-ink marker:text-mint">
                Scan a QR code or enter a ticket code
              </summary>
              <p className="mt-3 text-sm leading-6 text-ink/65">
                A phone camera opens the QR check-in link automatically. You can
                also paste a scanned value or type the code printed on the ticket.
              </p>
              <form className="mt-4" onSubmit={handleVerify}>
                <label className="block text-sm font-bold text-ink" htmlFor="lookup">
                  Ticket code or scanned value
                </label>
                <input
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
                  disabled={isMarking}
                  id="lookup"
                  onChange={(event) => {
                    verifyRequestIdRef.current += 1;
                    setIsVerifying(false);
                    setLookup(event.target.value);
                    setSelectedTicketCode("");
                    setTicket(null);
                    setMessage("");
                    setError("");
                  }}
                  placeholder="TCK-…"
                  ref={lookupInputRef}
                  spellCheck="false"
                  type="text"
                  value={lookup}
                />
                <button
                  className="action-secondary mt-4 px-5 py-3 text-sm font-bold disabled:cursor-not-allowed"
                  disabled={isVerifying || isMarking || !lookup.trim()}
                  type="submit"
                >
                  {isVerifying ? "Verifying..." : "Verify code"}
                </button>
              </form>
            </details>
          </div>

          <div className="surface-card rounded-lg p-5 sm:p-6">
            <p className="section-kicker">
              Ticket details
            </p>

            {error ? (
              <p className="mt-4 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember shadow-lift" role="alert">
                {error}
              </p>
            ) : null}
            {message ? (
              <p
                className={`mt-4 rounded-lg border px-4 py-3 text-sm font-semibold shadow-lift ${messageStyles[messageTone] ?? messageStyles.warning}`}
                role={messageTone === "danger" ? "alert" : "status"}
              >
                {message}
              </p>
            ) : null}

            {!ticket ? (
              <p className="mt-5 text-sm font-semibold text-ink/60">
                {isVerifying
                  ? "Verifying the selected ticket..."
                  : "Select an event and attendee ticket, or use the QR/manual option, to review check-in details."}
              </p>
            ) : (
              <div className="mt-5 grid gap-5 md:grid-cols-[1fr_160px]">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-normal text-ink">
                    {ticket.event?.title ?? "Event"}
                  </h2>
                  <p className="mt-2 text-sm text-ink/65">
                    {formatDateTime(ticket.event?.startsAt)}
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-ink/60">
                        Attendee
                      </p>
                      <p className="mt-1 font-bold text-ink">{ticket.user?.name}</p>
                      <p className="mt-1 text-sm text-ink/65">{ticket.user?.email}</p>
                      {ticket.user?.phone ? (
                        <p className="mt-1 text-sm text-ink/65">{ticket.user.phone}</p>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-ink/60">
                        Ticket
                      </p>
                      <p className="mt-1 break-all font-bold text-ink">{ticket.ticketCode}</p>
                      <p className="mt-1 text-sm text-ink/65">
                        {ticket.ticketType?.name ?? "Ticket"}
                      </p>
                      <div className="mt-2">
                        <StatusBadge status={ticket.status} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-ink/60">
                        Checked in
                      </p>
                      <p className="mt-1 text-sm font-bold text-ink">
                        {ticket.checkedInAt ? formatDateTime(ticket.checkedInAt) : "Not yet"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-ink/60">
                        Booking
                      </p>
                      <p className="mt-1 break-all text-sm font-bold text-ink">
                        {ticket.booking?.bookingNumber ?? "-"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      className="action-primary px-5 py-3 text-sm font-bold disabled:cursor-not-allowed"
                      disabled={isMarking || !statusDetails.canCheckIn}
                      onClick={handleMarkUsed}
                      type="button"
                    >
                      {isMarking
                        ? "Checking in..."
                        : statusDetails.adminActionLabel}
                    </button>
                    <button
                      className="action-secondary px-5 py-3 text-sm font-bold disabled:cursor-not-allowed"
                      disabled={isMarking}
                      onClick={prepareNextAttendee}
                      type="button"
                    >
                      {selectedEventId ? "Next attendee" : "Check another ticket"}
                    </button>
                  </div>
                </div>
                {statusDetails.canCheckIn && ticket.qrCodeUrl ? (
                  <img
                    alt={`QR code for ticket ${ticket.ticketCode}`}
                    className="h-40 w-40 rounded-lg border border-cyan/20 bg-white object-contain p-2 shadow-lift"
                    src={ticket.qrCodeUrl}
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
