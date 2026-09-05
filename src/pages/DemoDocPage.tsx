import React, { useEffect } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { usePostHog } from '@posthog/react'
import { DemoModeProvider } from '../components/DemoMode'
import { DemoEditorPage } from './DemoEditorPage'
import { LabelPage } from './LabelPage'
import { ProformaPage } from './ProformaPage'
import { BLPage } from './BLPage'
import { BLManifestPage } from './BLManifestPage'
import { IMODGDPage } from './IMODGDPage'
import { DGDPage } from './DGDPage'
import { ManifestPage } from './ManifestPage'
import { NeppexPage } from './NeppexPage'
import { FWBPage, FHLPage, FFRPage } from './EDIPages'

/**
 * Signed-out demo for a single document type. The editors are the real ones —
 * DemoModeProvider is what strips the account chrome and swaps the download
 * button for a signup CTA, so the demo can never drift from the live editor.
 *
 * AWB and HAWB keep their own demo page because they use the form-over-PDF
 * overlay rather than the shared editor shell.
 */
const DEMO_EDITORS: Record<string, React.ComponentType> = {
  awb: DemoEditorPage,
  hawb: DemoEditorPage,
  dgd: DGDPage,
  manifest: ManifestPage,
  neppex: NeppexPage,
  label: LabelPage,
  proforma: ProformaPage,
  bl: BLPage,
  bl_manifest: BLManifestPage,
  imo_dgd: IMODGDPage,
  fwb: FWBPage,
  fhl: FHLPage,
  ffr: FFRPage,
}

export function DemoDocPage() {
  const { docType } = useParams<{ docType: string }>()
  const location = useLocation()
  const posthog = usePostHog()
  const Editor = docType ? DEMO_EDITORS[docType] : undefined
  const params = new URLSearchParams(location.search)
  const source = params.get('source') ?? 'direct'
  const intent = params.get('intent') ?? 'view_demo'

  useEffect(() => {
    if (!docType || !Editor) return
    posthog?.capture('demo_viewed', {
      doc_type: docType,
      route: `/demo/${docType}`,
      source,
      intent,
    })
  }, [Editor, docType, intent, posthog, source])

  if (!Editor) return <Navigate to="/demo" replace />

  return (
    <DemoModeProvider>
      <Editor />
    </DemoModeProvider>
  )
}
