export function getAuthRoadmap() {
  return {
    implemented: false,
    strategy: "JWT with httpOnly cookies",
    endpoints: ["register", "login", "logout", "refresh", "me"]
  };
}
