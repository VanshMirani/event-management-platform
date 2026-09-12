import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAdminEvent } from "../api/admin.js";
import { AdminEventForm } from "../components/AdminEventForm.jsx";
import { AdminNav } from "../components/AdminNav.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

export function AdminEventCreatePage() {
  useDocumentTitle("Create Event | Event Management Platform");

  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(payload) {
    setIsSaving(true);
    setError("");

    try {
      await createAdminEvent(payload);
      navigate("/admin/events", { replace: true });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-5xl px-5 py-10 lg:py-14">
        <AdminNav />
        <div className="mt-8">
          <p className="section-kicker">
            Event management
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
            Create event
          </h1>
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
