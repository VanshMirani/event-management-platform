import { sendError } from "../utils/apiResponse.js";

export function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 20,
  message = "Too many requests, please try again later"
} = {}) {
  const attempts = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.method}:${req.originalUrl}`;
    const current = attempts.get(key);
    const bucket =
      current && current.resetAt > now
        ? current
        : {
            count: 0,
            resetAt: now + windowMs
          };

    bucket.count += 1;
    attempts.set(key, bucket);

    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
    res.set("RateLimit-Limit", String(max));
    res.set("RateLimit-Remaining", String(Math.max(max - bucket.count, 0)));
    res.set("RateLimit-Reset", String(retryAfterSeconds));

    if (bucket.count > max) {
      res.set("Retry-After", String(retryAfterSeconds));
      return sendError(res, message, 429);
    }

    return next();
  };
}

export const authRateLimiter = createRateLimiter({
  max: 20,
  message: "Too many auth attempts, please try again later"
});
