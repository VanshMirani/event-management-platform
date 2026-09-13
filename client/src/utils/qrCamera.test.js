import assert from "node:assert/strict";
import test from "node:test";
import {
  createQrCameraConstraints,
  getQrCameraErrorMessage,
  isQrCameraSupported,
  isRecoverableQrScanError,
  safelyStopQrControls,
  stopQrMediaStream
} from "./qrCamera.js";

test("requests video only and prefers the rear camera", () => {
  assert.deepEqual(createQrCameraConstraints(), {
    audio: false,
    video: {
      facingMode: {
        ideal: "environment"
      }
    }
  });
});

test("requires a secure context and browser camera support", () => {
  const navigatorObject = {
    mediaDevices: {
      getUserMedia() {}
    }
  };

  assert.equal(
    isQrCameraSupported({ navigatorObject, secureContext: true }),
    true
  );
  assert.equal(
    isQrCameraSupported({ navigatorObject, secureContext: false }),
    false
  );
  assert.equal(
    isQrCameraSupported({ navigatorObject: {}, secureContext: true }),
    false
  );
});

test("provides useful camera failure messages", () => {
  assert.match(
    getQrCameraErrorMessage({ name: "NotAllowedError" }),
    /allow camera permission/i
  );
  assert.match(
    getQrCameraErrorMessage({ name: "NotFoundError" }),
    /no camera was found/i
  );
  assert.match(
    getQrCameraErrorMessage({ name: "NotReadableError" }),
    /already being used/i
  );
  assert.match(getQrCameraErrorMessage(new Error("Unknown")), /could not start/i);
});

test("distinguishes normal decode misses from fatal scanner errors", () => {
  assert.equal(isRecoverableQrScanError({ name: "NotFoundException" }), true);
  assert.equal(isRecoverableQrScanError({ name: "ChecksumException" }), true);
  assert.equal(isRecoverableQrScanError({ name: "FormatException" }), true);
  assert.equal(
    isRecoverableQrScanError({
      name: "r",
      getKind() {
        return "NotFoundException";
      }
    }),
    true
  );
  assert.equal(isRecoverableQrScanError({ name: "NotReadableError" }), false);
});

test("scanner control cleanup handles synchronous and asynchronous failures", async () => {
  await safelyStopQrControls({
    stop() {
      throw new Error("Already stopped");
    }
  });
  await safelyStopQrControls({
    stop() {
      return Promise.reject(new Error("Torch cleanup failed"));
    }
  });
});

test("stops every camera track even when one track fails", () => {
  let stoppedTracks = 0;
  const stream = {
    getTracks() {
      return [
        {
          stop() {
            stoppedTracks += 1;
            throw new Error("Track already stopped");
          }
        },
        {
          stop() {
            stoppedTracks += 1;
          }
        }
      ];
    }
  };

  stopQrMediaStream(stream);
  assert.equal(stoppedTracks, 2);
});
