import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { apiGet } from "./http.js";
import { downloadTicketPdf } from "./tickets.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("apiRequest binary responses", () => {
  it("returns a PDF response as a Blob", async () => {
    globalThis.fetch = async () =>
      new Response("%PDF-test", {
        headers: {
          "Content-Type": "application/pdf"
        }
      });

    const blob = await downloadTicketPdf("ticket-id");

    assert.equal(blob.type, "application/pdf");
    assert.equal(await blob.text(), "%PDF-test");
  });

  it("refreshes an expired session before retrying a PDF download", async () => {
    const requestedPaths = [];

    globalThis.fetch = async (url) => {
      const path = new URL(url).pathname;
      requestedPaths.push(path);

      if (path === "/api/auth/refresh") {
        return Response.json({ status: "success" });
      }

      if (requestedPaths.filter((candidate) => candidate === path).length === 1) {
        return Response.json(
          {
            status: "error",
            message: "Authentication required"
          },
          { status: 401 }
        );
      }

      return new Response("%PDF-refreshed", {
        headers: {
          "Content-Type": "application/pdf"
        }
      });
    };

    const blob = await downloadTicketPdf("ticket-id");

    assert.deepEqual(requestedPaths, [
      "/api/tickets/ticket-id/download",
      "/api/auth/refresh",
      "/api/tickets/ticket-id/download"
    ]);
    assert.equal(await blob.text(), "%PDF-refreshed");
  });
});

describe("apiRequest errors", () => {
  it("uses a readable fallback when an HTTP error has no API message", async () => {
    globalThis.fetch = async () =>
      new Response("Service unavailable", {
        headers: {
          "Content-Type": "text/plain"
        },
        status: 503
      });

    await assert.rejects(
      apiGet("/events"),
      /The service is temporarily unavailable\. Please try again shortly\./
    );
  });

  it("keeps a specific message returned by the API", async () => {
    globalThis.fetch = async () =>
      Response.json(
        {
          message: "This event has sold out."
        },
        { status: 409 }
      );

    await assert.rejects(apiGet("/events/example"), /This event has sold out\./);
  });
});
