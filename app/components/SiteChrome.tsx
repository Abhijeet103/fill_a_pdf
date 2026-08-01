import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true">L</span><span>localpdf.store</span></Link>
      <nav aria-label="PDF tools navigation">
        <Link href="/fill-pdf">Fill</Link>
        <Link href="/compress-pdf">Compress</Link>
        <Link href="/merge-pdf">Merge</Link>
        <Link href="/split-pdf">Split</Link>
        <Link href="/protect-pdf">Protect</Link>
      </nav>
      <Link className="header-cta" href="/#tools">All PDF tools</Link>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <Link className="brand footer-brand" href="/"><span className="brand-mark" aria-hidden="true">L</span><span>localpdf.store</span></Link>
      <p>Private PDF tools that run in your browser.</p>
      <nav aria-label="Footer navigation"><Link href="/fill-pdf">Fill</Link><Link href="/compress-pdf">Compress</Link><Link href="/merge-pdf">Merge</Link><Link href="/split-pdf">Split</Link><Link href="/protect-pdf">Protect</Link><Link href="/privacy">Privacy</Link></nav>
      <small>© {new Date().getFullYear()} localpdf.store. Your files stay yours.</small>
    </footer>
  );
}
