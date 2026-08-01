import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "./components/SiteChrome";
import { SITE_URL } from "./lib/site";

export const metadata: Metadata = {
  title: { absolute: "Free Private PDF Tools Online — Fill, Compress, Merge, Split & Protect | PDF Slate" },
  description: "Free PDF tools that run privately in your browser. Fill forms, compress to a target size, merge, split, and password-protect PDFs with no uploads or account.",
  alternates: { canonical: SITE_URL },
  openGraph: { title: "PDF Slate — Private PDF tools in your browser", description: "Fill, compress, merge, split, and protect PDFs without uploading your files.", url: SITE_URL, siteName: "PDF Slate", type: "website", images: [{ url: `${SITE_URL}/og-pdf-slate.png`, width: 1729, height: 910, alt: "PDF Slate private browser-based PDF tools" }] },
  twitter: { card: "summary_large_image", title: "PDF Slate — Private PDF tools", description: "Free PDF tools with no uploads, login, or payment.", images: [`${SITE_URL}/og-pdf-slate.png`] },
};

const tools = [
  { href: "/fill-pdf", icon: "Aa", title: "Fill PDF", search: "Fill out PDF forms online", description: "Complete interactive form fields or place text onto a flat PDF, then download your copy.", accent: "blue" },
  { href: "/compress-pdf", icon: "↘", title: "Compress PDF", search: "Compress PDF to 1 MB", description: "Choose a target size and make your PDF smaller while it stays on your device.", accent: "indigo" },
  { href: "/merge-pdf", icon: "⇄", title: "Merge PDF", search: "Combine PDF files in order", description: "Arrange up to 20 PDFs and combine every page into one downloadable document.", accent: "teal" },
  { href: "/split-pdf", icon: "÷", title: "Split PDF", search: "Extract or remove PDF pages", description: "Select page numbers or ranges to create a new PDF containing exactly the pages you need.", accent: "slate" },
  { href: "/protect-pdf", icon: "⌑", title: "Protect PDF", search: "Password protect PDF with AES-256", description: "Add an opening password and download a securely encrypted PDF without uploading it.", accent: "violet" },
];

const faqs = [
  { question: "Are PDF Slate tools free?", answer: "Yes. Every current tool is free with no account, trial, payment, watermark, or usage paywall." },
  { question: "Do my PDF files get uploaded?", answer: "No. PDF Slate processes your documents with code running in your browser. File contents, filenames, form values, and passwords are not sent to our server." },
  { question: "Which PDF tools are available?", answer: "You can fill PDF forms, compress PDFs toward a chosen size, merge multiple PDFs, split or extract pages, and add AES-256 password protection." },
  { question: "Can I use PDF Slate on mobile?", answer: "Yes. Every tool adapts to phones and tablets, though large documents may process faster on a desktop computer with more memory." },
];

const softwareJsonLd = { "@context": "https://schema.org", "@type": "WebApplication", name: "PDF Slate", url: SITE_URL, applicationCategory: "UtilitiesApplication", operatingSystem: "Any modern browser", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, featureList: tools.map((tool) => tool.search) };
const itemListJsonLd = { "@context": "https://schema.org", "@type": "ItemList", name: "Free online PDF tools", itemListElement: tools.map((tool, index) => ({ "@type": "ListItem", position: index + 1, name: tool.search, url: `${SITE_URL}${tool.href}` })) };
const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) };

export default function Home() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    <SiteHeader />
    <main id="top">
      <section className="hub-hero" aria-labelledby="hub-title">
        <div className="hub-hero-copy"><p className="eyebrow"><span aria-hidden="true">●</span> Private by design · Free to use</p><h1 id="hub-title">Everyday PDF tools.<br /><em>Nothing leaves your browser.</em></h1><p>Fill, compress, merge, split, and protect PDFs without uploads, accounts, payments, or watermarks. Choose the exact tool you need.</p><div className="hero-actions"><a className="button button-primary" href="#tools">Explore PDF tools <span aria-hidden="true">↓</span></a><span className="no-account">0 bytes uploaded · No login</span></div></div>
        <div className="hub-tool-stack" aria-hidden="true"><div className="stack-sheet back"><span>PDF</span></div><div className="stack-sheet middle"><span>PDF</span></div><div className="stack-sheet front"><div className="mini-tool-row"><i>Aa</i><i>↘</i><i>⇄</i><i>÷</i><i>⌑</i></div><b>Your private PDF workspace</b><small>Runs on this device</small><div className="stack-lines"><i /><i /><i /></div></div><div className="privacy-chip"><span>✓</span><strong>Files stay local</strong><small>No server processing</small></div></div>
      </section>

      <section id="tools" className="tools-hub" aria-labelledby="tools-title"><div className="section-intro centered"><p className="eyebrow">Choose a task</p><h2 id="tools-title">Free online PDF tools</h2><p>Each tool has its own focused workspace and direct link, so you can get straight to the job.</p></div><div className="tool-card-grid">{tools.map((tool) => <Link className={`tool-card ${tool.accent}`} href={tool.href} key={tool.href}><span className="tool-card-icon" aria-hidden="true">{tool.icon}</span><div><p>{tool.search}</p><h2>{tool.title}</h2><span>{tool.description}</span></div><b aria-hidden="true">→</b></Link>)}</div></section>

      <section className="trust-strip" aria-label="Product promises"><div><span aria-hidden="true">◎</span><strong>100% browser-based</strong><small>No file uploads</small></div><div><span aria-hidden="true">$0</span><strong>Actually free</strong><small>No login or payment</small></div><div><span aria-hidden="true">◇</span><strong>Purpose-built pages</strong><small>Go directly to your tool</small></div><div><span aria-hidden="true">↯</span><strong>Works on any device</strong><small>Responsive and touch-friendly</small></div></section>

      <section className="privacy-section" aria-labelledby="privacy-title"><div className="privacy-visual" aria-hidden="true"><div className="device-ring"><div className="device-card"><span>PDF</span><i>✓</i></div></div><p>Your device</p><small>Secure browser workspace</small></div><div className="privacy-copy"><p className="eyebrow">Privacy you can verify</p><h2 id="privacy-title">Your documents stay on your device</h2><p>Traditional online PDF services upload documents for processing. PDF Slate uses browser-based libraries, so the work happens locally in the current tab.</p><ul><li><span>✓</span><div><strong>No uploads</strong><p>Document bytes are never transmitted to us or a third party.</p></div></li><li><span>✓</span><div><strong>No document storage</strong><p>Refreshing or closing the tab clears the active workspace.</p></div></li><li><span>✓</span><div><strong>No accounts or payments</strong><p>Use every current PDF tool without sharing personal details.</p></div></li></ul><Link href="/privacy">Read the plain-language privacy policy <span aria-hidden="true">→</span></Link></div></section>

      <section id="faq" className="content-section faq-section" aria-labelledby="faq-title"><div className="section-intro centered"><p className="eyebrow">PDF Slate FAQ</p><h2 id="faq-title">Common questions about our PDF tools</h2></div><div className="faq-list">{faqs.map((faq, index) => <details key={faq.question} open={index === 0}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div></section>
      <section className="final-cta" aria-labelledby="cta-title"><p className="eyebrow">Pick a tool and start</p><h2 id="cta-title">Your PDF. Your browser. Your choice.</h2><p>Private document tools without the upload queue or account wall.</p><a className="button button-light" href="#tools">View all PDF tools <span aria-hidden="true">↑</span></a></section>
    </main>
    <SiteFooter />
  </>;
}
