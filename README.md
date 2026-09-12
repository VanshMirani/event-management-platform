# Event Management Platform

Event Management Platform is a full-stack event management project built with React, Express,
PostgreSQL, and Prisma. It includes public event discovery, account management,
ticket booking, QR tickets, an admin dashboard, and ticket check-in.

The repository ships with an explicit **demo mode**. In that mode a
signed-in user can complete checkout and receive QR tickets without sending
money or contacting Razorpay. The UI labels this clearly. Demo mode is opt-in
and the server rejects the demo confirmation endpoint when it is disabled.

## Main flows

- Browse and filter published events.
- Register, sign in, book tickets, and view/download QR tickets.
- Complete a no-charge checkout when demo mode is enabled.
- Manage users, categories, events, ticket types, bookings, and payments as an
  administrator.
- Verify and check in a QR ticket with duplicate-use protection.

## Technology

- React 18, Vite, React Router, and Tailwind CSS
- Node.js, Express, cookie-based JWT authentication, and Zod
- PostgreSQL with Prisma ORM and migrations
- QRCode and PDFKit for digital tickets
- Razorpay support for deployments that deliberately configure real payments

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

   Replace the JWT and admin-password placeholders in `server/.env`. Leave the
   Razorpay values empty for the project demo. Keep `DEMO_MODE=true` on the
   server and `VITE_ENABLE_DEMO_CHECKOUT=true` in the client for no-charge
   checkout.

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
setup, Render asks for `ADMIN_EMAIL` and `ADMIN_PASSWORD`; use deployment
credentials and share them privately with the evaluator.

The Blueprint automatically:

- installs dependencies and builds the frontend;
- applies Prisma migrations and seeds the demo content;
- generates both JWT secrets;
- enables the explicitly labelled no-charge demo checkout;
- serves the frontend and API from the same HTTPS origin; and
- checks application and database readiness at `/api/health`.

Render's free PostgreSQL instances currently expire after 30 days, so create the
live deployment within 30 days of the evaluation (or choose a paid database).

Do not enter Razorpay keys for the demo deployment. To turn the project into a
real-payment deployment later, set `DEMO_MODE=false`, build with
`VITE_ENABLE_DEMO_CHECKOUT=false`, configure Razorpay credentials, and perform
a separate payment/security review before accepting customers.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection URL |
| `JWT_ACCESS_SECRET` | Signs short-lived access tokens |
| `JWT_REFRESH_SECRET` | Signs refresh tokens |
| `ADMIN_NAME` | Seeded administrator display name |
| `ADMIN_EMAIL` | Seeded administrator email |
| `ADMIN_PASSWORD` | Seeded administrator password |
| `DEMO_MODE` | Enables the server-side no-charge demo confirmation route |
| `VITE_ENABLE_DEMO_CHECKOUT` | Builds the client with the demo checkout UI |
| `CLIENT_ORIGIN` | Optional separate frontend origin for local/CORS use |
| `COOKIE_DOMAIN` | Optional cookie domain; leave blank for host-only cookies |
| `RAZORPAY_KEY_ID` | Optional real-payment public key |
| `RAZORPAY_KEY_SECRET` | Optional real-payment secret |
| `RAZORPAY_WEBHOOK_SECRET` | Optional real-payment webhook secret |

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
└── render.yaml             Live demo infrastructure
```

## Demo boundary

Demo confirmations are recorded with a demo provider identifier, so they are
visibly distinguishable from verified Razorpay payments. No card, UPI, bank,
or wallet information is collected by the demo path.
