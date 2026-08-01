import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_URL } from "./lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "PDF Slate", template: "%s | PDF Slate" },
  description: "Fill, compress, merge, split, and protect PDFs privately in your browser. Free, with no uploads, accounts, or payment.",
  applicationName: "PDF Slate",
  category: "utilities",
  openGraph: { siteName: "PDF Slate", type: "website", images: [{ url: `${SITE_URL}/og-pdf-slate.png`, width: 1729, height: 910, alt: "PDF Slate private PDF tools" }] },
  twitter: { card: "summary_large_image", images: [`${SITE_URL}/og-pdf-slate.png`] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f6f8",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head><link rel="icon" href="/favicon.svg" type="image/svg+xml" /></head>
      <body>{children}</body>
    </html>
  );
}
