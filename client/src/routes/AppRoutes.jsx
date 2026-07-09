import { Navigate, Route, Routes } from "react-router-dom";
import { AdminCategoriesPage } from "../pages/AdminCategoriesPage.jsx";
import { AdminDashboardPage } from "../pages/AdminDashboardPage.jsx";
import { AdminUsersPage } from "../pages/AdminUsersPage.jsx";
import { HomePage } from "../pages/HomePage.jsx";
import { LoginPage } from "../pages/LoginPage.jsx";
import { RegisterPage } from "../pages/RegisterPage.jsx";
import { UserDashboardPage } from "../pages/UserDashboardPage.jsx";
import { AdminRoute } from "./AdminRoute.jsx";
import { ProtectedRoute } from "./ProtectedRoute.jsx";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/user/dashboard"
        element={
          <ProtectedRoute>
            <UserDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminUsersPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <AdminRoute>
            <AdminCategoriesPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
