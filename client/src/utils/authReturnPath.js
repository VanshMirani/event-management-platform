export function getDashboardPath(user) {
  return user?.role === "ADMIN" ? "/admin/dashboard" : "/user/dashboard";
}

export function getAuthReturnPath(location, user) {
  const from = location.state?.from;
  const pathname = from?.pathname;

  if (
    !pathname ||
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    pathname === "/login" ||
    pathname === "/register"
  ) {
    return getDashboardPath(user);
  }

  const isPublicEventRoute = pathname === "/events" || pathname.startsWith("/events/");
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isUserRoute =
    pathname === "/user" ||
    pathname.startsWith("/user/") ||
    pathname.startsWith("/checkout/") ||
    pathname === "/payment-success" ||
    pathname === "/payment-failed";

  if (
    !isPublicEventRoute &&
    !(
      (user?.role === "ADMIN" && isAdminRoute) ||
      (user?.role !== "ADMIN" && isUserRoute)
    )
  ) {
    return getDashboardPath(user);
  }

  return `${pathname}${from.search ?? ""}${from.hash ?? ""}`;
}

export function getAuthNavigationState(location) {
  return location.state?.from ? { from: location.state.from } : undefined;
}
