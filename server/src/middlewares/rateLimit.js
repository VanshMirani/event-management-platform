import { sendError } from "../utils/apiResponse.js";

function normalizeIp(ip) {
  const normalized = String(ip || "unknown").trim();
  return normalized.startsWith("::ffff:") ? normalized.slice(7) : normalized;
}

function defaultKeyGenerator(req) {
  const ip = normalizeIp(req.ip ?? req.socket?.remoteAddress);
  const method = String(req.method ?? "GET").toUpperCase();
  const routePath = req.route?.path ?? req.path ?? String(req.url ?? "/").split("?")[0];
  const path = `${req.baseUrl ?? ""}${routePath}`;

  return `${ip}:${method}:${path}`;
}

export function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 20,
  message = "Too many requests, please try again later",
  keyGenerator = defaultKeyGenerator,
  clock = Date.now,
  cleanupIntervalMs = Math.min(windowMs, 60 * 1000),
  maxEntries = 10_000
} = {}) {
  const attempts = new Map();
  let nextCleanupAt = 0;

  function cleanup(now, force = false) {
    if (!force && now < nextCleanupAt) {
      return;
    }

    for (const [key, bucket] of attempts) {
      if (bucket.resetAt <= now) {
        attempts.delete(key);
      }
    }

    nextCleanupAt = now + Math.max(1, cleanupIntervalMs);
  }

  function setHeaders(res, count, resetAt, now) {
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
    res.set("RateLimit-Limit", String(max));
    res.set("RateLimit-Remaining", String(Math.max(max - count, 0)));
    res.set("RateLimit-Reset", String(retryAfterSeconds));

    return retryAfterSeconds;
  }

  return (req, res, next) => {
    const now = clock();
    cleanup(now);

    const key = keyGenerator(req);
    const current = attempts.get(key);

    if (!current && attempts.size >= maxEntries) {
      cleanup(now, true);

      if (attempts.size >= maxEntries) {
        const earliestResetAt = Math.min(
          ...Array.from(attempts.values(), (bucket) => bucket.resetAt)
        );
        const retryAfterSeconds = setHeaders(res, max + 1, earliestResetAt, now);
        res.set("Retry-After", String(retryAfterSeconds));
        return sendError(res, message, 429);
      }
    }

    const bucket =
      current && current.resetAt > now
        ? current
        : {
            count: 0,
            resetAt: now + windowMs
          };

    bucket.count = Math.min(bucket.count + 1, max + 1);
    attempts.set(key, bucket);

    const retryAfterSeconds = setHeaders(res, bucket.count, bucket.resetAt, now);

    if (bucket.count > max) {
      res.set("Retry-After", String(retryAfterSeconds));
      return sendError(res, message, 429);
    }

    return next();
  };
}

export const authRateLimiter = createRateLimiter({
  max: process.env.NODE_ENV === "test" ? 1_000 : 20,
  message: "Too many auth attempts, please try again later"
});
