import { Navigate, Route, Routes } from "react-router-dom";
import { AdminCategoriesPage } from "../pages/AdminCategoriesPage.jsx";
import { AdminBookingDetailPage } from "../pages/AdminBookingDetailPage.jsx";
import { AdminBookingsPage } from "../pages/AdminBookingsPage.jsx";
import { AdminDashboardPage } from "../pages/AdminDashboardPage.jsx";
import { AdminEventCreatePage } from "../pages/AdminEventCreatePage.jsx";
import { AdminEventEditPage } from "../pages/AdminEventEditPage.jsx";
import { AdminEventsPage } from "../pages/AdminEventsPage.jsx";
import { AdminPaymentDetailPage } from "../pages/AdminPaymentDetailPage.jsx";
import { AdminPaymentsPage } from "../pages/AdminPaymentsPage.jsx";
import { AdminUsersPage } from "../pages/AdminUsersPage.jsx";
import { CheckoutPage } from "../pages/CheckoutPage.jsx";
import { EventDetailPage } from "../pages/EventDetailPage.jsx";
import { EventsPage } from "../pages/EventsPage.jsx";
import { HomePage } from "../pages/HomePage.jsx";
import { LoginPage } from "../pages/LoginPage.jsx";
import { PaymentFailedPage } from "../pages/PaymentFailedPage.jsx";
import { PaymentSuccessPage } from "../pages/PaymentSuccessPage.jsx";
import { RegisterPage } from "../pages/RegisterPage.jsx";
import { UserBookingsPage } from "../pages/UserBookingsPage.jsx";
import { UserDashboardPage } from "../pages/UserDashboardPage.jsx";
import { AdminRoute } from "./AdminRoute.jsx";
import { ProtectedRoute } from "./ProtectedRoute.jsx";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/events/:slug" element={<EventDetailPage />} />
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
        path="/user/bookings"
        element={
          <ProtectedRoute>
            <UserBookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkout/:bookingId"
        element={
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment-success"
        element={
          <ProtectedRoute>
            <PaymentSuccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment-failed"
        element={
          <ProtectedRoute>
            <PaymentFailedPage />
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
      <Route
        path="/admin/events"
        element={
          <AdminRoute>
            <AdminEventsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/events/create"
        element={
          <AdminRoute>
            <AdminEventCreatePage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/events/:id/edit"
        element={
          <AdminRoute>
            <AdminEventEditPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/bookings"
        element={
          <AdminRoute>
            <AdminBookingsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/bookings/:id"
        element={
          <AdminRoute>
            <AdminBookingDetailPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <AdminRoute>
            <AdminPaymentsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/payments/:id"
        element={
          <AdminRoute>
            <AdminPaymentDetailPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
