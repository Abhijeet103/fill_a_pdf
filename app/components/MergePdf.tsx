"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { mergePdfBytes } from "../lib/pdf-organize";

const MAX_FILES = 20;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 150 * 1024 * 1024;

type LocalPdf = { id: string; file: File; bytes: Uint8Array };

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function MergePdf() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<LocalPdf[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Choose two or more PDFs to begin.");

  async function addFiles(selected: File[]) {
    if (!selected.length) return;
    setError("");
    try {
      const remainingSlots = MAX_FILES - files.length;
      if (selected.length > remainingSlots) throw new Error("TOO_MANY");
      const additions: LocalPdf[] = [];
      for (const file of selected) {
        if (file.size > MAX_FILE_BYTES) throw new Error("FILE_TOO_LARGE");
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (new TextDecoder("ascii").decode(bytes.subarray(0, 5)) !== "%PDF-") throw new Error("NOT_PDF");
        additions.push({ id: crypto.randomUUID(), file, bytes });
      }
      const total = [...files, ...additions].reduce((sum, item) => sum + item.bytes.byteLength, 0);
      if (total > MAX_TOTAL_BYTES) throw new Error("TOTAL_TOO_LARGE");
      setFiles((current) => [...current, ...additions]);
      setStatus(`${files.length + additions.length} PDF${files.length + additions.length === 1 ? "" : "s"} ready. Arrange them in the order you want.`);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      if (code === "TOO_MANY") setError(`You can merge up to ${MAX_FILES} PDFs at a time.`);
      else if (code === "FILE_TOO_LARGE") setError("Each PDF must be 50 MB or smaller.");
      else if (code === "TOTAL_TOO_LARGE") setError("The selected PDFs are over the 150 MB combined limit.");
      else if (code === "NOT_PDF") setError("One of the selected files is not a valid PDF.");
      else setError("We could not read one of those files. Please try again.");
    }
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    void addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void addFiles(Array.from(event.dataTransfer.files ?? []));
  }

  function move(index: number, direction: -1 | 1) {
    setFiles((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(id: string) {
    setFiles((current) => current.filter((item) => item.id !== id));
    setError("");
  }

  async function mergeAndDownload() {
    if (files.length < 2) return;
    setBusy(true);
    setError("");
    setStatus("Combining PDFs on this device…");
    try {
      let output;
      try {
        output = await mergePdfBytes(files.map((item) => item.bytes), (index) => {
        setStatus(`Adding PDF ${index + 1} of ${files.length}…`);
        });
      } catch (caught) {
        const message = caught instanceof Error ? caught.message.toLowerCase() : "";
        if (message.includes("encrypt")) throw new Error("ENCRYPTED");
        throw caught;
      }
      const copy = new Uint8Array(output.byteLength);
      copy.set(output);
      const url = URL.createObjectURL(new Blob([copy.buffer], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "merged-pdf.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setStatus(`Merged PDF downloaded with ${files.length} source documents.`);
    } catch (caught) {
      setError(caught instanceof Error && caught.message === "ENCRYPTED" ? "One of these PDFs is password-protected. Unlock it first, then try again." : "The PDFs could not be merged. One may be damaged or use an unsupported format.");
      setStatus("Merge was not completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="organize-tool">
      <input ref={inputRef} className="visually-hidden" type="file" accept=".pdf,application/pdf" multiple onChange={handleInput} aria-label="Choose PDFs to merge" />
      <div className="protect-workspace organize-workspace">
        <div className={`organize-drop${isDragging ? " is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
          <div className="upload-icon" aria-hidden="true">PDF<span>+</span></div>
          <div><h2>{files.length ? "Add more PDFs" : "Choose PDFs to merge"}</h2><p>Select at least two files, then arrange their order.</p></div>
          <button className="button button-primary" type="button" disabled={busy || files.length >= MAX_FILES} onClick={() => inputRef.current?.click()}>Choose PDFs</button>
        </div>

        <div className="organize-panel">
          <div className="organize-heading"><div><p className="eyebrow">Merge order</p><h3>{files.length ? `${files.length} PDF${files.length === 1 ? "" : "s"} selected` : "No PDFs selected yet"}</h3></div><small>Maximum 20 files · 150 MB total</small></div>
          {files.length ? <ol className="file-order-list">{files.map((item, index) => <li key={item.id}><span className="order-number">{index + 1}</span><div><strong>{item.file.name}</strong><small>{formatBytes(item.file.size)}</small></div><div className="order-actions"><button type="button" onClick={() => move(index, -1)} disabled={busy || index === 0} aria-label={`Move ${item.file.name} up`}>↑</button><button type="button" onClick={() => move(index, 1)} disabled={busy || index === files.length - 1} aria-label={`Move ${item.file.name} down`}>↓</button><button type="button" onClick={() => remove(item.id)} disabled={busy} aria-label={`Remove ${item.file.name}`}>×</button></div></li>)}</ol> : <div className="empty-file-list"><span aria-hidden="true">⇄</span><p>Your PDFs will appear here in merge order.</p></div>}
          <button className="button button-primary organize-download" type="button" disabled={files.length < 2 || busy} onClick={() => void mergeAndDownload()}>{busy ? "Merging PDFs…" : "Merge & download PDF"}<span aria-hidden="true">↓</span></button>
        </div>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <p className="local-note"><span className="local-note-icon" aria-hidden="true">✓</span><span className="local-note-copy"><strong>Every PDF stays in this browser.</strong><br />Nothing is uploaded or stored.</span></p>
      <p className="sr-status" role="status" aria-live="polite">{status}</p>
    </div>
  );
}
