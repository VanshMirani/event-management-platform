import { useCallback, useEffect, useRef, useState } from "react";
import {
  createQrCameraConstraints,
  getQrCameraErrorMessage,
  isQrCameraSupported,
  isRecoverableQrScanError,
  safelyStopQrControls,
  stopQrMediaStream
} from "../utils/qrCamera.js";

function detachVideo(videoElement) {
  if (videoElement) {
    try {
      videoElement.pause();
    } catch {
      // A preview that did not start does not need to be paused.
    }

    videoElement.srcObject = null;
  }
}

export function QrCameraScanner({ disabled = false, onScan }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const streamRef = useRef(null);
  const sessionIdRef = useRef(0);
  const detectedRef = useRef(false);
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");

  const releaseCamera = useCallback(() => {
    sessionIdRef.current += 1;
    detectedRef.current = false;

    const controls = controlsRef.current;
    const stream = streamRef.current;
    controlsRef.current = null;
    streamRef.current = null;
    safelyStopQrControls(controls);
    stopQrMediaStream(stream);
    detachVideo(videoRef.current);
  }, []);

  const closeCamera = useCallback(() => {
    releaseCamera();
    setPhase("idle");
    setError("");
  }, [releaseCamera]);

  useEffect(() => () => releaseCamera(), [releaseCamera]);

  useEffect(() => {
    if (disabled && (phase === "starting" || phase === "scanning")) {
      releaseCamera();
      setPhase("idle");
    }
  }, [disabled, phase, releaseCamera]);

  async function startCamera() {
    releaseCamera();
    setError("");

    if (!isQrCameraSupported()) {
      setPhase("idle");
      setError(
        globalThis.isSecureContext
          ? "Camera scanning is not supported by this browser. Use the event ticket list or enter the ticket code manually."
          : "Camera scanning requires a secure HTTPS connection. Use the live EventFlow website or enter the ticket code manually."
      );
      return;
    }

    const sessionId = sessionIdRef.current;
    setPhase("starting");

    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");

      if (sessionIdRef.current !== sessionId || !videoRef.current) {
        return;
      }

      const codeReader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 200,
        delayBetweenScanSuccess: 750
      });
      const stream = await globalThis.navigator.mediaDevices.getUserMedia(
        createQrCameraConstraints()
      );

      if (sessionIdRef.current !== sessionId || !videoRef.current) {
        stopQrMediaStream(stream);
        return;
      }

      streamRef.current = stream;
      const controls = await codeReader.decodeFromStream(
        stream,
        videoRef.current,
        (result, scanError, callbackControls) => {
          if (sessionIdRef.current !== sessionId) {
            return;
          }

          const scannedValue = result?.getText()?.trim();

          if (!scannedValue && scanError) {
            if (!isRecoverableQrScanError(scanError)) {
              releaseCamera();
              setPhase("idle");
              setError(
                "The camera scanner stopped before it could read the QR code. Close other camera apps and try again."
              );
            }

            return;
          }

          if (!scannedValue || detectedRef.current) {
            return;
          }

          detectedRef.current = true;
          sessionIdRef.current += 1;
          const verificationSessionId = sessionIdRef.current;
          safelyStopQrControls(callbackControls);
          controlsRef.current = null;
          stopQrMediaStream(streamRef.current);
          streamRef.current = null;
          detachVideo(videoRef.current);
          setPhase("detected");
          setError("");
          Promise.resolve()
            .then(() => onScan(scannedValue))
            .catch((scanHandlerError) => {
              if (sessionIdRef.current === verificationSessionId) {
                setError(
                  scanHandlerError?.message ||
                    "The scanned ticket could not be verified. Try scanning it again."
                );
              }
            })
            .finally(() => {
              if (sessionIdRef.current === verificationSessionId) {
                detectedRef.current = false;
                setPhase("idle");
              }
            });
        }
      );

      if (sessionIdRef.current !== sessionId || detectedRef.current) {
        safelyStopQrControls(controls);
        stopQrMediaStream(stream);
        return;
      }

      controlsRef.current = controls;
      setPhase("scanning");
    } catch (cameraError) {
      if (sessionIdRef.current !== sessionId) {
        return;
      }

      releaseCamera();
      setPhase("idle");
      setError(getQrCameraErrorMessage(cameraError));
    }
  }

  const isCameraOpen = phase === "starting" || phase === "scanning";

  return (
    <div className="mt-6 rounded-lg border border-cyan/20 bg-cyan/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-extrabold text-ink">Scan the attendee's QR code</p>
          <p className="mt-1 text-sm leading-6 text-ink/65">
            Open the camera, point it at the ticket, then confirm the attendee
            details before check-in.
          </p>
        </div>
        {isCameraOpen ? (
          <button
            className="action-secondary w-full shrink-0 px-4 py-3 text-sm font-bold sm:w-auto"
            onClick={closeCamera}
            type="button"
          >
            Close camera
          </button>
        ) : (
          <button
            className="action-primary w-full shrink-0 px-4 py-3 text-sm font-bold disabled:cursor-not-allowed sm:w-auto"
            disabled={disabled}
            onClick={startCamera}
            type="button"
          >
            Scan QR with camera
          </button>
        )}
      </div>

      {isCameraOpen ? (
        <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-lg bg-ink sm:max-h-96">
          <video
            aria-label="Live camera preview for QR scanning"
            autoPlay
            className="h-full w-full object-cover"
            muted
            playsInline
            ref={videoRef}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-1/2 aspect-square w-48 max-w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-lg border-4 border-white shadow-[0_0_0_999px_rgba(15,23,42,0.34)]"
          />
          <p className="absolute inset-x-4 bottom-4 rounded-lg bg-ink/80 px-3 py-2 text-center text-xs font-bold text-white">
            {phase === "starting"
              ? "Starting the camera..."
              : "Hold the QR code inside the square"}
          </p>
        </div>
      ) : null}

      {phase === "detected" ? (
        <p className="mt-3 text-sm font-semibold text-mint" role="status">
          QR code detected. Verifying the ticket...
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm font-semibold text-ember" role="alert">
          {error}
        </p>
      ) : null}

      <p className="mt-3 text-xs leading-5 text-ink/60">
        Camera access starts only after you press the button and stops when a QR
        code is detected or the camera is closed.
      </p>
    </div>
  );
}
