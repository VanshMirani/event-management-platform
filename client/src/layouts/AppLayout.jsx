import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/index.js";

export function AppLayout({ children }) {
  const { currentUser, isCheckingAuth, logout } = useAuth();
  const navigate = useNavigate();
  const dashboardPath =
    currentUser?.role === "ADMIN" ? "/admin/dashboard" : "/user/dashboard";

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-linen text-ink">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 shadow-lift backdrop-blur-xl">
        <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link
            className="brand-logo rounded-lg px-3 py-2 text-lg font-extrabold tracking-normal transition hover:shadow-glow"
            to="/"
          >
            EventFlow
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-ink/70 sm:gap-5">
            <Link className="rounded-lg px-2 py-1 hover:bg-cyan/10 hover:text-cyan" to="/events">
              Events
            </Link>
            <a className="rounded-lg px-2 py-1 hover:bg-cyan/10 hover:text-cyan" href="/#operations">
              Operations
            </a>
            {currentUser ? (
              <>
                <Link className="rounded-lg px-2 py-1 hover:bg-cyan/10 hover:text-cyan" to="/user/bookings">
                  Bookings
                </Link>
                <Link className="rounded-lg px-2 py-1 hover:bg-cyan/10 hover:text-cyan" to="/user/tickets">
                  Tickets
                </Link>
              </>
            ) : (
              <a className="rounded-lg px-2 py-1 hover:bg-cyan/10 hover:text-cyan" href="/#bookings">
                Bookings
              </a>
            )}
            {isCheckingAuth ? (
              <span className="text-ink/45">Checking...</span>
            ) : currentUser ? (
              <>
                <Link className="rounded-lg bg-cyan/10 px-3 py-2 font-extrabold text-cyan hover:bg-cyan/15" to={dashboardPath}>
                  Dashboard
                </Link>
                <button
                  className="action-secondary px-4 py-2 font-extrabold hover:border-ember hover:text-ember"
                  onClick={handleLogout}
                  type="button"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className="rounded-lg px-2 py-1 hover:bg-cyan/10 hover:text-cyan" to="/login">
                  Login
                </Link>
                <Link
                  className="action-primary px-4 py-2 font-extrabold"
                  to="/register"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
