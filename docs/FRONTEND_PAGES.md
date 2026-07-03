# Frontend Pages

## Public

- `/` - marketing and event discovery home page
- `/login` - email/password sign-in form
- `/register` - account creation form with optional phone field

## Protected

- `/user/dashboard` - requires an authenticated user and shows the current user's name and email
- `/admin/dashboard` - requires an authenticated user with role `ADMIN`

## Auth Behavior

- The client reads `VITE_API_URL` and sends auth requests with `credentials: "include"`.
- The app calls `GET /api/auth/me` on startup to populate auth state from httpOnly cookies.
- Login redirects normal users to `/user/dashboard` and admins to `/admin/dashboard`.
- Register redirects to the user dashboard after the backend creates and signs in the user.
- Logout calls `POST /api/auth/logout`, clears React auth state, and redirects to `/login`.
