# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # dev server, VITE_APP_ENV=development
npm run dev:prod-mode   # dev server, VITE_APP_ENV=production (test prod behavior locally)
npm run build           # tsc typecheck + vite build --mode production
npm run build:dev       # tsc typecheck + vite build --mode development
npm run preview          # serve the built output
```

There is no test suite and no linter configured — `tsc` (run as part of `build`)
is the only automated check. To typecheck without building: `npx tsc --noEmit`.

Environments are separated by `VITE_APP_ENV` (`development`/`production`), which
also namespaces `localStorage` keys so dev and prod data never mix on the same
browser profile. See `RAILWAY_ENVIRONMENTS.md` for the Railway deploy setup
(branch `main` → production) and `DEPLOY_CLOUDFLARE_PAGES.md` for the
alternative static-hosting path.

The Railway build and start commands live in `railway.json`, not only in the
Railway UI, and `nixpacks.toml` pins the language provider to `node`. Three
things there are load-bearing and easy to undo by accident: the install must be
`npm ci --include=dev` (the whole toolchain is a devDependency, so a
`NODE_ENV=production` in the environment would strip it); `preview.allowedHosts`
in `vite.config.ts` must cover the serving domain, because `vite preview`
answers 403 to any other `Host` and fails the healthcheck while the build still
reports success; and the provider pin must stay, because Nixpacks otherwise
detects Deno from the `https://deno.land/...` imports in `supabase/functions/`
and builds an image with no npm in it.

## Architecture

This is a Vite + React SPA that generates IATA-compliant air cargo and
freight-forwarding documents as PDFs in the browser via `@react-pdf/renderer`,
with Supabase for auth/storage/DB, Paddle for billing, and PostHog for
analytics.

The document suite (see `src/lib/docTypes.ts`, the single registry every list
and menu reads from):

| Type | Route | Renderer |
| --- | --- | --- |
| AWB / HAWB | `/editor` | `AWBDocument` + `awbLayout.ts` over the blank IATA sheet |
| DGD (air) | `/dgd` | `DGDDocument` |
| Cargo Manifest | `/manifest` | `ManifestDocument` |
| Air cargo label (4×5″, Zebra) | `/label` | `LabelDocument` |
| Proforma Invoice | `/proforma` | `ProformaDocument` |
| House Bill of Lading | `/bl` | `BLDocument` |
| B/L Consolidation Manifest | `/bl-manifest` | `BLManifestDocument` |
| IMO / IMDG DG form | `/imo-dgd` | `IMODGDDocument` |
| NEPPEX (SERNAPESCA F15) | `/neppex` | `NeppexDocument` |
| FWB / FHL / FFR (Cargo-IMP) | `/edi/*` | `EDIDocument` + `lib/ediMessage.ts` |

Everything except AWB/HAWB, DGD and Manifest was ported from the AWB module of
the sister `b2b` repo, adapted from its MUI + Redux + axios stack to this one:
plain React with the `App.css` form styles and Supabase persistence. Those
ported documents are drawn as vectors; the AWB itself is laid over `b2b`'s
blank IATA form (see below).

### AWB: coordinate schema + renderer + live overlay

The AWB is the only document with three pieces:

- **`src/pdf/awbLayout.ts`** — the single source of truth for where every value
  sits on the A4 form, as `FieldDef`s in millimetres. Imported by **both**
  `AWBDocument.tsx` (the PDF export) and `AWBOverlay.tsx` (the live editing
  UI), so the two can never drift out of visual sync — never hardcode a
  position in one without going through this schema.
- **`src/pdf/AWBDocument.tsx`** — `@react-pdf/renderer` component that draws
  the blank form as a background image and places field values on it. It draws
  no captions: the sheet already prints all 72 of them.
- **`src/components/AWBOverlay.tsx`** — absolutely-positioned HTML `<input>`/
  `<textarea>` elements layered on top of the rendered PDF preview, using the
  same `awbLayout.ts` coordinates scaled to the rendered page's pixel width, so
  typing feels like filling out the paper form directly. Unlike the exported
  PDF (which auto-shrinks/clips text to fit fixed boxes), the overlay always
  shows the full untruncated value. It draws no labels either, for the same
  reason.

While the overlay is up the editor renders the PDF with `hideValues`, so the
sheet underneath is blank. Both layers drawing the same value made every entry
appear twice: the inputs are transparent, and the PDF's own copy — wrapped to a
different width — showed through. The overlay owns the values on screen;
download and print always regenerate with `hideValues` off, so the preview blob
must never be reused as the downloaded file.

The overlay only mounts above 900px of viewport width, which a phone reaches
when the browser is in "desktop site" mode — that is how the duplication was
first seen on a phone.

`src/pdf/awbCopies.ts` lists the eight IATA copies with the paper colour each
one is issued on; `AWBCopiesDocument` emits one page per selected copy and
`src/components/CopiesDialog.tsx` is the picker, preview and print/download
front end for it. `src/lib/airlines.ts` maps the AWB prefix to its carrier and
brand colour: the editor fills the carrier block from it (never overwriting
what was typed) and the renderer prints the carrier's name in that colour with
a two-letter chip, standing in for a logo. Only add a prefix you have verified
— a wrong mapping goes straight onto a printed waybill.

`src/pdf/DGDDocument.tsx` and `src/pdf/ManifestDocument.tsx` are the renderers
for the other two original document types, defined more directly (no separate
layout-schema file, vector-drawn boxes). Every document ported from the `b2b`
suite follows that simpler shape too — a single `*Document.tsx`, no coordinate
schema and no live overlay.

### Shared editor shell

Only the AWB editor has the form-over-PDF overlay. Every other editor is built
from three shared pieces, so a new document type is a types file, a renderer
and a thin page:

- **`src/components/DocEditorShell.tsx`** — topbar, action bar, resizable form
  panel and the debounced PDF preview. Takes `data` plus a `renderDocument`
  callback and owns the regenerate/zoom/download loop.
- **`src/components/DocForm.tsx`** — `Section`/`Row`/`Field`/`TextArea`/
  `Select`/`Check`/`CodeChecks` and the `GridTable`/`GridRow` pair for
  repeating rows, all wrapping the existing `App.css` classes.
- **`src/lib/useDocEditor.ts`** — load-by-`?id=`, save and the `set(key)`
  field-patch helper, over `src/lib/documentService.ts` (generic CRUD on
  `awb_documents`, keyed by the `docType` inside the JSON `data` column).

### Cargo-IMP messages are drafts

`src/lib/ediMessage.ts` serialises the FWB/FHL/FFR forms to Cargo-IMP text.
Cargo-IMP grammar varies by carrier, so the output is explicitly a draft: the
editor shows the message body inline and the PDF carries a validate-before-
sending note. Do not wire it into a live Type B queue without checking it
against the receiving airline's implementation guide.

### The AWB renders on the blank IATA form

`public/awb-template.svg` is a blank IATA air waybill drawn in Inkscape ("AWB
BLANK TEMPLATE r3"), shared with the sister `b2b` repo — 522 vector paths and
73 printed captions, no embedded raster. `awb-template-bg.png` is its
rasterisation, used because `@react-pdf/renderer` cannot render arbitrary SVG.

Because the sheet supplies every box, rule and caption, `awbLayout.ts` only
positions *values*: it emits fields and no boxes, banners or static text, and
`AWBDocument` draws the sheet as a background image behind them. Give that
image a height a hair under `PAGE_HEIGHT` — at exactly the page height
react-pdf rounds it past the page and pushes every sibling onto page 2.

The page is US Letter but the template is A4, so the sheet is scaled to the
page height and centred (`SHEET_SCALE` / `SHEET_LEFT`), leaving ~9 mm blank
down each side. Keep the aspect ratio: stretching the form to fill Letter
would distort every box on it. Coordinates stay in template millimetres and
`sheetX()` / `sheetY()` apply the fit, so nothing in the schema has to know
about the page size.

Coordinates live in millimetres on the 210 × 297 mm template and were measured
from the SVG itself (its paths reduced to horizontal/vertical rules, then
cross-checked against the 72 captions), so they can be re-verified against the
source at any time.

This replaced an earlier vector redraw of the form. If you ever go
back to drawing the grid instead of using a licensed blank, do not substitute a
scanned or photographed real AWB as the background: what is IATA-restricted is
the official Resolution 600a *document* (sold inside the CSCRM manual, ~USD
$320-343) and, more importantly, copying somebody else's finished artwork
wholesale rather than your own measurements — see `docs/iata-reference/README.md`.

### App structure

- `src/pages/` — one component per route (see `src/App.tsx` for the route
  table). `EditorPage`/`DemoEditorPage` host the AWB editor (PDF preview +
  `AWBOverlay`); `DGDPage`/`ManifestPage`/`LabelPage`/`ProformaPage`/`BLPage`/
  `BLManifestPage`/`IMODGDPage`/`NeppexPage`/`EDIPages` are the other document
  editors; `MyAWBsPage` lists every saved document.
- `src/lib/*Service.ts` — one file per Supabase-backed domain (`awbService`,
  `dgdService`, `manifestService`, `neppexService`, `importService`,
  `feedbackService`, `paddleService`); `documentService.ts` is the generic
  replacement used by every document type ported from `b2b`.
  `src/lib/usePlan.ts` reads the user's plan/usage from Supabase and
  `src/lib/pdfQuota.ts` enforces the free-tier limit of 10 document PDF
  downloads per month, shared across every document type.
- `src/auth/` — `AuthContext` (Supabase session) + `ProtectedRoute` gate used
  in `App.tsx`.
- `src/i18n/` — `react-i18next` setup; `en.ts`/`es.ts` hold the translation
  strings.
- `supabase/` — SQL migrations (applied manually/via Supabase CLI, no
  migration runner wired into `npm` scripts) and Supabase Edge Functions
  (`functions/*/index.ts`) for feedback, welcome email, Paddle webhooks, and
  plan updates.
- `docs/iata-reference/` — provenance notes and public source documents for
  the IATA Resolution 600a/600b compliance claims made in `awbLayout.ts`.
