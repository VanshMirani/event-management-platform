import { Link, useLocation } from "react-router-dom";

const adminLinks = [
  { label: "Dashboard", to: "/admin/dashboard" },
  { label: "Users", to: "/admin/users" },
  { label: "Categories", to: "/admin/categories" },
  { label: "Events", to: "/admin/events" },
  { label: "Create event", to: "/admin/events/create" },
  { label: "Bookings", to: "/admin/dashboard#bookings" },
  { label: "Payments", to: "/admin/dashboard#payments" }
];

export function AdminNav() {
  const location = useLocation();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-ink/10 pb-5">
      {adminLinks.map((link) => {
        const isActive = link.to === location.pathname;

        return (
          <Link
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              isActive
                ? "bg-ink text-white"
                : "border border-ink/10 bg-white text-ink/70 hover:border-mint hover:text-mint"
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
