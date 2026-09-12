import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  markAdminTicketUsed,
  verifyAdminTicket
} from "../api/admin.js";
import { AdminNav } from "../components/AdminNav.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatDateTime } from "../utils/formatDate.js";
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

export function AdminCheckInPage() {
  useDocumentTitle("Admin Check-In | EventFlow");

  const [searchParams, setSearchParams] = useSearchParams();
  const lookupInputRef = useRef(null);
  const handledQrTokenRef = useRef("");
  const [lookup, setLookup] = useState("");
  const [ticket, setTicket] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");
  const [error, setError] = useState("");
  const statusDetails = getTicketStatusDetails(ticket?.status);

  const verifyLookup = useCallback(async (value) => {
    setIsVerifying(true);
    setError("");
    setMessage("");

    try {
      const verifiedTicket = await verifyAdminTicket(createLookupPayload(value));
      const verifiedStatusDetails = getTicketStatusDetails(verifiedTicket.status);
      setTicket(verifiedTicket);
      setMessage(verifiedStatusDetails.adminMessage);
      setMessageTone(verifiedStatusDetails.adminTone);
    } catch (verifyError) {
      setTicket(null);
      setError(verifyError.message);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  useEffect(() => {
    const qrToken = searchParams.get("token")?.trim();

    if (!qrToken || handledQrTokenRef.current === qrToken) {
      return;
    }

    handledQrTokenRef.current = qrToken;
    setLookup(qrToken);
    setSearchParams({}, { replace: true });
    verifyLookup(qrToken);
  }, [searchParams, setSearchParams, verifyLookup]);

  async function handleVerify(event) {
    event.preventDefault();

    if (!lookup.trim()) {
      setError("Enter a ticket code or QR token.");
      return;
    }

    await verifyLookup(lookup);
  }

  async function handleMarkUsed() {
    setIsMarking(true);
    setError("");
    setMessage("");

    try {
      const usedTicket = await markAdminTicketUsed({ ticketCode: ticket.ticketCode });
      setTicket(usedTicket);
      setMessage("Ticket checked in successfully.");
      setMessageTone("success");
    } catch (markError) {
      setError(markError.message);
    } finally {
      setIsMarking(false);
    }
  }

  function resetCheckIn() {
    setLookup("");
    setTicket(null);
    setMessage("");
    setMessageTone("success");
    setError("");
    lookupInputRef.current?.focus();
  }

  return (
    <AppLayout>
      <section className="site-shell py-10 lg:py-14">
        <AdminNav />

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <form
            className="surface-card rounded-lg p-5"
            onSubmit={handleVerify}
          >
            <p className="section-kicker">
              Check-in
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
              Verify ticket
            </h1>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              Scan the attendee QR code with a phone camera, or enter the ticket
              code printed below it.
            </p>
            <label className="mt-5 block text-sm font-bold text-ink" htmlFor="lookup">
              Ticket code or scanned value
            </label>
            <input
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              autoFocus
              className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
              id="lookup"
              onChange={(event) => {
                setLookup(event.target.value);
                setError("");
              }}
              placeholder="TCK-…"
              ref={lookupInputRef}
              spellCheck="false"
              type="text"
              value={lookup}
            />
            <button
              className="action-primary mt-5 px-5 py-3 text-sm font-bold disabled:cursor-not-allowed"
              disabled={isVerifying || !lookup.trim()}
              type="submit"
            >
              {isVerifying ? "Verifying..." : "Verify"}
            </button>
          </form>

          <div className="surface-card rounded-lg p-5">
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
                Verify a ticket code or QR token to see check-in details.
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
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-ink/60">
                        Ticket
                      </p>
                      <p className="mt-1 font-bold text-ink">{ticket.ticketCode}</p>
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
                      className="action-secondary px-5 py-3 text-sm font-bold"
                      onClick={resetCheckIn}
                      type="button"
                    >
                      Scan next ticket
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
