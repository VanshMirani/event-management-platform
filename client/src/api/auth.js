import { apiGet, apiPost } from "./http.js";

export async function registerRequest(data) {
  const response = await apiPost("/auth/register", data);
  return response.data.user;
}

export async function loginRequest(data) {
  const response = await apiPost("/auth/login", data);
  return response.data.user;
}

export async function logoutRequest() {
  await apiPost("/auth/logout");
}

export async function currentUserRequest() {
  const response = await apiGet("/auth/me");
  return response.data.user;
}
