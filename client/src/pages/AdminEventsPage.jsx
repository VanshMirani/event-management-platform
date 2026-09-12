import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteAdminEvent,
  listAdminEvents,
  publishAdminEvent,
  unpublishAdminEvent
} from "../api/admin.js";
import { AdminNav } from "../components/AdminNav.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { formatDateTime } from "../utils/formatDate.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

export function AdminEventsPage() {
  useDocumentTitle("Admin Events | EventFlow");

  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyEventId, setBusyEventId] = useState("");

  async function loadEvents() {
    setIsLoading(true);
    setError("");

    try {
      setEvents(await listAdminEvents());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  function replaceEvent(updatedEvent) {
    setEvents((currentEvents) =>
      currentEvents.map((event) => (event.id === updatedEvent.id ? updatedEvent : event))
    );
  }

  async function handleTogglePublish(event) {
    setBusyEventId(event.id);
    setActionError("");

    try {
      const updatedEvent =
        event.status === "PUBLISHED"
          ? await unpublishAdminEvent(event.id)
          : await publishAdminEvent(event.id);
      replaceEvent(updatedEvent);
    } catch (updateError) {
      setActionError(updateError.message);
    } finally {
      setBusyEventId("");
    }
  }

  async function handleDelete(event) {
    const shouldDelete = window.confirm(`Delete event "${event.title}"?`);

    if (!shouldDelete) {
      return;
    }

    setBusyEventId(event.id);
    setActionError("");

    try {
      await deleteAdminEvent(event.id);
      setEvents((currentEvents) => currentEvents.filter((current) => current.id !== event.id));
    } catch (deleteError) {
      setActionError(deleteError.message);
    } finally {
      setBusyEventId("");
    }
  }

  return (
    <AppLayout>
      <section className="site-shell py-10 lg:py-14">
        <AdminNav />

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">
              Event management
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
              Events
            </h1>
          </div>
          <Link
            className="action-primary px-5 py-3 text-sm font-bold"
            to="/admin/events/create"
          >
            Create event
          </Link>
        </div>

        {actionError ? (
          <p className="mt-5 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember">
            {actionError}
          </p>
        ) : null}

        <div className="surface-card mt-6 overflow-hidden rounded-lg">
          {isLoading ? (
            <p className="p-6 text-sm font-semibold text-ink/60">Loading events...</p>
          ) : error ? (
            <div className="p-6">
              <p className="text-sm font-semibold text-ember">{error}</p>
              <button
                className="action-primary mt-4 px-4 py-2 text-sm font-bold"
                onClick={loadEvents}
                type="button"
              >
                Retry
              </button>
            </div>
          ) : events.length === 0 ? (
            <p className="p-6 text-sm font-semibold text-ink/60">No events yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                <thead className="bg-linen text-xs font-bold uppercase tracking-wide text-ink/65">
                  <tr>
                    <th className="px-4 py-3" scope="col">Title</th>
                    <th className="px-4 py-3" scope="col">Category</th>
                    <th className="px-4 py-3" scope="col">City</th>
                    <th className="px-4 py-3" scope="col">Start date</th>
                    <th className="px-4 py-3" scope="col">Status</th>
                    <th className="px-4 py-3" scope="col">Featured</th>
                    <th className="px-4 py-3" scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {events.map((event) => {
                    const isBusy = busyEventId === event.id;
                    const canTogglePublish = ["DRAFT", "PUBLISHED"].includes(event.status);

                    return (
                      <tr key={event.id}>
                        <td className="px-4 py-4 font-bold text-ink">{event.title}</td>
                        <td className="px-4 py-4 text-ink/70">
                          {event.category?.name ?? "Uncategorized"}
                        </td>
                        <td className="px-4 py-4 text-ink/70">{event.city || "-"}</td>
                        <td className="px-4 py-4 text-ink/70">
                          {formatDateTime(event.startAt)}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={event.status} />
                        </td>
                        <td className="px-4 py-4 text-ink/70">
                          {event.isFeatured ? "Yes" : "No"}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              aria-label={`Edit ${event.title}`}
                              className="rounded-lg border border-ink/15 px-3 py-2 text-sm font-bold text-ink hover:border-mint hover:text-mint"
                              to={`/admin/events/${event.id}/edit`}
                            >
                              Edit
                            </Link>
                            {canTogglePublish ? (
                              <button
                                aria-label={`${event.status === "PUBLISHED" ? "Unpublish" : "Publish"} ${event.title}`}
                                className="rounded-lg border border-ink/15 px-3 py-2 text-sm font-bold text-ink hover:border-mint hover:text-mint disabled:cursor-not-allowed disabled:text-ink/60"
                                disabled={isBusy}
                                onClick={() => handleTogglePublish(event)}
                                type="button"
                              >
                                {isBusy
                                  ? "Saving..."
                                  : event.status === "PUBLISHED"
                                    ? "Unpublish"
                                    : "Publish"}
                              </button>
                            ) : (
                              <span className="inline-flex items-center px-2 py-2 text-xs font-semibold text-ink/60">
                                Status locked
                              </span>
                            )}
                            <button
                              aria-label={`Delete ${event.title}`}
                              className="danger-button px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:border-ink/10 disabled:text-ink/60"
                              disabled={isBusy}
                              onClick={() => handleDelete(event)}
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AppLayout>
  );
}
