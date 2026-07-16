# API Specification

Base URL: `/api`

Responses use the shared envelope:

```json
{
  "status": "success",
  "message": "Success",
  "data": {}
}
```

Errors use:

```json
{
  "status": "error",
  "message": "Validation failed",
  "details": null
}
```

## Auth

Authentication uses JWT access and refresh tokens stored in httpOnly cookies. Browser clients must send requests with credentials enabled. Password hashes and JWTs are not returned in response bodies.

### POST `/auth/register`

Creates a normal `USER` account, sets `accessToken` and `refreshToken` cookies, and returns the public user.

Request body:

```json
{
  "name": "Event User",
  "email": "user@example.com",
  "password": "StrongPass123",
  "phone": "9876543210"
}
```

Responses:

- `201` user registered
- `400` validation failed
- `409` email is already registered
- `429` too many auth attempts

### POST `/auth/login`

Validates email and password, sets auth cookies, and returns the public user.

Request body:

```json
{
  "email": "user@example.com",
  "password": "StrongPass123"
}
```

Responses:

- `200` login successful
- `400` validation failed
- `401` invalid email or password
- `403` user account is blocked
- `429` too many auth attempts

### POST `/auth/logout`

Clears auth cookies.

Responses:

- `200` logout successful

### GET `/auth/me`

Requires a valid `accessToken` cookie and returns the current public user.

Responses:

- `200` current user fetched
- `401` missing, invalid, or expired access token
- `403` user account is blocked

## Admin

All `/admin/*` routes require a valid authenticated user with role `ADMIN`. Normal users receive `403`.

### GET `/admin/users`

Returns paginated users without `passwordHash`.

Query parameters:

- `page` optional, defaults to `1`
- `limit` optional, defaults to `20`, maximum `100`

### GET `/admin/users/:id`

Returns one public user record.

### PATCH `/admin/users/:id/status`

Updates a user's status. Admins cannot block their own account.

Request body:

```json
{
  "status": "BLOCKED"
}
```

Allowed statuses: `ACTIVE`, `BLOCKED`.

### PATCH `/admin/users/:id/role`

Updates a user's role. Admins cannot remove their own admin role.

Request body:

```json
{
  "role": "ORGANIZER"
}
```

Allowed roles: `USER`, `ADMIN`, `ORGANIZER`.

### POST `/admin/categories`

Creates a category. The backend validates unique names and generates a slug from the name.

Request body:

```json
{
  "name": "Technology",
  "description": "Developer conferences and workshops"
}
```

Responses:

- `201` category created
- `400` validation failed
- `409` duplicate category name

### GET `/admin/categories`

Returns all categories sorted by name.

### GET `/admin/categories/:id`

Returns one category.

### PATCH `/admin/categories/:id`

Updates category name and/or description. Changing the name regenerates the slug.

Request body:

```json
{
  "name": "Business",
  "description": "Founder and operator events"
}
```

### DELETE `/admin/categories/:id`

Deletes a category. Categories referenced by events return `409`.

### POST `/admin/events`

Creates an event. The backend generates a slug from the title, verifies `categoryId`, stores the logged-in admin as `organizerId`, and validates that `endAt` is after `startAt`.

Request body:

```json
{
  "title": "Cloud Builders Summit",
  "description": "A full-day conference for cloud teams.",
  "categoryId": "category_id",
  "eventType": "OFFLINE",
  "venueName": "NESCO Convention Centre",
  "address": "Western Express Highway",
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "onlineUrl": "https://events.example.com/cloud",
  "startAt": "2026-08-01T04:30:00.000Z",
  "endAt": "2026-08-01T12:30:00.000Z",
  "status": "DRAFT",
  "isFeatured": false,
  "bannerImage": "https://example.com/banner.jpg"
}
```

### GET `/admin/events`

Returns all events, including draft and published events.

### GET `/admin/events/:id`

Returns one event by id.

### PATCH `/admin/events/:id`

Updates event fields. Changing the title regenerates the slug.

### DELETE `/admin/events/:id`

Deletes an event. Events referenced by related records return `409`.

### PATCH `/admin/events/:id/publish`

Sets event status to `PUBLISHED`.

### PATCH `/admin/events/:id/unpublish`

Sets event status to `DRAFT`.

## Categories

### GET `/categories`

Public endpoint returning all categories sorted by name.

## Events

### GET `/events`

Public endpoint returning only published events sorted by start date.

### GET `/events/featured`

Public endpoint returning only published featured events.

### GET `/events/:slug`

Public endpoint returning one published event by slug. Draft events return `404`.

### GET `/events/:slug/ticket-types`

Public endpoint returning active ticket types for one published event.

## Bookings

Booking routes require a valid authenticated user cookie. Bookings created by this MVP stay `PENDING`; payment confirmation is intentionally not implemented yet.

### POST `/bookings`

Creates a pending booking for one ticket type, reserves available ticket quantity, calculates totals from the database ticket price, and sets `expiresAt` to 10 minutes after creation.

Request body:

```json
{
  "eventId": "event_id",
  "ticketTypeId": "ticket_type_id",
  "quantity": 2
}
```

Responses:

- `201` booking created
- `400` validation failed, unpublished event, inactive ticket type, closed sale window, or max-per-user exceeded
- `401` authentication required
- `404` event or ticket type not found
- `409` requested quantity is not available

### GET `/bookings/my`

Returns the authenticated user's bookings.

### GET `/bookings/:id`

Returns one booking owned by the authenticated user. Missing bookings and bookings owned by another user return `404`.

## Payments

Payment routes use Razorpay test mode. The backend never trusts frontend amounts or payment success; it creates orders from server-side booking totals and confirms bookings only after verifying Razorpay signatures.

### POST `/payments/razorpay/create-order`

Requires authentication. Creates a Razorpay order for the authenticated user's own `PENDING` booking and creates or updates the local `Payment` record.

Request body:

```json
{
  "bookingId": "booking_id"
}
```

Responses:

- `201` Razorpay order created
- `400` booking is not pending
- `401` authentication required
- `404` booking not found for the current user

### POST `/payments/razorpay/verify`

Requires authentication. Verifies the Razorpay signature with `RAZORPAY_KEY_SECRET`, marks the payment `SUCCESS`, and marks the booking `CONFIRMED`. Duplicate verification with the same order/payment ids is idempotent.

Request body:

```json
{
  "bookingId": "booking_id",
  "razorpay_order_id": "order_id",
  "razorpay_payment_id": "payment_id",
  "razorpay_signature": "signature"
}
```

Responses:

- `200` payment verified and booking confirmed
- `400` invalid signature or mismatched payment order
- `401` authentication required
- `404` booking not found for the current user
- `409` booking was already confirmed with another payment

## Webhooks

### POST `/webhooks/razorpay`

Public Razorpay webhook endpoint. Verifies `x-razorpay-signature` with `RAZORPAY_WEBHOOK_SECRET` before handling success or failure events. Success handling is idempotent.
