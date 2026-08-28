import React from 'react';
import {
  Box,
  Button,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';

export const reqSx = {
  '& .MuiOutlinedInput-root': { bgcolor: '#c8f4f8' },
};

export const SPH_CODES = [
  { code: 'EAW', label: 'EAW - e-AWB (100% electrónico)' },
  { code: 'EAP', label: 'EAP - e-AWB con docs físicos' },
  { code: 'PER', label: 'PER - Perishable cargo' },
  { code: 'XPS', label: 'XPS - Priority small package' },
  { code: 'COL', label: 'COL - Cool goods' },
  { code: 'AVI', label: 'AVI - Live animal' },
  { code: 'PES', label: 'PES - Fish/Seafood' },
  { code: 'CAT', label: 'CAT - Cargo attendant acc. shipment' },
] as const;

export const CONTACT_TYPES = ['TE', 'FX', 'EM', 'TLX'];

export interface PartyContact {
  type: string;
  value: string;
}

export interface Party {
  accountNumber: string;
  name: string;
  street: string;
  place: string;
  state: string;
  country: string;
  postCode: string;
  contacts: PartyContact[];
}

export const emptyParty = (): Party => ({
  accountNumber: '',
  name: '',
  street: '',
  place: '',
  state: '',
  country: '',
  postCode: '',
  contacts: [
    { type: 'TE', value: '' },
    { type: 'TE', value: '' },
  ],
});

export const Fieldset: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Box
    sx={{
      border: '1px solid #bdbdbd',
      borderRadius: 0,
      p: 1.25,
      pt: 1.75,
      position: 'relative',
      mb: 1.5,
      bgcolor: '#fff',
    }}
  >
    <Typography
      sx={{
        position: 'absolute',
        top: -9,
        left: 10,
        px: 0.5,
        fontSize: 12,
        fontWeight: 700,
        color: 'text.secondary',
        bgcolor: '#fff',
        lineHeight: 1,
      }}
    >
      {title}
    </Typography>
    {children}
  </Box>
);

export const Tf: React.FC<{
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  req?: boolean;
  multiline?: boolean;
  rows?: number;
  type?: string;
  xs?: number;
  sm?: number;
  select?: boolean;
  children?: React.ReactNode;
  helperText?: string;
}> = ({ label, value, onChange, req, multiline, rows, type, xs = 12, sm, select, children, helperText }) => (
  <Grid item xs={xs} sm={sm ?? xs}>
    <TextField
      fullWidth
      size="small"
      label={label}
      value={value ?? ''}
      type={type || 'text'}
      select={select}
      multiline={multiline}
      minRows={rows}
      helperText={helperText}
      onChange={(e) => onChange(e.target.value)}
      InputLabelProps={type === 'date' ? { shrink: true } : undefined}
      sx={req ? reqSx : undefined}
    >
      {children}
    </TextField>
  </Grid>
);

export const PartyBlock: React.FC<{
  title: string;
  party: Party;
  onChange: (p: Party) => void;
  showAccount?: boolean;
  required?: boolean;
}> = ({ title, party, onChange, showAccount = true, required }) => {
  const set = (k: keyof Party, v: any) => onChange({ ...party, [k]: v });
  const setContact = (idx: number, patch: Partial<PartyContact>) => {
    const contacts = party.contacts.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    onChange({ ...party, contacts });
  };
  return (
    <Fieldset title={title}>
      <Grid container spacing={0.75}>
        {showAccount && (
          <Tf label="Account number" value={party.accountNumber} onChange={(v) => set('accountNumber', v)} xs={12} />
        )}
        <Tf label="Name" value={party.name} onChange={(v) => set('name', v)} req={required} xs={12} />
        <Tf label="Street address" value={party.street} onChange={(v) => set('street', v)} req={required} xs={12} />
        <Tf label="Place" value={party.place} onChange={(v) => set('place', v)} req={required} xs={6} />
        <Tf label="State/province" value={party.state} onChange={(v) => set('state', v)} xs={6} />
        <Tf label="Country code" value={party.country} onChange={(v) => set('country', v)} req={required} xs={4} />
        <Tf label="Post code" value={party.postCode} onChange={(v) => set('postCode', v)} xs={8} />
        {(party.contacts.length ? party.contacts : emptyParty().contacts).map((c, idx) => (
          <React.Fragment key={idx}>
            <Grid item xs={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Contact"
                value={c.type || 'TE'}
                onChange={(e) => setContact(idx, { type: e.target.value })}
              >
                {CONTACT_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={9}>
              <TextField
                fullWidth
                size="small"
                label=" "
                value={c.value}
                onChange={(e) => setContact(idx, { value: e.target.value })}
              />
            </Grid>
          </React.Fragment>
        ))}
      </Grid>
    </Fieldset>
  );
};

export const CrudBar: React.FC<{
  onAdd: () => void;
  onModify?: () => void;
  onRemove: () => void;
  disableModify?: boolean;
  disableRemove?: boolean;
}> = ({ onAdd, onModify, onRemove, disableModify, disableRemove }) => (
  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
    <Button size="small" variant="outlined" onClick={onAdd}>
      Add
    </Button>
    {onModify && (
      <Button size="small" variant="outlined" onClick={onModify} disabled={disableModify}>
        Modify
      </Button>
    )}
    <Button size="small" variant="outlined" color="error" onClick={onRemove} disabled={disableRemove}>
      Remove
    </Button>
  </Box>
);
