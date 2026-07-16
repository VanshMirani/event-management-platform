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
      <section className="mx-auto w-full max-w-5xl px-5 py-10 lg:py-14">
        <AdminNav />

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-mint">
              Event management
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
              Edit event
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            {event ? (
              <button
                className="rounded-lg border border-ink/15 bg-white px-5 py-3 text-sm font-bold text-ink hover:border-mint hover:text-mint disabled:cursor-not-allowed disabled:text-ink/35"
                disabled={isPublishing}
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
              className="rounded-lg bg-ink px-5 py-3 text-sm font-bold text-white hover:bg-ember"
              to="/admin/events"
            >
              Back to events
            </Link>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-6 rounded-lg border border-ink/10 bg-white p-5 text-sm font-semibold text-ink/60">
            Loading event...
          </p>
        ) : error ? (
          <p className="mt-6 rounded-lg border border-ember/20 bg-ember/10 p-5 text-sm font-semibold text-ember">
            {error}
          </p>
        ) : (
          <div className="mt-6">
            <AdminEventForm
              error={actionError}
              initialEvent={event}
              isSaving={isSaving}
              onSubmit={handleSubmit}
              submitLabel="Save changes"
            />
          </div>
        )}
      </section>
    </AppLayout>
  );
}
