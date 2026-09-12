# EventFlow

EventFlow is a full-stack event management platform built with React, Express,
PostgreSQL, and Prisma. It includes public event discovery, account management,
ticket booking, QR tickets, an admin dashboard, and ticket check-in.

The deployed application uses **Razorpay Test Mode**. A signed-in user can complete
the Razorpay checkout and receive QR tickets without transferring real money.
The UI labels the checkout as test mode, and the server rejects live Razorpay
keys. Zero-value bookings use a separate protected free-confirmation route.

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
   your Razorpay Test Mode key ID, key secret, and webhook secret. Only a key ID
   beginning with `rzp_test_` is accepted.

3. Start PostgreSQL and prepare the starter catalog:

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
On Render, `npm start` serves the API and can also serve `client/dist`, including
fallback routing for direct visits to React pages. The primary public frontend is
deployed separately on Vercel and reaches the Render API through a same-origin
`/api/*` rewrite.

## Deploy with Render and Vercel

Deploy the backend and database on Render first, then deploy the frontend on
Vercel. The browser uses the Vercel origin for both pages and `/api/*` requests;
`vercel.json` forwards those API requests to Render. This keeps authentication
cookies on the public frontend origin without exposing a separate API URL in the
client.

### Render API and database

`render.yaml` defines one free web service and one free PostgreSQL database.
Connect this repository in Render and create a Blueprint from the file. During
initial setup, Render asks for `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and the three
Razorpay Test Mode values marked `sync: false`; use private deployment credentials.
For an existing Blueprint, add the
three Razorpay values manually in the service's Environment settings before
deploying this change.

The Blueprint automatically:

- installs dependencies and builds the frontend;
- applies Prisma migrations and creates the starter event catalog;
- generates both JWT secrets;
- configures the app for the explicitly labelled Razorpay Test Mode checkout
  after its three secrets have been supplied;
- runs the Express API and retains the built frontend as a direct-Render fallback;
- sets `PUBLIC_APP_URL` to the public Vercel frontend so generated QR tickets open
  the correct check-in page; and
- checks application and database readiness at `/api/health`.

Render's free PostgreSQL instances currently expire after 30 days, so recreate
the database when needed or choose a paid database for longer-lived data.

Set the three Razorpay values in Render as secrets; never commit them. Use Test
Mode credentials only. This repository rejects `rzp_live_` keys
and is not configured to accept real customer payments.

### Vercel frontend

Import the same repository into Vercel. The checked-in `vercel.json` configuration:

- installs the workspace dependencies;
- builds the React client and publishes `client/dist`;
- rewrites `/api/*` to the Render web service; and
- sends other paths to `index.html` so direct visits to React routes work.

Before deploying, make sure the Render destination in `vercel.json` matches the
active Render service URL. If that service URL changes, update the rewrite and
redeploy Vercel. Keep the public Vercel URL in Render's `PUBLIC_APP_URL` value so
new QR tickets contain the correct check-in address.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection URL |
| `JWT_ACCESS_SECRET` | Signs short-lived access tokens |
| `JWT_REFRESH_SECRET` | Signs refresh tokens |
| `ADMIN_EMAIL` | Seeded administrator email |
| `ADMIN_PASSWORD` | Seeded administrator password |
| `CLIENT_ORIGIN` | Optional separate frontend origin for local/CORS use |
| `PUBLIC_APP_URL` | Public frontend origin used for links encoded by the server |
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
├── render.yaml             Render API and database infrastructure
└── vercel.json             Vercel build, API rewrite, and SPA routing
```

## Payment safety boundary

The hosted checkout is Razorpay Test Mode and cannot transfer real money. The
server rejects live Razorpay keys before contacting the provider. Paid bookings
are confirmed only from verified Razorpay test payments; zero-value bookings
use the protected free-confirmation route.
