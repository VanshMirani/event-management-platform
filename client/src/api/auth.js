import { apiGet, apiPost, runAuthMutation } from "./http.js";

export async function registerRequest(data) {
  const response = await runAuthMutation(() => apiPost("/auth/register", data));
  return response.data.user;
}

export async function loginRequest(data) {
  const response = await runAuthMutation(() => apiPost("/auth/login", data));
  return response.data.user;
}

export async function logoutRequest() {
  await runAuthMutation(() => apiPost("/auth/logout"));
}

export async function currentUserRequest() {
  const response = await apiGet("/auth/me");
  return response.data.user;
}
