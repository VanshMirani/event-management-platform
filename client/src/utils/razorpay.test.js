import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { loadRazorpayCheckoutScript } from "./razorpay.js";

let scripts;

function createScriptElement() {
  const script = {
    async: false,
    onerror: null,
    onload: null,
    src: "",
    remove() {
      scripts = scripts.filter((candidate) => candidate !== script);
    }
  };

  return script;
}

describe("loadRazorpayCheckoutScript", () => {
  beforeEach(() => {
    scripts = [];
    globalThis.window = {};
    globalThis.document = {
      body: {
        appendChild(script) {
          scripts.push(script);
        }
      },
      createElement() {
        return createScriptElement();
      },
      querySelector() {
        return scripts[0] ?? null;
      }
    };
  });

  afterEach(() => {
    delete globalThis.document;
    delete globalThis.window;
  });

  it("shares one in-flight checkout script request", async () => {
    const firstLoad = loadRazorpayCheckoutScript();
    const secondLoad = loadRazorpayCheckoutScript();

    assert.equal(firstLoad, secondLoad);
    assert.equal(scripts.length, 1);

    window.Razorpay = function Razorpay() {};
    scripts[0].onload();

    assert.equal(await firstLoad, true);
    assert.equal(await secondLoad, true);
  });

  it("removes a failed script so a later call can retry", async () => {
    const firstLoad = loadRazorpayCheckoutScript();
    const failedScript = scripts[0];
    failedScript.onerror();

    assert.equal(await firstLoad, false);
    assert.equal(scripts.length, 0);

    const retryLoad = loadRazorpayCheckoutScript();
    const retryScript = scripts[0];

    assert.notEqual(retryScript, failedScript);
    window.Razorpay = function Razorpay() {};
    retryScript.onload();

    assert.equal(await retryLoad, true);
  });
});
