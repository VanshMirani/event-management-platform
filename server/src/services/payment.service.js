export function getPaymentRoadmap() {
  return {
    implemented: false,
    provider: "Razorpay",
    flow: ["create order", "verify payment", "record payment", "confirm booking"]
  };
}
