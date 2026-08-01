import type { Metadata } from "next";
import Link from "next/link";
import { CompressPdf } from "../components/CompressPdf";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: { absolute: "Compress PDF to 1 MB or a Custom Size Online | Fill a PDF" },
  description: "Compress a PDF toward 1 MB or your chosen file size privately in your browser. Free, with no upload, login, payment, or watermark.",
  alternates: { canonical: `${SITE_URL}/compress-pdf` },
  openGraph: {
    title: "Compress a PDF to your desired size privately",
    description: "Choose a target size and download a smaller PDF without uploading your document.",
    url: `${SITE_URL}/compress-pdf`,
    siteName: "Fill a PDF",
    type: "website",
  },
};

const faqs = [
  { question: "Can I compress a PDF to exactly 1 MB?", answer: "The tool aims for 1 MB or less. The exact result depends on the PDF’s pages and images, so it may finish below the target or report the smallest readable result it can make." },
  { question: "Does my PDF get uploaded for compression?", answer: "No. Rendering, compression, and PDF creation happen in your browser. The document is never sent to our server or a third party." },
  { question: "Will text and form fields remain editable?", answer: "The compressed copy rebuilds pages as images to reduce file size predictably. This can flatten searchable text, links, annotations, signatures, and fillable form fields." },
  { question: "Why can’t every PDF reach my target?", answer: "Every page needs a minimum amount of data to remain readable. A long document or one with detailed scans may be larger than an extremely small target even at the lowest useful quality." },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })),
};

export default function CompressPdfPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <header className="site-header">
        <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true">F</span><span>Fill a PDF</span></Link>
        <nav aria-label="Main navigation"><Link href="/">Fill PDF</Link><Link href="/protect-pdf">Protect PDF</Link><a href="#how-it-works">How it works</a><a href="#faq">FAQ</a><Link href="/privacy">Privacy</Link></nav>
        <Link className="header-cta" href="/protect-pdf">Protect PDF</Link>
      </header>

      <main className="protect-main">
        <section className="protect-hero compress-hero" aria-labelledby="compress-title">
          <p className="eyebrow"><span aria-hidden="true">●</span> Private, target-size compression</p>
          <h1 id="compress-title">Compress a PDF to 1 MB.<br /><em>Or choose your own target.</em></h1>
          <p>Make a PDF smaller entirely in your browser. Pick a target size, compare the result, and download—without uploads, login, payment, or watermark.</p>
        </section>

        <section className="protect-tool-section" aria-label="Compress PDF tool"><CompressPdf /></section>

        <section id="how-it-works" className="content-section protect-explainer" aria-labelledby="compress-how-title">
          <div className="section-intro centered"><p className="eyebrow">Three simple steps</p><h2 id="compress-how-title">Compress to a size that works for you</h2></div>
          <ol className="steps-grid">
            <li><span>01</span><div className="step-icon" aria-hidden="true">↥</div><h3>Choose your PDF</h3><p>Select a PDF up to 50 MB and 100 pages. It remains on your device.</p></li>
            <li><span>02</span><div className="step-icon" aria-hidden="true">1M</div><h3>Enter a target</h3><p>Use the 1 MB default or enter a custom target from 0.1 MB to 50 MB.</p></li>
            <li><span>03</span><div className="step-icon" aria-hidden="true">↓</div><h3>Compare and download</h3><p>See the original and achieved sizes before downloading the compressed copy.</p></li>
          </ol>
        </section>

        <section id="faq" className="content-section faq-section" aria-labelledby="compress-faq-title">
          <div className="section-intro centered"><p className="eyebrow">Good to know</p><h2 id="compress-faq-title">PDF compression FAQ</h2></div>
          <div className="faq-list">{faqs.map((faq, index) => <details key={faq.question} open={index === 0}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div>
        </section>
      </main>

      <footer>
        <Link className="brand footer-brand" href="/"><span className="brand-mark" aria-hidden="true">F</span><span>Fill a PDF</span></Link>
        <p>Private PDF tools, right in your browser.</p>
        <nav aria-label="Footer navigation"><Link href="/">Fill PDF</Link><Link href="/compress-pdf">Compress PDF</Link><Link href="/protect-pdf">Protect PDF</Link><Link href="/privacy">Privacy</Link></nav>
        <small>© {new Date().getFullYear()} Fill a PDF. Your files stay yours.</small>
      </footer>
    </>
  );
}
