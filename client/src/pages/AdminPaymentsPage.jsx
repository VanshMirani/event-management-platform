import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listAdminPayments } from "../api/admin.js";
import { AdminNav } from "../components/AdminNav.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatCurrency } from "../utils/formatCurrency.js";
import { formatDateTime } from "../utils/formatDate.js";
import { formatStatusLabel } from "../utils/formatStatusLabel.js";

const statusOptions = ["", "CREATED", "SUCCESS", "FAILED", "REFUNDED"];
const providerOptions = ["", "free", "razorpay"];
const initialFilters = { status: "", provider: "", search: "" };
const pageSize = 20;

function formatProvider(provider) {
  if (provider === "razorpay") {
    return "Razorpay Test Mode";
  }

  if (provider === "free") {
    return "Free booking";
  }

  return provider || "Not recorded";
}

export function AdminPaymentsPage() {
  useDocumentTitle("Admin Payments | EventFlow");

  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPayments = useCallback(async (nextFilters, page = 1) => {
    setIsLoading(true);
    setError("");

    try {
      const data = await listAdminPayments({
        ...nextFilters,
        page,
        limit: pageSize
      });
      setPayments(data.payments);
      setPagination(data.pagination);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments(initialFilters, 1);
  }, [loadPayments]);

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
    loadPayments(nextFilters, 1);
  }

  function clearFilters() {
    const nextFilters = initialFilters;
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    loadPayments(nextFilters, 1);
  }

  return (
    <AppLayout>
      <section className="site-shell py-10 lg:py-14">
        <AdminNav />

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">
              Payment management
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
              Payments
            </h1>
          </div>
          <p className="surface-card rounded-lg px-4 py-2 text-sm font-bold text-ink/70">
            {`${pagination?.total ?? payments.length} ${
              (pagination?.total ?? payments.length) === 1 ? "payment" : "payments"
            }`}
          </p>
        </div>

        <form
          className="surface-card mt-6 grid gap-3 rounded-lg p-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto_auto]"
          onSubmit={handleSubmit}
        >
          <input
            className="min-w-0 rounded-lg border border-ink/15 px-4 py-3 text-sm text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15 md:col-span-2 lg:col-span-1"
            aria-label="Search payments"
            name="search"
            onChange={updateFilter}
            placeholder="Search payment, booking, user, or event"
            type="search"
            value={filters.search}
          />
          <select
            className="rounded-lg border border-ink/15 px-4 py-3 text-sm text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            aria-label="Filter payments by status"
            name="status"
            onChange={updateFilter}
            value={filters.status}
          >
            {statusOptions.map((status) => (
              <option key={status || "ALL"} value={status}>
                {status ? formatStatusLabel(status) : "All statuses"}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-ink/15 px-4 py-3 text-sm text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            aria-label="Filter payments by provider"
            name="provider"
            onChange={updateFilter}
            value={filters.provider}
          >
            {providerOptions.map((provider) => (
              <option key={provider || "ALL"} value={provider}>
                {provider ? formatProvider(provider) : "All providers"}
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
            <p className="p-6 text-sm font-semibold text-ink/60">Loading payments...</p>
          ) : error ? (
            <div className="p-6">
              <p className="text-sm font-semibold text-ember">{error}</p>
              <button
                className="action-primary mt-4 px-4 py-2 text-sm font-bold"
                onClick={() => loadPayments(appliedFilters, pagination?.page ?? 1)}
                type="button"
              >
                Retry
              </button>
            </div>
          ) : payments.length === 0 ? (
            <p className="p-6 text-sm font-semibold text-ink/60">No payments found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
                <thead className="bg-linen text-xs font-bold uppercase tracking-wide text-ink/65">
                  <tr>
                    <th className="px-4 py-3" scope="col">Payment</th>
                    <th className="px-4 py-3" scope="col">Booking</th>
                    <th className="px-4 py-3" scope="col">User</th>
                    <th className="px-4 py-3" scope="col">Event</th>
                    <th className="px-4 py-3" scope="col">Provider</th>
                    <th className="px-4 py-3" scope="col">Amount</th>
                    <th className="px-4 py-3" scope="col">Status</th>
                    <th className="px-4 py-3" scope="col">Paid/Created</th>
                    <th className="px-4 py-3" scope="col">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="max-w-[190px] break-all px-4 py-4 font-bold text-ink">
                        {payment.id}
                      </td>
                      <td className="px-4 py-4 text-ink/70">{payment.bookingCode}</td>
                      <td className="px-4 py-4 text-ink/70">
                        <span className="block font-bold text-ink">{payment.user?.name}</span>
                        <span>{payment.user?.email}</span>
                      </td>
                      <td className="px-4 py-4 text-ink/70">{payment.event?.title}</td>
                      <td className="px-4 py-4 text-ink/70">
                        {formatProvider(payment.provider)}
                      </td>
                      <td className="px-4 py-4 font-bold text-ink">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={payment.status} />
                      </td>
                      <td className="px-4 py-4 text-ink/65">
                        {formatDateTime(payment.paidAt ?? payment.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          aria-label={`View payment ${payment.id}`}
                          className="rounded-lg border border-ink/15 px-3 py-2 text-sm font-bold text-ink hover:border-mint hover:text-mint"
                          to={`/admin/payments/${payment.id}`}
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
            aria-label="Payment list pages"
            className="mt-5 flex flex-wrap items-center justify-between gap-3"
          >
            <button
              className="action-secondary px-4 py-2 text-sm font-bold disabled:cursor-not-allowed"
              disabled={isLoading || pagination.page <= 1}
              onClick={() => loadPayments(appliedFilters, pagination.page - 1)}
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
              onClick={() => loadPayments(appliedFilters, pagination.page + 1)}
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
