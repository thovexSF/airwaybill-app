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

## Architecture

This is a Vite + React SPA that generates IATA-compliant air cargo documents
(Air Waybill, Dangerous Goods Declaration, Cargo Manifest) as PDFs in the
browser via `@react-pdf/renderer`, with Supabase for auth/storage/DB, Paddle
for billing, and PostHog for analytics.

### PDF documents: coordinate-schema + renderer + live overlay

Each document type (AWB, DGD, Manifest) follows the same three-piece pattern,
most fully developed for the AWB:

- **`src/pdf/awbLayout.ts`** — the single source of truth for every box,
  field, and static-text position, expressed as `FieldDef`/`BoxDef`/`BannerDef`
  in PDF points on a fixed US-Letter page. This file is imported by **both**
  `AWBDocument.tsx` (canonical PDF export) and `AWBOverlay.tsx` (live HTML
  editing UI), so the two can never drift out of visual sync — never hardcode
  a position in one without going through this schema.
- **`src/pdf/AWBDocument.tsx`** — pure `@react-pdf/renderer` component that
  draws the boxes, static text, and field values from the layout schema.
  Includes the `CornerCut`/`Banner` components that render the pennant-style
  chamfered-corner labels (e.g. "WEIGHT CHARGE", "TOTAL PREPAID") matching the
  real IATA form's trapezoidal label banners — see `AWB_BANNERS` in
  `awbLayout.ts` for how those are declared.
- **`src/components/AWBOverlay.tsx`** — absolutely-positioned HTML `<input>`/
  `<textarea>` elements layered on top of the rendered PDF preview in the
  editor, using the same `awbLayout.ts` coordinates scaled to the rendered
  page's pixel width, so typing feels like filling out the paper form
  directly. Unlike the exported PDF (which auto-shrinks/clips text to fit
  fixed boxes), the overlay always shows the full untruncated value.

`src/pdf/DGDDocument.tsx` and `src/pdf/ManifestDocument.tsx` are the
equivalent renderers for the other two document types, defined more directly
(no separate layout-schema file).

### Design decision: vector-drawn AWB, not an image-based template

The AWB is built entirely from vector boxes/lines/text (`awbLayout.ts` +
`AWBDocument.tsx`), reproducing the official grid rather than overlaying
fields on a scanned/rasterized real AWB. The box grid itself is a functional
business form used industry-wide — reproducing measured box positions isn't
gated by anything. What IS IATA-restricted is the official Resolution 600a
*document* (sold inside the CSCRM manual, ~USD $320-343) and, more
importantly, copying somebody else's actual finished artwork/scan wholesale
(exact typography, exact printed expression) rather than your own
measurements — see `docs/iata-reference/README.md` for the full picture and
what was measured from a real production AWB instead.
Do not embed a scanned/photographed real AWB as a background image without
confirming the source is properly licensed for redistribution.

### App structure

- `src/pages/` — one component per route (see `src/App.tsx` for the route
  table). `EditorPage`/`DemoEditorPage` host the AWB editor (PDF preview +
  `AWBOverlay`); `DGDPage`/`ManifestPage` are the other document editors;
  `MyAWBsPage` lists saved AWBs.
- `src/lib/*Service.ts` — one file per Supabase-backed domain (`awbService`,
  `dgdService`, `manifestService`, `importService`, `feedbackService`,
  `paddleService`). `src/lib/usePlan.ts` reads the user's plan/usage from
  Supabase and enforces the free-tier AWB download limit.
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
