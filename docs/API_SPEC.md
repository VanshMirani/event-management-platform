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

## Categories

### GET `/categories`

Public endpoint returning all categories sorted by name.
