import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { downloadTicketPdf, getTicket } from "../api/tickets.js";
import { EventLocation } from "../components/EventLocation.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatDateTime } from "../utils/formatDate.js";
import { getTicketStatusDetails } from "../utils/ticketStatus.js";

export function UserTicketDetailPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const statusDetails = getTicketStatusDetails(ticket?.status);

  useDocumentTitle("Ticket | EventFlow");

  const loadTicket = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      setTicket(await getTicket(id));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  async function handleDownload() {
    setIsDownloading(true);
    setDownloadError("");

    try {
      const blob = await downloadTicketPdf(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${ticket.ticketCode}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1_000);
    } catch (downloadFailure) {
      setDownloadError(downloadFailure.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <AppLayout>
      <section className="site-shell py-10 lg:py-14">
        {isLoading ? (
          <p className="state-card p-5 text-sm font-semibold text-ink/60">
            Loading ticket...
          </p>
        ) : error ? (
          <div className="rounded-lg border border-ember/20 bg-ember/10 p-5 shadow-lift">
            <p className="text-sm font-semibold text-ember">{error}</p>
            <Link
              className="action-secondary mt-4 inline-flex px-4 py-2 text-sm font-bold"
              to="/user/tickets"
            >
              Back to tickets
            </Link>
          </div>
        ) : (
          <div className="surface-card grid gap-6 rounded-lg p-6 md:grid-cols-[1fr_260px]">
            <div>
              <StatusBadge status={ticket.status} />
              <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
                {ticket.event?.title ?? "Event"}
              </h1>
              <p className="mt-3 text-sm text-ink/65">
                {formatDateTime(ticket.event?.startsAt)}
              </p>
              <div className="mt-1 text-sm">
                <EventLocation event={ticket.event} />
              </div>
              <div className="mt-6 rounded-lg border border-cyan/10 bg-cyan/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-ink/60">
                  Ticket code
                </p>
                <p className="mt-1 break-all text-lg font-bold text-ink">
                  {ticket.ticketCode}
                </p>
                <p className="mt-3 text-sm text-ink/65">
                  Ticket type: {ticket.ticketType?.name ?? "-"}
                </p>
              </div>

              <div className="mt-5 rounded-lg border border-slate-200 bg-white/75 p-4">
                <h2 className="font-extrabold text-ink">
                  {statusDetails.userHeading}
                </h2>
                <p className="mt-2 text-sm leading-6 text-ink/65">
                  {statusDetails.userDetail}
                </p>
                {ticket.status === "USED" && ticket.checkedInAt ? (
                  <p className="mt-2 text-sm font-bold text-ink/65">
                    Checked in {formatDateTime(ticket.checkedInAt)}
                  </p>
                ) : null}
              </div>

              {downloadError ? (
                <p className="mt-4 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember">
                  {downloadError}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                {statusDetails.canCheckIn ? (
                  <button
                    className="action-primary px-5 py-3 text-sm font-bold disabled:cursor-not-allowed"
                    disabled={isDownloading}
                    onClick={handleDownload}
                    type="button"
                  >
                    {isDownloading ? "Preparing..." : "Download ticket"}
                  </button>
                ) : null}
                <Link
                  className="action-secondary inline-flex px-5 py-3 text-sm font-bold"
                  to="/user/tickets"
                >
                  All tickets
                </Link>
              </div>
            </div>

            {statusDetails.canCheckIn && ticket.qrCodeUrl ? (
              <div className="flex items-center justify-center rounded-lg border border-cyan/15 bg-cyan/5 p-5">
                <img
                  alt={`QR code for ticket ${ticket.ticketCode}`}
                  className="h-56 w-56 rounded-lg border border-cyan/20 bg-white object-contain p-3 shadow-lift"
                  src={ticket.qrCodeUrl}
                />
              </div>
            ) : null}
          </div>
        )}
      </section>
    </AppLayout>
  );
}
