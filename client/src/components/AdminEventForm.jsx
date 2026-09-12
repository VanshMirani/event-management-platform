import { useEffect, useMemo, useState } from "react";
import { listAdminCategories } from "../api/admin.js";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "../utils/formatDate.js";

const initialForm = {
  title: "",
  shortDescription: "",
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
  capacity: "",
  isFeatured: false,
  bannerImage: ""
};

function toFormState(event) {
  if (!event) {
    return initialForm;
  }

  return {
    title: event.title ?? "",
    shortDescription: event.shortDescription ?? "",
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
    capacity: event.capacity == null ? "" : String(event.capacity),
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

  if (["OFFLINE", "HYBRID"].includes(form.eventType) && !form.venueName.trim()) {
    return "Venue name is required for in-person events.";
  }

  if (["OFFLINE", "HYBRID"].includes(form.eventType) && !form.city.trim()) {
    return "City is required for in-person events.";
  }

  if (["ONLINE", "HYBRID"].includes(form.eventType) && !form.onlineUrl.trim()) {
    return "Online URL is required for online and hybrid events.";
  }

  if (!form.startAt || !form.endAt) {
    return "Start and end dates are required.";
  }

  if (new Date(form.endAt) <= new Date(form.startAt)) {
    return "End date must be after start date.";
  }

  if (
    form.capacity &&
    (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) <= 0)
  ) {
    return "Capacity must be a positive whole number.";
  }

  return "";
}

function optionalValue(value) {
  const normalized = value.trim();
  return normalized || null;
}

function toPayload(form) {
  return {
    title: form.title,
    shortDescription: optionalValue(form.shortDescription),
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
    capacity: form.capacity ? Number(form.capacity) : null,
    isFeatured: form.isFeatured,
    bannerImage: optionalValue(form.bannerImage)
  };
}

function formsMatch(left, right) {
  return Object.keys(initialForm).every((field) => left[field] === right[field]);
}

export function AdminEventForm({
  initialEvent = null,
  isSaving = false,
  submitLabel = "Save event",
  error = "",
  onDirtyChange,
  onSubmit
}) {
  const [form, setForm] = useState(() => toFormState(initialEvent));
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [validationError, setValidationError] = useState("");
  const initialFormState = useMemo(() => toFormState(initialEvent), [initialEvent]);
  const isDirty = !formsMatch(form, initialFormState);

  useEffect(() => {
    setForm(toFormState(initialEvent));
  }, [initialEvent]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

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
    setValidationError("");
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
      className="surface-card rounded-lg p-5"
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
            maxLength="160"
            name="title"
            onChange={updateField}
            required
            type="text"
            value={form.title}
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-bold text-ink" htmlFor="shortDescription">
            Short description
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            id="shortDescription"
            maxLength="220"
            name="shortDescription"
            onChange={updateField}
            placeholder="A concise summary shown on event cards"
            type="text"
            value={form.shortDescription}
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-bold text-ink" htmlFor="description">
            Description
          </label>
          <textarea
            className="mt-2 min-h-[8rem] w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            id="description"
            maxLength="5000"
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
            required
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
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">In person</option>
            <option value="HYBRID">Hybrid</option>
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
            required={["OFFLINE", "HYBRID"].includes(form.eventType)}
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
            required={["OFFLINE", "HYBRID"].includes(form.eventType)}
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
            required
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
            required={["ONLINE", "HYBRID"].includes(form.eventType)}
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
            required
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
            required
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

        <div>
          <label className="text-sm font-bold text-ink" htmlFor="capacity">
            Event capacity <span className="font-normal text-ink/60">(optional)</span>
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            id="capacity"
            min="1"
            name="capacity"
            onChange={updateField}
            step="1"
            type="number"
            value={form.capacity}
          />
        </div>

        <label className="flex items-center gap-3 self-end rounded-lg border border-ink/10 bg-linen px-4 py-3 text-sm font-bold text-ink">
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
        <p className="mt-4 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember" role="alert">
          {categoryError}
        </p>
      ) : null}

      {validationError || error ? (
        <p className="mt-4 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember" role="alert">
          {validationError || error}
        </p>
      ) : null}

      <button
        className="action-primary mt-6 px-5 py-3 text-sm font-bold disabled:cursor-not-allowed"
        disabled={isSaving || isLoadingCategories}
        type="submit"
      >
        {isSaving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
