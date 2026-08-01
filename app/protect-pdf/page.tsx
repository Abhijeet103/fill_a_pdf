import type { Metadata } from "next";
import Link from "next/link";
import { ProtectPdf } from "../components/ProtectPdf";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: { absolute: "Password Protect a PDF Online Free & Privately | Fill a PDF" },
  description: "Add AES-256 password protection to a PDF in your browser. Free, private, and no upload, login, or payment required.",
  alternates: { canonical: `${SITE_URL}/protect-pdf` },
  openGraph: {
    title: "Password protect a PDF privately",
    description: "Add a password and download an encrypted PDF without uploading your document.",
    url: `${SITE_URL}/protect-pdf`,
    siteName: "Fill a PDF",
    type: "website",
  },
};

const faqs = [
  { question: "Is my PDF or password uploaded?", answer: "No. Your PDF and password are processed only by code running in your browser. Neither is sent to our server or a third party." },
  { question: "What encryption does this tool use?", answer: "The downloaded file uses AES-256 PDF encryption, designed for modern PDF readers." },
  { question: "Can you recover my PDF password?", answer: "No. The password is never sent to or stored by us, so keep it in a safe place. A forgotten password may make the protected PDF inaccessible." },
  { question: "Can I protect an already locked PDF?", answer: "Not directly. First unlock it using its current password in a trusted PDF app, then protect the unlocked copy with a new password here." },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })),
};

export default function ProtectPdfPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <header className="site-header">
        <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true">F</span><span>Fill a PDF</span></Link>
        <nav aria-label="Main navigation"><Link href="/">Fill PDF</Link><a href="#how-it-works">How it works</a><a href="#faq">FAQ</a><Link href="/privacy">Privacy</Link></nav>
        <Link className="header-cta" href="/#tool">Fill a PDF</Link>
      </header>

      <main className="protect-main">
        <section className="protect-hero" aria-labelledby="protect-title">
          <p className="eyebrow"><span aria-hidden="true">●</span> Private, client-side PDF security</p>
          <h1 id="protect-title">Password protect a PDF.<br /><em>Keep it on your device.</em></h1>
          <p>Add a password with AES-256 encryption, then download the protected copy. No uploads, login, payment, or watermark.</p>
        </section>

        <section className="protect-tool-section" aria-label="Password protect PDF tool">
          <ProtectPdf />
        </section>

        <section id="how-it-works" className="content-section protect-explainer" aria-labelledby="protect-how-title">
          <div className="section-intro centered"><p className="eyebrow">Three simple steps</p><h2 id="protect-how-title">Protect your PDF in your browser</h2></div>
          <ol className="steps-grid">
            <li><span>01</span><div className="step-icon" aria-hidden="true">↥</div><h3>Choose your PDF</h3><p>Select a PDF up to 25 MB. Its bytes stay on your device.</p></li>
            <li><span>02</span><div className="step-icon" aria-hidden="true">••</div><h3>Set a password</h3><p>Enter any non-empty password and confirm it. Longer, unique passwords are safer.</p></li>
            <li><span>03</span><div className="step-icon" aria-hidden="true">↓</div><h3>Download the protected copy</h3><p>A new encrypted PDF is created locally. Your original file remains unchanged.</p></li>
          </ol>
        </section>

        <section id="faq" className="content-section faq-section" aria-labelledby="protect-faq-title">
          <div className="section-intro centered"><p className="eyebrow">Good to know</p><h2 id="protect-faq-title">PDF password protection FAQ</h2></div>
          <div className="faq-list">{faqs.map((faq, index) => <details key={faq.question} open={index === 0}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div>
        </section>
      </main>

      <footer>
        <Link className="brand footer-brand" href="/"><span className="brand-mark" aria-hidden="true">F</span><span>Fill a PDF</span></Link>
        <p>Private PDF tools, right in your browser.</p>
        <nav aria-label="Footer navigation"><Link href="/">Fill PDF</Link><Link href="/protect-pdf">Protect PDF</Link><Link href="/privacy">Privacy</Link></nav>
        <small>© {new Date().getFullYear()} Fill a PDF. Your files stay yours.</small>
      </footer>
    </>
  );
}
