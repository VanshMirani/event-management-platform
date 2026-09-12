# AGENTS.md

## Project

This is a full-stack event management platform.

Stack:

- Frontend: React + Vite + JavaScript
- Backend: Node.js + Express.js + JavaScript
- Database: PostgreSQL + Prisma
- Payment: Razorpay
- Styling: Tailwind CSS
- Authentication: JWT with httpOnly cookies
- Validation: Zod
- QR tickets: qrcode package

## JavaScript-only rule

This project must use JavaScript only.

Rules:

- Do not use TypeScript.
- Do not create `.ts` files.
- Do not create `.tsx` files.
- Do not create `tsconfig.json`.
- Do not install `typescript`.
- Do not install `ts-node`.
- Do not install `ts-node-dev`.
- Do not install `@types/*` packages unless absolutely required by a tool.
- React components must use `.jsx`.
- Utility files must use `.js`.
- Backend files must use `.js`.
- Use ES modules with `import/export`.

## Backend architecture

Backend code should be organized into:

- routes
- controllers
- services
- middlewares
- validators
- utils
- config

Do not put all logic directly inside route files.

## Frontend architecture

Frontend code should be organized into:

- pages
- components
- layouts
- features
- api
- hooks
- utils
- routes

## Security rules

- Never store plain passwords.
- Hash passwords using bcrypt.
- Use httpOnly cookies for authentication.
- Protect user routes with auth middleware.
- Protect admin routes with admin middleware.
- Normal users must never access admin APIs.
- Never trust frontend user role.
- Never trust frontend price.
- Never trust frontend payment success.
- Backend must calculate booking amount.
- Backend must verify Razorpay signature.
- Backend must verify Razorpay webhook signature.
- Use Prisma transactions for booking and ticket availability.
- Prevent ticket overselling.
- Prevent duplicate QR ticket check-in.
- Never expose secret keys in React code.

## Backend commands

From `/server`:

```bash
npm install
npm run dev
npm run lint
npm test
npx prisma migrate dev
npx prisma studio
```
