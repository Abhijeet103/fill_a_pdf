# Fill a PDF

A production-oriented, privacy-first PDF form filler. It detects AcroForm fields, supports text placement on flat PDFs, and creates the download entirely in the browser. There is no login, payment, upload endpoint, document storage, or server-side PDF handling.

## Architecture

- **Statically rendered landing pages:** Next-compatible app routes built with vinext provide indexable HTML for the hero, how-to guide, privacy explanation, FAQ, metadata, and JSON-LD.
- **One client editor:** `app/components/PdfFiller.tsx` owns intake, field state, preview, flat-PDF overlays, and download.
- **PDF mutation:** `pdf-lib` reloads pristine source bytes for every export, updates only form values and placed text, optionally flattens the form, then saves a new PDF.
- **Preview:** `pdfjs-dist` renders separate byte copies to canvas. Its worker and libraries are bundled locally and load only after a file is selected.
- **URL configuration:** set `NEXT_PUBLIC_SITE_URL` once to update canonical, Open Graph, sitemap, robots, and structured-data URLs.

## Privacy model

The browser reads the selected file directly. One pristine `Uint8Array` is retained for export, while separate `.slice()` copies are passed to pdf.js and pdf-lib to avoid worker-related buffer detachment. No file bytes, filenames, field names, field values, or placed text are sent over the network. A restrictive CSP permits connections only to the same origin.

## Supported documents

- AcroForm text fields, checkboxes, radio groups, dropdowns, and option lists
- Existing field values
- Flat PDFs through click-to-place text overlays on any page
- Optional form flattening through the default-on **Lock values** control

Password-protected and XFA documents receive specific, actionable messages. If flattening fails, the editor saves an editable form and tells the user.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Use a real domain or deployment URL for `NEXT_PUBLIC_SITE_URL` before publishing.

## Quality checks

```bash
npm run build
npm run lint
npm test
npm run lighthouse
```

Tests cover coordinate conversion, form-field mapping, a filled AcroForm output, a flat-PDF text overlay, pre-rendered SEO content, and the privacy page. The Lighthouse script audits the local production URL supplied through `LIGHTHOUSE_URL` (default `http://localhost:3000`).

## Adding another form type

1. Add its constructor mapping in `app/lib/pdf-utils.ts`.
2. Read the initial value in `readFieldState`.
3. Render an accessible control in `PdfFiller`.
4. Apply the value in `applyFieldValues`.
5. Add unit and integration coverage.

## Deploy

The app builds to Cloudflare Worker-compatible ESM and requires no database, storage bucket, authentication provider, or PDF service. Configure `NEXT_PUBLIC_SITE_URL`, run the production build, and deploy the generated site through Sites or another compatible static/edge host.
