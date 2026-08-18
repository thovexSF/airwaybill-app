import React, { useState } from 'react'
import { DownloadAuthorization } from '../lib/pdfQuota'

/**
 * PDF download button that charges the monthly document quota first.
 * Replaces a plain `<a download>` so the free-plan allowance is enforced for
 * every document type, not just the AWB.
 */
export function DownloadPdfButton({
  pdfUrl,
  fileName,
  authorize,
  onDownloaded,
  onRefused,
  label = 'Download PDF',
  style,
}: {
  pdfUrl: string
  fileName: string
  /** Saves the document if needed and charges one quota unit. */
  authorize: () => Promise<DownloadAuthorization>
  onDownloaded?: () => void
  onRefused?: (message: string) => void
  label?: string
  style?: React.CSSProperties
}) {
  const [busy, setBusy] = useState(false)

  async function handleClick() {
    if (busy) return
    setBusy(true)
    try {
      const auth = await authorize()
      if (!auth.ok) {
        onRefused?.(auth.message ?? 'Download not allowed')
        return
      }
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      onDownloaded?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <button className="btn-download" onClick={handleClick} disabled={busy} style={style}>
      {busy ? 'Preparing…' : label}
    </button>
  )
}
