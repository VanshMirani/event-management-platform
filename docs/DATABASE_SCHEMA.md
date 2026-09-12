# Database Schema

The application uses PostgreSQL with Prisma. All Prisma files must stay under `server/prisma`.

## MVP Models

- `User`: platform account with `USER`, `ADMIN`, or `ORGANIZER` role and `ACTIVE` or `BLOCKED` status.
- `Category`: event grouping with unique `name` and `slug`.
- `Event`: belongs to a category and organizer user; supports `ONLINE`, `OFFLINE`, and `HYBRID` events.
- `TicketType`: event-level inventory and price records. Use this for all backend price calculation.
- `Booking`: belongs to a user and event, optionally uses a coupon, and owns booking items, payment, and tickets.
- `BookingItem`: line item for a ticket type, with quantity and server-calculated amounts.
- `Payment`: one payment per booking, with Razorpay provider order/payment IDs and verified status.
- `Ticket`: QR-backed issued ticket for a user, event, booking, and optional booking item.
- `Coupon`: percentage or fixed discount code, optionally scoped to an event.
- `AuditLog`: admin action log tied to the admin user who performed the action.

## Enums

- `UserRole`: `USER`, `ADMIN`, `ORGANIZER`
- `UserStatus`: `ACTIVE`, `BLOCKED`
- `EventStatus`: `DRAFT`, `PUBLISHED`, `CANCELLED`, `COMPLETED`
- `EventType`: `ONLINE`, `OFFLINE`, `HYBRID`
- `BookingStatus`: `PENDING`, `CONFIRMED`, `FAILED`, `CANCELLED`, `REFUNDED`
- `PaymentStatus`: `CREATED`, `SUCCESS`, `FAILED`, `REFUNDED`
- `TicketStatus`: `VALID`, `USED`, `CANCELLED`, `REFUNDED`
- `CouponDiscountType`: `PERCENTAGE`, `FIXED`
- `CouponStatus`: `ACTIVE`, `INACTIVE`

## Required Relations

- `User` has many bookings, tickets, organized events, and audit logs for admin actions.
- `Category` has many events.
- `Event` belongs to a category and organizer user.
- `Event` has many ticket types, bookings, tickets, and coupons.
- `TicketType` belongs to an event and has many booking items.
- `Booking` belongs to a user and event.
- `Booking` has many booking items and tickets.
- `Booking` has one payment.
- `Booking` can optionally reference a coupon.
- `BookingItem` belongs to a booking and ticket type.
- `Payment` belongs to a booking.
- `Ticket` belongs to a user, event, booking, and optionally a booking item.
- `Coupon` has many bookings and can optionally belong to an event.
- `AuditLog` belongs to the admin user who performed the action.

## Security And Consistency Rules

- Store only `passwordHash`, never plain passwords.
- Calculate booking subtotal, discount, total, and ticket inventory on the backend.
- Never trust frontend role, ticket price, discount amount, or payment success.
- Verify Razorpay payment and webhook signatures before marking a payment `SUCCESS`.
- Use Prisma transactions when creating bookings, decrementing `TicketType.availableQuantity`, creating tickets, and updating coupon usage.
- Prevent duplicate check-in by checking ticket status and setting `TicketStatus.USED` with `usedAt` in one transaction.

## Migration

After editing `server/prisma/schema.prisma`, format the schema:

```bash
cd server
npx prisma format
```

Create the next migration without resetting existing data:

```bash
cd server
npx prisma migrate dev --name complete_mvp_schema
```

From the repository root, the equivalent workspace command is:

```bash
npm run prisma:migrate -- --name complete_mvp_schema
```

Then seed development data after setting `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `server/.env`:

```bash
npm run prisma:seed
```
