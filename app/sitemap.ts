import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/fill-pdf`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/compress-pdf`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/merge-pdf`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/split-pdf`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/protect-pdf`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.4 },
  ];
}
