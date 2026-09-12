# EventFlow

EventFlow is a full-stack event management project built with React, Express,
PostgreSQL, and Prisma. It includes public event discovery, account management,
ticket booking, QR tickets, an admin dashboard, and ticket check-in.

The deployed project uses **Razorpay Test Mode**. A signed-in user can complete
the Razorpay checkout and receive QR tickets without transferring real money.
The UI labels the checkout as test mode, and the server rejects live Razorpay
keys. An optional no-charge demo confirmation remains available for local
fallback testing but is disabled by default.

## Main flows

- Browse and filter published events.
- Register, sign in, book tickets, and view/download QR tickets.
- Complete a Razorpay test payment and receive a confirmed QR ticket.
- Manage users, categories, events, ticket types, bookings, and payments as an
  administrator.
- Verify and check in a QR ticket with duplicate-use protection.

## Technology

- React 18, Vite, React Router, and Tailwind CSS
- Node.js, Express, cookie-based JWT authentication, and Zod
- PostgreSQL with Prisma ORM and migrations
- QRCode and PDFKit for digital tickets
- Razorpay Test Mode with server-side order and signature verification

## Local setup

Requirements: Node.js 20.19.x or Node.js 22.12 through 24.x, plus Docker Desktop (or another PostgreSQL
16 instance).

1. Install packages:

   ```bash
   npm ci
   ```

2. Create the local environment files:

   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```

   Replace the JWT and admin-password placeholders in `server/.env`, then add
   your Razorpay Test Mode key ID, key secret, and webhook secret. Keep
   `DEMO_MODE=false` on the server and `VITE_ENABLE_DEMO_CHECKOUT=false` in the
   client. Only a key ID beginning with `rzp_test_` is accepted.

3. Start PostgreSQL and prepare sample data:

   ```bash
   docker compose up -d postgres
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

4. Start the frontend and API:

   ```bash
   npm run dev
   ```

   Open `http://localhost:5173`. The seeded admin account uses the
   `ADMIN_EMAIL` and `ADMIN_PASSWORD` values from `server/.env`.

## Useful checks

```bash
npm run lint
npm test
npm run build
```

The production build generates the Prisma client and creates the Vite bundle.
`npm start` serves both the API and `client/dist`, including fallback routing
for direct visits to React pages.

## Deploy on Render

`render.yaml` defines one free web service and one free PostgreSQL database.
Connect this repository in Render and create a Blueprint from the file. During
initial setup, Render asks for `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and the three
Razorpay Test Mode values marked `sync: false`; use deployment credentials and
share them privately with the evaluator. For an existing Blueprint, add the
three Razorpay values manually in the service's Environment settings before
deploying this change.

The Blueprint automatically:

- installs dependencies and builds the frontend;
- applies Prisma migrations and seeds the demo content;
- generates both JWT secrets;
- configures the app for the explicitly labelled Razorpay Test Mode checkout
  after its three secrets have been supplied;
- serves the frontend and API from the same HTTPS origin; and
- checks application and database readiness at `/api/health`.

Render's free PostgreSQL instances currently expire after 30 days, so create the
live deployment within 30 days of the evaluation (or choose a paid database).

Set the three Razorpay values in Render as secrets; never commit them. Use Test
Mode credentials only. This repository deliberately rejects `rzp_live_` keys
and is not configured to accept real customer payments.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection URL |
| `JWT_ACCESS_SECRET` | Signs short-lived access tokens |
| `JWT_REFRESH_SECRET` | Signs refresh tokens |
| `ADMIN_EMAIL` | Seeded administrator email |
| `ADMIN_PASSWORD` | Seeded administrator password |
| `DEMO_MODE` | Enables the server-side no-charge demo confirmation route |
| `VITE_ENABLE_DEMO_CHECKOUT` | Builds the client with the demo checkout UI |
| `CLIENT_ORIGIN` | Optional separate frontend origin for local/CORS use |
| `COOKIE_DOMAIN` | Optional cookie domain; leave blank for host-only cookies |
| `RAZORPAY_KEY_ID` | Razorpay Test Mode public key; must start with `rzp_test_` |
| `RAZORPAY_KEY_SECRET` | Razorpay Test Mode secret; store only on the server |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Test Mode webhook signing secret |

## Project structure

```text
.
├── client/                 React/Vite application
├── server/
│   ├── prisma/             Schema, migrations, and sample seed
│   ├── src/                Express application
│   └── tests/              API integration tests
├── docs/                   API, database, and project notes
├── docker-compose.yml      Local PostgreSQL
└── render.yaml             Live deployment infrastructure
```

## Payment safety boundary

The hosted checkout is Razorpay Test Mode and cannot transfer real money. The
server rejects live Razorpay keys before contacting the provider. Optional demo
confirmations use a separate provider identifier and remain visibly distinct
from verified Razorpay test payments.
