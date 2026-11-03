import React, { useMemo } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import createCache, { type EmotionCache } from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import MawbForm from './structured/MawbForm'
import HawbStructuredForm from './structured/HawbManifestForms'
import type { AWBData } from '../types/awb'
import type { MawbFormData } from './structured/types'
import type { HawbFormData } from './structured/HawbManifestForms'
import {
  awbDataToHawbEntity,
  awbDataToMawbEntity,
  hawbFormToAwbData,
  mawbFormToAwbData,
} from '../lib/awbStructuredBridge'
import { getPartnerShadow } from '../lib/partnerHost'

// Inside B2B's shadow root, styles written to document.head do not apply and
// dialogs portaled to document.body fall outside it, so both stay in the root.
// Per root: B2B builds a new one each time its page opens.
const shadowStyling = new WeakMap<ShadowRoot, { cache: EmotionCache; portal: HTMLElement }>()

function stylingFor(shadow: ShadowRoot) {
  let styling = shadowStyling.get(shadow)
  if (!styling) {
    const portal = document.createElement('div')
    shadow.append(portal)
    styling = { cache: createCache({ key: 'awb', container: shadow }), portal }
    shadowStyling.set(shadow, styling)
  }
  return styling
}

// MUI derives hover and contrast shades from this colour, so it needs a real
// value, not var(--red): read what the page resolved (orange under the B2B theme).
const brandColor = () =>
  (typeof document !== 'undefined' && getComputedStyle(document.documentElement).getPropertyValue('--red').trim()) || '#8B0000'

const makeTheme = (portal?: HTMLElement) => createTheme({
  palette: {
    primary: { main: brandColor() },
  },
  // Above `.awb-host .form-dialog-backdrop`, the editor modal these dialogs open from.
  ...(portal && { zIndex: { modal: 1700 } }),
  typography: {
    fontSize: 12,
    body2: { fontSize: '0.75rem' },
    subtitle2: { fontSize: '0.8rem', fontWeight: 700 },
  },
  components: {
    MuiTextField: {
      defaultProps: { size: 'small', margin: 'dense' },
    },
    MuiButton: {
      defaultProps: { size: 'small' },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { fontSize: '0.72rem', padding: '4px 6px' },
        head: { fontWeight: 700 },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: { fontSize: '0.75rem', padding: '5px 8px' },
        inputMultiline: { fontSize: '0.75rem', lineHeight: 1.35 },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { fontSize: '0.72rem' } },
    },
    MuiFormControlLabel: {
      styleOverrides: { label: { fontSize: '0.72rem' } },
    },
    ...(portal && {
      // The focus trap reads document.activeElement, which is the shadow host from
      // out here, so it would keep pulling focus away from the dialog's own fields.
      MuiModal: { defaultProps: { container: portal, disableEnforceFocus: true } },
      MuiPopover: { defaultProps: { container: portal } },
    }),
  },
})

interface Props {
  data: AWBData
  onChange: (data: AWBData) => void
  documentKey?: string | null
}

export function StructuredFormPanel({ data, onChange, documentKey }: Props) {
  const key = documentKey || (data.docType === 'hawb' ? data.hawbNumber : `${data.awbPrefix}-${data.awbSerial}`) || 'new'
  const mawbEntity = useMemo(() => awbDataToMawbEntity(data, documentKey), [data, documentKey])
  const hawbEntity = useMemo(() => awbDataToHawbEntity(data, documentKey), [data, documentKey])
  const shadow = getPartnerShadow()
  const styling = shadow ? stylingFor(shadow) : null
  const theme = useMemo(() => makeTheme(styling?.portal), [styling])

  const panel = (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="structured-form-panel">
        {data.docType === 'hawb' ? (
          <HawbStructuredForm
            key={key}
            data={hawbEntity}
            onChange={(form: HawbFormData) => onChange(hawbFormToAwbData(form, data))}
          />
        ) : (
          <MawbForm
            key={key}
            data={mawbEntity}
            onChange={(form: MawbFormData) => onChange(mawbFormToAwbData(form, data))}
          />
        )}
      </div>
    </ThemeProvider>
  )

  return styling ? <CacheProvider value={styling.cache}>{panel}</CacheProvider> : panel
}
