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
