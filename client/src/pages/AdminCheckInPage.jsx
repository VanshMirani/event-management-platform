import { useState } from "react";
import {
  markAdminTicketUsed,
  verifyAdminTicket
} from "../api/admin.js";
import { AdminNav } from "../components/AdminNav.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatDateTime } from "../utils/formatDate.js";

export function AdminCheckInPage() {
  useDocumentTitle("Admin Check-In | EventFlow");

  const [lookup, setLookup] = useState("");
  const [ticket, setTicket] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function createLookupPayload() {
    const value = lookup.trim();
    return value.startsWith("TCK-") ? { ticketCode: value } : { qrToken: value };
  }

  async function handleVerify(event) {
    event.preventDefault();

    if (!lookup.trim()) {
      setError("Enter a ticket code or QR token.");
      return;
    }

    setIsVerifying(true);
    setError("");
    setMessage("");

    try {
      const verifiedTicket = await verifyAdminTicket(createLookupPayload());
      setTicket(verifiedTicket);
      setMessage(
        verifiedTicket.status === "USED"
          ? "Ticket was already checked in."
          : "Ticket verified."
      );
    } catch (verifyError) {
      setTicket(null);
      setError(verifyError.message);
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleMarkUsed() {
    setIsMarking(true);
    setError("");
    setMessage("");

    try {
      const usedTicket = await markAdminTicketUsed({ ticketCode: ticket.ticketCode });
      setTicket(usedTicket);
      setMessage("Ticket checked in successfully.");
    } catch (markError) {
      setError(markError.message);
    } finally {
      setIsMarking(false);
    }
  }

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-14">
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
            <label className="mt-5 block text-sm font-bold text-ink" htmlFor="lookup">
              Ticket code or QR token
            </label>
            <textarea
              className="mt-2 min-h-[8rem] w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
              id="lookup"
              onChange={(event) => setLookup(event.target.value)}
              value={lookup}
            />
            <button
              className="action-primary mt-5 px-5 py-3 text-sm font-bold disabled:cursor-not-allowed"
              disabled={isVerifying}
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
              <p className="mt-4 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember shadow-lift">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="mt-4 rounded-lg border border-mint/20 bg-mint/10 px-4 py-3 text-sm font-semibold text-mint shadow-lift">
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
                      <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
                        User
                      </p>
                      <p className="mt-1 font-bold text-ink">{ticket.user?.name}</p>
                      <p className="mt-1 text-sm text-ink/65">{ticket.user?.email}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
                        Ticket
                      </p>
                      <p className="mt-1 font-bold text-ink">{ticket.ticketCode}</p>
                      <div className="mt-2">
                        <StatusBadge status={ticket.status} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
                        Checked in
                      </p>
                      <p className="mt-1 text-sm font-bold text-ink">
                        {ticket.checkedInAt ? formatDateTime(ticket.checkedInAt) : "Not yet"}
                      </p>
                    </div>
                  </div>

                  <button
                    className="action-primary mt-6 px-5 py-3 text-sm font-bold disabled:cursor-not-allowed"
                    disabled={isMarking || ticket.status !== "VALID"}
                    onClick={handleMarkUsed}
                    type="button"
                  >
                    {isMarking ? "Checking in..." : "Mark used"}
                  </button>
                </div>
                {ticket.qrCodeUrl ? (
                  <img
                    alt=""
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
