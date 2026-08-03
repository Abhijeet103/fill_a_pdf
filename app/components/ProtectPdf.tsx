"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { reportClientError } from "../lib/client-errors";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

type PasswordStrength = {
  label: "Weak" | "Fair" | "Strong";
  className: "weak" | "fair" | "strong";
  hint: string;
};

function passwordStrength(password: string): PasswordStrength {
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;

  if (password.length >= 12 && variety >= 3) {
    return { label: "Strong", className: "strong", hint: "Good length and character variety." };
  }
  if (password.length >= 8 && variety >= 2) {
    return { label: "Fair", className: "fair", hint: "Consider 12+ characters for better protection." };
  }
  return { label: "Weak", className: "weak", hint: "Use a longer, unique password if the document is sensitive." };
}

function downloadName(filename: string) {
  const withoutExtension = filename.replace(/\.pdf$/i, "");
  return `${withoutExtension || "document"}-protected.pdf`;
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const identifiable = error as { code?: string; name?: string };
    if (identifiable.code === "ALREADY_ENCRYPTED" || identifiable.name === "AlreadyEncryptedError") {
      return "This PDF is already password-protected. Unlock it in a trusted PDF app before adding a new password.";
    }
    if (identifiable.name === "PasswordEncodingError") {
      return "That password contains a character the PDF standard cannot safely use. Try another password.";
    }
  }
  return "We could not protect this PDF. It may be damaged or use an unsupported PDF format.";
}

export function ProtectPdf() {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileBytes = useRef<Uint8Array | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProtecting, setIsProtecting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Choose a PDF to begin.");

  const strength = passwordStrength(password);
  const passwordsMatch = password === confirmation;
  const canDownload = Boolean(file && password && confirmation && passwordsMatch && !isProtecting);

  async function selectFile(selected: File | undefined) {
    setError("");
    setStatus("Reading your PDF locally…");

    if (!selected) return;
    if (selected.size > MAX_FILE_BYTES) {
      setError("This PDF is larger than 25 MB. Choose a smaller file.");
      setStatus("Choose another PDF.");
      return;
    }

    try {
      const bytes = new Uint8Array(await selected.arrayBuffer());
      const signature = new TextDecoder("ascii").decode(bytes.subarray(0, 5));
      if (signature !== "%PDF-") {
        setError("This file does not appear to be a valid PDF.");
        setStatus("Choose a PDF file.");
        return;
      }

      fileBytes.current = bytes;
      setFile(selected);
      setPassword("");
      setConfirmation("");
      setStatus("PDF ready. Set a password to protect it.");
    } catch (caught) {
      reportClientError("protect.read-file", caught, { fileSize: selected.size, mimeType: selected.type || "unknown" });
      setError("We could not read that file. Choose another PDF and try again.");
      setStatus("Choose another PDF.");
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
    fileBytes.current = null;
    setFile(null);
    setPassword("");
    setConfirmation("");
    setError("");
    setStatus("Choose a PDF to begin.");
  }

  async function protectAndDownload() {
    if (!canDownload || !file || !fileBytes.current) return;

    setIsProtecting(true);
    setError("");
    setStatus("Adding AES-256 password protection on this device…");

    try {
      const { encryptPDF } = await import("@pdfsmaller/pdf-encrypt");
      const encrypted = await encryptPDF(fileBytes.current, password, { algorithm: "AES-256" });
      const downloadable = new Uint8Array(encrypted.byteLength);
      downloadable.set(encrypted);
      const url = URL.createObjectURL(new Blob([downloadable.buffer], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadName(file.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setStatus("Protected PDF downloaded. Keep your password somewhere safe.");
    } catch (caught) {
      reportClientError("protect.encrypt", caught, { fileSize: file.size, algorithm: "AES-256" });
      setError(errorMessage(caught));
      setStatus("Protection was not completed.");
    } finally {
      setIsProtecting(false);
    }
  }

  return (
    <div className="protect-tool">
      <input ref={inputRef} className="visually-hidden" type="file" accept=".pdf,application/pdf" onChange={handleInput} aria-label="Choose a PDF to protect" />

      {!file ? (
        <div
          className={`drop-zone protect-drop-zone${isDragging ? " is-dragging" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="upload-icon" aria-hidden="true">PDF<span>↑</span></div>
          <h2>Choose a PDF to protect</h2>
          <p>Drag and drop it here, or choose it from your device.</p>
          <button className="button button-primary" type="button" onClick={() => inputRef.current?.click()}>Choose PDF</button>
          <small>PDF only · Maximum 25 MB</small>
        </div>
      ) : (
        <div className="protect-workspace">
          <div className="protect-file-summary">
            <span aria-hidden="true">PDF</span>
            <div><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB · Ready on this device</small></div>
            <button className="text-button" type="button" onClick={clearFile}>Choose another</button>
          </div>

          <div className="password-panel">
            <div className="password-panel-heading">
              <span className="lock-icon" aria-hidden="true">⌑</span>
              <div><p className="eyebrow">AES-256 protection</p><h2>Set an opening password</h2><p>Anyone opening the downloaded PDF will need this password.</p></div>
            </div>

            <div className="password-fields">
              <label htmlFor="pdf-password">Password</label>
              <div className="password-input-wrap">
                <input id="pdf-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="Enter any password" />
                <button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
              </div>
              {password ? <p className={`strength-note ${strength.className}`}><strong>{strength.label}</strong> · {strength.hint}</p> : <p className="field-hint">A longer, unique password is harder to guess.</p>}

              <label htmlFor="pdf-password-confirm">Confirm password</label>
              <div className="password-input-wrap">
                <input id="pdf-password-confirm" type={showConfirmation ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" placeholder="Enter it again" aria-invalid={Boolean(confirmation && !passwordsMatch)} aria-describedby="password-match-note" />
                <button type="button" onClick={() => setShowConfirmation((shown) => !shown)} aria-label={showConfirmation ? "Hide confirmed password" : "Show confirmed password"}>{showConfirmation ? "Hide" : "Show"}</button>
              </div>
              <p id="password-match-note" className={confirmation && !passwordsMatch ? "match-note mismatch" : "match-note"}>{confirmation ? (passwordsMatch ? "Passwords match." : "Passwords do not match yet.") : "Re-enter the password to confirm it."}</p>
            </div>

            <button className="button button-primary protect-download" type="button" disabled={!canDownload} onClick={() => void protectAndDownload()}>
              {isProtecting ? "Protecting PDF…" : "Protect & download PDF"}<span aria-hidden="true">↓</span>
            </button>
            <p className="password-warning"><strong>Important:</strong> We cannot recover a forgotten password.</p>
          </div>
        </div>
      )}

      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <p className="local-note"><span className="local-note-icon" aria-hidden="true">✓</span><span className="local-note-copy"><strong>Your PDF and password stay in this browser.</strong><br />Nothing is uploaded, saved, or sent to us.</span></p>
      <p className="sr-status" role="status" aria-live="polite">{status}</p>
    </div>
  );
}
