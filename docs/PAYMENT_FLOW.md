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
`/api/payments/free-confirm` path. That route checks the stored server-side total
and rejects paid bookings.

Repeated create-order requests reuse the booking's active local Razorpay order
instead of creating another provider order. Before an order is created or a
payment is confirmed, the server rechecks the booking expiry and event status in
a database transaction. Order creation locks the booking and event so concurrent
requests cannot create duplicate provider orders; confirmation uses serializable
transactions. If the event is no longer published or has started, the pending
hold is cancelled, reserved inventory is restored exactly once, any non-success
payment is marked failed, and no tickets are generated.
