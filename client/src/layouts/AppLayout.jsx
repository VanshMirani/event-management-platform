import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/index.js";

export function AppLayout({ children }) {
  const { authError, currentUser, isCheckingAuth, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutError, setShowLogoutError] = useState(false);
  const dashboardPath =
    currentUser?.role === "ADMIN" ? "/admin/dashboard" : "/user/dashboard";

  async function handleLogout() {
    setShowLogoutError(false);
    setIsLoggingOut(true);
    const didLogout = await logout(() =>
      navigate("/login", {
        replace: true,
        state: null,
        flushSync: true
      })
    );
    setShowLogoutError(!didLogout);
    setIsLoggingOut(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-transparent text-ink">
      <a
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        href="#main-content"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/[0.88] shadow-lift backdrop-blur-xl">
        <nav
          aria-label="Primary navigation"
          className="site-shell flex flex-wrap items-center justify-between gap-3 py-4"
        >
          <Link
            className="brand-logo rounded-lg px-3 py-2 text-lg font-extrabold tracking-normal transition hover:shadow-glow"
            onClick={() => setIsMenuOpen(false)}
            to="/"
          >
            EventFlow
          </Link>
          <button
            aria-controls="primary-navigation-links"
            aria-expanded={isMenuOpen}
            className="action-secondary px-4 py-2 text-sm font-extrabold lg:hidden"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            {isMenuOpen ? "Close" : "Menu"}
          </button>
          <div
            className={`${isMenuOpen ? "flex" : "hidden"} w-full flex-col items-stretch gap-2 text-sm font-bold text-ink/70 lg:flex lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:gap-5`}
            id="primary-navigation-links"
          >
            <Link
              className="rounded-lg px-3 py-2 hover:bg-cyan/10 hover:text-cyan"
              onClick={() => setIsMenuOpen(false)}
              to="/events"
            >
              Events
            </Link>
            <a
              className="rounded-lg px-3 py-2 hover:bg-cyan/10 hover:text-cyan"
              href="/#operations"
              onClick={() => setIsMenuOpen(false)}
            >
              Operations
            </a>
            {currentUser ? (
              currentUser.role !== "ADMIN" ? (
                <>
                  <Link
                    className="rounded-lg px-3 py-2 hover:bg-cyan/10 hover:text-cyan"
                    onClick={() => setIsMenuOpen(false)}
                    to="/user/bookings"
                  >
                    Bookings
                  </Link>
                  <Link
                    className="rounded-lg px-3 py-2 hover:bg-cyan/10 hover:text-cyan"
                    onClick={() => setIsMenuOpen(false)}
                    to="/user/tickets"
                  >
                    Tickets
                  </Link>
                </>
              ) : null
            ) : (
              <a
                className="rounded-lg px-3 py-2 hover:bg-cyan/10 hover:text-cyan"
                href="/#bookings"
                onClick={() => setIsMenuOpen(false)}
              >
                Bookings
              </a>
            )}
            {isCheckingAuth ? (
              <span className="text-ink/65">Loading...</span>
            ) : currentUser ? (
              <>
                <Link
                  className="rounded-lg bg-cyan/10 px-3 py-2 font-extrabold text-ink hover:bg-cyan/15"
                  onClick={() => setIsMenuOpen(false)}
                  to={dashboardPath}
                >
                  Dashboard
                </Link>
                <button
                  className="action-secondary px-4 py-2 font-extrabold hover:border-ember hover:text-ember"
                  disabled={isLoggingOut}
                  onClick={handleLogout}
                  type="button"
                >
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </button>
              </>
            ) : (
              <>
                <Link
                  className="rounded-lg px-3 py-2 hover:bg-cyan/10 hover:text-cyan"
                  onClick={() => setIsMenuOpen(false)}
                  to="/login"
                >
                  Login
                </Link>
                <Link
                  className="action-primary px-4 py-2 font-extrabold"
                  onClick={() => setIsMenuOpen(false)}
                  to="/register"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>
        {showLogoutError ? (
          <div
            className="site-shell pb-3"
            role="alert"
          >
            <p className="rounded-lg border border-ember/30 bg-rose-50 px-4 py-3 text-sm font-semibold text-ember shadow-lift">
              {authError || "We could not log you out. Please try again."}
            </p>
          </div>
        ) : null}
      </header>
      <main className="flex-1" id="main-content">{children}</main>
      <footer className="border-t border-slate-200/80 bg-white/70 py-8 backdrop-blur">
        <div className="site-shell flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-extrabold text-ink">EventFlow</p>
            <p className="mt-1 text-sm text-ink/60">
              Discover events, reserve tickets, and arrive ready.
            </p>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-ink/65">
            <Link className="hover:text-cyan" to="/events">Events</Link>
            <a className="hover:text-cyan" href="/#operations">How it works</a>
            <Link className="hover:text-cyan" to={currentUser ? dashboardPath : "/login"}>
              {currentUser ? "Dashboard" : "Sign in"}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
