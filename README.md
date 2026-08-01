# localpdf.store

A production-oriented, privacy-first PDF toolkit. It fills forms, compresses toward a target size, merges documents, extracts or removes pages, and adds password protection entirely in the browser. There is no login, payment, upload endpoint, document storage, or server-side PDF handling.

## Architecture

- **Statically rendered tool pages:** Next-compatible app routes provide indexable HTML, canonical metadata, FAQs, and structured data for every PDF task.
- **Focused client tools:** Separate components own form filling, target-size compression, merging, splitting, and password protection.
- **PDF mutation:** `pdf-lib` reloads pristine source bytes for every export, updates only form values and placed text, optionally flattens the form, then saves a new PDF.
- **Preview:** `pdfjs-dist` renders separate byte copies to canvas. Its worker and libraries are bundled locally and load only after a file is selected.
- **URL configuration:** set `NEXT_PUBLIC_SITE_URL` once to update canonical, Open Graph, sitemap, robots, and structured-data URLs.

## Privacy model

The browser reads selected files directly. Separate byte copies are passed to PDF libraries to avoid worker-related buffer detachment. No file bytes, filenames, field values, or passwords are sent over the network. A restrictive CSP permits connections only to the same origin.

## Supported documents

- AcroForm text fields, checkboxes, radio groups, dropdowns, and option lists
- Existing field values
- Flat PDFs through click-to-place text overlays on any page
- Optional form flattening through the default-on **Lock values** control
- Target-size PDF compression
- Ordered merging of up to 20 PDFs
- Page extraction and removal using ranges
- AES-256 PDF password protection

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

Tests cover PDF form mutation, coordinates, password encryption, merging, page extraction, range parsing, and server-rendered SEO content for every public route. The Lighthouse script audits the local production URL supplied through `LIGHTHOUSE_URL` (default `http://localhost:3000`).

## Adding another form type

1. Add its constructor mapping in `app/lib/pdf-utils.ts`.
2. Read the initial value in `readFieldState`.
3. Render an accessible control in `PdfFiller`.
4. Apply the value in `applyFieldValues`.
5. Add unit and integration coverage.

## Deploy

The app builds to Cloudflare Worker-compatible ESM and requires no database, storage bucket, authentication provider, or PDF service. Configure `NEXT_PUBLIC_SITE_URL`, run the production build, and deploy the generated site through Sites or another compatible static/edge host.

### EC2 with Nginx

For Ubuntu, Debian, Amazon Linux 2023, or RHEL-compatible EC2 instances, the one-time installer adds Git, Node.js 22, Nginx, and a systemd service. Nginx listens on port 80 and proxies to vinext on private port 3000.
On instances with less than 1.8 GB of memory, it also creates a 2 GB swap file so the production build can complete reliably.

```bash
git clone https://github.com/Abhijeet103/fill_a_pdf.git
cd fill_a_pdf
sudo bash deploy/ec2-setup.sh \
  https://github.com/Abhijeet103/fill_a_pdf.git \
  http://your-domain.example
```

Use `http://YOUR_EC2_PUBLIC_IP` as the second argument until a domain is ready. The instance security group must allow inbound TCP port 80. Configure a TLS certificate before changing `NEXT_PUBLIC_SITE_URL` to an `https://` URL. For later releases, run:

```bash
cd /opt/localpdf-store
sudo bash deploy/ec2-update.sh
```

Useful service commands:

```bash
sudo systemctl status localpdf-store
sudo journalctl -u localpdf-store -f
sudo systemctl restart localpdf-store
```
