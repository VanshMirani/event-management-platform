# EventFlow - Event Management Platform

EventFlow is a full-stack event management platform built with React, Node.js, Express, PostgreSQL, Prisma, Razorpay, and QR-based ticket verification.

It supports public event browsing, user registration, ticket booking, Razorpay payments, QR ticket generation, admin event management, booking/payment management, and admin check-in.

---

## Features

### Public/User Features

- User registration and login
- Cookie-based authentication using httpOnly cookies
- Browse published events
- View event details
- View ticket types and pricing
- Create pending bookings
- Checkout flow
- Razorpay payment integration
- Payment success/failure pages
- User bookings page
- User tickets page
- Download ticket PDF
- QR ticket display

### Admin Features

- Admin login
- Admin dashboard
- User management
- Category management
- Event management
- Publish/unpublish events
- Ticket type management
- Booking management
- Payment management
- QR ticket verification
- Mark tickets as used/check-in
- Duplicate check-in prevention

### Payment Features

- Razorpay Checkout integration
- Razorpay order creation from backend
- Backend-side payment signature verification
- Razorpay webhook endpoint
- Booking confirmation after verified payment
- Payment records stored in database

### Ticket Features

- QR ticket generation after successful payment
- One ticket generated per booked quantity
- Ticket PDF download
- Secure QR token
- Admin ticket verification
- Admin check-in
- Prevent duplicate ticket usage

---

## Tech Stack

### Frontend

- React
- Vite
- JavaScript
- React Router
- Axios
- Tailwind CSS

### Backend

- Node.js
- Express.js
- JavaScript ES Modules
- Prisma ORM
- PostgreSQL
- JWT authentication
- httpOnly cookies
- Zod validation
- Razorpay SDK
- QR code generation
- PDF generation

### Database

- PostgreSQL
- Prisma migrations
- Prisma seed script

### Tools

- Docker Compose for local PostgreSQL
- ESLint
- Node test runner
- Supertest

---

## Project Structure

```txt
Event-Management-Platform/
│
├── client/
│   ├── src/
│   ├── package.json
│   └── .env.example
│
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.js
│   │   └── migrations/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── validators/
│   ├── tests/
│   ├── package.json
│   └── .env.example
│
├── docs/
├── AGENTS.md
├── docker-compose.yml
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
└── README.md
