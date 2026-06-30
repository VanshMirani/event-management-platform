# Event Management Platform

JavaScript-only full-stack monorepo for an event management platform.

## Stack

- Frontend: React, Vite, JavaScript, Tailwind CSS
- Backend: Node.js, Express.js, JavaScript
- Database: PostgreSQL with Prisma
- Planned auth: JWT with httpOnly cookies
- Planned payments: Razorpay

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

Run a Prisma migration after PostgreSQL is available:

```bash
npm run prisma:migrate -- --name init
```

Run the frontend and backend together:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend health: `http://localhost:5000/api/health`

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

## JavaScript Only

Do not add TypeScript files, `.tsx` files, or `tsconfig.json`. React components use `.jsx`; backend and utility files use `.js`.
