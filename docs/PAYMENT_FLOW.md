# Payment flows

## Demo mode

1. A signed-in user creates a pending booking.
2. The server calculates the amount and reserves inventory.
3. When both demo flags are enabled, checkout displays a no-charge demo action.
4. The protected demo endpoint validates booking ownership, status, and expiry.
5. The server records a successful payment with demo identifiers, confirms the
   booking, and creates the QR tickets in one transaction.

This path never loads Razorpay and never collects payment details.

## Real Razorpay flow

The existing real-payment path creates an order on the server, opens Razorpay
Checkout in the browser, and verifies the returned signature on the server
before confirming a booking and generating tickets. Webhook verification is
also server-side. Keep the demo flags disabled for this mode and configure all
three Razorpay variables.

Real payments are outside the scope of this deployment and should be
security- and reconciliation-reviewed before commercial use.
