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

test("server-renders the complete SEO tools hub", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Free Private PDF Tools Online/i);
  assert.match(html, /<h1[^>]*>Everyday PDF tools\./i);
  assert.match(html, /Free online PDF tools/i);
  assert.match(html, /Fill PDF/i);
  assert.match(html, /Compress PDF/i);
  assert.match(html, /Merge PDF/i);
  assert.match(html, /Split PDF/i);
  assert.match(html, /Protect PDF/i);
  assert.match(html, /application\/ld\+json/i);
  assert.match(html, /FAQPage/i);
  assert.match(html, /canonical/i);
  assert.match(html, /ItemList/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("server-renders the dedicated PDF filler page", async () => {
  const response = await render("/fill-pdf");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Fill PDF Forms Online Free &amp; Privately \| localpdf\.store<\/title>/i);
  assert.match(html, /<h1[^>]*>Fill a PDF online\./i);
  assert.match(html, /Choose your PDF/i);
  assert.match(html, /FAQPage/i);
});

test("server-renders a plain-language privacy page", async () => {
  const response = await render("/privacy");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Privacy built into the product/i);
  assert.match(html, /your PDF stays on your device/i);
  assert.match(html, /does not upload, store, inspect, or share/i);
});

test("server-renders the password protection tool with SEO content", async () => {
  const response = await render("/protect-pdf");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Password Protect a PDF Online Free &amp; Privately \| localpdf\.store<\/title>/i);
  assert.match(html, /<h1[^>]*>Password protect a PDF\./i);
  assert.match(html, /Choose a PDF to protect/i);
  assert.match(html, /AES-256/i);
  assert.match(html, /FAQPage/i);
  assert.match(html, /canonical/i);
});

test("server-renders the target-size PDF compressor with SEO content", async () => {
  const response = await render("/compress-pdf");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Compress PDF to 1 MB or a Custom Size Online \| localpdf\.store<\/title>/i);
  assert.match(html, /<h1[^>]*>Compress a PDF to 1 MB\./i);
  assert.match(html, /Choose a PDF to compress/i);
  assert.match(html, /Target size/i);
  assert.match(html, /local-note-icon/i);
  assert.match(html, /local-note-copy/i);
  assert.match(html, /FAQPage/i);
  assert.match(html, /canonical/i);
});

test("server-renders the merge PDF tool with direct SEO content", async () => {
  const response = await render("/merge-pdf");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Merge PDF Files Online Free &amp; Privately \| localpdf\.store<\/title>/i);
  assert.match(html, /<h1[^>]*>Merge PDF files online\./i);
  assert.match(html, /Choose PDFs to merge/i);
  assert.match(html, /FAQPage/i);
  assert.match(html, /canonical/i);
});

test("server-renders the split PDF tool with direct SEO content", async () => {
  const response = await render("/split-pdf");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Split PDF &amp; Extract Pages Online Free \| localpdf\.store<\/title>/i);
  assert.match(html, /<h1[^>]*>Split a PDF online\./i);
  assert.match(html, /Choose a PDF to split/i);
  assert.match(html, /FAQPage/i);
  assert.match(html, /canonical/i);
});
