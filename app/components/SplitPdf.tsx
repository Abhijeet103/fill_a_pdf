"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { reportClientError } from "../lib/client-errors";
import { parsePageRanges } from "../lib/page-ranges";
import { createPdfFromPageIndices } from "../lib/pdf-organize";

const MAX_FILE_BYTES = 50 * 1024 * 1024;
type SplitMode = "extract" | "remove";

export function SplitPdf() {
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceBytes = useRef<Uint8Array | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [ranges, setRanges] = useState("");
  const [mode, setMode] = useState<SplitMode>("extract");
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Choose a PDF to begin.");

  let selectedPages: number[] = [];
  let rangeError = "";
  if (ranges.trim() && pageCount) {
    try { selectedPages = parsePageRanges(ranges, pageCount); }
    catch { rangeError = `Use page numbers from 1 to ${pageCount}, for example 1-3, 5, 8-10.`; }
  }
  const outputPageCount = mode === "extract" ? selectedPages.length : pageCount - selectedPages.length;
  const canDownload = Boolean(file && selectedPages.length && !rangeError && outputPageCount > 0 && !busy);

  async function selectFile(selected: File | undefined) {
    if (!selected) return;
    setBusy(true);
    setError("");
    setStatus("Checking your PDF locally…");
    try {
      if (selected.size > MAX_FILE_BYTES) throw new Error("TOO_LARGE");
      const bytes = new Uint8Array(await selected.arrayBuffer());
      if (new TextDecoder("ascii").decode(bytes.subarray(0, 5)) !== "%PDF-") throw new Error("NOT_PDF");
      const { PDFDocument } = await import("pdf-lib");
      let document;
      try { document = await PDFDocument.load(bytes.slice(), { ignoreEncryption: false }); }
      catch (caught) {
        const message = caught instanceof Error ? caught.message.toLowerCase() : "";
        if (message.includes("encrypt")) throw new Error("ENCRYPTED");
        throw caught;
      }
      sourceBytes.current = bytes;
      setFile(selected);
      setPageCount(document.getPageCount());
      setRanges(document.getPageCount() === 1 ? "1" : `1-${Math.min(2, document.getPageCount())}`);
      setStatus(`${document.getPageCount()} pages found. Choose which pages to ${mode}.`);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      if (code === "TOO_LARGE") setError("This PDF is larger than 50 MB. Choose a smaller document.");
      else if (code === "NOT_PDF") setError("This file does not appear to be a valid PDF.");
      else if (code === "ENCRYPTED") setError("This PDF is password-protected. Unlock it first, then try again.");
      else {
        reportClientError("split.open", caught, { fileSize: selected.size, mimeType: selected.type || "unknown" });
        setError("We could not open this PDF. It may be damaged or unsupported.");
      }
    } finally { setBusy(false); }
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) { void selectFile(event.target.files?.[0]); event.target.value = ""; }
  function handleDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setIsDragging(false); void selectFile(event.dataTransfer.files?.[0]); }
  function clearFile() { sourceBytes.current = null; setFile(null); setPageCount(0); setRanges(""); setError(""); setStatus("Choose a PDF to begin."); }

  async function splitAndDownload() {
    if (!canDownload || !file || !sourceBytes.current) return;
    setBusy(true); setError(""); setStatus("Creating your new PDF on this device…");
    try {
      const selected = new Set(selectedPages);
      const indices = mode === "extract" ? selectedPages : Array.from({ length: pageCount }, (_, index) => index).filter((index) => !selected.has(index));
      const bytes = await createPdfFromPageIndices(sourceBytes.current, indices);
      const copy = new Uint8Array(bytes.byteLength); copy.set(bytes);
      const url = URL.createObjectURL(new Blob([copy.buffer], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${file.name.replace(/\.pdf$/i, "") || "document"}-${mode === "extract" ? "selected-pages" : "pages-removed"}.pdf`;
      document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setStatus(`Downloaded a ${indices.length}-page PDF.`);
    } catch (caught) {
      reportClientError("split.process", caught, { mode, pageCount, selectedPageCount: selectedPages.length });
      setError("We could not create the split PDF. Please try another page selection.");
      setStatus("Split was not completed.");
    }
    finally { setBusy(false); }
  }

  return (
    <div className="organize-tool">
      <input ref={inputRef} className="visually-hidden" type="file" accept=".pdf,application/pdf" onChange={handleInput} aria-label="Choose a PDF to split" />
      {!file ? <div className={`drop-zone protect-drop-zone${isDragging ? " is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}><div className="upload-icon" aria-hidden="true">PDF<span>÷</span></div><h2>Choose a PDF to split</h2><p>Extract the pages you need or remove pages you do not.</p><button className="button button-primary" type="button" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? "Opening PDF…" : "Choose PDF"}</button><small>PDF only · Maximum 50 MB</small></div> : <div className="protect-workspace split-workspace"><div className="protect-file-summary"><span aria-hidden="true">PDF</span><div><strong>{file.name}</strong><small>{pageCount} page{pageCount === 1 ? "" : "s"} · Ready on this device</small></div><button className="text-button" type="button" onClick={clearFile} disabled={busy}>Choose another</button></div><div className="password-panel"><div className="password-panel-heading"><span className="lock-icon" aria-hidden="true">÷</span><div><p className="eyebrow">Select pages</p><h2>What should the new PDF contain?</h2><p>Enter individual pages or ranges separated by commas.</p></div></div><fieldset className="split-mode"><legend>Split action</legend><label><input type="radio" name="split-mode" checked={mode === "extract"} onChange={() => setMode("extract")} /><span><strong>Extract selected pages</strong><small>Make a new PDF containing only these pages.</small></span></label><label><input type="radio" name="split-mode" checked={mode === "remove"} onChange={() => setMode("remove")} /><span><strong>Remove selected pages</strong><small>Make a new PDF containing all other pages.</small></span></label></fieldset><label className="range-label" htmlFor="page-ranges">Pages</label><input className="range-input" id="page-ranges" value={ranges} onChange={(event) => setRanges(event.target.value)} placeholder="1-3, 5, 8-10" aria-invalid={Boolean(rangeError)} aria-describedby="range-help" /><p id="range-help" className={rangeError ? "match-note mismatch" : "field-hint"}>{rangeError || `${selectedPages.length} selected · Output will contain ${Math.max(0, outputPageCount)} page${outputPageCount === 1 ? "" : "s"}.`}</p><button className="button button-primary organize-download" type="button" disabled={!canDownload} onClick={() => void splitAndDownload()}>{busy ? "Creating PDF…" : `${mode === "extract" ? "Extract" : "Remove"} & download`}<span aria-hidden="true">↓</span></button></div></div>}
      {error ? <p className="error-message" role="alert">{error}</p> : null}<p className="local-note"><span className="local-note-icon" aria-hidden="true">✓</span><span className="local-note-copy"><strong>Your PDF stays in this browser.</strong><br />Nothing is uploaded or stored.</span></p><p className="sr-status" role="status" aria-live="polite">{status}</p>
    </div>
  );
}
