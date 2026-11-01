import assert from "node:assert/strict";
import test from "node:test";
import { assertAllowedHttpsUrl, FINN_HOSTS, fetchAllowed, KLARNA_HOSTS } from "../src/safe-url.js";
import { finnCodeSchema, klarnaProductUrlSchema } from "../src/schemas.js";
import { registerTools } from "../src/tools/index.js";

test("assertAllowedHttpsUrl allows FINN and Klarna hosts only", () => {
  assert.equal(
    assertAllowedHttpsUrl("https://www.finn.no/recommerce/forsale/item/123", FINN_HOSTS),
    "https://www.finn.no/recommerce/forsale/item/123",
  );
  assert.equal(
    assertAllowedHttpsUrl("https://www.klarna.com/no/shopping/pl/1/2/x/", KLARNA_HOSTS),
    "https://www.klarna.com/no/shopping/pl/1/2/x/",
  );
  assert.throws(() => assertAllowedHttpsUrl("http://www.finn.no/", FINN_HOSTS), /Only HTTPS/);
  assert.throws(() => assertAllowedHttpsUrl("https://evil.example/", FINN_HOSTS), /Host not allowed/);
  assert.throws(() => assertAllowedHttpsUrl("https://www.finn.no.evil.example/", FINN_HOSTS), /Host not allowed/);
  assert.throws(() => assertAllowedHttpsUrl("https://user:pass@www.finn.no/", FINN_HOSTS), /Credentials/);
  assert.throws(() => assertAllowedHttpsUrl("https://127.0.0.1/", FINN_HOSTS), /IP address/);
  assert.throws(() => assertAllowedHttpsUrl("https://localhost/", FINN_HOSTS), /Host not allowed/);
  assert.throws(() => assertAllowedHttpsUrl("https://[::1]/", FINN_HOSTS), /IP address/);
});

test("fetchAllowed refuses redirects that leave the allowlist", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(String(url));
    if (calls.length === 1) {
      return new Response(null, {
        status: 302,
        headers: { Location: "https://127.0.0.1/secret" },
      });
    }
    return new Response("should-not-fetch", { status: 200 });
  });

  await assert.rejects(
    () => fetchAllowed("https://www.klarna.com/no/shopping/test", { allowedHosts: KLARNA_HOSTS }),
    /IP address|Host not allowed/,
  );
  assert.deepEqual(calls, ["https://www.klarna.com/no/shopping/test"]);
});

test("fetchAllowed follows same-host HTTPS redirects", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(String(url));
    if (calls.length === 1) {
      return new Response(null, {
        status: 301,
        headers: { Location: "/no/shopping/final" },
      });
    }
    return new Response("<html>ok</html>", { status: 200 });
  });

  const body = await fetchAllowed("https://www.klarna.com/no/shopping/start", {
    allowedHosts: KLARNA_HOSTS,
  });
  assert.equal(body, "<html>ok</html>");
  assert.deepEqual(calls, ["https://www.klarna.com/no/shopping/start", "https://www.klarna.com/no/shopping/final"]);
});

test("schemas reject non-numeric FINN codes and non-Klarna product URLs", () => {
  assert.equal(finnCodeSchema.parse("343932826"), "343932826");
  assert.throws(() => finnCodeSchema.parse("../etc/passwd"));
  assert.throws(() => finnCodeSchema.parse("abc"));
  assert.throws(() => finnCodeSchema.parse("12"));
  assert.ok(klarnaProductUrlSchema.parse("https://www.klarna.com/no/shopping/pl/1/2/x/"));
  assert.throws(() => klarnaProductUrlSchema.parse("https://example.com/"));
  assert.throws(() => klarnaProductUrlSchema.parse("http://www.klarna.com/no/shopping/x"));
});

test("get_klarna_product handler rejects off-allowlist hosts even if schema were bypassed", async (t) => {
  const tools = new Map();
  registerTools({ registerTool: (name, _config, handler) => tools.set(name, handler) });
  t.mock.method(globalThis, "fetch", async () => new Response("nope", { status: 200 }));
  const result = await tools.get("get_klarna_product")({ url: "https://example.com/" });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /Host not allowed|Only HTTPS|klarna/i);
});
