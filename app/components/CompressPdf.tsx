"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_PAGES = 100;
const MAX_CANVAS_PIXELS = 4_000_000;

type CompressionResult = {
  size: number;
  metTarget: boolean;
};

type PdfJsPage = {
  getViewport(options: { scale: number }): { width: number; height: number };
  render(options: { canvas: HTMLCanvasElement; canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number }; background: string }): { promise: Promise<void> };
};

type PdfJsDocument = {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfJsPage>;
  destroy(): Promise<void>;
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function outputName(filename: string) {
  return `${filename.replace(/\.pdf$/i, "") || "document"}-compressed.pdf`;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("IMAGE_ENCODING_FAILED"));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/jpeg", quality);
  });
}

async function rasterizePdf(
  source: PdfJsDocument,
  pdfLib: typeof import("pdf-lib"),
  scale: number,
  quality: number,
  onPage: (page: number) => void,
) {
  const output = await pdfLib.PDFDocument.create();

  for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
    onPage(pageNumber);
    const page = await source.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const requestedViewport = page.getViewport({ scale });
    const requestedPixels = requestedViewport.width * requestedViewport.height;
    const pixelLimitFactor = requestedPixels > MAX_CANVAS_PIXELS ? Math.sqrt(MAX_CANVAS_PIXELS / requestedPixels) : 1;
    const actualScale = scale * pixelLimitFactor;
    const viewport = page.getViewport({ scale: actualScale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("CANVAS_UNAVAILABLE");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport, background: "#ffffff" }).promise;
    const jpeg = await canvasToJpeg(canvas, quality);
    canvas.width = 1;
    canvas.height = 1;

    const image = await output.embedJpg(jpeg);
    const outputPage = output.addPage([baseViewport.width, baseViewport.height]);
    outputPage.drawImage(image, { x: 0, y: 0, width: baseViewport.width, height: baseViewport.height });
  }

  return output.save({ useObjectStreams: true, addDefaultPage: false });
}

export function CompressPdf() {
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceBytes = useRef<Uint8Array | null>(null);
  const compressedBytes = useRef<Uint8Array | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [targetMb, setTargetMb] = useState("1");
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState("Choose a PDF to begin.");
  const [error, setError] = useState("");

  const parsedTarget = Number(targetMb);
  const targetIsValid = Number.isFinite(parsedTarget) && parsedTarget >= 0.1 && parsedTarget <= 50;

  async function selectFile(selected: File | undefined) {
    if (!selected) return;
    setError("");
    setResult(null);
    compressedBytes.current = null;
    if (selected.size > MAX_FILE_BYTES) {
      setError("This PDF is larger than 50 MB. Choose a smaller document.");
      return;
    }

    try {
      const bytes = new Uint8Array(await selected.arrayBuffer());
      if (new TextDecoder("ascii").decode(bytes.subarray(0, 5)) !== "%PDF-") {
        setError("This file does not appear to be a valid PDF.");
        return;
      }
      sourceBytes.current = bytes;
      setFile(selected);
      setProgress("PDF ready. Choose a target size and compress it.");
    } catch {
      setError("We could not read that file. Choose another PDF and try again.");
    }
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    void selectFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void selectFile(event.dataTransfer.files?.[0]);
  }

  function clearFile() {
    sourceBytes.current = null;
    compressedBytes.current = null;
    setFile(null);
    setResult(null);
    setError("");
    setProgress("Choose a PDF to begin.");
  }

  function updateTarget(value: string) {
    setTargetMb(value);
    compressedBytes.current = null;
    setResult(null);
    setError("");
    if (file) setProgress("Target changed. Compress again to create a new copy.");
  }

  async function compress() {
    if (!file || !sourceBytes.current || !targetIsValid) return;
    const targetBytes = Math.floor(parsedTarget * 1024 * 1024);
    setIsCompressing(true);
    setError("");
    setResult(null);
    compressedBytes.current = null;

    if (file.size <= targetBytes) {
      const copy = sourceBytes.current.slice();
      compressedBytes.current = copy;
      setResult({ size: copy.byteLength, metTarget: true });
      setProgress("This PDF is already within your target. It is ready to download unchanged.");
      setIsCompressing(false);
      return;
    }

    let pdfDocument: PdfJsDocument | null = null;
    try {
      setProgress("Opening your PDF locally…");
      const [pdfLib, pdfJs] = await Promise.all([import("pdf-lib"), import("pdfjs-dist")]);
      pdfJs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      pdfDocument = await pdfJs.getDocument({ data: sourceBytes.current.slice() }).promise as unknown as PdfJsDocument;
      if (pdfDocument.numPages > MAX_PAGES) throw new Error("TOO_MANY_PAGES");

      let scale = 1.15;
      let quality = 0.68;
      let smallest: Uint8Array | null = null;

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        const candidate = await rasterizePdf(pdfDocument, pdfLib, scale, quality, (page) => {
          setProgress(`Compression pass ${attempt} of 5 · Page ${page} of ${pdfDocument?.numPages ?? 0}`);
        });
        if (!smallest || candidate.byteLength < smallest.byteLength) smallest = candidate;
        if (candidate.byteLength <= targetBytes) break;

        const ratio = targetBytes / candidate.byteLength;
        const scaleFactor = Math.max(0.62, Math.sqrt(ratio) * 0.96);
        const nextScale = Math.max(0.38, scale * scaleFactor);
        const nextQuality = Math.max(0.2, quality * Math.max(0.68, Math.pow(ratio, 0.34)));
        if (nextScale === scale && nextQuality === quality) break;
        scale = nextScale;
        quality = nextQuality;
      }

      if (!smallest) throw new Error("NO_OUTPUT");
      const downloadable = new Uint8Array(smallest.byteLength);
      downloadable.set(smallest);
      compressedBytes.current = downloadable;
      const metTarget = downloadable.byteLength <= targetBytes;
      setResult({ size: downloadable.byteLength, metTarget });
      setProgress(metTarget
        ? `Done. Your PDF is ${formatBytes(downloadable.byteLength)} and ready to download.`
        : `Best readable result: ${formatBytes(downloadable.byteLength)}. This document could not safely reach ${formatBytes(targetBytes)}.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message.toLowerCase() : "";
      if (message.includes("password")) setError("This PDF is password-protected. Unlock it in a trusted PDF app, then try again.");
      else if (caught instanceof Error && caught.message === "TOO_MANY_PAGES") setError(`This version supports up to ${MAX_PAGES} pages per PDF.`);
      else setError("We could not compress this PDF. It may be damaged or use an unsupported format.");
      setProgress("Compression was not completed.");
    } finally {
      await pdfDocument?.destroy();
      setIsCompressing(false);
    }
  }

  function download() {
    if (!file || !compressedBytes.current) return;
    const copy = new Uint8Array(compressedBytes.current.byteLength);
    copy.set(compressedBytes.current);
    const url = URL.createObjectURL(new Blob([copy.buffer], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = outputName(file.name);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setProgress("Compressed PDF downloaded.");
  }

  return (
    <div className="compress-tool">
      <input ref={inputRef} className="visually-hidden" type="file" accept=".pdf,application/pdf" onChange={handleInput} aria-label="Choose a PDF to compress" />

      {!file ? (
        <div className={`drop-zone protect-drop-zone${isDragging ? " is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
          <div className="upload-icon" aria-hidden="true">PDF<span>↓</span></div>
          <h2>Choose a PDF to compress</h2>
          <p>Drag and drop it here, or choose it from your device.</p>
          <button className="button button-primary" type="button" onClick={() => inputRef.current?.click()}>Choose PDF</button>
          <small>PDF only · Maximum 50 MB · Up to 100 pages</small>
        </div>
      ) : (
        <div className="protect-workspace compress-workspace">
          <div className="protect-file-summary">
            <span aria-hidden="true">PDF</span>
            <div><strong>{file.name}</strong><small>{formatBytes(file.size)} · Ready on this device</small></div>
            <button className="text-button" type="button" onClick={clearFile} disabled={isCompressing}>Choose another</button>
          </div>
          <div className="password-panel">
            <div className="password-panel-heading">
              <span className="lock-icon compression-icon" aria-hidden="true">↘</span>
              <div><p className="eyebrow">Desired output size</p><h2>How small should it be?</h2><p>We will aim for this size while keeping pages readable.</p></div>
            </div>

            <div className="target-size-field">
              <label htmlFor="target-size">Target size</label>
              <div><input id="target-size" type="number" inputMode="decimal" min="0.1" max="50" step="0.1" value={targetMb} onChange={(event) => updateTarget(event.target.value)} disabled={isCompressing} /><span>MB</span></div>
              <p className={targetIsValid ? "field-hint" : "match-note mismatch"}>{targetIsValid ? "For example, enter 1 for a target of 1 MB." : "Enter a target between 0.1 MB and 50 MB."}</p>
            </div>

            {result ? (
              <div className={`compression-result${result.metTarget ? " target-met" : " target-missed"}`}>
                <div><small>Original</small><strong>{formatBytes(file.size)}</strong></div><span aria-hidden="true">→</span><div><small>Compressed</small><strong>{formatBytes(result.size)}</strong></div>
                <p>{result.metTarget ? "Target reached" : "Best readable result"}</p>
              </div>
            ) : null}

            <div className="compress-actions">
              <button className="button button-primary" type="button" disabled={!targetIsValid || isCompressing} onClick={() => void compress()}>{isCompressing ? "Compressing…" : "Compress PDF"}</button>
              <button className="button button-secondary" type="button" disabled={!result || isCompressing} onClick={download}>Download compressed PDF <span aria-hidden="true">↓</span></button>
            </div>
            <p className="compression-disclosure"><strong>Heads up:</strong> To reliably reduce size in your browser, pages are rebuilt as images. Searchable text, links, and fillable fields may become flattened.</p>
          </div>
        </div>
      )}

      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <p className="local-note"><span className="local-note-icon" aria-hidden="true">✓</span><span className="local-note-copy"><strong>Your PDF stays in this browser.</strong><br />Nothing is uploaded, saved, or sent to us.</span></p>
      <p className="compression-progress" role="status" aria-live="polite">{progress}</p>
    </div>
  );
}
