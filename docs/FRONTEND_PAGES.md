# Frontend Pages

## Public

- `/` - marketing and event discovery home page
- `/events` - published event listing
- `/events/:slug` - published event detail with ticket selection, quantity, estimated total, and booking creation
- `/login` - email/password sign-in form
- `/register` - account creation form with optional phone field

## Protected

- `/user/dashboard` - requires an authenticated user and shows the current user's name and email
- `/user/bookings` - requires an authenticated user and lists their bookings
- `/checkout/:bookingId` - requires an authenticated user and starts Razorpay checkout for pending bookings
- `/payment-success` - requires an authenticated user and shows successful payment confirmation
- `/payment-failed` - requires an authenticated user and shows payment failure details
- `/admin/dashboard` - requires an authenticated user with role `ADMIN`
- `/admin/users` - admin-only user table with block and unblock actions
- `/admin/categories` - admin-only category list with create, edit, and delete actions
- `/admin/events` - admin-only event table with edit, delete, publish, and unpublish actions
- `/admin/events/create` - admin-only event creation form
- `/admin/events/:id/edit` - admin-only event editing form
- `/admin/bookings` - admin-only live booking table with status/search filters
- `/admin/bookings/:id` - admin-only booking detail view
- `/admin/payments` - admin-only live payment table with status/provider/search filters
- `/admin/payments/:id` - admin-only payment detail view

## Auth Behavior

- The client reads `VITE_API_URL` and sends auth requests with `credentials: "include"`.
- The app calls `GET /api/auth/me` on startup to populate auth state from httpOnly cookies.
- Login redirects normal users to `/user/dashboard` and admins to `/admin/dashboard`.
- Register redirects to the user dashboard after the backend creates and signs in the user.
- Logout calls `POST /api/auth/logout`, clears React auth state, and redirects to `/login`.

## Admin Behavior

- Admin pages use the shared API client and send cookies with every request.
- Normal users are redirected away from admin routes by `AdminRoute`; backend admin middleware still enforces access.
- User management never displays `passwordHash`.
- Category management shows backend validation errors such as duplicate names or categories still used by events.
- Event management loads categories for the event form, sends cookie-authenticated admin requests, and redirects back to `/admin/events` after create or update.
- Admin bookings and payments pages use paginated backend data and never depend on frontend-trusted role, amount, or payment status.
- Public event cards link to `/events/:slug`; event details let authenticated users create pending bookings and pay from checkout.
