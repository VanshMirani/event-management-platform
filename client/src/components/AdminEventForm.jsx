import { useEffect, useState } from "react";
import { listAdminCategories } from "../api/admin.js";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "../utils/formatDate.js";

const initialForm = {
  title: "",
  description: "",
  categoryId: "",
  eventType: "OFFLINE",
  venueName: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  onlineUrl: "",
  startAt: "",
  endAt: "",
  isFeatured: false,
  bannerImage: ""
};

function toFormState(event) {
  if (!event) {
    return initialForm;
  }

  return {
    title: event.title ?? "",
    description: event.description ?? "",
    categoryId: event.categoryId ?? "",
    eventType: event.eventType ?? "OFFLINE",
    venueName: event.venueName ?? "",
    address: event.address ?? "",
    city: event.city ?? "",
    state: event.state ?? "",
    country: event.country ?? "India",
    onlineUrl: event.onlineUrl ?? "",
    startAt: toDateTimeLocalValue(event.startAt),
    endAt: toDateTimeLocalValue(event.endAt),
    isFeatured: Boolean(event.isFeatured),
    bannerImage: event.bannerImage ?? ""
  };
}

function validateForm(form) {
  if (form.title.trim().length < 3) {
    return "Title must be at least 3 characters.";
  }

  if (!form.categoryId) {
    return "Choose a category.";
  }

  if (!form.startAt || !form.endAt) {
    return "Start and end dates are required.";
  }

  if (new Date(form.endAt) <= new Date(form.startAt)) {
    return "End date must be after start date.";
  }

  return "";
}

function optionalValue(value) {
  const normalized = value.trim();
  return normalized || undefined;
}

function toPayload(form) {
  return {
    title: form.title,
    description: optionalValue(form.description),
    categoryId: form.categoryId,
    eventType: form.eventType,
    venueName: optionalValue(form.venueName),
    address: optionalValue(form.address),
    city: optionalValue(form.city),
    state: optionalValue(form.state),
    country: optionalValue(form.country) || "India",
    onlineUrl: optionalValue(form.onlineUrl),
    startAt: fromDateTimeLocalValue(form.startAt),
    endAt: fromDateTimeLocalValue(form.endAt),
    isFeatured: form.isFeatured,
    bannerImage: optionalValue(form.bannerImage)
  };
}

export function AdminEventForm({
  initialEvent = null,
  isSaving = false,
  submitLabel = "Save event",
  error = "",
  onSubmit
}) {
  const [form, setForm] = useState(() => toFormState(initialEvent));
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    setForm(toFormState(initialEvent));
  }, [initialEvent]);

  useEffect(() => {
    async function loadCategories() {
      setIsLoadingCategories(true);
      setCategoryError("");

      try {
        setCategories(await listAdminCategories());
      } catch (loadError) {
        setCategoryError(loadError.message);
      } finally {
        setIsLoadingCategories(false);
      }
    }

    loadCategories();
  }, []);

  function updateField(event) {
    const { checked, name, type, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextValidationError = validateForm(form);
    if (nextValidationError) {
      setValidationError(nextValidationError);
      return;
    }

    setValidationError("");
    await onSubmit(toPayload(form));
  }

  return (
    <form
      className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="text-sm font-bold text-ink" htmlFor="title">
            Title
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            id="title"
            name="title"
            onChange={updateField}
            type="text"
            value={form.title}
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-bold text-ink" htmlFor="description">
            Description
          </label>
          <textarea
            className="mt-2 min-h-[8rem] w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            id="description"
            name="description"
            onChange={updateField}
            value={form.description}
          />
        </div>

        <div>
          <label className="text-sm font-bold text-ink" htmlFor="categoryId">
            Category
          </label>
          <select
            className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            id="categoryId"
            name="categoryId"
            onChange={updateField}
            value={form.categoryId}
          >
            <option value="">Choose category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-bold text-ink" htmlFor="eventType">
            Event type
          </label>
          <select
            className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            id="eventType"
            name="eventType"
            onChange={updateField}
            value={form.eventType}
          >
            <option value="ONLINE">ONLINE</option>
            <option value="OFFLINE">OFFLINE</option>
            <option value="HYBRID">HYBRID</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-bold text-ink" htmlFor="venueName">
            Venue name
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            id="venueName"
            name="venueName"
            onChange={updateField}
            type="text"
            value={form.venueName}
          />
        </div>

        <div>
          <label className="text-sm font-bold text-ink" htmlFor="city">
            City
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            id="city"
            name="city"
            onChange={updateField}
            type="text"
            value={form.city}
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-bold text-ink" htmlFor="address">
            Address
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            id="address"
            name="address"
            onChange={updateField}
            type="text"
            value={form.address}
          />
        </div>

        <div>
          <label className="text-sm font-bold text-ink" htmlFor="state">
            State
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            id="state"
            name="state"
            onChange={updateField}
            type="text"
            value={form.state}
          />
        </div>

        <div>
          <label className="text-sm font-bold text-ink" htmlFor="country">
            Country
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            id="country"
            name="country"
            onChange={updateField}
            type="text"
            value={form.country}
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-bold text-ink" htmlFor="onlineUrl">
            Online URL
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            id="onlineUrl"
            name="onlineUrl"
            onChange={updateField}
            type="url"
            value={form.onlineUrl}
          />
        </div>

        <div>
          <label className="text-sm font-bold text-ink" htmlFor="startAt">
            Start date
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            id="startAt"
            name="startAt"
            onChange={updateField}
            type="datetime-local"
            value={form.startAt}
          />
        </div>

        <div>
          <label className="text-sm font-bold text-ink" htmlFor="endAt">
            End date
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            id="endAt"
            name="endAt"
            onChange={updateField}
            type="datetime-local"
            value={form.endAt}
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-bold text-ink" htmlFor="bannerImage">
            Banner image URL
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            id="bannerImage"
            name="bannerImage"
            onChange={updateField}
            type="url"
            value={form.bannerImage}
          />
        </div>

        <label className="flex items-center gap-3 rounded-lg border border-ink/10 bg-linen px-4 py-3 text-sm font-bold text-ink">
          <input
            checked={form.isFeatured}
            name="isFeatured"
            onChange={updateField}
            type="checkbox"
          />
          Featured event
        </label>
      </div>

      {categoryError ? (
        <p className="mt-4 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember">
          {categoryError}
        </p>
      ) : null}

      {validationError || error ? (
        <p className="mt-4 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember">
          {validationError || error}
        </p>
      ) : null}

      <button
        className="mt-6 rounded-lg bg-ember px-5 py-3 text-sm font-bold text-white hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/40"
        disabled={isSaving || isLoadingCategories}
        type="submit"
      >
        {isSaving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
