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
  email: "",
  password: ""
};

function validateLoginForm(form) {
  if (!form.email.trim()) {
    return "Email is required.";
  }

  if (!form.email.includes("@")) {
    return "Enter a valid email address.";
  }

  if (form.password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return "";
}

export function LoginPage() {
  useDocumentTitle("Login | EventFlow");

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cameFromProtectedRoute = Boolean(location.state?.from?.pathname);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validateLoginForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const user = await login({
        email: form.email,
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
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-16">
        <div className="hero-panel rounded-lg p-7">
          <p className="text-sm font-extrabold uppercase tracking-wide text-cyan">
            Account access
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-normal sm:text-5xl">
            Sign in to manage your events.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-ink/70">
            Use your EventFlow account to review bookings, manage tickets, or open
            the admin workspace.
          </p>
          <div className="mt-6 grid gap-3 text-sm font-bold text-ink/70 sm:grid-cols-3">
            <span className="rounded-lg border border-cyan/20 bg-white/72 px-3 py-2">
              Secure cookies
            </span>
            <span className="rounded-lg border border-cyan/20 bg-white/72 px-3 py-2">
              Admin controls
            </span>
            <span className="rounded-lg border border-cyan/20 bg-white/72 px-3 py-2">
              QR tickets
            </span>
          </div>
          {cameFromProtectedRoute ? (
            <p className="mt-5 rounded-lg border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm font-semibold text-cyan">
              Sign in to continue.
            </p>
          ) : null}
        </div>

        <form
          className="surface-card rounded-lg p-6"
          onSubmit={handleSubmit}
        >
          <div className="space-y-5">
            <div>
              <label className="text-sm font-bold text-ink" htmlFor="email">
                Email
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                id="email"
                name="email"
                onChange={updateField}
                type="email"
                value={form.email}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-ink" htmlFor="password">
                Password
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 text-ink outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                id="password"
                name="password"
                onChange={updateField}
                type="password"
                value={form.password}
                autoComplete="current-password"
              />
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember shadow-lift">
              {error}
            </p>
          ) : null}

          <button
            className="action-primary mt-6 inline-flex w-full justify-center px-5 py-3 text-sm font-extrabold disabled:cursor-not-allowed"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>

          <p className="mt-5 text-center text-sm text-ink/65">
            New to EventFlow?{" "}
            <Link
              className="font-bold text-mint hover:text-ember"
              state={getAuthNavigationState(location)}
              to="/register"
            >
              Create an account
            </Link>
          </p>
        </form>
      </section>
    </AppLayout>
  );
}
