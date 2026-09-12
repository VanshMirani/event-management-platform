const viteEnv = import.meta.env ?? {};
const defaultApiUrl = viteEnv.PROD ? "/api" : "http://localhost:5000/api";

const API_URL = (viteEnv.VITE_API_URL ?? defaultApiUrl).replace(
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

function getFallbackErrorMessage(status) {
  if (status === 400) {
    return "Please check the information and try again.";
  }

  if (status === 401) {
    return "Please sign in to continue.";
  }

  if (status === 403) {
    return "You do not have permission to complete this action.";
  }

  if (status === 404) {
    return "The requested information could not be found.";
  }

  if (status === 409) {
    return "This action could not be completed because the information has changed.";
  }

  if (status === 429) {
    return "Too many requests were made. Please wait a moment and try again.";
  }

  if (status >= 500) {
    return "The service is temporarily unavailable. Please try again shortly.";
  }

  return "We could not complete that request. Please try again.";
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

async function apiRequest(path, options = {}) {
  const { responseType = "json", skipAuthRefresh = false, ...requestOptions } = options;
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
      responseType,
      skipAuthRefresh: true
    });
  }

  const payload =
    response.ok && responseType === "blob"
      ? await response.blob()
      : await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401 && !refreshExcludedPaths.has(path)) {
      notifyUnauthorized();
    }

    const error = new Error(
      payload?.message || getFallbackErrorMessage(response.status)
    );
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
