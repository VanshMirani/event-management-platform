import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { downloadTicketPdf, getTicket } from "../api/tickets.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatDateTime } from "../utils/formatDate.js";

export function UserTicketDetailPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");

  useDocumentTitle("Ticket | EventFlow");

  async function loadTicket() {
    setIsLoading(true);
    setError("");

    try {
      setTicket(await getTicket(id));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTicket();
  }, [id]);

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
      window.URL.revokeObjectURL(url);
    } catch (downloadFailure) {
      setDownloadError(downloadFailure.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-4xl px-5 py-10 lg:py-14">
        {isLoading ? (
          <p className="rounded-lg border border-ink/10 bg-white p-5 text-sm font-semibold text-ink/60">
            Loading ticket...
          </p>
        ) : error ? (
          <div className="rounded-lg border border-ember/20 bg-ember/10 p-5">
            <p className="text-sm font-semibold text-ember">{error}</p>
            <Link
              className="mt-4 inline-flex rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-ember"
              to="/user/tickets"
            >
              Back to tickets
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 rounded-lg border border-ink/10 bg-white p-6 shadow-soft md:grid-cols-[1fr_260px]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-mint">
                {ticket.status}
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
                {ticket.event?.title ?? "Event"}
              </h1>
              <p className="mt-3 text-sm text-ink/65">
                {formatDateTime(ticket.event?.startsAt)}
              </p>
              <p className="mt-1 text-sm text-ink/65">
                {[ticket.event?.venueName, ticket.event?.city, ticket.event?.country]
                  .filter(Boolean)
                  .join(", ") || ticket.event?.onlineUrl || "To be announced"}
              </p>
              <div className="mt-6 rounded-lg bg-linen p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
                  Ticket code
                </p>
                <p className="mt-1 break-all text-lg font-bold text-ink">
                  {ticket.ticketCode}
                </p>
                <p className="mt-3 text-sm text-ink/65">
                  Ticket type: {ticket.ticketType?.name ?? "-"}
                </p>
              </div>

              {downloadError ? (
                <p className="mt-4 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember">
                  {downloadError}
                </p>
              ) : null}

              <button
                className="mt-5 rounded-lg bg-ember px-5 py-3 text-sm font-bold text-white hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/40"
                disabled={isDownloading}
                onClick={handleDownload}
                type="button"
              >
                {isDownloading ? "Preparing..." : "Download ticket"}
              </button>
            </div>

            {ticket.qrCodeUrl ? (
              <div className="flex items-center justify-center rounded-lg bg-linen p-5">
                <img
                  alt=""
                  className="h-56 w-56 rounded-lg border border-ink/10 bg-white object-contain p-3"
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
