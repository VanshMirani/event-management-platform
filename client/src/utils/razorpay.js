const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
let checkoutScriptPromise = null;

export function loadRazorpayCheckoutScript() {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (checkoutScriptPromise) {
    return checkoutScriptPromise;
  }

  const existingScript = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
  existingScript?.remove();

  checkoutScriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;

    const finish = (loaded) => {
      const isReady = loaded && Boolean(window.Razorpay);

      script.onload = null;
      script.onerror = null;

      if (!isReady) {
        script.remove();
      }

      checkoutScriptPromise = null;
      resolve(isReady);
    };

    script.onload = () => finish(true);
    script.onerror = () => finish(false);
    document.body.appendChild(script);
  });

  return checkoutScriptPromise;
}
