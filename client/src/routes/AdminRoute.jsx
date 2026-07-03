import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/index.js";
import { ProtectedRoute } from "./ProtectedRoute.jsx";

export function AdminRoute({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  return (
    <ProtectedRoute>
      {currentUser?.role === "ADMIN" ? (
        children
      ) : (
        <Navigate to="/user/dashboard" replace state={{ from: location }} />
      )}
    </ProtectedRoute>
  );
}
