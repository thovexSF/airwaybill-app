import React, { useMemo } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
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

const theme = createTheme({
  palette: {
    primary: { main: '#8b0000' },
  },
  typography: { fontSize: 13 },
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

  if (data.docType === 'hawb') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="structured-form-panel">
          <HawbStructuredForm
            key={key}
            data={hawbEntity}
            onChange={(form: HawbFormData) => onChange(hawbFormToAwbData(form, data))}
          />
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="structured-form-panel">
        <MawbForm
          key={key}
          data={mawbEntity}
          onChange={(form: MawbFormData) => onChange(mawbFormToAwbData(form, data))}
        />
      </div>
    </ThemeProvider>
  )
}
