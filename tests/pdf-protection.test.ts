import assert from "node:assert/strict";
import test from "node:test";
import { encryptPDF, AlreadyEncryptedError } from "@pdfsmaller/pdf-encrypt";
import { PDFDocument } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

test("AES-256 protection requires the chosen password and preserves the source bytes", async () => {
  const sourceDocument = await PDFDocument.create();
  sourceDocument.addPage([300, 200]);
  const source = await sourceDocument.save();
  const sourceSnapshot = new Uint8Array(source);

  const encrypted = await encryptPDF(source, "Correct horse battery staple", { algorithm: "AES-256" });

  assert.deepEqual(source, sourceSnapshot, "source bytes should not be mutated");
  assert.match(new TextDecoder("latin1").decode(encrypted), /\/Encrypt\b/);
  await assert.rejects(getDocument({ data: new Uint8Array(encrypted) }).promise, /password/i);
  await assert.rejects(getDocument({ data: new Uint8Array(encrypted), password: "wrong" }).promise, /password/i);

  const openingTask = getDocument({ data: new Uint8Array(encrypted), password: "Correct horse battery staple" });
  const opened = await openingTask.promise;
  assert.equal(opened.numPages, 1);
  await openingTask.destroy();
});

test("already protected PDFs are rejected with a specific error", async () => {
  const document = await PDFDocument.create();
  document.addPage();
  const protectedOnce = await encryptPDF(await document.save(), "first password");

  await assert.rejects(
    encryptPDF(protectedOnce, "second password"),
    (error: unknown) => error instanceof AlreadyEncryptedError && error.code === "ALREADY_ENCRYPTED",
  );
});
