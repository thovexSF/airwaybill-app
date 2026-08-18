/**
 * Cargo-IMP message bodies for the FWB / FHL / FFR forms.
 *
 * IMPORTANT: these are *draft* message bodies. Cargo-IMP grammar varies by
 * carrier — every airline publishes its own implementation guide with the
 * supplementary identifiers it accepts and the ones it rejects. Validate the
 * output against the receiving carrier's guide before wiring it into a live
 * Type B queue. The B2B suite these forms came from kept FWB/FHL/FFR out of
 * its document tabs for exactly this reason; here they are exposed with the
 * message text visible so it can be checked before it is sent.
 */

import {
  FwbData,
  FhlData,
  FfrData,
  Party,
} from '../types/edi'

const up = (s: string) => String(s || '').trim().toUpperCase()

/** Cargo-IMP forbids lowercase and most punctuation in free text fields. */
const clean = (s: string) => up(s).replace(/[^A-Z0-9 ./\-+]/g, ' ').replace(/\s+/g, ' ').trim()

function awbNumber(prefix: string, serial: string): string {
  const p = String(prefix || '').replace(/\D/g, '')
  const s = String(serial || '').replace(/\D/g, '')
  return p && s ? `${p}-${s}` : p || s
}

/** Party block: name / street / place-state-country-postcode / contacts. */
function partyLines(tag: string, party: Party): string[] {
  const lines = [tag]
  if (party.accountNumber) lines.push(`/${clean(party.accountNumber)}`)
  if (party.name) lines.push(`/${clean(party.name)}`)
  if (party.street) lines.push(`/${clean(party.street)}`)

  const locale = [party.place, party.state, party.country, party.postCode].map(clean).filter(Boolean)
  if (locale.length) lines.push(`/${locale.join('/')}`)

  for (const c of party.contacts) {
    if (c.value) lines.push(`/${up(c.type)}/${clean(c.value)}`)
  }
  return lines
}

function sphLine(codes: string[], other: string): string | null {
  const all = [...codes, ...String(other || '').split(/[,\s]+/)].map(up).filter(Boolean)
  return all.length ? `SPH/${all.join('/')}` : null
}

/* ───────────────────────── FWB ───────────────────────── */

export function buildFwbMessage(data: FwbData): string {
  const lines: string[] = []
  const awb = awbNumber(data.awbPrefix, data.awbSerial)

  lines.push(up(data.version) || 'FWB/17')

  // Waybill / routing / consignment detail
  const consignment = [
    awb,
    up(data.origin) + up(data.destination),
    `/T${data.pieces || '0'}${up(data.weightUnit) || 'K'}${data.weight || '0'}`,
  ].join('')
  lines.push(consignment)

  if (data.slac) lines.push(`/S${data.slac}`)
  if (data.description) lines.push(`/NG/${clean(data.description)}`)

  lines.push(...partyLines('SHP', data.shipper))
  lines.push(...partyLines('CNE', data.consignee))

  // Agent
  if (data.agentName || data.agentIata || data.agentCass) {
    lines.push('AGT')
    if (data.agentIata) lines.push(`/${clean(data.agentIata)}`)
    if (data.agentCass) lines.push(`/${clean(data.agentCass)}`)
    if (data.agentAccount) lines.push(`/${clean(data.agentAccount)}`)
    if (data.agentName) lines.push(`/${clean(data.agentName)}/${up(data.agentPlace)}`)
  }

  const sph = sphLine(data.sph, data.sphOther)
  if (sph) lines.push(sph)

  for (const a of data.accounting) {
    if (a.code || a.information) lines.push(`ACC/${up(a.code) || 'GEN'}/${clean(a.information)}`)
  }

  if (data.refNumber) lines.push(`REF/${clean(data.refNumber)}${data.refCode ? `/${up(data.refCode)}` : ''}`)

  lines.push(
    `CVD/${up(data.currency) || 'USD'}//${up(data.valueCarriage) || 'NVD'}/${up(data.valueCustoms) || 'NCV'}/${up(data.insurance) || 'XXX'}`,
  )

  if (data.notes) lines.push(`OSI/${clean(data.notes)}`)

  return lines.join('\n')
}

/* ───────────────────────── FHL ───────────────────────── */

export function buildFhlMessage(data: FhlData): string {
  const lines: string[] = []

  lines.push(up(data.version) || 'FHL/4')

  // Master consignment
  lines.push(
    `MAWB/${awbNumber(data.awbPrefix, data.awbSerial)}${up(data.mOrigin)}${up(data.mDest)}` +
      `/T${data.mPieces || '0'}${up(data.mWeightUnit) || 'K'}${data.mWeight || '0'}`,
  )

  // House consignment
  lines.push(
    `HBS/${clean(data.hwbNumber)}${up(data.hOrigin)}${up(data.hDest)}` +
      `/T${data.hPieces || '0'}${up(data.hWeightUnit) || 'K'}${data.hWeight || '0'}` +
      (data.slac ? `/S${data.slac}` : '') +
      (data.description ? `/${clean(data.description)}` : ''),
  )

  lines.push(...partyLines('SHP', data.shipper))
  lines.push(...partyLines('CNE', data.consignee))

  const sph = sphLine(data.sph, data.sphOther)
  if (sph) lines.push(sph)

  if (data.security) lines.push(`SSR/${clean(data.security)}`)

  lines.push(
    `CVD/${up(data.currency) || 'USD'}//${up(data.valueCarriage) || 'NVD'}/${up(data.valueCustoms) || 'NCV'}/${up(data.insurance) || 'XXX'}`,
  )

  if (data.extendedDescription) lines.push(`OTH/${clean(data.extendedDescription)}`)
  if (data.hsCodes) lines.push(`HTS/${clean(data.hsCodes)}`)

  for (const c of data.customs) {
    const parts = [up(c.country), up(c.infoId), up(c.cusId), clean(c.information)].filter(Boolean)
    if (parts.length) lines.push(`CVD/${parts.join('/')}`)
  }

  if (data.notes) lines.push(`OSI/${clean(data.notes)}`)

  return lines.join('\n')
}

/* ───────────────────────── FFR ───────────────────────── */

export function buildFfrMessage(data: FfrData): string {
  const lines: string[] = []

  lines.push('FFR/5')
  lines.push(`${awbNumber(data.awbPrefix, data.awbSerial)}${up(data.origin)}${up(data.destination)}`)

  for (const f of data.flights) {
    if (!f.flight) continue
    const seg = [up(f.flight), `${f.day || ''}${up(f.month)}`, `${up(f.origin)}${up(f.destination)}`]
      .filter(Boolean)
      .join('/')
    lines.push(`FLT/${seg}${f.spaceCode ? `/${up(f.spaceCode)}` : ''}${f.allotment ? `/${up(f.allotment)}` : ''}`)
  }

  const totalPieces = data.totalPieces || data.pieces || '0'
  lines.push(`SHP/${up(data.shipmentDesc) || 'TOTAL'}/${totalPieces}/${up(data.weightUnit) || 'K'}${data.weight || '0'}`)

  if (data.volume) lines.push(`VOL/${up(data.volumeUnit) || 'MC'}${data.volume}`)
  if (data.densityGroup) lines.push(`DG/${up(data.densityGroup)}`)
  if (data.rateClass) lines.push(`RTC/${up(data.rateClass)}`)
  if (data.serviceCode) lines.push(`SRV/${up(data.serviceCode)}`)
  if (data.description) lines.push(`NG/${clean(data.description)}`)

  for (const d of data.dimensions) {
    if (!d.length && !d.width && !d.height) continue
    lines.push(
      `DIM/${up(d.unit) || 'CM'}${d.length || 0}/${d.width || 0}/${d.height || 0}` +
        `/${d.pieces || 0}${d.weight ? `/${up(d.weightUnit) || 'K'}${d.weight}` : ''}`,
    )
  }

  for (const u of data.ulds) {
    if (!u.type && !u.serial) continue
    lines.push(
      `ULD/${up(u.type)}${up(u.serial)}${up(u.owner)}` +
        `${u.loadingIndicator ? `/${up(u.loadingIndicator)}` : ''}` +
        `${u.weight ? `/${up(u.weightUnit) || 'K'}${u.weight}` : ''}`,
    )
  }

  // Parties are deliberately not emitted here: FFR already uses `SHP/` for the
  // shipment-total line above, so a second SHP block would make the message
  // self-contradictory. The shipper/consignee captured on the FFR form carry
  // over to the FWB/FHL that follow the booking.

  if (data.agentName) {
    lines.push('AGT')
    if (data.agentIata) lines.push(`/${clean(data.agentIata)}`)
    if (data.agentCass) lines.push(`/${clean(data.agentCass)}`)
    if (data.agentAccount) lines.push(`/${clean(data.agentAccount)}`)
    lines.push(`/${clean(data.agentName)}/${up(data.agentPlace)}`)
  }

  const sph = sphLine(data.sph, data.sphOther)
  if (sph) lines.push(sph)

  if (data.security) lines.push(`SSR/${clean(data.security)}`)
  if (data.ssr) lines.push(`SSR/${clean(data.ssr)}`)
  if (data.osi) lines.push(`OSI/${clean(data.osi)}`)
  if (data.refNumber) lines.push(`REF/${clean(data.refNumber)}`)
  if (data.refInfo1) lines.push(`/${clean(data.refInfo1)}`)
  if (data.refInfo2) lines.push(`/${clean(data.refInfo2)}`)
  if (data.eawb) lines.push(`EAW/${up(data.eawb)}`)
  if (data.notes) lines.push(`OSI/${clean(data.notes)}`)

  return lines.join('\n')
}

export function buildEdiMessage(data: FwbData | FhlData | FfrData): string {
  switch (data.docType) {
    case 'fwb': return buildFwbMessage(data)
    case 'fhl': return buildFhlMessage(data)
    case 'ffr': return buildFfrMessage(data)
  }
}

/** Download the message body as a .txt file for the Type B queue. */
export function downloadEdiMessage(data: FwbData | FhlData | FfrData, filename: string): void {
  const url = URL.createObjectURL(new Blob([buildEdiMessage(data)], { type: 'text/plain' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
