import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listAdminBookings } from "../api/admin.js";
import { AdminNav } from "../components/AdminNav.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatCurrency } from "../utils/formatCurrency.js";
import { formatDateTime } from "../utils/formatDate.js";

const statusOptions = ["", "PENDING", "CONFIRMED", "FAILED", "CANCELLED", "REFUNDED"];
const initialFilters = { status: "", search: "" };
const pageSize = 20;

export function AdminBookingsPage() {
  useDocumentTitle("Admin Bookings | EventFlow");

  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBookings = useCallback(async (nextFilters, page = 1) => {
    setIsLoading(true);
    setError("");

    try {
      const data = await listAdminBookings({
        ...nextFilters,
        page,
        limit: pageSize
      });
      setBookings(data.bookings);
      setPagination(data.pagination);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings(initialFilters, 1);
  }, [loadBookings]);

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextFilters = { ...filters };
    setAppliedFilters(nextFilters);
    loadBookings(nextFilters, 1);
  }

  function clearFilters() {
    const nextFilters = initialFilters;
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    loadBookings(nextFilters, 1);
  }

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-14">
        <AdminNav />

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">
              Booking management
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
              Bookings
            </h1>
          </div>
          <p className="surface-card rounded-lg px-4 py-2 text-sm font-bold text-ink/70">
            {pagination ? `${pagination.total} bookings` : `${bookings.length} bookings`}
          </p>
        </div>

        <form
          className="surface-card mt-6 grid gap-3 rounded-lg p-4 md:grid-cols-[1fr_220px_auto_auto]"
          onSubmit={handleSubmit}
        >
          <input
            className="rounded-lg border border-ink/15 px-4 py-3 text-sm text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            aria-label="Search bookings"
            name="search"
            onChange={updateFilter}
            placeholder="Search booking, user, or event"
            type="search"
            value={filters.search}
          />
          <select
            className="rounded-lg border border-ink/15 px-4 py-3 text-sm text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            aria-label="Filter bookings by status"
            name="status"
            onChange={updateFilter}
            value={filters.status}
          >
            {statusOptions.map((status) => (
              <option key={status || "ALL"} value={status}>
                {status || "All statuses"}
              </option>
            ))}
          </select>
          <button
            className="action-primary px-5 py-3 text-sm font-bold"
            type="submit"
          >
            Filter
          </button>
          <button
            className="rounded-lg border border-ink/15 px-5 py-3 text-sm font-bold text-ink hover:border-mint hover:text-mint"
            onClick={clearFilters}
            type="button"
          >
            Clear
          </button>
        </form>

        <div className="surface-card mt-6 overflow-hidden rounded-lg">
          {isLoading ? (
            <p className="p-6 text-sm font-semibold text-ink/60">Loading bookings...</p>
          ) : error ? (
            <div className="p-6">
              <p className="text-sm font-semibold text-ember">{error}</p>
              <button
                className="action-primary mt-4 px-4 py-2 text-sm font-bold"
                onClick={() => loadBookings(appliedFilters, pagination?.page ?? 1)}
                type="button"
              >
                Retry
              </button>
            </div>
          ) : bookings.length === 0 ? (
            <p className="p-6 text-sm font-semibold text-ink/60">No bookings found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead className="bg-linen text-xs font-bold uppercase tracking-wide text-ink/55">
                  <tr>
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-4 py-4 font-bold text-ink">{booking.bookingCode}</td>
                      <td className="px-4 py-4 text-ink/70">
                        <span className="block font-bold text-ink">{booking.user?.name}</span>
                        <span>{booking.user?.email}</span>
                      </td>
                      <td className="px-4 py-4 text-ink/70">{booking.event?.title}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="px-4 py-4 font-bold text-ink">
                        {formatCurrency(booking.finalAmount, booking.currency)}
                      </td>
                      <td className="px-4 py-4 text-ink/70">
                        {booking.paymentStatus ? (
                          <StatusBadge status={booking.paymentStatus} />
                        ) : (
                          "No payment"
                        )}
                      </td>
                      <td className="px-4 py-4 text-ink/65">
                        {formatDateTime(booking.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          className="rounded-lg border border-ink/15 px-3 py-2 text-sm font-bold text-ink hover:border-mint hover:text-mint"
                          to={`/admin/bookings/${booking.id}`}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {pagination?.totalPages > 1 ? (
          <nav
            aria-label="Booking list pages"
            className="mt-5 flex flex-wrap items-center justify-between gap-3"
          >
            <button
              className="action-secondary px-4 py-2 text-sm font-bold disabled:cursor-not-allowed"
              disabled={isLoading || pagination.page <= 1}
              onClick={() => loadBookings(appliedFilters, pagination.page - 1)}
              type="button"
            >
              Previous
            </button>
            <p className="text-sm font-bold text-ink/60">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <button
              className="action-secondary px-4 py-2 text-sm font-bold disabled:cursor-not-allowed"
              disabled={isLoading || pagination.page >= pagination.totalPages}
              onClick={() => loadBookings(appliedFilters, pagination.page + 1)}
              type="button"
            >
              Next
            </button>
          </nav>
        ) : null}
      </section>
    </AppLayout>
  );
}
