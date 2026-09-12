import { useCallback, useEffect, useRef, useState } from "react";
import {
  createAdminTicketType,
  deleteAdminTicketType,
  listAdminEventTicketTypes,
  updateAdminTicketType
} from "../api/admin.js";
import { StatusBadge } from "./StatusBadge.jsx";
import { formatCurrency } from "../utils/formatCurrency.js";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "../utils/formatDate.js";

const initialForm = {
  name: "",
  description: "",
  price: "",
  currency: "INR",
  totalQuantity: "",
  maxPerUser: "5",
  saleStartAt: "",
  saleEndAt: "",
  status: "ACTIVE"
};

function toFormState(ticketType) {
  if (!ticketType) {
    return initialForm;
  }

  return {
    name: ticketType.name ?? "",
    description: ticketType.description ?? "",
    price: String(ticketType.price ?? ""),
    currency: ticketType.currency ?? "INR",
    totalQuantity: String(ticketType.totalQuantity ?? ""),
    maxPerUser: String(ticketType.maxPerUser ?? 5),
    saleStartAt: toDateTimeLocalValue(ticketType.saleStartAt),
    saleEndAt: toDateTimeLocalValue(ticketType.saleEndAt),
    status: ticketType.status ?? "ACTIVE"
  };
}

function validateForm(form) {
  if (form.name.trim().length < 2) {
    return "Ticket type name must be at least 2 characters.";
  }

  if (Number(form.price) < 0 || form.price === "") {
    return "Price cannot be negative.";
  }

  if (!Number.isInteger(Number(form.totalQuantity)) || Number(form.totalQuantity) <= 0) {
    return "Total quantity must be greater than 0.";
  }

  if (!Number.isInteger(Number(form.maxPerUser)) || Number(form.maxPerUser) <= 0) {
    return "Max per user must be greater than 0.";
  }

  if (
    form.saleStartAt &&
    form.saleEndAt &&
    new Date(form.saleEndAt) <= new Date(form.saleStartAt)
  ) {
    return "Sale end must be after sale start.";
  }

  return "";
}

function optionalValue(value) {
  const normalized = value.trim();
  return normalized || null;
}

function toPayload(form, eventId = null) {
  const payload = {
    name: form.name,
    description: optionalValue(form.description),
    price: Number(form.price),
    currency: form.currency,
    totalQuantity: Number(form.totalQuantity),
    maxPerUser: Number(form.maxPerUser),
    saleStartAt: form.saleStartAt ? fromDateTimeLocalValue(form.saleStartAt) : null,
    saleEndAt: form.saleEndAt ? fromDateTimeLocalValue(form.saleEndAt) : null,
    status: form.status
  };

  if (eventId) {
    payload.eventId = eventId;
  }

  return payload;
}

export function AdminTicketTypesSection({ eventId }) {
  const formHeadingRef = useRef(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingTicketTypeId, setEditingTicketTypeId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingTicketTypeId, setDeletingTicketTypeId] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadTicketTypes = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      setTicketTypes(await listAdminEventTicketTypes(eventId));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadTicketTypes();
  }, [loadTicketTypes]);

  function updateField(event) {
    const { name, value } = event.target;
    setFormError("");
    setSuccessMessage("");
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function startEditing(ticketType) {
    setEditingTicketTypeId(ticketType.id);
    setForm(toFormState(ticketType));
    setFormError("");
    setSuccessMessage("");
    window.requestAnimationFrame(() => formHeadingRef.current?.focus());
  }

  function resetForm() {
    setEditingTicketTypeId("");
    setForm(initialForm);
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validateForm(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      if (editingTicketTypeId) {
        const updatedTicketType = await updateAdminTicketType(
          editingTicketTypeId,
          toPayload(form)
        );
        setTicketTypes((currentTicketTypes) =>
          currentTicketTypes.map((ticketType) =>
            ticketType.id === updatedTicketType.id ? updatedTicketType : ticketType
          )
        );
        setSuccessMessage("Ticket type updated.");
      } else {
        const createdTicketType = await createAdminTicketType(toPayload(form, eventId));
        setTicketTypes((currentTicketTypes) => [...currentTicketTypes, createdTicketType]);
        setSuccessMessage("Ticket type added.");
      }

      resetForm();
    } catch (saveError) {
      setFormError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(ticketType) {
    const shouldDelete = window.confirm(`Delete ticket type "${ticketType.name}"?`);

    if (!shouldDelete) {
      return;
    }

    setDeletingTicketTypeId(ticketType.id);
    setFormError("");

    try {
      await deleteAdminTicketType(ticketType.id);
      setTicketTypes((currentTicketTypes) =>
        currentTicketTypes.filter((current) => current.id !== ticketType.id)
      );

      if (editingTicketTypeId === ticketType.id) {
        resetForm();
      }
      setSuccessMessage("Ticket type deleted.");
    } catch (deleteError) {
      setFormError(deleteError.message);
      window.requestAnimationFrame(() => formHeadingRef.current?.focus());
    } finally {
      setDeletingTicketTypeId("");
    }
  }

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <form
        className="surface-card rounded-lg p-5"
        onSubmit={handleSubmit}
      >
        <p className="section-kicker">
          Ticket types
        </p>
        <h2
          className="mt-2 text-2xl font-extrabold tracking-normal text-ink outline-none"
          ref={formHeadingRef}
          tabIndex="-1"
        >
          {editingTicketTypeId ? "Edit ticket type" : "Add ticket type"}
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-bold text-ink" htmlFor="ticket-name">
              Name
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
              id="ticket-name"
              maxLength="100"
              name="name"
              onChange={updateField}
              required
              type="text"
              value={form.name}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-bold text-ink" htmlFor="ticket-description">
              Description
            </label>
            <textarea
              className="mt-2 min-h-[6rem] w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
              id="ticket-description"
              maxLength="500"
              name="description"
              onChange={updateField}
              value={form.description}
            />
          </div>

          <div>
            <label className="text-sm font-bold text-ink" htmlFor="ticket-price">
              Price
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
              id="ticket-price"
              min="0"
              name="price"
              onChange={updateField}
              required
              step="0.01"
              type="number"
              value={form.price}
            />
          </div>

          <div>
            <label className="text-sm font-bold text-ink" htmlFor="ticket-currency">
              Currency
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-ink/15 bg-linen px-4 py-3 uppercase text-ink"
              id="ticket-currency"
              name="currency"
              readOnly
              type="text"
              value={form.currency}
            />
            <p className="mt-1 text-xs font-semibold text-ink/60">
              Prices are currently supported in INR.
            </p>
          </div>

          <div>
            <label className="text-sm font-bold text-ink" htmlFor="ticket-total">
              Total quantity
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
              id="ticket-total"
              min="1"
              name="totalQuantity"
              onChange={updateField}
              required
              step="1"
              type="number"
              value={form.totalQuantity}
            />
          </div>

          <div>
            <label className="text-sm font-bold text-ink" htmlFor="ticket-max">
              Max per user
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
              id="ticket-max"
              min="1"
              name="maxPerUser"
              onChange={updateField}
              required
              step="1"
              type="number"
              value={form.maxPerUser}
            />
          </div>

          <div>
            <label className="text-sm font-bold text-ink" htmlFor="ticket-start">
              Sale start
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
              id="ticket-start"
              name="saleStartAt"
              onChange={updateField}
              type="datetime-local"
              value={form.saleStartAt}
            />
          </div>

          <div>
            <label className="text-sm font-bold text-ink" htmlFor="ticket-end">
              Sale end
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
              id="ticket-end"
              name="saleEndAt"
              onChange={updateField}
              type="datetime-local"
              value={form.saleEndAt}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-bold text-ink" htmlFor="ticket-status">
              Status
            </label>
            <select
              className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
              id="ticket-status"
              name="status"
              onChange={updateField}
              value={form.status}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {formError ? (
          <p className="mt-4 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember" role="alert">
            {formError}
          </p>
        ) : null}

        {successMessage ? (
          <p className="mt-4 rounded-lg border border-mint/20 bg-mint/10 px-4 py-3 text-sm font-semibold text-mint" role="status">
            {successMessage}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="action-primary px-5 py-3 text-sm font-bold disabled:cursor-not-allowed"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving..." : editingTicketTypeId ? "Save changes" : "Add ticket type"}
          </button>
          {editingTicketTypeId ? (
            <button
              className="rounded-lg border border-ink/15 px-5 py-3 text-sm font-bold text-ink hover:border-mint hover:text-mint"
              onClick={resetForm}
              type="button"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="surface-card overflow-hidden rounded-lg">
        <div className="flex items-center justify-between gap-4 border-b border-ink/10 px-5 py-4">
          <h2 className="text-xl font-extrabold tracking-normal text-ink">
            Ticket type list
          </h2>
          <span className="text-sm font-bold text-ink/65">{ticketTypes.length} total</span>
        </div>

        {isLoading ? (
          <p className="p-6 text-sm font-semibold text-ink/60">Loading ticket types...</p>
        ) : error ? (
          <div className="p-6">
            <p className="text-sm font-semibold text-ember">{error}</p>
            <button
              className="action-primary mt-4 px-4 py-2 text-sm font-bold"
              onClick={loadTicketTypes}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : ticketTypes.length === 0 ? (
          <p className="p-6 text-sm font-semibold text-ink/60">No ticket types yet.</p>
        ) : (
          <div className="divide-y divide-ink/10">
            {ticketTypes.map((ticketType) => {
              const isDeleting = deletingTicketTypeId === ticketType.id;

              return (
                <div
                  className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center"
                  key={ticketType.id}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-ink">{ticketType.name}</p>
                      <StatusBadge status={ticketType.status} />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-mint">
                      {formatCurrency(ticketType.price, ticketType.currency)}
                    </p>
                    <p className="mt-1 text-sm text-ink/65">
                      {ticketType.availableQuantity} available of {ticketType.totalQuantity} - Max{" "}
                      {ticketType.maxPerUser} per user
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      aria-label={`Edit ${ticketType.name} ticket type`}
                      className="rounded-lg border border-ink/15 px-4 py-2 text-sm font-bold text-ink hover:border-mint hover:text-mint"
                      onClick={() => startEditing(ticketType)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      aria-label={`Delete ${ticketType.name} ticket type`}
                      className="danger-button px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:border-ink/10 disabled:text-ink/60"
                      disabled={isDeleting}
                      onClick={() => handleDelete(ticketType)}
                      type="button"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
