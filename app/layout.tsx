import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_URL } from "./lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Fill a PDF", template: "%s | Fill a PDF" },
  description: "Fill PDF forms privately in your browser. Free, with no uploads, accounts, or payment.",
  applicationName: "Fill a PDF",
  category: "utilities",
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
