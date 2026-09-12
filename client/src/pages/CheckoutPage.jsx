import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getBooking } from "../api/bookings.js";
import {
  confirmDemoPayment,
  createRazorpayOrder,
  verifyRazorpayPayment
} from "../api/payments.js";
import { EventLocation } from "../components/EventLocation.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useAuth } from "../features/auth/index.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { formatCurrency } from "../utils/formatCurrency.js";
import { formatDateTime } from "../utils/formatDate.js";
import { loadRazorpayCheckoutScript } from "../utils/razorpay.js";

const isDemoCheckoutEnabled = ["1", "true", "yes"].includes(
  String(import.meta.env.VITE_ENABLE_DEMO_CHECKOUT ?? "").toLowerCase()
);

export function CheckoutPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState("");
  const [paymentError, setPaymentError] = useState("");

  useDocumentTitle("Checkout | EventFlow");

  const loadBooking = useCallback(async () => {
    setIsLoading(true);
    setError("");
    setPaymentError("");

    try {
      setBooking(await getBooking(bookingId));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const bookingItem = booking?.items?.[0] ?? null;
  const canPay = booking?.status === "PENDING";

  function showPaymentSuccess(confirmedBooking, isDemo = false) {
    const confirmedBookingId = confirmedBooking?.id ?? booking.id;
    const query = new URLSearchParams({ bookingId: confirmedBookingId });

    if (isDemo) {
      query.set("demo", "1");
    }

    navigate(`/payment-success?${query.toString()}`, {
      replace: true,
      state: {
        bookingId: confirmedBookingId,
        isDemo
      }
    });
  }

  function showPaymentFailure(message) {
    const query = new URLSearchParams({ bookingId: booking.id });

    navigate(`/payment-failed?${query.toString()}`, {
      state: {
        bookingId: booking.id,
        message
      }
    });
  }

  async function handleDemoPayment() {
    if (!booking) {
      return;
    }

    setIsPaying(true);
    setPaymentError("");

    try {
      const confirmedBooking = await confirmDemoPayment(booking.id);
      setBooking(confirmedBooking);
      showPaymentSuccess(confirmedBooking, true);
    } catch (demoError) {
      setPaymentError(demoError.message);
    } finally {
      setIsPaying(false);
    }
  }

  async function handlePayment() {
    if (!booking) {
      return;
    }

    setIsPaying(true);
    setPaymentError("");

    try {
      const scriptLoaded = await loadRazorpayCheckoutScript();

      if (!scriptLoaded) {
        throw new Error("Unable to load Razorpay Checkout. Please try again.");
      }

      const razorpayOrder = await createRazorpayOrder(booking.id);
      const key = razorpayOrder.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;

      if (!key) {
        throw new Error("Razorpay key is not configured.");
      }

      const checkout = new window.Razorpay({
        key,
        amount: razorpayOrder.order.amount,
        currency: razorpayOrder.order.currency,
        name: "EventFlow",
        description: booking.event?.title ?? "Event booking",
        order_id: razorpayOrder.order.id,
        prefill: {
          name: currentUser?.name ?? "",
          email: currentUser?.email ?? ""
        },
        notes: {
          bookingId: booking.id
        },
        theme: {
          color: "#e85d3f"
        },
        handler: async (response) => {
          try {
            const confirmedBooking = await verifyRazorpayPayment({
              bookingId: booking.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            setBooking(confirmedBooking);
            showPaymentSuccess(confirmedBooking);
          } catch (verifyError) {
            setPaymentError(verifyError.message);
            showPaymentFailure(verifyError.message);
          } finally {
            setIsPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentError("Payment was closed before completion.");
            setIsPaying(false);
          }
        }
      });

      checkout.on("payment.failed", (response) => {
        const message =
          response?.error?.description ?? "Payment failed. Please try again.";
        setPaymentError(message);
        setIsPaying(false);
        showPaymentFailure(message);
      });

      checkout.open();
    } catch (payError) {
      setPaymentError(payError.message);
      setIsPaying(false);
    }
  }

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-5xl px-5 py-10 lg:py-14">
        <p className="section-kicker">
          Checkout
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-normal text-ink">
          Review your pending booking
        </h1>

        {isLoading ? (
          <p className="state-card mt-6 p-5 text-sm font-semibold text-ink/60">
            Loading booking...
          </p>
        ) : error ? (
          <div className="mt-6 rounded-lg border border-ember/20 bg-ember/10 p-5 shadow-lift">
            <p className="text-sm font-semibold text-ember">{error}</p>
            <button
              className="action-primary mt-4 px-4 py-2 text-sm font-bold"
              onClick={loadBooking}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="surface-card rounded-lg p-6">
              <p className="section-kicker">
                Event
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-normal text-ink">
                {booking.event?.title ?? "Event"}
              </h2>
              <p className="mt-3 text-sm text-ink/65">
                {formatDateTime(booking.event?.startsAt)}
              </p>
              <div className="mt-1 text-sm">
                <EventLocation event={booking.event} fallback="Location to be announced" />
              </div>

              <div className="mt-6 rounded-lg border border-cyan/10 bg-cyan/5 p-4">
                <p className="text-sm font-extrabold uppercase tracking-wide text-mint">
                  Ticket
                </p>
                <p className="mt-2 text-lg font-bold text-ink">
                  {bookingItem?.ticketType?.name ?? "Ticket type"}
                </p>
                <p className="mt-2 text-sm text-ink/65">
                  Quantity: {booking.quantity}
                </p>
                <p className="mt-1 text-sm text-ink/65">
                  Unit price:{" "}
                  {formatCurrency(bookingItem?.unitPrice ?? 0, booking.currency)}
                </p>
              </div>
            </div>

            <aside className="surface-card rounded-lg p-6">
              <p className="section-kicker">
                Summary
              </p>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-ink/65">Status</span>
                  <StatusBadge status={booking.status} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-ink/65">Subtotal</span>
                  <span className="font-bold text-ink">
                    {formatCurrency(booking.subtotalAmount, booking.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-ink/65">Discount</span>
                  <span className="font-bold text-ink">
                    {formatCurrency(booking.discountAmount, booking.currency)}
                  </span>
                </div>
                <div className="border-t border-ink/10 pt-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-ink">Final amount</span>
                    <span className="text-xl font-extrabold text-ink">
                      {formatCurrency(booking.totalAmount, booking.currency)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-5 text-xs font-semibold text-ink/50">
                Expires at {formatDateTime(booking.expiresAt)}
              </p>
              {isDemoCheckoutEnabled ? (
                <div
                  className="mt-4 rounded-lg border border-cyan/25 bg-cyan/10 px-4 py-3 text-sm text-ink"
                  role="note"
                >
                  <p className="font-extrabold text-cyan">Demo checkout</p>
                  <p className="mt-1 font-semibold text-ink/70">
                    This confirms the booking for testing only. No real payment or charge is made.
                  </p>
                </div>
              ) : null}
              {paymentError ? (
                <p
                  className="mt-4 rounded-lg border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember"
                  role="alert"
                >
                  {paymentError}
                </p>
              ) : null}
              <button
                className="action-primary mt-5 w-full px-5 py-3 text-sm font-extrabold disabled:cursor-not-allowed"
                disabled={!canPay || isPaying}
                onClick={isDemoCheckoutEnabled ? handleDemoPayment : handlePayment}
                type="button"
              >
                {isPaying
                  ? "Processing..."
                  : isDemoCheckoutEnabled
                    ? "Confirm demo booking"
                    : "Pay Now"}
              </button>
              <p className="mt-3 text-xs font-semibold text-ink/50">
                {isDemoCheckoutEnabled
                  ? "Demo confirmation is available only when explicitly enabled for this environment."
                  : "Payments are verified by the backend before your booking is confirmed."}
              </p>
              <Link
                className="mt-5 inline-flex text-sm font-bold text-mint hover:text-ember"
                to="/user/bookings"
              >
                View my bookings
              </Link>
            </aside>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
