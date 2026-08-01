import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { mergePdfBytes, createPdfFromPageIndices } from "../app/lib/pdf-organize.ts";
import { parsePageRanges } from "../app/lib/page-ranges.ts";

async function makePdf(pageCount: number) {
  const document = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) document.addPage([300 + index, 400 + index]);
  return document.save();
}

test("parses individual PDF pages and ranges without duplicates", () => {
  assert.deepEqual(parsePageRanges("1-3, 3, 5, 8-10", 10), [0, 1, 2, 4, 7, 8, 9]);
  assert.throws(() => parsePageRanges("3-1", 5), /OUT_OF_RANGE/);
  assert.throws(() => parsePageRanges("6", 5), /OUT_OF_RANGE/);
});

test("merges source PDFs in the supplied order", async () => {
  const merged = await mergePdfBytes([await makePdf(1), await makePdf(2)]);
  const document = await PDFDocument.load(merged);
  assert.equal(document.getPageCount(), 3);
  assert.equal(document.getPage(0).getWidth(), 300);
  assert.equal(document.getPage(2).getWidth(), 301);
});

test("creates a PDF containing only selected source pages", async () => {
  const split = await createPdfFromPageIndices(await makePdf(4), [1, 3]);
  const document = await PDFDocument.load(split);
  assert.equal(document.getPageCount(), 2);
  assert.equal(document.getPage(0).getWidth(), 301);
  assert.equal(document.getPage(1).getWidth(), 303);
});
