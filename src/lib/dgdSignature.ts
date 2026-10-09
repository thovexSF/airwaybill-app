import type { DGDData } from '../types/dgd'

/** 53-bit string hash (cyrb53): detects edits after signing. It is a change detector, not a cryptographic seal. */
function cyrb53(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)
}

/** Everything the declaration says, except the signature itself, the draft mark and the logo. */
export function dgdContentHash(d: DGDData): string {
  const { signatureUrl: _s, signatureProof: _p, logoUrl: _l, isDraft: _d, ...content } = d
  return cyrb53(JSON.stringify(content))
}

export type SignatureState = 'none' | 'valid' | 'modified'

export function signatureState(d: DGDData): SignatureState {
  if (!d.signatureUrl || !d.signatureProof) return 'none'
  return d.signatureProof.hash === dgdContentHash(d) ? 'valid' : 'modified'
}

export function signDgd(d: DGDData, signatureUrl: string, signedBy: string): DGDData {
  return {
    ...d,
    signatureUrl,
    signatureProof: { hash: dgdContentHash(d), signedAt: new Date().toISOString(), signedBy },
  }
}

export function clearSignature(d: DGDData): DGDData {
  const { signatureUrl: _s, signatureProof: _p, ...rest } = d
  return rest as DGDData
}
