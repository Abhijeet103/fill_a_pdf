import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_URL } from "./lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "localpdf.store", template: "%s | localpdf.store" },
  description: "Fill, compress, merge, split, and protect PDFs privately in your browser. Free, with no uploads, accounts, or payment.",
  applicationName: "localpdf.store",
  category: "utilities",
  openGraph: { siteName: "localpdf.store", type: "website", images: [{ url: `${SITE_URL}/og-localpdf-store.png`, width: 1729, height: 910, alt: "localpdf.store private PDF tools" }] },
  twitter: { card: "summary_large_image", images: [`${SITE_URL}/og-localpdf-store.png`] },
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
