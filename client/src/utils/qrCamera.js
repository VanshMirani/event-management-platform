const recoverableScanErrors = new Set([
  "ChecksumException",
  "FormatException",
  "NotFoundException"
]);

export function createQrCameraConstraints() {
  return {
    audio: false,
    video: {
      facingMode: {
        ideal: "environment"
      }
    }
  };
}

export function isQrCameraSupported({
  navigatorObject = globalThis.navigator,
  secureContext = globalThis.isSecureContext
} = {}) {
  return Boolean(secureContext && navigatorObject?.mediaDevices?.getUserMedia);
}

export function getQrCameraErrorMessage(error) {
  switch (error?.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "Camera access was blocked. Allow camera permission in your browser settings, then try again.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No camera was found on this device. Use the event ticket list or enter the ticket code manually.";
    case "NotReadableError":
    case "TrackStartError":
      return "The camera is unavailable or already being used by another app. Close the other app and try again.";
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return "The preferred camera could not start. Try again or enter the ticket code manually.";
    default:
      return "The camera scanner could not start. Check the browser camera permission or enter the ticket code manually.";
  }
}

export function isRecoverableQrScanError(error) {
  let errorKind;

  try {
    errorKind =
      typeof error?.getKind === "function" ? error.getKind() : error?.name;
  } catch {
    errorKind = error?.name;
  }

  return recoverableScanErrors.has(errorKind);
}

export function safelyStopQrControls(controls) {
  if (!controls) {
    return Promise.resolve();
  }

  try {
    return Promise.resolve(controls.stop()).catch(() => undefined);
  } catch {
    return Promise.resolve();
  }
}

export function stopQrMediaStream(stream) {
  if (!stream || typeof stream.getTracks !== "function") {
    return;
  }

  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // Continue stopping the remaining tracks.
    }
  }
}
