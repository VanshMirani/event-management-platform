# Technical decisions

- **Split hosting with a same-origin API path:** Vercel serves the public React
  frontend and rewrites `/api/*` to the Express service on Render. The browser
  therefore uses the Vercel origin for pages, API requests, and host-only auth
  cookies, while Render owns the API and PostgreSQL connection. Express retains
  static Vite serving as a direct-Render fallback.
- **SPA routing at both hosts:** Vercel rewrites frontend routes to `index.html`,
  and Express provides the equivalent production fallback when its bundled client
  is accessed directly.
- **Razorpay Test Mode only:** Checkout uses test credentials, the UI labels the
  flow clearly, and the server rejects live Razorpay keys before provider calls.
- **Database-backed readiness:** The health endpoint reports ready only after a
  PostgreSQL query succeeds.
- **Server-authoritative bookings:** Ticket prices, inventory, expiry, ownership,
  and confirmation are enforced by the API rather than trusted from the client.
- **Host-only cookies by default:** `COOKIE_DOMAIN` is optional. With the Vercel
  API rewrite, the browser receives auth cookies from the public Vercel origin
  without requiring cross-site cookie settings.
- **Fresh deployment migrations:** Production uses `prisma migrate deploy`; local
  schema development continues to use `prisma migrate dev`.
