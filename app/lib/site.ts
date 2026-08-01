const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fill-a-pdf.example";

export const SITE_URL = configuredUrl.replace(/\/$/, "");
