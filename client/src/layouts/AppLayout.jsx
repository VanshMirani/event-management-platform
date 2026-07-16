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
      <header className="border-b border-ink/10 bg-white/85 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link className="text-lg font-bold tracking-normal text-ink" to="/">
            EventFlow
          </Link>
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-ink/70 sm:gap-6">
            <Link className="hover:text-ember" to="/events">
              Events
            </Link>
            <a className="hover:text-ember" href="/#operations">
              Operations
            </a>
            {currentUser ? (
              <>
                <Link className="hover:text-ember" to="/user/bookings">
                  Bookings
                </Link>
                <Link className="hover:text-ember" to="/user/tickets">
                  Tickets
                </Link>
              </>
            ) : (
              <a className="hover:text-ember" href="/#bookings">
                Bookings
              </a>
            )}
            {isCheckingAuth ? (
              <span className="text-ink/45">Checking...</span>
            ) : currentUser ? (
              <>
                <Link className="font-bold text-mint hover:text-ember" to={dashboardPath}>
                  Dashboard
                </Link>
                <button
                  className="rounded-lg border border-ink/15 px-4 py-2 font-bold text-ink hover:border-ember hover:text-ember"
                  onClick={handleLogout}
                  type="button"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className="hover:text-ember" to="/login">
                  Login
                </Link>
                <Link
                  className="rounded-lg bg-ember px-4 py-2 font-bold text-white hover:bg-ink"
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
