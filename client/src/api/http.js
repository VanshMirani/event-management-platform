export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:5000/api").replace(
  /\/$/,
  ""
);

function buildUrl(path) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return null;
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
    credentials: "include"
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(payload?.message ?? `Request failed with status ${response.status}`);
    error.status = response.status;
    error.details = payload?.details ?? null;
    throw error;
  }

  return payload;
}

export function apiGet(path, options = {}) {
  return apiRequest(path, {
    ...options,
    method: "GET"
  });
}

export function apiPost(path, data, options = {}) {
  return apiRequest(path, {
    ...options,
    method: "POST",
    body: JSON.stringify(data ?? {})
  });
}

export function apiPatch(path, data, options = {}) {
  return apiRequest(path, {
    ...options,
    method: "PATCH",
    body: JSON.stringify(data ?? {})
  });
}

export function apiDelete(path, options = {}) {
  return apiRequest(path, {
    ...options,
    method: "DELETE"
  });
}
