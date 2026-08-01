import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { applyFieldValues, canvasPointToPdf } from "../app/lib/pdf-utils.ts";

test("fills an AcroForm and produces a readable PDF", async () => {
  const source = await PDFDocument.create();
  const page = source.addPage([420, 300]);
  const textField = source.getForm().createTextField("full_name");
  textField.addToPage(page, { x: 40, y: 210, width: 240, height: 28 });
  const pristine = await source.save();

  const outputDocument = await PDFDocument.load(pristine.slice());
  applyFieldValues(outputDocument.getForm().getFields(), [
    { name: "full_name", kind: "text", value: "Morgan Lee" },
  ]);
  const output = await outputDocument.save();
  const reopened = await PDFDocument.load(output.slice());
  assert.equal(reopened.getForm().getTextField("full_name").getText(), "Morgan Lee");
  assert.equal(reopened.getPageCount(), 1);
});

test("field type identity survives production minification", async () => {
  const document = await PDFDocument.create();
  const form = document.getForm();
  const page = document.addPage([420, 300]);
  const text = form.createTextField("employee_name");
  const checkbox = form.createCheckBox("active");
  text.addToPage(page, { x: 20, y: 220, width: 180, height: 24 });
  checkbox.addToPage(page, { x: 20, y: 180, width: 18, height: 18 });

  const fields = form.getFields();
  assert.equal(fields[0] instanceof (await import("pdf-lib")).PDFTextField, true);
  assert.equal(fields[1] instanceof (await import("pdf-lib")).PDFCheckBox, true);
});

test("places overlay text at converted PDF coordinates", async () => {
  const source = await PDFDocument.create();
  const page = source.addPage([400, 500]);
  const font = await source.embedFont(StandardFonts.Helvetica);
  const point = canvasPointToPdf(150, 120, 1.5, 500, 14);
  page.drawText("Private overlay", { ...point, size: 14, font });
  const output = await source.save();

  const reopened = await PDFDocument.load(output.slice());
  assert.equal(reopened.getPageCount(), 1);
  assert.deepEqual(point, { x: 100, y: 406 });

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: output.slice(), disableWorker: true });
  const display = await loadingTask.promise;
  const text = await (await display.getPage(1)).getTextContent();
  assert.match(text.items.map((item) => "str" in item ? item.str : "").join(" "), /Private overlay/);
  await loadingTask.destroy();
});
