import assert from "node:assert/strict";
import test from "node:test";
import { applyFieldValues, canvasPointToPdf, fieldKindFromConstructor, friendlyFieldName, inferFieldLabel } from "../app/lib/pdf-utils.ts";

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

test("infers human labels from nearby visible PDF text", () => {
  const items = [
    { text: "Name of individual who is the beneficial owner", x: 63.8, y: 556.3, width: 165.8 },
    { text: "Country of citizenship", x: 393.7, y: 556.3, width: 77.8 },
  ];
  assert.equal(inferFieldLabel({ name: "f_1", rect: [36, 540, 374.4, 554] }, items), "Name of individual who is the beneficial owner");
  assert.equal(inferFieldLabel({ name: "f_2", rect: [376.4, 540, 576, 554] }, items), "Country of citizenship");
  assert.equal(inferFieldLabel({ name: "f_13", rect: [237.6, 348, 439.2, 360] }, [
    { text: "I certify that the beneficial owner is a resident of", x: 64.8, y: 351.3, width: 171 },
    { text: "(for chapter 3 purposes only)", x: 223.8, y: 362.9, width: 206.7 },
  ]), "I certify that the beneficial owner is a resident of");
  assert.equal(inferFieldLabel({ name: "f_21", rect: [108, 48, 424.8, 60] }, [
    { text: "Signature of beneficial owner", x: 138.5, y: 64.4, width: 255.7 },
    { text: "Print name of signer", x: 108, y: 40.5, width: 62.9 },
  ]), "Print name of signer");
  assert.equal(friendlyFieldName("topmostSubform[0].Page1[0].f_4[0]"), "f 4");
});
