import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/index.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import {
  getAuthNavigationState,
  getAuthReturnPath
} from "../utils/authReturnPath.js";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  password: ""
};

function validateRegisterForm(form) {
  if (form.name.trim().length < 2) {
    return "Name must be at least 2 characters.";
  }

  if (!form.email.trim() || !form.email.includes("@")) {
    return "Enter a valid email address.";
  }

  if (form.phone.trim() && form.phone.trim().length < 7) {
    return "Phone must be at least 7 characters when provided.";
  }

  if (form.password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return "";
}

export function RegisterPage() {
  useDocumentTitle("Register | EventFlow");

  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setError("");
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validateRegisterForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const user = await register({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password
      });
      navigate(getAuthReturnPath(location, user), {
        replace: true,
        state: null
      });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <section className="site-shell grid gap-8 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-16">
        <div className="hero-panel rounded-lg p-7">
          <p className="text-sm font-extrabold uppercase tracking-wide text-cyan">
            Join EventFlow
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-normal sm:text-5xl">
            Make your next event easy to attend.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-ink/70">
            Create one account to reserve places, follow booking progress, and
            keep every confirmed ticket close at hand.
          </p>
          <div className="mt-6 grid gap-3 text-sm font-bold text-ink/70 sm:grid-cols-3">
            <span className="rounded-lg border border-cyan/20 bg-white/[0.72] px-3 py-2">
              Browse freely
            </span>
            <span className="rounded-lg border border-cyan/20 bg-white/[0.72] px-3 py-2">
              Simple booking
            </span>
            <span className="rounded-lg border border-cyan/20 bg-white/[0.72] px-3 py-2">
              Tickets on hand
            </span>
          </div>
        </div>

        <form
          className="surface-card rounded-lg p-6"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-bold text-ink" htmlFor="name">
                Name
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                id="name"
                name="name"
                onChange={updateField}
                required
                type="text"
                value={form.name}
                autoComplete="name"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-ink" htmlFor="email">
                Email
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                id="email"
                name="email"
                onChange={updateField}
                required
                type="email"
                value={form.email}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-ink" htmlFor="phone">
                Phone <span className="font-normal text-ink/60">(optional)</span>
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                id="phone"
                name="phone"
                onChange={updateField}
                type="tel"
                value={form.phone}
                autoComplete="tel"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-bold text-ink" htmlFor="password">
                Password
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                id="password"
                name="password"
                onChange={updateField}
                required
                type="password"
                value={form.password}
                autoComplete="new-password"
              />
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember shadow-lift" role="alert">
              {error}
            </p>
          ) : null}

          <button
            className="action-primary mt-6 inline-flex w-full justify-center px-5 py-3 text-sm font-extrabold disabled:cursor-not-allowed"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>

          <p className="mt-5 text-center text-sm text-ink/65">
            Already have an account?{" "}
            <Link
              className="font-bold text-mint hover:text-ember"
              state={getAuthNavigationState(location)}
              to="/login"
            >
              Sign in
            </Link>
          </p>
        </form>
      </section>
    </AppLayout>
  );
}
