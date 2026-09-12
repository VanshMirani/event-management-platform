import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAdminEvent } from "../api/admin.js";
import { AdminEventForm } from "../components/AdminEventForm.jsx";
import { AdminNav } from "../components/AdminNav.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

export function AdminEventCreatePage() {
  useDocumentTitle("Create Event | EventFlow");

  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(payload) {
    setIsSaving(true);
    setError("");

    try {
      const createdEvent = await createAdminEvent(payload);
      navigate(`/admin/events/${createdEvent.id}/edit`, { replace: true });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppLayout>
      <section className="site-shell py-10 lg:py-14">
        <AdminNav />
        <div className="mt-8">
          <p className="section-kicker">
            Event management
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
            Create event
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">
            Start with the event details. You will add ticket types on the next screen
            before publishing.
          </p>
        </div>
        <div className="mt-6">
          <AdminEventForm
            error={error}
            isSaving={isSaving}
            onSubmit={handleSubmit}
            submitLabel="Create event"
          />
        </div>
      </section>
    </AppLayout>
  );
}
