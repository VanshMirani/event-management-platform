import { Link } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

export function NotFoundPage() {
  useDocumentTitle("Page Not Found | EventFlow");

  return (
    <AppLayout>
      <section className="site-shell py-16 lg:py-24">
        <div className="hero-panel mx-auto max-w-3xl rounded-lg p-7 text-center sm:p-10">
          <p className="section-kicker">404 · Page not found</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-normal text-ink sm:text-5xl">
            This page is not available.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink/70">
            The address may be incorrect, or the page may have moved. You can return
            home or continue browsing upcoming events.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link className="action-primary px-5 py-3 text-sm font-extrabold" to="/events">
              Browse events
            </Link>
            <Link className="action-secondary px-5 py-3 text-sm font-extrabold" to="/">
              Go home
            </Link>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
