# Technical decisions

- **Single-origin production service:** Express serves the Vite build and API.
  This removes cross-origin cookie complexity and supports React deep links.
- **Explicit demo checkout:** No-charge confirmation is guarded by a server
  environment flag and separately enabled at client build time.
- **Database-backed readiness:** The health endpoint reports ready only after a
  PostgreSQL query succeeds.
- **Server-authoritative bookings:** Ticket prices, inventory, expiry, ownership,
  and confirmation are enforced by the API rather than trusted from the client.
- **Host-only cookies by default:** `COOKIE_DOMAIN` is optional, which is safer
  for local and Render hostnames.
- **Fresh deployment migrations:** Production uses `prisma migrate deploy`; local
  schema development continues to use `prisma migrate dev`.
