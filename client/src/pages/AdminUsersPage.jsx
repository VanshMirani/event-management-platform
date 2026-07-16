import { useEffect, useMemo, useState } from "react";
import { listAdminUsers, updateAdminUserStatus } from "../api/admin.js";
import { AdminNav } from "../components/AdminNav.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useAuth } from "../features/auth/index.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium"
});

function formatDate(value) {
  return dateFormatter.format(new Date(value));
}

export function AdminUsersPage() {
  useDocumentTitle("Admin Users | EventFlow");

  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState("");

  const userCountLabel = useMemo(() => {
    if (!pagination) {
      return `${users.length} users`;
    }

    return `${pagination.total} users`;
  }, [pagination, users.length]);

  async function loadUsers() {
    setIsLoading(true);
    setError("");

    try {
      const data = await listAdminUsers();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleToggleStatus(user) {
    const nextStatus = user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    setUpdatingUserId(user.id);
    setActionError("");

    try {
      const updatedUser = await updateAdminUserStatus(user.id, nextStatus);
      setUsers((currentUsers) =>
        currentUsers.map((current) => (current.id === updatedUser.id ? updatedUser : current))
      );
    } catch (updateError) {
      setActionError(updateError.message);
    } finally {
      setUpdatingUserId("");
    }
  }

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-14">
        <AdminNav />

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">
              User management
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
              Platform users
            </h1>
          </div>
          <p className="surface-card rounded-lg px-4 py-2 text-sm font-bold text-ink/70">
            {userCountLabel}
          </p>
        </div>

        {actionError ? (
          <p className="mt-5 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember">
            {actionError}
          </p>
        ) : null}

        <div className="surface-card mt-6 overflow-hidden rounded-lg">
          {isLoading ? (
            <p className="p-6 text-sm font-semibold text-ink/60">Loading users...</p>
          ) : error ? (
            <div className="p-6">
              <p className="text-sm font-semibold text-ember">{error}</p>
              <button
                className="action-primary mt-4 px-4 py-2 text-sm font-bold"
                onClick={loadUsers}
                type="button"
              >
                Retry
              </button>
            </div>
          ) : users.length === 0 ? (
            <p className="p-6 text-sm font-semibold text-ink/60">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-linen text-xs font-bold uppercase tracking-wide text-ink/55">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {users.map((user) => {
                    const isCurrentAdmin = user.id === currentUser?.id;
                    const isUpdating = updatingUserId === user.id;
                    const nextAction = user.status === "ACTIVE" ? "Block" : "Unblock";

                    return (
                      <tr key={user.id}>
                        <td className="px-4 py-4 font-bold text-ink">{user.name}</td>
                        <td className="px-4 py-4 text-ink/70">{user.email}</td>
                        <td className="px-4 py-4">
                          <span className="rounded-lg border border-aurora/20 bg-aurora/10 px-3 py-1 text-xs font-extrabold text-aurora">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={user.status} />
                        </td>
                        <td className="px-4 py-4 text-ink/65">{formatDate(user.createdAt)}</td>
                        <td className="px-4 py-4">
                          <button
                            className="rounded-lg border border-ink/15 px-4 py-2 text-sm font-bold text-ink hover:border-ember hover:text-ember disabled:cursor-not-allowed disabled:border-ink/10 disabled:text-ink/35"
                            disabled={isCurrentAdmin || isUpdating}
                            onClick={() => handleToggleStatus(user)}
                            type="button"
                          >
                            {isCurrentAdmin
                              ? "Current admin"
                              : isUpdating
                                ? "Saving..."
                                : nextAction}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AppLayout>
  );
}
