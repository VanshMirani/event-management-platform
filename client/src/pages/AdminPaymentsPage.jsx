import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listAdminPayments } from "../api/admin.js";
import { AdminNav } from "../components/AdminNav.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatCurrency } from "../utils/formatCurrency.js";
import { formatDateTime } from "../utils/formatDate.js";

const statusOptions = ["", "CREATED", "SUCCESS", "FAILED", "REFUNDED"];
const providerOptions = ["", "razorpay"];

export function AdminPaymentsPage() {
  useDocumentTitle("Admin Payments | EventFlow");

  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({ status: "", provider: "", search: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPayments(nextFilters = filters) {
    setIsLoading(true);
    setError("");

    try {
      const data = await listAdminPayments({
        ...nextFilters,
        page: 1,
        limit: 20
      });
      setPayments(data.payments);
      setPagination(data.pagination);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    loadPayments(filters);
  }

  function clearFilters() {
    const nextFilters = { status: "", provider: "", search: "" };
    setFilters(nextFilters);
    loadPayments(nextFilters);
  }

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-14">
        <AdminNav />

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-mint">
              Payment management
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
              Payments
            </h1>
          </div>
          <p className="rounded-lg border border-ink/10 bg-white px-4 py-2 text-sm font-bold text-ink/70">
            {pagination ? `${pagination.total} payments` : `${payments.length} payments`}
          </p>
        </div>

        <form
          className="mt-6 grid gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_180px_auto_auto]"
          onSubmit={handleSubmit}
        >
          <input
            className="rounded-lg border border-ink/15 px-4 py-3 text-sm text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            name="search"
            onChange={updateFilter}
            placeholder="Search payment, booking, user, or event"
            type="search"
            value={filters.search}
          />
          <select
            className="rounded-lg border border-ink/15 px-4 py-3 text-sm text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
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
          <select
            className="rounded-lg border border-ink/15 px-4 py-3 text-sm text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
            name="provider"
            onChange={updateFilter}
            value={filters.provider}
          >
            {providerOptions.map((provider) => (
              <option key={provider || "ALL"} value={provider}>
                {provider || "All providers"}
              </option>
            ))}
          </select>
          <button
            className="rounded-lg bg-ember px-5 py-3 text-sm font-bold text-white hover:bg-ink"
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

        <div className="mt-6 overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm">
          {isLoading ? (
            <p className="p-6 text-sm font-semibold text-ink/60">Loading payments...</p>
          ) : error ? (
            <div className="p-6">
              <p className="text-sm font-semibold text-ember">{error}</p>
              <button
                className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-ember"
                onClick={() => loadPayments()}
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
                <thead className="bg-linen text-xs font-bold uppercase tracking-wide text-ink/55">
                  <tr>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Paid/Created</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-4 font-bold text-ink">{payment.id}</td>
                      <td className="px-4 py-4 text-ink/70">{payment.bookingCode}</td>
                      <td className="px-4 py-4 text-ink/70">
                        <span className="block font-bold text-ink">{payment.user?.name}</span>
                        <span>{payment.user?.email}</span>
                      </td>
                      <td className="px-4 py-4 text-ink/70">{payment.event?.title}</td>
                      <td className="px-4 py-4 text-ink/70">{payment.provider}</td>
                      <td className="px-4 py-4 font-bold text-ink">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-lg bg-mint/10 px-3 py-1 text-xs font-bold text-mint">
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-ink/65">
                        {formatDateTime(payment.paidAt ?? payment.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <Link
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
      </section>
    </AppLayout>
  );
}
