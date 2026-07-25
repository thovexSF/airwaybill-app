# IATA Air Waybill — Official Reference

The AWB layout in `src/pdf/awbLayout.ts` follows the **IATA Cargo Services
Conference** standard for the neutral Air Waybill:

- **Resolution 600a** — *The Air Waybill (form and layout)*. Defines the box
  positions/sizes (Appendix A grid, unit = 1/10 inch / 2 mm) and printing rules
  (e.g. the dangerous-goods clause from "insofar…" in the Shipper's
  Certification must be **bold**). The full resolution text ships inside the
  **Cargo Services Conference Resolutions Manual (CSCRM)**, a commercial IATA
  publication — found priced around **USD $320–343** (edition 43, English;
  sourced from a third-party search snippet, not confirmed live against
  iata.org/store — that domain rejects direct fetches from this dev
  environment's network policy, independent of anything IATA does). Not
  stored here for that reason.

  This is about the *official resolution document*, not the AWB layout
  itself: the box grid is a functional business form used industry-wide, and
  reproducing box positions you've measured from a real form (see below) is
  standard practice, not something that requires buying the CSCRM.
- **Resolution 600b** — *Air Waybill — Conditions of Contract*. Public on
  iata.org. Stored here as
  `IATA-Resolution-600b-Conditions-of-Contract-2019-12-28.pdf`
  (source: https://www.iata.org/contentassets/783ac75f30d74e32a8eaef26af5696b6/csc-600b-en-28dec2019.pdf).

## Validation status

- The **face notice** rendered by the app (`IATA_CONDITIONS` in `awbLayout.ts`)
  matches the official Resolution 600b text **verbatim** (verified char-for-char).
- Allowed page size per 600a: width 208–230 mm, length 274–305 mm — both
  **US Letter** (216×279 mm, currently used) and **A4** (210×297 mm) are valid.
- The dangerous-goods clause in the Shipper's Certification is printed in bold,
  per 600a.

The box coordinates themselves were measured from a real production AWB
(LATAM 045-21564944) which conforms to 600a, then aligned in `awbLayout.ts`.
