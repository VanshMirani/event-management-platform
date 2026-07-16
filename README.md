# Event Management Platform

JavaScript-only full-stack monorepo for an event management platform.

## Stack

- Frontend: React, Vite, JavaScript, Tailwind CSS
- Backend: Node.js, Express.js, JavaScript
- Database: PostgreSQL with Prisma
- Authentication: JWT access and refresh tokens in httpOnly cookies
- Payments: Razorpay test mode

## Structure

```txt
client/
server/
docs/
AGENTS.md
README.md
.env.example
.gitignore
docker-compose.yml
```

## Setup

Install dependencies from the repository root:

```bash
npm install
```

Create local environment files:

```bash
cp .env.example .env
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run a Prisma migration after PostgreSQL is available. For the complete MVP schema, use:

```bash
npm run prisma:migrate -- --name complete_mvp_schema
```

Seed development data after the migration. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `ADMIN_NAME` in `server/.env` first:

```bash
npm run prisma:seed
```

Run the frontend and backend together:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend health: `http://localhost:5000/api/health`

## Auth API

Auth uses httpOnly cookies. Frontend requests must include credentials, for example:

```js
fetch("http://localhost:5000/api/auth/me", {
  credentials: "include"
});
```

Register a user:

```bash
curl -i -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Event User","email":"user@example.com","password":"StrongPass123"}'
```

Login:

```bash
curl -i -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"StrongPass123"}'
```

Current user and logout:

```bash
curl -i http://localhost:5000/api/auth/me --cookie "accessToken=<cookie>"
curl -i -X POST http://localhost:5000/api/auth/logout
```

Set `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_ORIGIN`, and optional `COOKIE_DOMAIN` in `server/.env`. Do not use the placeholder JWT values outside local scaffolding.

## Frontend Auth

Set `VITE_API_URL` in `client/.env`:

```bash
VITE_API_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=rzp_test_your_public_key
```

The React app uses `/api/auth/me` on startup to load the current user from backend httpOnly cookies. JWTs are not stored in `localStorage` or `sessionStorage`.

Auth routes:

- `/login` - sign in and redirect users by role
- `/register` - create a user account
- `/user/dashboard` - protected user dashboard
- `/admin/dashboard` - admin-only dashboard
- `/admin/users` - admin-only user management
- `/admin/categories` - admin-only category management
- `/admin/events` - admin-only event list with publish controls
- `/admin/events/create` - admin-only event creation
- `/admin/events/:id/edit` - admin-only event editing
- `/admin/bookings` - admin-only booking management
- `/admin/bookings/:id` - admin-only booking detail
- `/admin/payments` - admin-only payment management
- `/admin/payments/:id` - admin-only payment detail
- `/events` - published public events
- `/events/:slug` - public event details with ticket selection and pending booking creation
- `/checkout/:bookingId` - protected Razorpay checkout for pending bookings
- `/payment-success` - protected payment confirmation page
- `/payment-failed` - protected payment failure page
- `/user/bookings` - protected list of the user's bookings

Admin APIs are available under `/api/admin/*` for dashboard stats, users, categories, events, ticket types, bookings, and payments. Public category discovery is available at `/api/categories`; public published events are available at `/api/events`, `/api/events/featured`, and `/api/events/:slug`.

Authenticated users can create pending bookings with `POST /api/bookings`, list their bookings with `GET /api/bookings/my`, and view their own booking details with `GET /api/bookings/:id`. Booking totals are calculated by the backend from `TicketType.price`; Razorpay checkout creates orders through the backend and confirms bookings only after server-side signature verification.

Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in `server/.env`. Only the key id is safe for frontend use.

## Scripts

- `npm run dev` - run client and server together
- `npm run dev:client` - run only the Vite client
- `npm run dev:server` - run only the Express server
- `npm run build` - build the frontend
- `npm run start` - start the backend
- `npm run lint` - lint workspaces
- `npm run test` - run workspace tests
- `npm run prisma:generate` - generate Prisma Client
- `npm run prisma:migrate -- --name <name>` - run Prisma migrations
- `npm run prisma:seed` - create the admin user, sample categories, events, and ticket types

## JavaScript Only

Do not add TypeScript files, `.tsx` files, or `tsconfig.json`. React components use `.jsx`; backend and utility files use `.js`.

## Database

The Prisma schema lives in `server/prisma/schema.prisma`. The MVP data model includes `User`, `Category`, `Event`, `TicketType`, `Booking`, `BookingItem`, `Payment`, `Ticket`, `Coupon`, and `AuditLog`, with enums for users, events, bookings, payments, tickets, and coupons.

Bookings store server-calculated totals and line items. Ticket inventory is tracked per `TicketType`; booking and ticket creation should happen in Prisma transactions to prevent overselling.
