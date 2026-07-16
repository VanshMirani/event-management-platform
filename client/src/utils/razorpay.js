const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

export function loadRazorpayCheckoutScript() {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const existingScript = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
