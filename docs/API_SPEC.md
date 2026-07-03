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
