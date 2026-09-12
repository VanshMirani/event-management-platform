import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getAdminEvent,
  publishAdminEvent,
  unpublishAdminEvent,
  updateAdminEvent
} from "../api/admin.js";
import { AdminEventForm } from "../components/AdminEventForm.jsx";
import { AdminNav } from "../components/AdminNav.jsx";
import { AdminTicketTypesSection } from "../components/AdminTicketTypesSection.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

export function AdminEventEditPage() {
  useDocumentTitle("Edit Event | EventFlow");

  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);

  useEffect(() => {
    async function loadEvent() {
      setIsLoading(true);
      setError("");

      try {
        setEvent(await getAdminEvent(id));
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadEvent();
  }, [id]);

  async function handleSubmit(payload) {
    setIsSaving(true);
    setActionError("");

    try {
      await updateAdminEvent(id, payload);
      navigate("/admin/events", { replace: true });
    } catch (saveError) {
      setActionError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTogglePublish() {
    if (isFormDirty) {
      setActionError("Save your event changes before changing its publication status.");
      return;
    }

    setIsPublishing(true);
    setActionError("");

    try {
      const updatedEvent =
        event.status === "PUBLISHED"
          ? await unpublishAdminEvent(id)
          : await publishAdminEvent(id);
      setEvent(updatedEvent);
    } catch (publishError) {
      setActionError(publishError.message);
    } finally {
      setIsPublishing(false);
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
              Edit event
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">
              Save event details and manage ticket types below. At least one active
              ticket type is required before publishing.
            </p>
          </div>
          <div>
            <div className="flex flex-wrap gap-3">
              {event && ["DRAFT", "PUBLISHED"].includes(event.status) ? (
                <button
                  aria-describedby={isFormDirty ? "event-lifecycle-note" : undefined}
                  className="action-secondary px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:text-ink/60"
                  disabled={isPublishing || isFormDirty}
                  onClick={handleTogglePublish}
                  type="button"
                >
                  {isPublishing
                    ? "Saving..."
                    : event.status === "PUBLISHED"
                      ? "Unpublish"
                      : "Publish"}
                </button>
              ) : null}
              <Link
                className="action-secondary px-5 py-3 text-sm font-bold"
                to="/admin/events"
              >
                Back to events
              </Link>
            </div>
            {isFormDirty && event && ["DRAFT", "PUBLISHED"].includes(event.status) ? (
              <p
                className="mt-2 max-w-sm text-sm font-semibold text-ink/65"
                id="event-lifecycle-note"
              >
                Save your event changes before changing its publication status.
              </p>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <p className="state-card mt-6 p-5 text-sm font-semibold text-ink/60">
            Loading event...
          </p>
        ) : error ? (
          <p className="mt-6 rounded-lg border border-ember/20 bg-ember/10 p-5 text-sm font-semibold text-ember shadow-lift">
            {error}
          </p>
        ) : (
          <>
            <div className="mt-6">
              <AdminEventForm
                error={actionError}
                initialEvent={event}
                isSaving={isSaving}
                onDirtyChange={setIsFormDirty}
                onSubmit={handleSubmit}
                submitLabel="Save changes"
              />
            </div>
            <AdminTicketTypesSection eventId={event.id} />
          </>
        )}
      </section>
    </AppLayout>
  );
}
