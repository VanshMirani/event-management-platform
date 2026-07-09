import { useEffect, useState } from "react";
import {
  createAdminCategory,
  deleteAdminCategory,
  listAdminCategories,
  updateAdminCategory
} from "../api/admin.js";
import { AdminNav } from "../components/AdminNav.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

const initialForm = {
  name: "",
  description: ""
};

function validateCategoryForm(form) {
  if (form.name.trim().length < 2) {
    return "Category name must be at least 2 characters.";
  }

  if (form.description.trim().length > 500) {
    return "Description must be 500 characters or fewer.";
  }

  return "";
}

export function AdminCategoriesPage() {
  useDocumentTitle("Admin Categories | EventFlow");

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  async function loadCategories() {
    setIsLoading(true);
    setError("");

    try {
      const nextCategories = await listAdminCategories();
      setCategories(nextCategories);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function startEditing(category) {
    setEditingCategoryId(category.id);
    setForm({
      name: category.name,
      description: category.description ?? ""
    });
    setFormError("");
  }

  function resetForm() {
    setEditingCategoryId("");
    setForm(initialForm);
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validateCategoryForm(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      if (editingCategoryId) {
        const updatedCategory = await updateAdminCategory(editingCategoryId, {
          name: form.name,
          description: form.description || null
        });
        setCategories((currentCategories) =>
          currentCategories.map((category) =>
            category.id === updatedCategory.id ? updatedCategory : category
          )
        );
      } else {
        const createdCategory = await createAdminCategory({
          name: form.name,
          description: form.description || undefined
        });
        setCategories((currentCategories) =>
          [...currentCategories, createdCategory].sort((first, second) =>
            first.name.localeCompare(second.name)
          )
        );
      }

      resetForm();
    } catch (saveError) {
      setFormError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(category) {
    const shouldDelete = window.confirm(`Delete category "${category.name}"?`);

    if (!shouldDelete) {
      return;
    }

    setDeletingCategoryId(category.id);
    setFormError("");

    try {
      await deleteAdminCategory(category.id);
      setCategories((currentCategories) =>
        currentCategories.filter((current) => current.id !== category.id)
      );

      if (editingCategoryId === category.id) {
        resetForm();
      }
    } catch (deleteError) {
      setFormError(deleteError.message);
    } finally {
      setDeletingCategoryId("");
    }
  }

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-14">
        <AdminNav />

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <form
            className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm"
            onSubmit={handleSubmit}
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-mint">
              Categories
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-normal text-ink">
              {editingCategoryId ? "Edit category" : "Add category"}
            </h1>

            <div className="mt-5">
              <label className="text-sm font-bold text-ink" htmlFor="name">
                Name
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
                id="name"
                name="name"
                onChange={updateField}
                type="text"
                value={form.name}
              />
            </div>

            <div className="mt-5">
              <label className="text-sm font-bold text-ink" htmlFor="description">
                Description
              </label>
              <textarea
                className="mt-2 min-h-[7rem] w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
                id="description"
                name="description"
                onChange={updateField}
                value={form.description}
              />
            </div>

            {formError ? (
              <p className="mt-4 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember">
                {formError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="rounded-lg bg-ember px-5 py-3 text-sm font-bold text-white hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/40"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Saving..." : editingCategoryId ? "Save changes" : "Add category"}
              </button>
              {editingCategoryId ? (
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

          <div className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-ink/10 px-5 py-4">
              <h2 className="text-xl font-extrabold tracking-normal text-ink">
                Category list
              </h2>
              <span className="text-sm font-bold text-ink/55">
                {categories.length} total
              </span>
            </div>

            {isLoading ? (
              <p className="p-6 text-sm font-semibold text-ink/60">Loading categories...</p>
            ) : error ? (
              <div className="p-6">
                <p className="text-sm font-semibold text-ember">{error}</p>
                <button
                  className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-ember"
                  onClick={loadCategories}
                  type="button"
                >
                  Retry
                </button>
              </div>
            ) : categories.length === 0 ? (
              <p className="p-6 text-sm font-semibold text-ink/60">No categories yet.</p>
            ) : (
              <div className="divide-y divide-ink/10">
                {categories.map((category) => {
                  const isDeleting = deletingCategoryId === category.id;

                  return (
                    <div
                      className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center"
                      key={category.id}
                    >
                      <div>
                        <p className="font-bold text-ink">{category.name}</p>
                        <p className="mt-1 text-sm text-ink/55">{category.slug}</p>
                        {category.description ? (
                          <p className="mt-2 text-sm leading-6 text-ink/65">
                            {category.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-lg border border-ink/15 px-4 py-2 text-sm font-bold text-ink hover:border-mint hover:text-mint"
                          onClick={() => startEditing(category)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-lg border border-ember/30 px-4 py-2 text-sm font-bold text-ember hover:bg-ember hover:text-white disabled:cursor-not-allowed disabled:border-ink/10 disabled:text-ink/35"
                          disabled={isDeleting}
                          onClick={() => handleDelete(category)}
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
        </div>
      </section>
    </AppLayout>
  );
}
