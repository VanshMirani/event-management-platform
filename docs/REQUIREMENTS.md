# Event Management Platform requirements

## In scope

- Public users can browse upcoming published events and available ticket types.
- Users can register, sign in, reserve inventory, complete the no-charge demo
  checkout, and access generated QR/PDF tickets.
- Administrators can manage event data, ticket inventory, users, bookings, and
  payment records, then verify and check in tickets.
- Pending bookings expire, cannot be confirmed afterward, and return their
  reserved inventory.
- Authentication remains usable through access-token refresh and blocked users
  cannot renew a session.
- The repository can run locally and deploy as one web service plus PostgreSQL.

## Deployment boundary

The hosted deployment is a demonstration system. It does not accept real
customers or money. Demo checkout is labelled in the UI, is guarded by an
environment flag on the server, and never opens a payment-provider form.

## Acceptance checks

- Lint, unit/integration tests, and the production build complete successfully.
- A guest can follow event → registration → booking → demo confirmation → QR
  ticket without losing the selected event.
- Direct visits to client routes work on the production server.
- The health endpoint fails when PostgreSQL is unavailable.
- Mobile navigation remains usable at a 320 px viewport.
