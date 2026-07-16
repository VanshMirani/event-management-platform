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
    <nav className="surface-card flex flex-wrap gap-2 rounded-lg p-2">
      {adminLinks.map((link) => {
        const isActive =
          link.to === location.pathname ||
          (link.to !== "/admin/dashboard" && location.pathname.startsWith(`${link.to}/`));

        return (
          <Link
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
    </nav>
  );
}
