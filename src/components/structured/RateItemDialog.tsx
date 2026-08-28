import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { RateLine } from './types';
import { emptyRateLine } from './types';

export interface DimRow {
  length: number;
  width: number;
  height: number;
  unit: string;
  pieces: number;
  weight: number;
  weightUnit: string;
}

export const emptyDim = (): DimRow => ({
  length: 0,
  width: 0,
  height: 0,
  unit: 'cm',
  pieces: 0,
  weight: 0,
  weightUnit: 'kg',
});

const FACTOR = 6000;

interface Props {
  open: boolean;
  line: RateLine | null;
  onClose: () => void;
  onAccept: (line: RateLine) => void;
}

const RateItemDialog: React.FC<Props> = ({ open, line, onClose, onAccept }) => {
  const [item, setItem] = useState<RateLine>(emptyRateLine());
  const [dims, setDims] = useState<DimRow[]>([emptyDim()]);
  const [autoCalc, setAutoCalc] = useState<'total' | 'rate' | 'none'>('total');

  useEffect(() => {
    if (!open) return;
    const next = { ...emptyRateLine(), ...(line || {}) };
    setItem(next);
    const fromLine = Array.isArray((next as any).dimensions) && (next as any).dimensions.length
      ? (next as any).dimensions
      : [emptyDim()];
    setDims(fromLine);
    setAutoCalc(((next as any).autoCalc as any) || 'total');
  }, [open, line]);

  const volumeCm3 = useMemo(
    () =>
      dims.reduce((s, d) => {
        const unit = (d.unit || 'cm').toLowerCase();
        const f = unit === 'in' ? 2.54 : unit === 'm' ? 100 : 1;
        return s + d.length * f * d.width * f * d.height * f * (Number(d.pieces) || 0);
      }, 0),
    [dims]
  );
  const volWeight = volumeCm3 / FACTOR;

  const set = (patch: Partial<RateLine>) => {
    setItem((p) => {
      const next = { ...p, ...patch };
      if (autoCalc === 'total') {
        next.total = Number((Number(next.chargeableWeight) * Number(next.rate) || 0).toFixed(2));
      } else if (autoCalc === 'rate' && Number(next.chargeableWeight)) {
        next.rate = Number((Number(next.total) / Number(next.chargeableWeight)).toFixed(2));
      }
      return next;
    });
  };

  const updateDim = (idx: number, patch: Partial<DimRow>) => {
    setDims((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Rate Description Item</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField fullWidth size="small" type="number" label="Pieces" value={item.pieces} onChange={(e) => set({ pieces: Number(e.target.value) })} />
              </Grid>
              <Grid item xs={4}>
                <TextField fullWidth size="small" type="number" label="Gross W." value={item.grossWeight} onChange={(e) => set({ grossWeight: Number(e.target.value) })} />
              </Grid>
              <Grid item xs={2}>
                <TextField select fullWidth size="small" label=" " value={item.weightUnit} onChange={(e) => set({ weightUnit: e.target.value })}>
                  <MenuItem value="K">K</MenuItem>
                  <MenuItem value="L">L</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="Rate Class" value={item.rateClass} onChange={(e) => set({ rateClass: e.target.value })} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="Item No." value={item.itemNo} onChange={(e) => set({ itemNo: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth size="small" type="number" label="Charg. Weight" value={item.chargeableWeight} onChange={(e) => set({ chargeableWeight: Number(e.target.value) })} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" type="number" label="Rate/Charge" value={item.rate} onChange={(e) => set({ rate: Number(e.target.value) })} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" type="number" label="Total" value={item.total} InputProps={{ readOnly: autoCalc === 'total' }} onChange={(e) => set({ total: Number(e.target.value) })} />
              </Grid>
              <Grid item xs={12}>
                <TextField select fullWidth size="small" label="Auto-calculations" value={autoCalc} onChange={(e) => setAutoCalc(e.target.value as any)}>
                  <MenuItem value="total">Total</MenuItem>
                  <MenuItem value="rate">Rate/Charge</MenuItem>
                  <MenuItem value="none">None</MenuItem>
                </TextField>
              </Grid>
            </Grid>
            <Typography variant="caption" display="block" sx={{ mt: 1.5, color: 'text.secondary' }}>
              Volume: {Math.round(volumeCm3)} cm³ ({item.pieces} pieces)
              <br />
              Volumetric weight: {volWeight.toFixed(1)} kg
              <br />
              Factor: {FACTOR} cm³/kg
              <br />
              Rounding: Up (half kilo)
            </Typography>
          </Grid>
          <Grid item xs={12} md={7}>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={6}
              label="Nature and quantity of goods"
              value={item.natureAndQuantity}
              onChange={(e) => set({ natureAndQuantity: e.target.value })}
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" fontWeight={700}>Dimensions</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Length</TableCell>
                  <TableCell>Width</TableCell>
                  <TableCell>Height</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Pieces</TableCell>
                  <TableCell>Weight</TableCell>
                  <TableCell>Unit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dims.map((d, idx) => (
                  <TableRow key={idx}>
                    <TableCell><TextField size="small" type="number" value={d.length} onChange={(e) => updateDim(idx, { length: Number(e.target.value) })} /></TableCell>
                    <TableCell><TextField size="small" type="number" value={d.width} onChange={(e) => updateDim(idx, { width: Number(e.target.value) })} /></TableCell>
                    <TableCell><TextField size="small" type="number" value={d.height} onChange={(e) => updateDim(idx, { height: Number(e.target.value) })} /></TableCell>
                    <TableCell>
                      <TextField select size="small" value={d.unit} onChange={(e) => updateDim(idx, { unit: e.target.value })} sx={{ minWidth: 64 }}>
                        <MenuItem value="cm">cm</MenuItem>
                        <MenuItem value="in">in</MenuItem>
                      </TextField>
                    </TableCell>
                    <TableCell><TextField size="small" type="number" value={d.pieces} onChange={(e) => updateDim(idx, { pieces: Number(e.target.value) })} /></TableCell>
                    <TableCell><TextField size="small" type="number" value={d.weight} onChange={(e) => updateDim(idx, { weight: Number(e.target.value) })} /></TableCell>
                    <TableCell>
                      <TextField select size="small" value={d.weightUnit} onChange={(e) => updateDim(idx, { weightUnit: e.target.value })} sx={{ minWidth: 56 }}>
                        <MenuItem value="kg">kg</MenuItem>
                        <MenuItem value="lb">lb</MenuItem>
                      </TextField>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button size="small" sx={{ mt: 0.5 }} onClick={() => setDims((d) => [...d, emptyDim()])}>Add dimension</Button>
            <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
              To enable the boxes above change the &apos;auto-calculations&apos; option.
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onAccept({ ...item, dimensions: dims, autoCalc } as RateLine)}
        >
          Accept
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RateItemDialog;
