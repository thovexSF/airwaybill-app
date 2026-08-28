import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  Paper,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { B2B_AGENT_DEFAULTS, emptyRateLine, RateLine, OtherCharge, agentDefaultsForPartner } from './types';
import RateItemDialog from './RateItemDialog';

export interface HawbFormData {
  hawbNumber: string;
  masterAwbNumber: string;
  shipperNameAndAddress: string;
  consigneeNameAndAddress: string;
  agentNameAndCity: string;
  agentIataCode: string;
  airportOfDeparture: string;
  airportOfDestination: string;
  flightInfo: string;
  pieces: number;
  weight: number;
  natureAndQuantity: string;
  handlingInformation: string;
  sci: string;
  destinationSci: string;
  rateLines: RateLine[];
  otherCharges: OtherCharge[];
  weightChargePrepaid: number;
  weightChargeCollect: number;
  valuationChargePrepaid: number;
  valuationChargeCollect: number;
  taxPrepaid: number;
  taxCollect: number;
  totalOtherDueAgentPrepaid: number;
  totalOtherDueAgentCollect: number;
  totalOtherDueCarrierPrepaid: number;
  totalOtherDueCarrierCollect: number;
  totalPrepaid: number;
  totalCollect: number;
  currencyConvRate: string;
  ccChargesDest: string;
  chargesAtDest: string;
  totalCollectDest: string;
  shipperCertification: string;
  signatureOfShipperOrAgent: string;
  executedOnDate: string;
  executedAtPlace: string;
  signatureOfIssuingCarrierOrAgent: string;
  notes: string;
}

const defaults = (): HawbFormData => ({
  hawbNumber: '',
  masterAwbNumber: '',
  shipperNameAndAddress: '',
  consigneeNameAndAddress: '',
  agentNameAndCity: agentDefaultsForPartner().agentNameAndCity,
  agentIataCode: agentDefaultsForPartner().agentIataCode,
  airportOfDeparture: '',
  airportOfDestination: '',
  flightInfo: '',
  pieces: 0,
  weight: 0,
  natureAndQuantity: '',
  handlingInformation: '',
  sci: '',
  destinationSci: '',
  rateLines: [emptyRateLine()],
  otherCharges: [],
  weightChargePrepaid: 0,
  weightChargeCollect: 0,
  valuationChargePrepaid: 0,
  valuationChargeCollect: 0,
  taxPrepaid: 0,
  taxCollect: 0,
  totalOtherDueAgentPrepaid: 0,
  totalOtherDueAgentCollect: 0,
  totalOtherDueCarrierPrepaid: 0,
  totalOtherDueCarrierCollect: 0,
  totalPrepaid: 0,
  totalCollect: 0,
  currencyConvRate: '',
  ccChargesDest: '',
  chargesAtDest: '',
  totalCollectDest: '',
  shipperCertification: '',
  signatureOfShipperOrAgent: '',
  executedOnDate: new Date().toISOString().slice(0, 10),
  executedAtPlace: 'A.MERINO.B',
  signatureOfIssuingCarrierOrAgent: '',
  notes: '',
});

export function entityToHawb(entity?: any): HawbFormData {
  if (!entity) return defaults();
  const fp = entity.formPayload && typeof entity.formPayload === 'object' ? entity.formPayload : {};
  const base = defaults();
  return {
    ...base,
    ...fp,
    hawbNumber: fp.hawbNumber || entity.hawbNumber || '',
    masterAwbNumber: fp.masterAwbNumber || entity.masterAwb?.awbNumber || entity.masterAwbNumber || '',
    shipperNameAndAddress:
      fp.shipperNameAndAddress ||
      [entity.shipperName, entity.shipperAddress].filter(Boolean).join('\n') ||
      '',
    consigneeNameAndAddress:
      fp.consigneeNameAndAddress ||
      [entity.consigneeName, entity.consigneeAddress].filter(Boolean).join('\n') ||
      '',
    agentNameAndCity: fp.agentNameAndCity || entity.agentNameAndCity || agentDefaultsForPartner().agentNameAndCity,
    agentIataCode: fp.agentIataCode || entity.agentIataCode || agentDefaultsForPartner().agentIataCode,
    airportOfDeparture: fp.airportOfDeparture || entity.airportOfDeparture || '',
    airportOfDestination: fp.airportOfDestination || entity.airportOfDestination || '',
    flightInfo: fp.flightInfo || entity.flightNumber || entity.requestedRouting || '',
    pieces: Number(fp.pieces || entity.numberOfPieces || entity.pieces) || 0,
    weight: Number(fp.weight || entity.grossWeight || entity.weight) || 0,
    natureAndQuantity: fp.natureAndQuantity || entity.natureAndQuantityOfGoods || '',
    handlingInformation: fp.handlingInformation || entity.handlingInformation || '',
    sci: fp.sci || entity.sci || '',
    rateLines: Array.isArray(fp.rateLines) && fp.rateLines.length
      ? fp.rateLines
      : Array.isArray(entity.rateLines) && entity.rateLines.length
        ? entity.rateLines.map((r: any) => ({ ...emptyRateLine(), ...r }))
        : [emptyRateLine()],
    notes: fp.notes || entity.notes || '',
  };
}

export function hawbToPayload(form: HawbFormData) {
  const [shipperName = '', ...shipperRest] = form.shipperNameAndAddress.split('\n');
  const [consigneeName = '', ...consigneeRest] = form.consigneeNameAndAddress.split('\n');
  const rate = form.rateLines[0] || emptyRateLine();
  return {
    hawbNumber: form.hawbNumber || undefined,
    shipperName,
    shipperAddress: shipperRest.join('\n'),
    consigneeName,
    consigneeAddress: consigneeRest.join('\n'),
    agentNameAndCity: form.agentNameAndCity,
    agentIataCode: form.agentIataCode,
    airportOfDeparture: form.airportOfDeparture,
    airportOfDestination: form.airportOfDestination,
    flightNumber: form.flightInfo,
    requestedRouting: form.flightInfo,
    numberOfPieces: form.rateLines.reduce((s, r) => s + Number(r.pieces || 0), 0) || form.pieces,
    grossWeight: form.rateLines.reduce((s, r) => s + Number(r.grossWeight || 0), 0) || form.weight,
    natureAndQuantityOfGoods: rate.natureAndQuantity || form.natureAndQuantity,
    handlingInformation: form.handlingInformation,
    sci: form.sci,
    rateLines: form.rateLines,
    otherCharges: JSON.stringify(form.otherCharges),
    weightCharge: form.weightChargePrepaid,
    totalPrepaid: form.totalPrepaid,
    totalCollect: form.totalCollect,
    signatureOfShipperOrAgent: form.signatureOfShipperOrAgent,
    executedOnDate: form.executedOnDate || undefined,
    executedAtPlace: form.executedAtPlace,
    signatureOfIssuingCarrierOrAgent: form.signatureOfIssuingCarrierOrAgent,
    notes: form.notes,
    formPayload: form,
  };
}

const HawbStructuredForm: React.FC<{ data?: any; onChange: (d: HawbFormData) => void }> = ({ data, onChange }) => {
  const [form, setForm] = useState(() => entityToHawb(data));
  useEffect(() => setForm(entityToHawb(data)), [data?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => onChange(form), [form]);
  const set = (k: keyof HawbFormData, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const [selectedRate, setSelectedRate] = useState(0);
  const [rateDialog, setRateDialog] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState(0);

  const updateRate = (idx: number, patch: Partial<RateLine>) => {
    setForm((prev) => {
      const rateLines = prev.rateLines.map((r, i) => (i === idx ? { ...r, ...patch } : r));
      return {
        ...prev,
        rateLines,
        natureAndQuantity: rateLines[0]?.natureAndQuantity || prev.natureAndQuantity,
        pieces: rateLines.reduce((s, r) => s + Number(r.pieces || 0), 0),
        weight: rateLines.reduce((s, r) => s + Number(r.grossWeight || 0), 0),
        weightChargePrepaid: Number(rateLines[0]?.total) || prev.weightChargePrepaid,
        totalPrepaid: Number(rateLines[0]?.total) || prev.totalPrepaid,
      };
    });
  };

  return (
    <Box sx={{ p: 1 }}>
      <Paper variant="outlined" sx={{ p: 2, mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>HAWB</Typography>
        <Grid container spacing={1}>
          <Grid item xs={6}><TextField fullWidth size="small" label="HAWB Number" value={form.hawbNumber} onChange={(e) => set('hawbNumber', e.target.value)} helperText="Número house del forwarder" /></Grid>
          <Grid item xs={6}><TextField fullWidth size="small" label="Master AWB (MAWB)" value={form.masterAwbNumber} onChange={(e) => set('masterAwbNumber', e.target.value)} helperText="Referencia al consolidado; se imprime en Reference del PDF" /></Grid>
          <Grid item xs={6}><TextField fullWidth size="small" label="Shipper" multiline minRows={3} value={form.shipperNameAndAddress} onChange={(e) => set('shipperNameAndAddress', e.target.value)} /></Grid>
          <Grid item xs={6}><TextField fullWidth size="small" label="Consignee" multiline minRows={3} value={form.consigneeNameAndAddress} onChange={(e) => set('consigneeNameAndAddress', e.target.value)} /></Grid>
          <Grid item xs={8}><TextField fullWidth size="small" label="Agent" multiline minRows={2} value={form.agentNameAndCity} onChange={(e) => set('agentNameAndCity', e.target.value)} /></Grid>
          <Grid item xs={4}><TextField fullWidth size="small" label="IATA" value={form.agentIataCode} onChange={(e) => set('agentIataCode', e.target.value)} /></Grid>
          <Grid item xs={4}><TextField fullWidth size="small" label="Origin" value={form.airportOfDeparture} onChange={(e) => set('airportOfDeparture', e.target.value)} /></Grid>
          <Grid item xs={4}><TextField fullWidth size="small" label="Destination" value={form.airportOfDestination} onChange={(e) => set('airportOfDestination', e.target.value)} /></Grid>
          <Grid item xs={4}><TextField fullWidth size="small" label="Flight" value={form.flightInfo} onChange={(e) => set('flightInfo', e.target.value)} /></Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Handling Information</Typography>
        <Grid container spacing={1}>
          <Grid item xs={12} md={8}>
            <TextField fullWidth size="small" label="Requirements" multiline minRows={3} value={form.handlingInformation} onChange={(e) => set('handlingInformation', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth size="small" label="SCI" value={form.sci} onChange={(e) => set('sci', e.target.value)} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" label="Destination" value={form.destinationSci} onChange={(e) => set('destinationSci', e.target.value)} />
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Rate Description</Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <Button size="small" startIcon={<AddIcon />} onClick={() => set('rateLines', [...form.rateLines, emptyRateLine()])}>Add</Button>
          <Button size="small" onClick={() => setRateDialog(true)}>Modify</Button>
          <Button size="small" color="error" startIcon={<DeleteIcon />} disabled={form.rateLines.length <= 1} onClick={() => set('rateLines', form.rateLines.filter((_, i) => i !== selectedRate))}>Remove</Button>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Pieces</TableCell>
              <TableCell>Gross W.</TableCell>
              <TableCell>k/l</TableCell>
              <TableCell>RC</TableCell>
              <TableCell>Item No.</TableCell>
              <TableCell>Charg. Wt</TableCell>
              <TableCell>Rate/Class</TableCell>
              <TableCell>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {form.rateLines.map((r, idx) => (
              <TableRow key={idx} selected={selectedRate === idx} hover onClick={() => setSelectedRate(idx)} sx={{ cursor: 'pointer' }}>
                <TableCell>{r.pieces}</TableCell>
                <TableCell>{r.grossWeight}</TableCell>
                <TableCell>{r.weightUnit}</TableCell>
                <TableCell>{r.rateClass}</TableCell>
                <TableCell>{r.itemNo}</TableCell>
                <TableCell>{r.chargeableWeight}</TableCell>
                <TableCell>{r.rate}</TableCell>
                <TableCell>{r.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={3}
          sx={{ mt: 1 }}
          label="Nature and Quantity"
          value={form.rateLines[selectedRate]?.natureAndQuantity || form.natureAndQuantity}
          onChange={(e) => updateRate(selectedRate, { natureAndQuantity: e.target.value })}
        />
      </Paper>

      <Grid container spacing={1.5}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Charges Summary</Typography>
            {([
              ['Weight Charge', 'weightChargePrepaid', 'weightChargeCollect'],
              ['Valuation Charge', 'valuationChargePrepaid', 'valuationChargeCollect'],
              ['Tax', 'taxPrepaid', 'taxCollect'],
              ['Total Other Due Agent', 'totalOtherDueAgentPrepaid', 'totalOtherDueAgentCollect'],
              ['Total Other Due Carrier', 'totalOtherDueCarrierPrepaid', 'totalOtherDueCarrierCollect'],
              ['Total', 'totalPrepaid', 'totalCollect'],
            ] as const).map(([label, ppd, coll]) => (
              <Grid container spacing={1} key={label} sx={{ mb: 0.5 }} alignItems="center">
                <Grid item xs={4}><Typography variant="body2">{label}</Typography></Grid>
                <Grid item xs={4}><TextField fullWidth size="small" label="Prepaid" type="number" value={form[ppd]} onChange={(e) => set(ppd, Number(e.target.value))} /></Grid>
                <Grid item xs={4}><TextField fullWidth size="small" label="Collect" type="number" value={form[coll]} onChange={(e) => set(coll, Number(e.target.value))} /></Grid>
              </Grid>
            ))}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2, mb: 1 }}>CC Charges in Destination Currency</Typography>
            <Grid container spacing={1}>
              <Grid item xs={12}><TextField fullWidth size="small" label="Currency Conv. Rate" value={form.currencyConvRate} onChange={(e) => set('currencyConvRate', e.target.value)} /></Grid>
              <Grid item xs={12}><TextField fullWidth size="small" label="CC Charges in Dest." value={form.ccChargesDest} onChange={(e) => set('ccChargesDest', e.target.value)} /></Grid>
              <Grid item xs={12}><TextField fullWidth size="small" label="Charges at Dest." value={form.chargesAtDest} onChange={(e) => set('chargesAtDest', e.target.value)} /></Grid>
              <Grid item xs={12}><TextField fullWidth size="small" label="Total Collect" value={form.totalCollectDest} onChange={(e) => set('totalCollectDest', e.target.value)} /></Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Other Charges</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Button size="small" onClick={() => set('otherCharges', [...form.otherCharges, { description: '', amount: 0, entitlement: 'DUE AGENT' }])}>Add</Button>
              <Button size="small" color="error" disabled={!form.otherCharges.length} onClick={() => set('otherCharges', form.otherCharges.filter((_, i) => i !== selectedCharge))}>Remove</Button>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Entitlement</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {form.otherCharges.map((c, idx) => (
                  <TableRow key={idx} selected={selectedCharge === idx} onClick={() => setSelectedCharge(idx)} hover>
                    <TableCell>
                      <TextField size="small" fullWidth value={c.description} onChange={(e) => {
                        const otherCharges = form.otherCharges.map((row, i) => i === idx ? { ...row, description: e.target.value } : row);
                        set('otherCharges', otherCharges);
                      }} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={c.amount} onChange={(e) => {
                        const otherCharges = form.otherCharges.map((row, i) => i === idx ? { ...row, amount: Number(e.target.value) } : row);
                        set('otherCharges', otherCharges);
                      }} />
                    </TableCell>
                    <TableCell>
                      <TextField select size="small" value={c.entitlement} onChange={(e) => {
                        const otherCharges = form.otherCharges.map((row, i) => i === idx ? { ...row, entitlement: e.target.value as OtherCharge['entitlement'] } : row);
                        set('otherCharges', otherCharges);
                      }}>
                        <MenuItem value="DUE AGENT">DUE AGENT</MenuItem>
                        <MenuItem value="DUE CARRIER">DUE CARRIER</MenuItem>
                      </TextField>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Shipper&apos;s Certification</Typography>
            <TextField fullWidth size="small" multiline minRows={2} value={form.shipperCertification} onChange={(e) => set('shipperCertification', e.target.value)} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" label="Signature" value={form.signatureOfShipperOrAgent} onChange={(e) => set('signatureOfShipperOrAgent', e.target.value)} />
          </Paper>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Carrier&apos;s Execution</Typography>
            <TextField fullWidth size="small" multiline minRows={2} sx={{ mb: 1 }} />
            <Grid container spacing={1}>
              <Grid item xs={5}><TextField fullWidth size="small" type="date" InputLabelProps={{ shrink: true }} label="Date" value={form.executedOnDate} onChange={(e) => set('executedOnDate', e.target.value)} /></Grid>
              <Grid item xs={7}><TextField fullWidth size="small" label="Place" value={form.executedAtPlace} onChange={(e) => set('executedAtPlace', e.target.value)} /></Grid>
              <Grid item xs={12}><TextField fullWidth size="small" label="Signature" value={form.signatureOfIssuingCarrierOrAgent} onChange={(e) => set('signatureOfIssuingCarrierOrAgent', e.target.value)} /></Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <RateItemDialog
        open={rateDialog}
        line={form.rateLines[selectedRate] || emptyRateLine()}
        onClose={() => setRateDialog(false)}
        onAccept={(line) => { updateRate(selectedRate, line); setRateDialog(false); }}
      />
    </Box>
  );
};

export default HawbStructuredForm;

export interface ManifestLine {
  hawb: string;
  pieces: number;
  weight: number;
  origin: string;
  destination: string;
  ppdColl: string;
  shipper: string;
  consignee: string;
  shipperConsignee: string;
  details: string;
}

export interface ManifestFormData {
  carrier: string;
  shipper: string;
  consignee: string;
  masterAwbNumber: string;
  manifestDate: string;
  reference: string;
  flight: string;
  origin: string;
  destination: string;
  showAgentLogo: boolean;
  lines: ManifestLine[];
}

export const defaultManifest = (): ManifestFormData => ({
  carrier: '',
  shipper: '',
  consignee: '',
  masterAwbNumber: '',
  manifestDate: new Date().toISOString().slice(0, 10),
  reference: '',
  flight: '',
  origin: '',
  destination: '',
  showAgentLogo: false,
  lines: [],
});

export function entityToManifest(entity?: any): ManifestFormData {
  if (!entity) return defaultManifest();
  if (entity.formPayload) return { ...defaultManifest(), ...entity.formPayload };
  return {
    ...defaultManifest(),
    carrier: entity.carrier || '',
    shipper: entity.shipper || entity.consolidatorName || '',
    consignee: entity.consignee || '',
    masterAwbNumber: entity.masterAwbNumber || '',
    manifestDate: entity.manifestDate ? String(entity.manifestDate).slice(0, 10) : defaultManifest().manifestDate,
    reference: entity.reference || entity.manifestNumber || '',
    flight: entity.flightNumber || '',
    origin: entity.airportOfDeparture || '',
    destination: entity.airportOfDestination || '',
    showAgentLogo: Boolean(entity.showAgentLogo),
    lines: (entity.waybills || []).map((w: any) => ({
      hawb: w.hawbNumber || w.awbNumber || '',
      pieces: w.pieces || 0,
      weight: w.weight || 0,
      origin: w.origin || '',
      destination: w.destination || '',
      ppdColl: w.ppdColl || 'PPD',
      shipper: w.shipper || '',
      consignee: w.consignee || '',
      shipperConsignee: w.shipperConsignee || '',
      details: w.description || w.details || '',
    })),
  };
}

export function manifestToPayload(form: ManifestFormData) {
  return {
    manifestNumber: form.reference || `MF-${Date.now()}`,
    carrier: form.carrier,
    shipper: form.shipper,
    consignee: form.consignee,
    masterAwbNumber: form.masterAwbNumber,
    manifestDate: form.manifestDate || undefined,
    reference: form.reference,
    flightNumber: form.flight,
    airportOfDeparture: form.origin,
    airportOfDestination: form.destination,
    showAgentLogo: form.showAgentLogo,
    totalPieces: form.lines.reduce((s, l) => s + Number(l.pieces || 0), 0),
    totalWeight: form.lines.reduce((s, l) => s + Number(l.weight || 0), 0),
    waybills: form.lines.map((l) => ({
      hawbNumber: l.hawb,
      pieces: l.pieces,
      weight: l.weight,
      origin: l.origin,
      destination: l.destination,
      description: l.details,
      shipper: l.shipper,
      consignee: l.consignee,
    })),
    formPayload: form,
  };
}

const emptyHouse = (origin = '', destination = ''): ManifestLine => ({
  hawb: '',
  pieces: 0,
  weight: 0,
  origin,
  destination,
  ppdColl: 'PPD',
  shipper: '',
  consignee: '',
  shipperConsignee: '',
  details: '',
});

export const ManifestStructuredForm: React.FC<{ data?: any; onChange: (d: ManifestFormData) => void }> = ({ data, onChange }) => {
  const [form, setForm] = useState(() => entityToManifest(data));
  useEffect(() => setForm(entityToManifest(data)), [data]);
  useEffect(() => onChange(form), [form]);
  const set = (k: keyof ManifestFormData, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const [sel, setSel] = useState(-1);
  const [houseOpen, setHouseOpen] = useState(false);
  const [house, setHouse] = useState<ManifestLine>(emptyHouse());

  const totalPcs = form.lines.reduce((s, l) => s + Number(l.pieces || 0), 0);
  const totalWt = form.lines.reduce((s, l) => s + Number(l.weight || 0), 0);

  const openHouse = (idx: number) => {
    setSel(idx);
    setHouse(idx >= 0 ? form.lines[idx] : emptyHouse(form.origin, form.destination));
    setHouseOpen(true);
  };

  return (
    <Box sx={{ p: 1 }}>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Manifest Information</Typography>
        <Grid container spacing={1}>
          <Grid item xs={12} md={7}>
            <TextField fullWidth size="small" label="Carrier" value={form.carrier} onChange={(e) => set('carrier', e.target.value)} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" label="Shipper" multiline minRows={3} value={form.shipper} onChange={(e) => set('shipper', e.target.value)} sx={{ mb: 1 }} />
            <FormControlLabel
              control={<Checkbox size="small" checked={form.showAgentLogo} onChange={(e) => set('showAgentLogo', e.target.checked)} />}
              label="Show agent's logo on top right"
            />
            <TextField fullWidth size="small" label="Consignee" multiline minRows={3} value={form.consignee} onChange={(e) => set('consignee', e.target.value)} sx={{ mt: 1 }} />
          </Grid>
          <Grid item xs={12} md={5}>
            <TextField fullWidth size="small" label="Master AWB" value={form.masterAwbNumber} onChange={(e) => set('masterAwbNumber', e.target.value)} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" type="date" InputLabelProps={{ shrink: true }} label="Date" value={form.manifestDate} onChange={(e) => set('manifestDate', e.target.value)} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" label="Reference" value={form.reference} onChange={(e) => set('reference', e.target.value)} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" label="Flight" value={form.flight} onChange={(e) => set('flight', e.target.value)} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" label="Origin" value={form.origin} onChange={(e) => set('origin', e.target.value)} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" label="Destination" value={form.destination} onChange={(e) => set('destination', e.target.value)} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" label="No. of HAWBs" value={form.lines.length} InputProps={{ readOnly: true }} />
          </Grid>
        </Grid>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>Details</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" onClick={() => openHouse(-1)}>Add</Button>
            <Button size="small" disabled={sel < 0} onClick={() => openHouse(sel)}>Modify</Button>
            <Button size="small" color="error" disabled={sel < 0} onClick={() => { set('lines', form.lines.filter((_, i) => i !== sel)); setSel(-1); }}>Remove</Button>
          </Box>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>HAWB</TableCell>
              <TableCell>Pieces</TableCell>
              <TableCell>Weight</TableCell>
              <TableCell>Origin</TableCell>
              <TableCell>Destination</TableCell>
              <TableCell>PPD/COLL</TableCell>
              <TableCell>Shipper/Consignee</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {form.lines.map((line, idx) => (
              <TableRow key={idx} hover selected={sel === idx} onClick={() => setSel(idx)} onDoubleClick={() => openHouse(idx)} sx={{ cursor: 'pointer' }}>
                <TableCell>{line.hawb}</TableCell>
                <TableCell>{line.pieces}</TableCell>
                <TableCell>{line.weight}</TableCell>
                <TableCell>{line.origin}</TableCell>
                <TableCell>{line.destination}</TableCell>
                <TableCell>{line.ppdColl}</TableCell>
                <TableCell>{line.shipperConsignee || [line.shipper, line.consignee].filter(Boolean).join(' / ')}</TableCell>
                <TableCell>{line.details}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
          <TextField size="small" label="Pcs" value={totalPcs} InputProps={{ readOnly: true }} sx={{ width: 90 }} />
          <TextField size="small" label="Weight" value={totalWt.toFixed(2)} InputProps={{ readOnly: true }} sx={{ width: 120 }} />
          <TextField select size="small" value="K" sx={{ width: 72 }}>
            <MenuItem value="K">K</MenuItem>
            <MenuItem value="L">L</MenuItem>
          </TextField>
        </Box>
      </Paper>

      <Dialog open={houseOpen} onClose={() => setHouseOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>House Information</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="HAWB" value={house.hawb} onChange={(e) => setHouse({ ...house, hawb: e.target.value })} sx={{ mb: 1 }} />
              <TextField fullWidth size="small" type="number" label="Pieces" value={house.pieces} onChange={(e) => setHouse({ ...house, pieces: Number(e.target.value) })} sx={{ mb: 1 }} />
              <TextField fullWidth size="small" type="number" label="Weight" value={house.weight} onChange={(e) => setHouse({ ...house, weight: Number(e.target.value) })} sx={{ mb: 1 }} />
              <TextField fullWidth size="small" label="Origin" value={house.origin} onChange={(e) => setHouse({ ...house, origin: e.target.value })} sx={{ mb: 1 }} />
              <TextField fullWidth size="small" label="Destination" value={house.destination} onChange={(e) => setHouse({ ...house, destination: e.target.value })} sx={{ mb: 1 }} />
              <TextField select fullWidth size="small" label="PPD/COLL" value={house.ppdColl} onChange={(e) => setHouse({ ...house, ppdColl: e.target.value })} sx={{ mb: 1 }}>
                <MenuItem value="PPD">PPD</MenuItem>
                <MenuItem value="COLL">COLL</MenuItem>
              </TextField>
              <TextField fullWidth size="small" multiline minRows={3} label="Details" value={house.details} onChange={(e) => setHouse({ ...house, details: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" multiline minRows={5} label="Shipper" value={house.shipper} onChange={(e) => setHouse({ ...house, shipper: e.target.value })} sx={{ mb: 1 }} />
              <TextField fullWidth size="small" multiline minRows={5} label="Consignee" value={house.consignee} onChange={(e) => setHouse({ ...house, consignee: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHouseOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => {
            const row = { ...house, shipperConsignee: [house.shipper, house.consignee].filter(Boolean).join(' / ') };
            const lines = [...form.lines];
            if (sel >= 0 && houseOpen && form.lines[sel]) lines[sel] = row;
            else lines.push(row);
            set('lines', lines);
            setHouseOpen(false);
          }}>Accept</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
