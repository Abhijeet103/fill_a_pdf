"use client";

import { ChangeEvent, DragEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { applyFieldValues, canvasPointToPdf, fieldKindFromConstructor, friendlyFieldName, inferFieldLabel, type PdfFieldState, type PdfTextLabelItem, type TextOverlay } from "../lib/pdf-utils";
import type { PDFDocument as PdfLibDocument, PDFField } from "pdf-lib";

const MAX_BYTES = 25 * 1024 * 1024;
const RENDER_SCALE = 1.35;

type PdfJsPage = {
  getViewport(options: { scale: number }): { width: number; height: number };
  getAnnotations(): Promise<Array<{ fieldName?: string; rect?: number[]; alternativeText?: string }>>;
  getTextContent(): Promise<{ items: Array<{ str?: string; transform?: number[]; width?: number }> }>;
  render(options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): { promise: Promise<void> };
};

type PdfJsDocument = {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfJsPage>;
  destroy(): Promise<void>;
};

function bytesLookLikePdf(bytes: Uint8Array) {
  return new TextDecoder("ascii").decode(bytes.slice(0, 5)) === "%PDF-";
}

function readFieldState(field: PDFField, pdfLib: typeof import("pdf-lib")): PdfFieldState {
  const kind = field instanceof pdfLib.PDFTextField ? "text"
    : field instanceof pdfLib.PDFCheckBox ? "checkbox"
      : field instanceof pdfLib.PDFRadioGroup ? "radio"
        : field instanceof pdfLib.PDFDropdown ? "dropdown"
          : field instanceof pdfLib.PDFOptionList ? "option-list"
            : fieldKindFromConstructor(field.constructor.name);
  let value: PdfFieldState["value"] = "";
  let options: string[] | undefined;
  if (field instanceof pdfLib.PDFTextField) value = field.getText() || "";
  if (field instanceof pdfLib.PDFCheckBox) value = field.isChecked();
  if (field instanceof pdfLib.PDFRadioGroup) {
    value = field.getSelected() || "";
    options = field.getOptions();
  }
  if (field instanceof pdfLib.PDFDropdown) {
    value = field.getSelected()[0] || "";
    options = field.getOptions();
  }
  if (field instanceof pdfLib.PDFOptionList) {
    value = field.getSelected();
    options = field.getOptions();
  }
  return { name: field.getName(), kind, value, options };
}

async function inferVisibleFieldLabels(document: PdfJsDocument) {
  const labels = new Map<string, string>();
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const [annotations, textContent] = await Promise.all([page.getAnnotations(), page.getTextContent()]);
    const textItems: PdfTextLabelItem[] = textContent.items.flatMap((item) => {
      if (!item.str || !item.transform || typeof item.width !== "number") return [];
      return [{ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width }];
    });
    for (const annotation of annotations) {
      if (!annotation.fieldName || !annotation.rect || annotation.rect.length !== 4) continue;
      const label = inferFieldLabel({
        name: annotation.fieldName,
        rect: annotation.rect as [number, number, number, number],
        alternativeText: annotation.alternativeText,
      }, textItems);
      if (label) labels.set(annotation.fieldName, label);
    }
  }
  return labels;
}

export function PdfFiller() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pristineBytes = useRef<Uint8Array | null>(null);
  const pdfJsDocument = useRef<PdfJsDocument | null>(null);
  const [currentPageHeight, setCurrentPageHeight] = useState(0);
  const [fileName, setFileName] = useState("");
  const [fields, setFields] = useState<PdfFieldState[]>([]);
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [lockValues, setLockValues] = useState(true);
  const [status, setStatus] = useState("Choose a PDF to start filling it privately.");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [flatMode, setFlatMode] = useState(false);
  const [placingText, setPlacingText] = useState(false);

  const renderPage = useCallback(async (nextPageIndex: number) => {
    const canvas = canvasRef.current;
    const document = pdfJsDocument.current;
    if (!canvas || !document) return;
    const page = await document.getPage(nextPageIndex + 1);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * pixelRatio);
    canvas.height = Math.floor(viewport.height * pixelRatio);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    setCurrentPageHeight(viewport.height / RENDER_SCALE);
    await page.render({ canvasContext: context, viewport }).promise;
  }, []);

  useEffect(() => {
    if (pageCount) void renderPage(pageIndex);
  }, [pageCount, pageIndex, renderPage]);

  useEffect(() => () => { void pdfJsDocument.current?.destroy(); }, []);

  async function loadFile(file: File) {
    setError("");
    if (file.type && file.type !== "application/pdf") {
      setError("That file is not a PDF. Choose a document ending in .pdf.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("This PDF is larger than 25 MB. Compress it or choose a smaller document.");
      return;
    }
    setBusy(true);
    setStatus("Checking your PDF locally…");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!bytesLookLikePdf(bytes)) throw new Error("NOT_PDF");
      pristineBytes.current = bytes.slice();

      const [pdfLib, pdfJs] = await Promise.all([import("pdf-lib"), import("pdfjs-dist")]);
      pdfJs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

      let libDocument: PdfLibDocument;
      try {
        libDocument = await pdfLib.PDFDocument.load(bytes.slice(), { ignoreEncryption: false });
      } catch (cause) {
        const message = cause instanceof Error ? cause.message.toLowerCase() : "";
        if (message.includes("encrypt")) throw new Error("ENCRYPTED");
        throw cause;
      }
      const form = libDocument.getForm();
      if (form.hasXFA()) throw new Error("XFA");
      const detected = form.getFields().map((field) => readFieldState(field, pdfLib)).filter((field) => field.kind !== "unknown");

      await pdfJsDocument.current?.destroy();
      const displayDocument = await pdfJs.getDocument({ data: bytes.slice() }).promise as unknown as PdfJsDocument;
      const inferredLabels = await inferVisibleFieldLabels(displayDocument);
      pdfJsDocument.current = displayDocument;
      setFileName(file.name);
      setFields(detected.map((field) => ({ ...field, label: inferredLabels.get(field.name) || friendlyFieldName(field.name) })));
      setOverlays([]);
      setPageIndex(0);
      setPageCount(displayDocument.numPages);
      setFlatMode(detected.length === 0);
      setStatus(detected.length
        ? `${detected.length} fillable field${detected.length === 1 ? "" : "s"} found. Complete them, then download your copy.`
        : "No form fields found. Use Place text, then click the page where text should appear.");
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      if (code === "NOT_PDF") setError("This file does not contain a valid PDF. Choose an original .pdf document.");
      else if (code === "ENCRYPTED") setError("This PDF is password-protected. Unlock it in a trusted PDF app, then try again.");
      else if (code === "XFA") setError("This XFA form type is not supported yet. Open it in Adobe Acrobat or request a standard AcroForm version.");
      else setError("This PDF could not be opened. It may be damaged or use an unsupported format.");
      pristineBytes.current = null;
      setPageCount(0);
    } finally {
      setBusy(false);
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void loadFile(file);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  }

  function updateField(name: string, value: PdfFieldState["value"]) {
    setFields((current) => current.map((field) => field.name === name ? { ...field, value } : field));
  }

  function placeOverlay(clientX: number, clientY: number) {
    if (!flatMode || !placingText || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = rect.width / (canvasRef.current.width / Math.min(window.devicePixelRatio || 1, 2));
    const renderScale = RENDER_SCALE * scale;
    const point = canvasPointToPdf(clientX - rect.left, clientY - rect.top, renderScale, currentPageHeight, 14);
    setOverlays((current) => [...current, { id: crypto.randomUUID(), pageIndex, x: point.x, y: point.y, text: "Type here", fontSize: 14 }]);
    setPlacingText(false);
    setStatus("Text placed. Edit it on the page or choose Place text to add another.");
  }

  function onCanvasKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" && placingText && canvasRef.current) {
      event.preventDefault();
      const rect = canvasRef.current.getBoundingClientRect();
      placeOverlay(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  }

  async function downloadPdf() {
    if (!pristineBytes.current) return;
    setBusy(true);
    setError("");
    let flattenFailed = false;
    try {
      const pdfLib = await import("pdf-lib");
      const document = await pdfLib.PDFDocument.load(pristineBytes.current.slice(), { ignoreEncryption: false });
      const form = document.getForm();
      applyFieldValues(form.getFields() as never[], fields);
      if (overlays.length) {
        const font = await document.embedFont(pdfLib.StandardFonts.Helvetica);
        const pages = document.getPages();
        for (const overlay of overlays) {
          if (!overlay.text.trim() || !pages[overlay.pageIndex]) continue;
          pages[overlay.pageIndex].drawText(overlay.text, { x: overlay.x, y: overlay.y, size: overlay.fontSize, font, color: pdfLib.rgb(0.08, 0.1, 0.12) });
        }
      }
      if (lockValues && fields.length) {
        try { form.flatten(); } catch { flattenFailed = true; }
      }
      const output = await document.save();
      const blob = new Blob([output as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = documentRef.createElement("a");
      anchor.href = url;
      anchor.download = `${fileName.replace(/\.pdf$/i, "") || "document"}-filled.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(flattenFailed
        ? "Downloaded successfully. Locking was not supported by this form, so its fields remain editable."
        : "Downloaded successfully. Your original file remains unchanged.");
    } catch {
      setError("The filled PDF could not be saved. Keep this page open and try again with Lock values turned off.");
    } finally {
      setBusy(false);
    }
  }

  const documentRef = typeof document === "undefined" ? ({} as Document) : document;
  const hasDocument = pageCount > 0;
  const pageOverlays = overlays.filter((overlay) => overlay.pageIndex === pageIndex);

  if (!hasDocument) {
    return (
      <div className="uploader-shell">
        <div
          className={`drop-zone ${isDragging ? "is-dragging" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={onFileChange} className="visually-hidden" aria-label="Choose a PDF file" />
          <div className="upload-icon" aria-hidden="true">PDF<span>↑</span></div>
          <h3>{busy ? "Opening your PDF…" : "Drop your PDF here"}</h3>
          <p>or choose it from your device</p>
          <button className="button button-primary" type="button" onClick={() => inputRef.current?.click()} disabled={busy}>Choose PDF</button>
          <small>PDF only · Maximum 25 MB</small>
        </div>
        <div className="local-note"><span className="local-note-icon" aria-hidden="true">✓</span><p className="local-note-copy"><strong>Your file stays on this device</strong><br />Everything happens inside your browser.</p></div>
        <p className="sr-status" role="status" aria-live="polite">{status}</p>
        {error && <div className="error-message" role="alert">{error}</div>}
      </div>
    );
  }

  return (
    <div className="editor-shell">
      <div className="editor-toolbar">
        <div className="file-summary"><span aria-hidden="true">PDF</span><div><strong>{fileName}</strong><small>{pageCount} page{pageCount === 1 ? "" : "s"} · On this device</small></div></div>
        <button type="button" className="text-button" onClick={() => { pristineBytes.current = null; setPageCount(0); setFields([]); setOverlays([]); setStatus("Choose a PDF to start filling it privately."); }}>Choose another PDF</button>
      </div>
      <div className="editor-layout">
        <div className="preview-pane">
          <div className="preview-controls">
            <button type="button" disabled={pageIndex === 0} onClick={() => setPageIndex((value) => value - 1)} aria-label="Previous page">←</button>
            <span>Page {pageIndex + 1} of {pageCount}</span>
            <button type="button" disabled={pageIndex === pageCount - 1} onClick={() => setPageIndex((value) => value + 1)} aria-label="Next page">→</button>
            {flatMode && <button type="button" className={placingText ? "active" : ""} onClick={() => setPlacingText((value) => !value)}>{placingText ? "Click page…" : "+ Place text"}</button>}
          </div>
          <div className={`canvas-stage ${placingText ? "is-placing" : ""}`} tabIndex={flatMode ? 0 : -1} onKeyDown={onCanvasKeyDown} onClick={(event) => placeOverlay(event.clientX, event.clientY)} aria-label={flatMode ? "PDF page. Press Enter to place text in the center when Place text is active." : "PDF page preview"}>
            <canvas ref={canvasRef} />
            {pageOverlays.map((overlay) => {
              const scale = RENDER_SCALE;
              return (
                <div key={overlay.id} className="text-overlay" style={{ left: overlay.x * scale, top: (currentPageHeight - overlay.y - overlay.fontSize) * scale }} onClick={(event) => event.stopPropagation()}>
                  <input aria-label="Placed text" value={overlay.text} style={{ fontSize: overlay.fontSize * scale }} onChange={(event) => setOverlays((current) => current.map((item) => item.id === overlay.id ? { ...item, text: event.target.value } : item))} />
                  <div>
                    <label>Size <input type="number" min="8" max="72" value={overlay.fontSize} onChange={(event) => setOverlays((current) => current.map((item) => item.id === overlay.id ? { ...item, fontSize: Math.max(8, Math.min(72, Number(event.target.value))) } : item))} /></label>
                    <button type="button" onClick={() => setOverlays((current) => current.filter((item) => item.id !== overlay.id))}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <aside className="inspector" aria-label="PDF form fields">
          <div className="inspector-heading"><div><p className="eyebrow">Document controls</p><h3>{flatMode ? "Placed text" : `${fields.length} form field${fields.length === 1 ? "" : "s"}`}</h3></div><span aria-hidden="true">✓</span></div>
          {flatMode ? (
            <div className="flat-instructions"><p>This PDF has no interactive form fields.</p><ol><li>Select <strong>Place text</strong>.</li><li>Click the page or press Enter.</li><li>Edit the text and size.</li></ol><p>{overlays.length} text item{overlays.length === 1 ? "" : "s"} placed</p></div>
          ) : (
            <div className="field-list">
              {fields.map((field, index) => (
                <div className="field-control" key={field.name}>
                  <label htmlFor={`pdf-field-${index}`}><span>{field.label || friendlyFieldName(field.name)}</span><small title={field.name}>{field.kind.replace("-", " ")} · {field.name}</small></label>
                  {field.kind === "text" && <input id={`pdf-field-${index}`} type="text" value={String(field.value)} onChange={(event) => updateField(field.name, event.target.value)} />}
                  {field.kind === "checkbox" && <label className="toggle"><input id={`pdf-field-${index}`} type="checkbox" checked={Boolean(field.value)} onChange={(event) => updateField(field.name, event.target.checked)} /><span aria-hidden="true" /> <b>{field.value ? "Checked" : "Not checked"}</b></label>}
                  {(field.kind === "dropdown" || field.kind === "radio") && <select id={`pdf-field-${index}`} value={String(field.value)} onChange={(event) => updateField(field.name, event.target.value)}><option value="">Choose an option</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select>}
                  {field.kind === "option-list" && <select id={`pdf-field-${index}`} multiple value={Array.isArray(field.value) ? field.value : []} onChange={(event) => updateField(field.name, Array.from(event.target.selectedOptions, (option) => option.value))}>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select>}
                </div>
              ))}
            </div>
          )}
          <div className="inspector-actions">
            <label className="lock-control"><input type="checkbox" checked={lockValues} onChange={(event) => setLockValues(event.target.checked)} /><span aria-hidden="true" /><div><strong>Lock values</strong><small>Recommended for consistent viewing</small></div></label>
            <button className="button button-primary download-button" type="button" onClick={() => void downloadPdf()} disabled={busy}>{busy ? "Preparing download…" : "Download PDF"} <span aria-hidden="true">↓</span></button>
            <p className="inspector-privacy"><span aria-hidden="true">✓</span> Download anytime · Created locally</p>
          </div>
        </aside>
      </div>
      <p className="editor-status" role="status" aria-live="polite">{status}</p>
      {error && <div className="error-message" role="alert">{error}</div>}
    </div>
  );
}
