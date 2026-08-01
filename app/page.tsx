import type { Metadata } from "next";
import Link from "next/link";
import { PdfFiller } from "./components/PdfFiller";
import { SITE_URL } from "./lib/site";

export const metadata: Metadata = {
  title: { absolute: "Fill a PDF Online Free & Privately | Fill a PDF" },
  description:
    "Fill PDF forms online for free without uploading your file. Everything runs privately in your browser, then downloads straight to your device.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "Fill a PDF — Private, free PDF form filler",
    description: "Fill and download PDFs without uploading them. Your file stays on your device.",
    url: SITE_URL,
    siteName: "Fill a PDF",
    type: "website",
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630, alt: "Fill a PDF — private PDF form filling in your browser" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fill a PDF — Private, free PDF form filler",
    description: "Fill and download PDFs without uploading them.",
    images: [`${SITE_URL}/og.png`],
  },
};

const faqs = [
  {
    question: "Can I fill a PDF form online for free?",
    answer: "Yes. Fill a PDF is free to use, with no account, trial, or payment details required. Choose a PDF, complete its fields, and download the filled copy.",
  },
  {
    question: "Does my PDF get uploaded?",
    answer: "No. The file is opened, rendered, edited, and saved by code running in your browser. Its contents are never sent to our server or a third party.",
  },
  {
    question: "Can I fill a PDF that has no form fields?",
    answer: "Yes. If a PDF has no interactive fields, place text directly onto any page, adjust the size, and download a new copy with the text added.",
  },
  {
    question: "Will the original PDF formatting change?",
    answer: "The original PDF is loaded and only its field values or your placed text are added. Pages are not converted to images or rebuilt, so the existing layout remains intact.",
  },
  {
    question: "What does Lock values do?",
    answer: "Lock values bakes completed form fields into the document so they look consistent in more PDF readers. Turn it off when recipients should still be able to edit the fields.",
  },
  {
    question: "Are password-protected PDFs supported?",
    answer: "PDFs that require a password cannot currently be opened. Remove the password in a trusted PDF app, then try the unlocked copy here.",
  },
  {
    question: "Does Fill a PDF support XFA forms?",
    answer: "Not yet. XFA forms, often created with Adobe LiveCycle, use a different form system. The tool identifies them and explains the limitation instead of producing an unreliable file.",
  },
  {
    question: "Can I use it on a phone or tablet?",
    answer: "Yes. The editor adapts to smaller screens, supports touch, and keeps the field controls in a collapsible panel so the document stays readable.",
  },
];

const applicationJsonLd = {
  "@context": "https://schema.org",
  "@type": ["WebApplication", "SoftwareApplication"],
  name: "Fill a PDF",
  url: SITE_URL,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any device with a modern web browser",
  browserRequirements: "Requires JavaScript for PDF editing",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Fill PDF forms in the browser",
    "No file uploads",
    "Place text on flat PDFs",
    "Lock or preserve editable form fields",
    "Free with no account required",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(applicationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <header className="site-header">
        <a className="brand" href="#top">
          <span className="brand-mark" aria-hidden="true">F</span>
          <span>Fill a PDF</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <Link href="/compress-pdf">Compress PDF</Link>
          <Link href="/protect-pdf">Protect PDF</Link>
          <a href="#privacy">Privacy</a>
          <a href="#faq">FAQ</a>
        </nav>
        <a className="header-cta" href="#tool">Fill a PDF</a>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span aria-hidden="true">●</span> Private by design · Free to use</p>
            <h1 id="hero-title">Fill a PDF online.<br /><em>Keep it private.</em></h1>
            <p className="hero-lede">Complete PDF forms and add text right in your browser. Your document never gets uploaded, stored, or seen by us.</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#tool">Choose your PDF <span aria-hidden="true">↓</span></a>
              <span className="no-account">No login. No payment. No uploads.</span>
            </div>
          </div>
          <div className="hero-proof" aria-label="How Fill a PDF protects your document">
            <div className="proof-window">
              <div className="window-bar" aria-hidden="true"><i /><i /><i /><span>your-device</span></div>
              <div className="document-card" aria-hidden="true">
                <div className="doc-heading" />
                <div className="doc-line short" />
                <div className="doc-fields"><b /><b /></div>
                <div className="doc-line" /><div className="doc-line" />
                <div className="doc-signature">Signed safely</div>
              </div>
              <div className="privacy-chip"><span aria-hidden="true">✓</span><strong>Stays on this device</strong><small>0 bytes uploaded</small></div>
            </div>
          </div>
        </section>

        <section id="tool" className="tool-section" aria-labelledby="tool-heading">
          <div className="section-intro centered">
            <p className="eyebrow">Your private workspace</p>
            <h2 id="tool-heading">Fill your PDF now</h2>
            <p>Choose a document to begin. The editing tools load only after your PDF is selected.</p>
          </div>
          <PdfFiller />
        </section>

        <section className="trust-strip" aria-label="Product promises">
          <div><span aria-hidden="true">◎</span><strong>100% browser-based</strong><small>No server processing</small></div>
          <div><span aria-hidden="true">↯</span><strong>Fast and lightweight</strong><small>Tools load when needed</small></div>
          <div><span aria-hidden="true">◇</span><strong>Formatting preserved</strong><small>Original PDF stays a PDF</small></div>
          <div><span aria-hidden="true">$0</span><strong>Actually free</strong><small>No account or paywall</small></div>
        </section>

        <section id="how-it-works" className="content-section steps-section" aria-labelledby="how-title">
          <div className="section-intro">
            <p className="eyebrow">Simple by default</p>
            <h2 id="how-title">How to fill a PDF online</h2>
            <p>Three steps, entirely on your device. There is nothing to install and no account to create.</p>
          </div>
          <ol className="steps-grid">
            <li><span>01</span><div className="step-icon" aria-hidden="true">↥</div><h3>Choose your PDF</h3><p>Pick a PDF from your device or drag it into the private workspace above.</p></li>
            <li><span>02</span><div className="step-icon" aria-hidden="true">Aa</div><h3>Fill in the details</h3><p>Complete detected fields, or click a page to place text on a flat PDF.</p></li>
            <li><span>03</span><div className="step-icon" aria-hidden="true">↓</div><h3>Download your copy</h3><p>Lock values for consistent viewing or keep form fields editable for later.</p></li>
          </ol>
        </section>

        <section id="privacy" className="privacy-section" aria-labelledby="privacy-title">
          <div className="privacy-visual" aria-hidden="true">
            <div className="device-ring"><div className="device-card"><span>PDF</span><i>✓</i></div></div>
            <p>Your device</p><small>Secure browser workspace</small>
          </div>
          <div className="privacy-copy">
            <p className="eyebrow">Privacy you don’t have to trust</p>
            <h2 id="privacy-title">Your file never leaves your browser</h2>
            <p>Many online PDF tools send documents to a remote server. Fill a PDF works differently: the editor runs locally in your browser, using a separate working copy while preserving the original bytes for export.</p>
            <ul>
              <li><span>✓</span><div><strong>No uploads</strong><p>Your document is never transmitted to us or any third party.</p></div></li>
              <li><span>✓</span><div><strong>No storage</strong><p>We cannot retain a file we never receive.</p></div></li>
              <li><span>✓</span><div><strong>No document tracking</strong><p>No filenames, field values, or file contents are collected.</p></div></li>
            </ul>
            <Link href="/privacy">Read the plain-language privacy policy <span aria-hidden="true">→</span></Link>
          </div>
        </section>

        <section id="faq" className="content-section faq-section" aria-labelledby="faq-title">
          <div className="section-intro centered">
            <p className="eyebrow">Good to know</p>
            <h2 id="faq-title">Frequently asked questions</h2>
          </div>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <details key={faq.question} open={index === 0}>
                <summary>{faq.question}<span aria-hidden="true">+</span></summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="final-cta" aria-labelledby="cta-title">
          <p className="eyebrow">Ready when you are</p>
          <h2 id="cta-title">Fill the form. Not someone else’s server.</h2>
          <p>Private PDF filling with no uploads, no account, and no hidden cost.</p>
          <a className="button button-light" href="#tool">Fill a PDF for free <span aria-hidden="true">↑</span></a>
        </section>
      </main>

      <footer>
        <a className="brand footer-brand" href="#top"><span className="brand-mark" aria-hidden="true">F</span><span>Fill a PDF</span></a>
        <p>Private PDF form filling, right in your browser.</p>
        <nav aria-label="Footer navigation"><Link href="/compress-pdf">Compress PDF</Link><Link href="/protect-pdf">Protect PDF</Link><Link href="/privacy">Privacy</Link><a href="#faq">FAQ</a><a href="#tool">Use the tool</a></nav>
        <small>© {new Date().getFullYear()} Fill a PDF. Your files stay yours.</small>
      </footer>
    </>
  );
}
