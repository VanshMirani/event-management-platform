# Payment flows

## Razorpay Test Mode (deployed flow)

1. A signed-in user creates a pending booking.
2. The server calculates the amount and reserves inventory.
3. The server creates a Razorpay test order using an `rzp_test_` key.
4. Razorpay Checkout opens in Test Mode in the browser.
5. The backend verifies the returned payment signature before confirming the
   booking and creating QR tickets.
6. Razorpay webhooks are signature-verified server-side when configured.

The server rejects `rzp_live_` keys, so this project cannot accidentally accept
real customer payments.

Zero-value ticket bookings bypass Razorpay and use the protected
`/api/payments/free-confirm` path even while demo mode is disabled. That route
checks the stored server-side total and rejects paid bookings.

## Optional no-charge demo fallback

When both demo flags are explicitly enabled, checkout uses the protected demo
confirmation endpoint instead of loading Razorpay. The server validates booking
ownership, status, inventory, and expiry, then records a clearly identified demo
confirmation and generates QR tickets.

This fallback is disabled in the hosted project.
