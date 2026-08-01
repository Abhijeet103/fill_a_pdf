import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Fill a PDF keeps your documents private by processing them entirely in your browser.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true">F</span><span>Fill a PDF</span></Link>
        <nav aria-label="Main navigation"><Link href="/#how-it-works">How it works</Link><Link href="/protect-pdf">Protect PDF</Link><Link href="/#privacy">Privacy</Link><Link href="/#faq">FAQ</Link></nav>
        <Link className="header-cta" href="/#tool">Fill a PDF</Link>
      </header>
      <main className="policy-main">
        <article className="policy-card">
          <p className="eyebrow">Plain-language policy</p>
          <h1>Privacy built into the product</h1>
          <p><strong>Short version:</strong> your PDF stays on your device. Fill a PDF does not upload, store, inspect, or share your document, its filename, or the values you enter.</p>
          <h2>How document processing works</h2>
          <p>When you choose a PDF, browser-based code reads and renders a working copy in the current tab. When you download, a fresh copy of the original document is updated locally. No upload endpoint or remote file-processing service is involved.</p>
          <h2>Information we do not collect</h2>
          <ul><li>PDF file contents or file bytes</li><li>PDF filenames</li><li>Form field names or values</li><li>PDF protection passwords</li><li>Placed text</li><li>Copies of completed documents</li></ul>
          <h2>Cookies and accounts</h2>
          <p>Fill a PDF has no login, payment flow, advertising cookies, or document analytics. The current version does not use cookies.</p>
          <h2>Network access</h2>
          <p>The PDF libraries and worker are bundled with the site rather than loaded from a third-party content network. The site security policy prevents the editor from connecting to external services.</p>
          <h2>Keeping control of your file</h2>
          <p>Closing or refreshing the tab clears the active editing or protection session. Your original PDF is not changed; a new filled or password-protected copy is created only when you choose Download.</p>
          <h2>Questions</h2>
          <p>This policy will be updated with a contact address when the final domain is selected. Until then, no personal information or document data is requested by the service.</p>
          <p><Link href="/">← Return to Fill a PDF</Link></p>
        </article>
      </main>
    </>
  );
}
