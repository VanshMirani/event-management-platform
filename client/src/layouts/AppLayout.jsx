import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/index.js";

export function AppLayout({ children }) {
  const { currentUser, isCheckingAuth, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dashboardPath =
    currentUser?.role === "ADMIN" ? "/admin/dashboard" : "/user/dashboard";

  async function handleLogout() {
    setIsLoggingOut(true);
    await logout(() =>
      navigate("/login", {
        replace: true,
        state: null,
        flushSync: true
      })
    );
    setIsLoggingOut(false);
  }

  return (
    <div className="min-h-screen bg-transparent text-ink">
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
            <a className="rounded-lg px-3 py-2 hover:bg-cyan/10 hover:text-cyan" href="/#operations">
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
              <a className="rounded-lg px-3 py-2 hover:bg-cyan/10 hover:text-cyan" href="/#bookings">
                Bookings
              </a>
            )}
            {isCheckingAuth ? (
              <span className="text-ink/65">Checking...</span>
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
      </header>
      <main id="main-content">{children}</main>
    </div>
  );
}
