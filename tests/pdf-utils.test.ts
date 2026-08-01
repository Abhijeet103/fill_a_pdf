import assert from "node:assert/strict";
import test from "node:test";
import { applyFieldValues, canvasPointToPdf, fieldKindFromConstructor } from "../app/lib/pdf-utils.ts";

test("converts canvas coordinates to PDF coordinates", () => {
  assert.deepEqual(canvasPointToPdf(150, 90, 1.5, 792, 12), { x: 100, y: 720 });
});

test("maps pdf-lib field classes to controls", () => {
  assert.equal(fieldKindFromConstructor("PDFTextField"), "text");
  assert.equal(fieldKindFromConstructor("PDFCheckBox"), "checkbox");
  assert.equal(fieldKindFromConstructor("PDFRadioGroup"), "radio");
  assert.equal(fieldKindFromConstructor("PDFDropdown"), "dropdown");
  assert.equal(fieldKindFromConstructor("PDFOptionList"), "option-list");
  assert.equal(fieldKindFromConstructor("PDFSignature"), "unknown");
});

test("applies values by stable field name", () => {
  const results = new Map<string, unknown>();
  const fields = [
    { constructor: { name: "PDFTextField" }, getName: () => "name", setText: (value: string) => results.set("name", value) },
    { constructor: { name: "PDFCheckBox" }, getName: () => "agree", check: () => results.set("agree", true), uncheck: () => results.set("agree", false) },
    { constructor: { name: "PDFDropdown" }, getName: () => "region", select: (value: string | string[]) => results.set("region", value) },
  ];
  applyFieldValues(fields, [
    { name: "name", kind: "text", value: "Taylor Reed" },
    { name: "agree", kind: "checkbox", value: true },
    { name: "region", kind: "dropdown", value: "North" },
  ]);
  assert.deepEqual(Object.fromEntries(results), { name: "Taylor Reed", agree: true, region: "North" });
});
