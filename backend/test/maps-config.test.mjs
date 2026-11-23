import test from "node:test";
import assert from "node:assert/strict";
import { handleSocialRequest } from "../social-api.mjs";

test("maps config is available to the frontend from the backend runtime environment", async () => {
  const previousMapsApi = process.env.MAPS_API;
  process.env.MAPS_API = "geoapify-runtime-test-key";

  const response = {
    headers: {},
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body) {
      this.body = body;
    },
  };

  try {
    const handled = await handleSocialRequest(
      { method: "GET", headers: {} },
      response,
      new URL("http://localhost/api/maps-config"),
    );

    assert.equal(handled, true);
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["Cache-Control"], "no-store, max-age=0");
    assert.deepEqual(JSON.parse(response.body), { apiKey: "geoapify-runtime-test-key" });
  } finally {
    if (previousMapsApi === undefined) delete process.env.MAPS_API;
    else process.env.MAPS_API = previousMapsApi;
  }
});
