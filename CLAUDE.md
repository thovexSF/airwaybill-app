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

**Partner API (B2B and other clients):** `npm start` serves the SPA and the
`/v1` Partner API (`server/index.ts`). Auth is `Authorization: Bearer awb_live_…`
(see `docs/PARTNER_API.md` and `supabase/migration_partner_api.sql`). B2B should
not fork AWB PDF/UI — it calls this API / opens the hosted app.

The Railway deploy is pinned in the repo, not only in the Railway UI:
`nixpacks.toml` holds the language provider and the install phase,
`railway.json` the build and start commands. Four things there are load-bearing
and easy to undo by accident.

- The provider pin (`providers = ["node"]`) must stay: Nixpacks otherwise
  detects Deno from the `https://deno.land/...` imports in
  `supabase/functions/` and builds an image with no npm in it.
- The install must be `npm ci --include=dev` — the whole toolchain is a
  devDependency, and npm's `production` config is on in that environment.
- Nothing may install again in the build phase. Nixpacks mounts
  `/app/node_modules/.cache` as a build cache, so a second `npm ci` wipes
  `node_modules`, cannot `rmdir` that mount point and dies with `EBUSY`.
- `preview.allowedHosts` in `vite.config.ts` must cover the serving domain:
  `vite preview` answers 403 to any other `Host`, which fails the healthcheck
  while the build still reports success.

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

- **`src/pdf/awbFieldPositions.ts`** — the coordinates, as percentages of the
  US Letter page, calibrated against the awbeditor "SET COMPLETO" sheets. This
  file is shared verbatim with the sister `b2b` repo, which prints from the
  same numbers: fix alignment here and both apps move together, never by
  nudging a value downstream.
- **`src/pdf/awbLayout.ts`** — turns those percentages into points and maps
  them onto `AWBData`. Imported by **both** `AWBDocument.tsx` (the PDF export)
  and `AWBOverlay.tsx` (the live editing UI), so the two can never drift out of
  visual sync.
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

`src/pdf/awbCopyTheme.ts` lists the eight IATA copies. Each is issued on its own
sheet, printed in its own ink — green, magenta, blue, mustard, black — so the
blank form comes as one rasterisation per copy in `public/awb-copies/`, and
every typed value takes that copy's `ink`. Copies 6 to 8 are extra copies and
share sheet 5. `AWBCopiesDocument` emits a face page and its reverse per
selected copy, and `src/components/CopiesDialog.tsx` is the picker, preview and
print/download front end for it.

Values are set in **Courier Prime**, embedded from `public/awb-fonts/` rather
than using the built-in Courier: the standard Type 1 face renders noticeably
heavier in macOS Preview than in Chrome, so the same waybill looked like two
different documents depending on who opened it. The fitting in `fittedLines`
depends on the face being monospaced — `0.6 * fontSize` per character is the
real advance width, not an estimate — and `AWBOverlay` carries the matching CSS
stack and the same 9pt baseline so what is typed measures the same on screen as
it prints.

`src/lib/airlines.ts` maps the AWB prefix to its carrier: the editor fills the
carrier block from it (never overwriting what was typed) and the renderer draws
the airline's logo from `public/awb-airlines/<prefix>.png`. Both the registry
and the logo files are kept in step with `airlineByPrefix.ts` in `b2b`. Only add
a prefix you have verified — a wrong mapping goes straight onto a printed
waybill.

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

`public/awb-copies/1.png` … `5.png` are the blank IATA sheets, one per copy,
each already printed in that copy's ink. They come from the awbeditor "SET
COMPLETO" and are shared with the sister `b2b` repo, which renders them from
the same SVG through `recolorAwbSvg`. They are US Letter (2481 × 3211, ratio
0.7727) — not A4, which is why the coordinate schema is in page percentages
rather than millimetres. `public/awb-template.svg` and `awb-template-bg.png`
are the older A4 blank, kept as the source the sheets were derived from.

The reverse of the sheet is `src/pdf/awbConditions.ts` — IATA Resolution 600b,
held as text and typeset in two columns by `AwbConditionsPage`, not embedded as
a picture of somebody else's printed page. `scripts/check-conditions.mjs` diffs
it word for word against the text layer of a reference waybill (pass the PDF's
path); it passes at 1413 words. Every copy carries its own reverse, so printing
double-sided gives each sheet its contract.

Because the sheet supplies every box, rule and caption, `awbLayout.ts` only
positions *values*: it emits fields and no boxes, banners or static text, and
`AWBDocument` draws the sheet as a background image behind them. Give that
image a height a hair under `PAGE_HEIGHT` — at exactly the page height
react-pdf rounds it past the page and pushes every sibling onto page 2.

`hideValues` skips only the fields the overlay covers. The derived ones — the
waybill number in its three places, the rate totals — are marked `readOnly` and
stay the PDF's job, because the overlay never draws them.

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
