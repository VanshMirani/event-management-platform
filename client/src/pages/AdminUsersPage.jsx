import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus
} from "../api/admin.js";
import { AdminNav } from "../components/AdminNav.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useAuth } from "../features/auth/index.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium"
});
const pageSize = 20;

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
  const [actionSuccess, setActionSuccess] = useState("");
  const [pendingAction, setPendingAction] = useState({ userId: "", type: "" });

  const userCountLabel = useMemo(() => {
    const count = pagination?.total ?? users.length;
    return `${count} ${count === 1 ? "user" : "users"}`;
  }, [pagination, users.length]);

  const loadUsers = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError("");

    try {
      const data = await listAdminUsers({ page, limit: pageSize });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers(1);
  }, [loadUsers]);

  async function handleToggleStatus(user) {
    const nextStatus = user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    const actionLabel = nextStatus === "BLOCKED" ? "block" : "unblock";

    if (!window.confirm(`Are you sure you want to ${actionLabel} ${user.name}?`)) {
      return;
    }

    setPendingAction({ userId: user.id, type: "status" });
    setActionError("");
    setActionSuccess("");

    try {
      const updatedUser = await updateAdminUserStatus(user.id, nextStatus);
      setUsers((currentUsers) =>
        currentUsers.map((current) => (current.id === updatedUser.id ? updatedUser : current))
      );
      setActionSuccess(`${updatedUser.name} is now ${nextStatus.toLowerCase()}.`);
    } catch (updateError) {
      setActionError(updateError.message);
    } finally {
      setPendingAction({ userId: "", type: "" });
    }
  }

  async function handleRoleChange(user, nextRole, selectElement) {
    if (nextRole === user.role) {
      return;
    }

    const roleLabel = nextRole === "ADMIN" ? "Admin" : "User";
    if (!window.confirm(`Change ${user.name}'s role to ${roleLabel}?`)) {
      selectElement.value = user.role;
      return;
    }

    setPendingAction({ userId: user.id, type: "role" });
    setActionError("");
    setActionSuccess("");

    try {
      const updatedUser = await updateAdminUserRole(user.id, nextRole);
      setUsers((currentUsers) =>
        currentUsers.map((current) => (current.id === updatedUser.id ? updatedUser : current))
      );
      setActionSuccess(`${updatedUser.name}'s role is now ${roleLabel}.`);
    } catch (updateError) {
      setActionError(updateError.message);
    } finally {
      setPendingAction({ userId: "", type: "" });
    }
  }

  return (
    <AppLayout>
      <section className="site-shell py-10 lg:py-14">
        <AdminNav />

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">
              User management
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
              Platform users
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
              Assign User or Admin access and manage account status. Your own admin access is
              locked.
            </p>
          </div>
          <p className="surface-card rounded-lg px-4 py-2 text-sm font-bold text-ink/70">
            {userCountLabel}
          </p>
        </div>

        {actionError ? (
          <p
            className="mt-5 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember"
            role="alert"
          >
            {actionError}
          </p>
        ) : null}
        {actionSuccess ? (
          <p
            aria-live="polite"
            className="mt-5 rounded-lg border border-mint/20 bg-mint/10 px-4 py-3 text-sm font-semibold text-mint"
            role="status"
          >
            {actionSuccess}
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
                onClick={() => loadUsers(pagination?.page ?? 1)}
                type="button"
              >
                Retry
              </button>
            </div>
          ) : users.length === 0 ? (
            <p className="p-6 text-sm font-semibold text-ink/60">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead className="bg-linen text-xs font-bold uppercase tracking-wide text-ink/65">
                  <tr>
                    <th className="px-4 py-3" scope="col">Name</th>
                    <th className="px-4 py-3" scope="col">Email</th>
                    <th className="px-4 py-3" scope="col">Role</th>
                    <th className="px-4 py-3" scope="col">Status</th>
                    <th className="px-4 py-3" scope="col">Created</th>
                    <th className="px-4 py-3" scope="col">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {users.map((user) => {
                    const isCurrentAdmin = user.id === currentUser?.id;
                    const isUpdating = pendingAction.userId === user.id;
                    const isUpdatingRole = isUpdating && pendingAction.type === "role";
                    const isUpdatingStatus = isUpdating && pendingAction.type === "status";
                    const isAnyActionPending = Boolean(pendingAction.userId);
                    const hasManageableRole = user.role === "USER" || user.role === "ADMIN";
                    const nextAction = user.status === "ACTIVE" ? "Block" : "Unblock";

                    return (
                      <tr aria-busy={isUpdating} key={user.id}>
                        <td className="px-4 py-4 font-bold text-ink">{user.name}</td>
                        <td className="px-4 py-4 text-ink/70">{user.email}</td>
                        <td className="px-4 py-4">
                          {hasManageableRole ? (
                            <div className="min-w-36">
                              <label className="sr-only" htmlFor={`user-role-${user.id}`}>
                                Role for {user.name}
                              </label>
                              <select
                                aria-describedby={
                                  isCurrentAdmin ? `current-admin-lock-${user.id}` : undefined
                                }
                                className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm font-bold text-ink outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20 disabled:cursor-not-allowed disabled:text-ink/60"
                                disabled={isCurrentAdmin || isAnyActionPending}
                                id={`user-role-${user.id}`}
                                onChange={(event) =>
                                  handleRoleChange(user, event.target.value, event.currentTarget)
                                }
                                title={
                                  isCurrentAdmin
                                    ? "Your own admin role cannot be changed"
                                    : `Change role for ${user.name}`
                                }
                                value={user.role}
                              >
                                <option value="USER">User</option>
                                <option value="ADMIN">Admin</option>
                              </select>
                              {isUpdatingRole ? (
                                <span className="mt-1 block text-xs font-semibold text-ink/65">
                                  Saving role...
                                </span>
                              ) : null}
                              {isCurrentAdmin ? (
                                <span className="sr-only" id={`current-admin-lock-${user.id}`}>
                                  Your own role and status cannot be changed here.
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="rounded-lg border border-ink/15 bg-linen px-3 py-1 text-xs font-extrabold text-ink/60">
                              Reserved role
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={user.status} />
                        </td>
                        <td className="px-4 py-4 text-ink/65">{formatDate(user.createdAt)}</td>
                        <td className="px-4 py-4">
                          <button
                            aria-label={`${nextAction} ${user.name}`}
                            className="rounded-lg border border-ink/15 px-4 py-2 text-sm font-bold text-ink hover:border-ember hover:text-ember disabled:cursor-not-allowed disabled:border-ink/10 disabled:text-ink/60"
                            disabled={isCurrentAdmin || isAnyActionPending}
                            onClick={() => handleToggleStatus(user)}
                            type="button"
                          >
                            {isCurrentAdmin
                              ? "Current admin"
                              : isUpdatingStatus
                                ? "Saving status..."
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
        {pagination?.totalPages > 1 ? (
          <nav
            aria-label="User list pages"
            className="mt-5 flex flex-wrap items-center justify-between gap-3"
          >
            <button
              className="action-secondary px-4 py-2 text-sm font-bold disabled:cursor-not-allowed"
              disabled={isLoading || pagination.page <= 1}
              onClick={() => loadUsers(pagination.page - 1)}
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
              onClick={() => loadUsers(pagination.page + 1)}
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
