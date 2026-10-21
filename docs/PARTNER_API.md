# Partner API (B2B → Airwaybill App)

Airwaybill App is the source of truth for documents and PDF rendering.
Partners integrate with an API key — no duplicated AWB UI/PDF code.

## For end users (simplest)

1. Apply SQL once: [`supabase/migration_partner_api.sql`](supabase/migration_partner_api.sql)
2. In the SPA: **Settings → API keys → Create token** (copy `awb_live_…` once)
3. In the partner system (e.g. B2B → Configuración → Airwaybill): paste the token and save

Base URL defaults to `https://airwaybill.app`. Partners only paste the token.

## Auth

```
Authorization: Bearer awb_live_…
```

Keys are stored as SHA-256 hashes. Creating a key from Settings on a free plan sets `plan_override=enterprise` so partner PDFs are not watermarked / quota-blocked for your own org integration.

## Endpoints

| Method | Path | Body / query |
|--------|------|----------------|
| GET | `/v1/health` | — |
| GET | `/v1/documents` | `?docType=awb&externalId=…` |
| POST | `/v1/documents` | `{ "data": { "docType":"awb", … }, "externalId":"op-123" }` |
| GET | `/v1/documents/:id` | — |
| PATCH | `/v1/documents/:id` | `{ "data": {…} }` |
| DELETE | `/v1/documents/:id` | — |
| GET/POST | `/v1/documents/:id/pdf` | optional `{ "copies": ["1","2"] }` → PDF bytes |
| POST | `/v1/embed-session` | `{ "theme":"b2b", "next":"/my-awbs" }` → `{ embedUrl, expiresInSeconds }` |
| POST | `/v1/fwb/preview` | AWB JSON (or FwbInput) → `{ ok, message, errors, warnings }` |
| POST | `/v1/documents/:id/fwb` | generate FWB/17, persist `eAwb*` on document |

`data` is the same JSON shape the SPA stores in `awb_documents.data` (`docType` discriminator).

## Embedded app (SSO)

`POST /v1/embed-session` returns a one-time `embedUrl` (`/partner-entry?…`) valid for
`expiresInSeconds` (60). The partner opens it in an iframe or new tab: the SPA exchanges the
magic-link token for a Supabase session of the key's acting user, so there is no second login.
`theme` (default `b2b`) styles the shell, `next` is the SPA path to land on (default `/my-awbs`).
The base of `embedUrl` is `PUBLIC_APP_URL`, then `AIRWAYBILL_APP_URL`, then the request host.
Request the URL right before opening it: it is single-use and expires quickly.

## CLI (optional)

```bash
npm run partner:create-key -- --org-id <uuid> --user-id <uuid> --name "B2B Express"
```

Prefer the Settings UI when possible.

## B2B client

See `b2b/docs/AIRWAYBILL_PARTNER.md`. Token lives in B2B `system_settings`; URL is hardcoded.
