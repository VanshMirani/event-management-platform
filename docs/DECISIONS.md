# Technical decisions

- **Single-origin production service:** Express serves the Vite build and API.
  This removes cross-origin cookie complexity and supports React deep links.
- **Razorpay Test Mode only:** Checkout uses test credentials, the UI labels the
  flow clearly, and the server rejects live Razorpay keys before provider calls.
- **Optional demo fallback:** No-charge confirmation remains guarded by a server
  flag and is separately enabled at client build time, but is disabled by default.
- **Database-backed readiness:** The health endpoint reports ready only after a
  PostgreSQL query succeeds.
- **Server-authoritative bookings:** Ticket prices, inventory, expiry, ownership,
  and confirmation are enforced by the API rather than trusted from the client.
- **Host-only cookies by default:** `COOKIE_DOMAIN` is optional, which is safer
  for local and Render hostnames.
- **Fresh deployment migrations:** Production uses `prisma migrate deploy`; local
  schema development continues to use `prisma migrate dev`.
