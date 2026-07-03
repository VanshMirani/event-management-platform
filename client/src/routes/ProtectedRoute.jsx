import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/index.js";

function RouteLoadingState() {
  return (
    <div className="min-h-screen bg-linen px-5 py-16 text-ink">
      <div className="mx-auto max-w-3xl rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-mint">
          Checking session
        </p>
        <p className="mt-2 text-lg font-bold">Loading your account...</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isCheckingAuth } = useAuth();
  const location = useLocation();

  if (isCheckingAuth) {
    return <RouteLoadingState />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
