# Frontend Pages

## Public

- `/` - marketing and event discovery home page
- `/events` - published event listing
- `/events/:slug` - published event detail with ticket selection, quantity, estimated total, and booking creation
- `/login` - email/password sign-in form
- `/register` - account creation form with optional phone field

## Protected

- `/user/dashboard` - authenticated welcome page with action cards for bookings, QR tickets, and event discovery
- `/user/bookings` - requires an authenticated user and lists their bookings
- `/user/tickets` - requires an authenticated user and lists QR tickets
- `/user/tickets/:id` - requires an authenticated user and shows QR ticket detail/download
- `/checkout/:bookingId` - shows a pending booking, confirms zero-value bookings through the protected free flow, or starts Razorpay Test Mode checkout for paid bookings
- `/payment-success` - requires an authenticated user and shows successful payment confirmation
- `/payment-failed` - requires an authenticated user, fetches the latest booking status, and only offers a payment retry while the booking remains pending
- `/admin/dashboard` - requires an authenticated user with role `ADMIN`
- `/admin/users` - paginated admin-only user table with a User/Admin role selector, Active/Blocked account controls, and current-admin lockout protection
- `/admin/categories` - admin-only category list with create, edit, and delete actions
- `/admin/events` - admin-only event table with status badges and context-appropriate edit, delete, publish, and unpublish actions
- `/admin/events/create` - admin-only event creation form
- `/admin/events/:id/edit` - admin-only event and ticket-type management, with guarded publish/unpublish controls
- `/admin/bookings` - admin-only booking table with status/search filters
- `/admin/bookings/:id` - admin-only booking detail view
- `/admin/payments` - admin-only payment table with status/provider/search filters
- `/admin/payments/:id` - admin-only payment detail view
- `/admin/check-in` - admin-only ticket verification and check-in tool

## Auth Behavior

- The client uses `VITE_API_URL` when supplied, defaults to the local API during
  development, and uses relative `/api` paths in production so Vercel can proxy
  requests to Render. All auth requests use `credentials: "include"`.
- The app calls `GET /api/auth/me` on startup to populate auth state from httpOnly cookies.
- Login returns users to the safe page they originally requested, or sends them to
  their user/admin dashboard when there is no return destination.
- Register creates and signs in a user, then follows the same safe return behavior.
- Logout calls `POST /api/auth/logout`, clears React auth state, and redirects to `/login`.

## Admin Behavior

- Admin pages use the shared API client and send cookies with every request.
- Normal users are redirected away from admin routes by `AdminRoute`; backend admin middleware still enforces access.
- User management never displays `passwordHash`. Role and account-status changes
  require confirmation; admins can promote users, remove admin access, and block
  or unblock accounts. The current admin cannot change their own role or status,
  and the backend protects the final active administrator from lockout.
- Category management shows backend validation errors such as duplicate names or categories still used by events.
- Event creation opens the new event's edit page so ticket types can be added before
  publication. Publishing requires an active ticket type, and unsaved event edits
  must be saved before publication status can change. Draft and published events
  expose publish/unpublish controls; terminal event statuses keep lifecycle controls
  locked. Updating an existing event returns to the event list.
- Admin bookings and payments pages use paginated backend data and never depend on frontend-trusted role, amount, or payment status.
- Admin check-in accepts a ticket code, raw QR token, or scanned check-in URL and
  blocks duplicate check-ins.
- Public event cards link to `/events/:slug`; event details let authenticated users create pending bookings and pay from checkout.
