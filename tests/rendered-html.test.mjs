import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the complete SEO landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Fill a PDF Online Free &amp; Privately \| Fill a PDF<\/title>/i);
  assert.match(html, /<h1[^>]*>Fill a PDF online\./i);
  assert.match(html, /Your file never leaves your browser/i);
  assert.match(html, /Can I fill a PDF form online for free\?/i);
  assert.match(html, /application\/ld\+json/i);
  assert.match(html, /FAQPage/i);
  assert.match(html, /canonical/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("server-renders a plain-language privacy page", async () => {
  const response = await render("/privacy");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Privacy built into the product/i);
  assert.match(html, /your PDF stays on your device/i);
  assert.match(html, /does not upload, store, inspect, or share/i);
});
