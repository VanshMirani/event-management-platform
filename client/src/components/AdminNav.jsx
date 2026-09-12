import { Link, useLocation } from "react-router-dom";

const adminLinks = [
  { label: "Dashboard", to: "/admin/dashboard" },
  { label: "Users", to: "/admin/users" },
  { label: "Categories", to: "/admin/categories" },
  { label: "Events", to: "/admin/events" },
  { label: "Create event", to: "/admin/events/create" },
  { label: "Bookings", to: "/admin/bookings" },
  { label: "Payments", to: "/admin/payments" },
  { label: "Check-in", to: "/admin/check-in" }
];

export function AdminNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Admin navigation"
      className="surface-card overflow-x-auto rounded-lg p-2"
    >
      <div className="flex min-w-max gap-2">
        {adminLinks.map((link) => {
          const isExactMatch = link.to === location.pathname;
          const isDetailMatch =
            (link.to === "/admin/events" &&
              /^\/admin\/events\/[^/]+\/edit$/.test(location.pathname)) ||
            (link.to === "/admin/bookings" &&
              location.pathname.startsWith("/admin/bookings/")) ||
            (link.to === "/admin/payments" &&
              location.pathname.startsWith("/admin/payments/"));
          const isActive = isExactMatch || isDetailMatch;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                isActive
                  ? "action-primary shadow-lift"
                  : "text-ink/65 hover:bg-cyan/10 hover:text-cyan"
              }`}
              key={link.label}
              to={link.to}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
