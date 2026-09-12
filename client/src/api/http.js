const defaultApiUrl = import.meta.env.PROD ? "/api" : "http://localhost:5000/api";

export const API_URL = (import.meta.env.VITE_API_URL ?? defaultApiUrl).replace(
  /\/$/,
  ""
);

const refreshExcludedPaths = new Set([
  "/auth/login",
  "/auth/logout",
  "/auth/refresh",
  "/auth/register"
]);

let refreshRequest = null;
let authOperationQueue = Promise.resolve();
const unauthorizedListeners = new Set();

function queueAuthOperation(callback) {
  const operation = authOperationQueue.then(callback, callback);
  authOperationQueue = operation.catch(() => undefined);
  return operation;
}

function notifyUnauthorized() {
  for (const listener of unauthorizedListeners) {
    listener();
  }
}

export function subscribeToUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export function runAuthMutation(callback) {
  return queueAuthOperation(callback);
}

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

async function refreshSession() {
  if (!refreshRequest) {
    refreshRequest = queueAuthOperation(async () => {
      try {
        const response = await fetch(buildUrl("/auth/refresh"), {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({})
        });

        return response.ok;
      } catch {
        return false;
      }
    })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

export async function apiRequest(path, options = {}) {
  const { skipAuthRefresh = false, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);

  if (requestOptions.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path), {
    ...requestOptions,
    headers,
    credentials: "include"
  });

  if (
    response.status === 401 &&
    !skipAuthRefresh &&
    !refreshExcludedPaths.has(path) &&
    (await refreshSession())
  ) {
    return apiRequest(path, {
      ...requestOptions,
      skipAuthRefresh: true
    });
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401 && !refreshExcludedPaths.has(path)) {
      notifyUnauthorized();
    }

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
