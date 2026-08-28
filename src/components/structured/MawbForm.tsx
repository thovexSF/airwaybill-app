import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  Typography,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Divider,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import {
  MawbFormData,
  RateLine,
  OtherCharge,
  emptyRateLine,
  entityToMawbForm,
  validateAwbCheckDigit,
} from './types';
import RateItemDialog from './RateItemDialog';
import { Fieldset } from './formChrome';

const MONO = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 12,
  lineHeight: 1.4,
};

const inputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 0, bgcolor: '#fff' },
  '& .MuiInputBase-input': { fontSize: 13, py: 0.6 },
  '& .MuiInputLabel-root': { fontSize: 13 },
};

const Mini: React.FC<{
  value: string;
  onChange: (v: string) => void;
  width: number;
}> = ({ value, onChange, width }) => (
  <TextField
    size="small"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    sx={{ width, flexShrink: 0, ...inputSx, '& .MuiInputBase-input': { ...MONO, py: 0.5 } }}
  />
);

const Lbl: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap', lineHeight: '32px' }}>
    {children}
  </Typography>
);

const PpdColl: React.FC<{
  label: string;
  value: 'PPD' | 'COLL';
  onChange: (v: 'PPD' | 'COLL') => void;
}> = ({ label, value, onChange }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Typography sx={{ fontSize: 12, color: 'text.secondary', width: 56, flexShrink: 0 }}>{label}</Typography>
    <RadioGroup row value={value} onChange={(e) => onChange(e.target.value as 'PPD' | 'COLL')} sx={{ gap: 0 }}>
      <FormControlLabel
        value="PPD"
        control={<Radio size="small" sx={{ p: 0.4 }} />}
        label="PPD"
        sx={{ mr: 1, '& .MuiFormControlLabel-label': { fontSize: 12 } }}
      />
      <FormControlLabel
        value="COLL"
        control={<Radio size="small" sx={{ p: 0.4 }} />}
        label="COLL"
        sx={{ mr: 0, '& .MuiFormControlLabel-label': { fontSize: 12 } }}
      />
    </RadioGroup>
  </Box>
);

interface Props {
  data?: any;
  onChange: (data: MawbFormData) => void;
}

const MawbForm: React.FC<Props> = ({ data, onChange }) => {
  const [form, setForm] = useState<MawbFormData>(() => entityToMawbForm(data));
  const [selectedRate, setSelectedRate] = useState(0);
  const [selectedCharge, setSelectedCharge] = useState(0);
  const [rateDialog, setRateDialog] = useState(false);

  useEffect(() => {
    setForm(entityToMawbForm(data));
  }, [data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onChange(form);
  }, [form]);

  const set = <K extends keyof MawbFormData>(key: K, value: MawbFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateRate = (idx: number, patch: Partial<RateLine>) => {
    setForm((prev) => {
      const rateLines = prev.rateLines.map((r, i) => (i === idx ? { ...r, ...patch } : r));
      const nature = rateLines[0]?.natureAndQuantity || prev.natureAndQuantityOfGoods;
      const pieces = rateLines.reduce((s, r) => s + Number(r.pieces || 0), 0);
      const gross = rateLines.reduce((s, r) => s + Number(r.grossWeight || 0), 0);
      return { ...prev, rateLines, natureAndQuantityOfGoods: nature, numberOfPieces: pieces, grossWeight: gross };
    });
  };

  const updateCharge = (idx: number, patch: Partial<OtherCharge>) => {
    setForm((prev) => {
      const otherCharges = prev.otherCharges.map((c, i) => (i === idx ? { ...c, ...patch } : c));
      const agent = otherCharges.filter((c) => c.entitlement === 'DUE AGENT').reduce((s, c) => s + Number(c.amount || 0), 0);
      const carrier = otherCharges.filter((c) => c.entitlement === 'DUE CARRIER').reduce((s, c) => s + Number(c.amount || 0), 0);
      const weight = Number(prev.weightChargePrepaid) || 0;
      return {
        ...prev,
        otherCharges,
        totalOtherDueAgentPrepaid: agent,
        totalOtherDueCarrierPrepaid: carrier,
        totalPrepaid: weight + agent + carrier + Number(prev.valuationChargePrepaid || 0) + Number(prev.taxPrepaid || 0),
      };
    });
  };

  const checkOk =
    !form.awbPrefix || !form.awbSerial || form.awbSerial.length < 8
      ? null
      : validateAwbCheckDigit(form.awbPrefix, form.awbSerial);

  const osi = String(form.optionalShippingInformation || '').split('\n');
  const setOsi = (idx: number, v: string) => {
    const next = [osi[0] || '', osi[1] || ''];
    next[idx] = v;
    set('optionalShippingInformation', next.join('\n').replace(/\n+$/, ''));
  };

  return (
    <Box
      sx={{
        maxWidth: 1080,
        mx: 'auto',
        px: 1.5,
        py: 1.25,
        bgcolor: '#fff',
        '& .MuiOutlinedInput-root': { borderRadius: 0, bgcolor: '#fff' },
      }}
    >
      {checkOk === false && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          Check digit IATA inválido para {form.awbPrefix}-{form.awbSerial}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, alignItems: 'start' }}>
        <Box>
          <Fieldset title="Shipper">
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>Account Number</Typography>
            <TextField
              size="small"
              value={form.shipperAccountNumber}
              onChange={(e) => set('shipperAccountNumber', e.target.value)}
              sx={{ width: 240, mb: 0.75, ...inputSx }}
            />
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>Name and Address</Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={4}
              value={form.shipperNameAndAddress}
              onChange={(e) => set('shipperNameAndAddress', e.target.value)}
              InputProps={{ sx: MONO }}
            />
          </Fieldset>

          <Fieldset title="Consignee">
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>Account Number</Typography>
            <TextField
              size="small"
              value={form.consigneeAccountNumber}
              onChange={(e) => set('consigneeAccountNumber', e.target.value)}
              sx={{ width: 240, mb: 0.75, ...inputSx }}
            />
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>Name and Address</Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={4}
              value={form.consigneeNameAndAddress}
              onChange={(e) => set('consigneeNameAndAddress', e.target.value)}
              InputProps={{ sx: MONO }}
            />
          </Fieldset>

          <Fieldset title="Issuing Carrier's Agent">
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>Name and City</Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={3}
              value={form.agentNameAndCity}
              onChange={(e) => set('agentNameAndCity', e.target.value)}
              InputProps={{ sx: MONO }}
              sx={{ mb: 0.75 }}
            />
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>IATA Code</Typography>
                <TextField
                  size="small"
                  value={form.agentIataCode}
                  onChange={(e) => set('agentIataCode', e.target.value)}
                  sx={{ width: 160, ...inputSx }}
                />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>Account No</Typography>
                <TextField
                  size="small"
                  value={form.agentAccountNumber}
                  onChange={(e) => set('agentAccountNumber', e.target.value)}
                  sx={{ width: 140, ...inputSx }}
                />
              </Box>
            </Box>
          </Fieldset>

          <Fieldset title="Routing and Flight Bookings">
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>Departure</Typography>
            <TextField
              fullWidth
              size="small"
              value={form.departureDisplay || form.airportOfDeparture}
              onChange={(e) => set('departureDisplay', e.target.value)}
              sx={{ mb: 0.75, ...inputSx, '& .MuiInputBase-input': MONO }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
              <Lbl>To</Lbl>
              <Mini value={form.routeTo1} onChange={(v) => set('routeTo1', v)} width={72} />
              <Lbl>By First Carrier</Lbl>
              <Mini value={form.routeBy1} onChange={(v) => set('routeBy1', v)} width={140} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
              <Lbl>To</Lbl>
              <Mini value={form.routeTo2} onChange={(v) => set('routeTo2', v)} width={72} />
              <Lbl>By</Lbl>
              <Mini value={form.routeBy2} onChange={(v) => set('routeBy2', v)} width={72} />
              <Lbl>To</Lbl>
              <Mini value={form.routeTo3} onChange={(v) => set('routeTo3', v)} width={72} />
              <Lbl>By</Lbl>
              <Mini value={form.routeBy3} onChange={(v) => set('routeBy3', v)} width={72} />
            </Box>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>Destination</Typography>
            <TextField
              fullWidth
              size="small"
              value={form.destinationDisplay || form.airportOfDestination}
              onChange={(e) => set('destinationDisplay', e.target.value)}
              sx={{ mb: 0.75, ...inputSx, '& .MuiInputBase-input': MONO }}
            />
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>Flight/Date</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                value={form.flightNumber || form.requestedFlightsDates}
                onChange={(e) => {
                  set('flightNumber', e.target.value);
                  set('requestedFlightsDates', e.target.value);
                }}
                sx={{ width: 140, ...inputSx, '& .MuiInputBase-input': MONO }}
              />
              <TextField
                size="small"
                value={form.flightNumber2}
                onChange={(e) => set('flightNumber2', e.target.value)}
                sx={{ width: 140, ...inputSx, '& .MuiInputBase-input': MONO }}
              />
            </Box>
          </Fieldset>
        </Box>

        <Box>
          <Fieldset title="AWB Consignment Details">
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>AWB number</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
              <Mini value={form.awbPrefix} onChange={(v) => set('awbPrefix', v)} width={56} />
              <Mini value={form.awbSerial} onChange={(v) => set('awbSerial', v)} width={120} />
              <FormControlLabel
                control={<Checkbox size="small" checked={form.assignOnSave} onChange={(e) => set('assignOnSave', e.target.checked)} />}
                label="assign on save"
                sx={{ ml: 0.5, '& .MuiFormControlLabel-label': { fontSize: 12 } }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
              <Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>Airport of departure</Typography>
                <Mini value={form.airportOfDeparture} onChange={(v) => set('airportOfDeparture', v)} width={80} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>Date</Typography>
                <TextField
                  size="small"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={form.issueDate}
                  onChange={(e) => set('issueDate', e.target.value)}
                  sx={{ width: 150, ...inputSx }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>House</Typography>
                <TextField
                  size="small"
                  fullWidth
                  value={form.houseNumber}
                  onChange={(e) => set('houseNumber', e.target.value)}
                  sx={inputSx}
                />
              </Box>
            </Box>
          </Fieldset>

          <Fieldset title="Issuer">
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', width: 72, pt: 0.75, flexShrink: 0 }}>Issued By</Typography>
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={3}
                value={form.issuedBy || form.issuer}
                onChange={(e) => {
                  set('issuedBy', e.target.value);
                  set('issuer', e.target.value.split('\n')[0] || '');
                }}
                InputProps={{ sx: MONO }}
              />
            </Box>
          </Fieldset>

          <Fieldset title="Accounting Information">
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', width: 72, pt: 0.75, flexShrink: 0 }}>Details</Typography>
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={4}
                value={form.accountingInformation}
                onChange={(e) => set('accountingInformation', e.target.value)}
                InputProps={{ sx: MONO }}
              />
            </Box>
          </Fieldset>

          <Fieldset title="Shipment Reference Information">
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>Reference Number</Typography>
            <TextField
              size="small"
              value={form.referenceNumber}
              onChange={(e) => set('referenceNumber', e.target.value)}
              sx={{ width: 280, mb: 0.75, ...inputSx }}
            />
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>Information</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField size="small" value={osi[0] || ''} onChange={(e) => setOsi(0, e.target.value)} sx={{ width: 160, ...inputSx }} />
              <TextField size="small" value={osi[1] || ''} onChange={(e) => setOsi(1, e.target.value)} sx={{ width: 160, ...inputSx }} />
            </Box>
          </Fieldset>

          <Fieldset title="Charges Declaration">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 0 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Box>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>Currency</Typography>
                    <Mini value={form.currency} onChange={(v) => set('currency', v)} width={64} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>CHGS</Typography>
                    <Mini value={form.chgsCode} onChange={(v) => set('chgsCode', v)} width={56} />
                  </Box>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>Value for Carriage</Typography>
                  <Mini value={form.valueForCarriage} onChange={(v) => set('valueForCarriage', v)} width={100} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>Value for Customs</Typography>
                  <Mini value={form.valueForCustoms} onChange={(v) => set('valueForCustoms', v)} width={100} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>Amount of Insurance</Typography>
                  <Mini value={form.insuranceAmount} onChange={(v) => set('insuranceAmount', v)} width={100} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 2.5 }}>
                <PpdColl
                  label="WT/VAL"
                  value={form.weightValuationCharges}
                  onChange={(v) => set('weightValuationCharges', v)}
                />
                <PpdColl label="Other" value={form.otherChargesCode} onChange={(v) => set('otherChargesCode', v)} />
              </Box>
            </Box>
          </Fieldset>
        </Box>
      </Box>

      <Fieldset title="Handling Information">
        <Grid container spacing={1}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              size="small"
              label="Requirements"
              multiline
              minRows={3}
              value={form.handlingInformation}
              onChange={(e) => set('handlingInformation', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth size="small" label="SCI" value={form.sci} onChange={(e) => set('sci', e.target.value)} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" label="Notes" multiline minRows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </Grid>
        </Grid>
      </Fieldset>

      <Fieldset title="Rate Description">
        <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setForm((p) => ({ ...p, rateLines: [...p.rateLines, emptyRateLine()] }))}
          >
            Add
          </Button>
          <Button size="small" onClick={() => setRateDialog(true)}>
            Modify
          </Button>
          <Button
            size="small"
            color="error"
            startIcon={<DeleteIcon />}
            disabled={form.rateLines.length <= 1}
            onClick={() =>
              setForm((p) => ({
                ...p,
                rateLines: p.rateLines.filter((_, i) => i !== selectedRate),
              }))
            }
          >
            Remove
          </Button>
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
              <TableCell>Rate</TableCell>
              <TableCell>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {form.rateLines.map((r, idx) => (
              <TableRow
                key={idx}
                selected={selectedRate === idx}
                onClick={() => setSelectedRate(idx)}
                hover
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <TextField size="small" type="number" value={r.pieces} onChange={(e) => updateRate(idx, { pieces: Number(e.target.value) })} />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    value={r.grossWeight}
                    onChange={(e) => updateRate(idx, { grossWeight: Number(e.target.value) })}
                  />
                </TableCell>
                <TableCell>
                  <TextField size="small" value={r.weightUnit} onChange={(e) => updateRate(idx, { weightUnit: e.target.value })} sx={{ width: 56 }} />
                </TableCell>
                <TableCell>
                  <TextField size="small" value={r.rateClass} onChange={(e) => updateRate(idx, { rateClass: e.target.value })} sx={{ width: 56 }} />
                </TableCell>
                <TableCell>
                  <TextField size="small" value={r.itemNo} onChange={(e) => updateRate(idx, { itemNo: e.target.value })} />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    value={r.chargeableWeight}
                    onChange={(e) => updateRate(idx, { chargeableWeight: Number(e.target.value) })}
                  />
                </TableCell>
                <TableCell>
                  <TextField size="small" type="number" value={r.rate} onChange={(e) => updateRate(idx, { rate: Number(e.target.value) })} />
                </TableCell>
                <TableCell>
                  <TextField size="small" type="number" value={r.total} onChange={(e) => updateRate(idx, { total: Number(e.target.value) })} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TextField
          fullWidth
          size="small"
          label="Nature and Quantity of Goods"
          multiline
          minRows={3}
          sx={{ mt: 1 }}
          value={form.rateLines[selectedRate]?.natureAndQuantity || form.natureAndQuantityOfGoods}
          onChange={(e) => {
            updateRate(selectedRate, { natureAndQuantity: e.target.value });
            set('natureAndQuantityOfGoods', e.target.value);
          }}
        />
      </Fieldset>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Fieldset title="Charges Summary">
            <Grid container spacing={1}>
              {(
                [
                  ['Weight Charge', 'weightChargePrepaid', 'weightChargeCollect'],
                  ['Valuation Charge', 'valuationChargePrepaid', 'valuationChargeCollect'],
                  ['Tax', 'taxPrepaid', 'taxCollect'],
                  ['Total Other Due Agent', 'totalOtherDueAgentPrepaid', 'totalOtherDueAgentCollect'],
                  ['Total Other Due Carrier', 'totalOtherDueCarrierPrepaid', 'totalOtherDueCarrierCollect'],
                  ['Total', 'totalPrepaid', 'totalCollect'],
                ] as const
              ).map(([label, ppd, coll]) => (
                <React.Fragment key={label}>
                  <Grid item xs={4}>
                    <Typography variant="body2" sx={{ pt: 1 }}>
                      {label}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Prepaid"
                      type="number"
                      value={form[ppd]}
                      onChange={(e) => set(ppd, Number(e.target.value) as never)}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Collect"
                      type="number"
                      value={form[coll]}
                      onChange={(e) => set(coll, Number(e.target.value) as never)}
                    />
                  </Grid>
                </React.Fragment>
              ))}
            </Grid>
          </Fieldset>
        </Grid>
        <Grid item xs={12} md={6}>
          <Fieldset title="Other Charges">
            <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    otherCharges: [...p.otherCharges, { description: '', amount: 0, entitlement: 'DUE AGENT' }],
                  }))
                }
              >
                Add
              </Button>
              <Button
                size="small"
                color="error"
                disabled={!form.otherCharges.length}
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    otherCharges: p.otherCharges.filter((_, i) => i !== selectedCharge),
                  }))
                }
              >
                Remove
              </Button>
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
                      <TextField
                        size="small"
                        fullWidth
                        value={c.description}
                        onChange={(e) => updateCharge(idx, { description: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={c.amount}
                        onChange={(e) => updateCharge(idx, { amount: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        select
                        SelectProps={{ native: true }}
                        value={c.entitlement}
                        onChange={(e) => updateCharge(idx, { entitlement: e.target.value as OtherCharge['entitlement'] })}
                      >
                        <option value="DUE AGENT">DUE AGENT</option>
                        <option value="DUE CARRIER">DUE CARRIER</option>
                      </TextField>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Fieldset>
        </Grid>
      </Grid>

      <Fieldset title="Shipper's Certification">
        <Grid container spacing={1}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Signature of Shipper or Agent"
              value={form.signatureOfShipperOrAgent}
              onChange={(e) => set('signatureOfShipperOrAgent', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Executed on"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.executedOnDate}
              onChange={(e) => set('executedOnDate', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField fullWidth size="small" label="at" value={form.executedAtPlace} onChange={(e) => set('executedAtPlace', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Issuing Carrier / Agent"
              value={form.signatureOfIssuingCarrierOrAgent}
              onChange={(e) => set('signatureOfIssuingCarrierOrAgent', e.target.value)}
            />
          </Grid>
        </Grid>
      </Fieldset>
      <Divider sx={{ my: 1 }} />
      <RateItemDialog
        open={rateDialog}
        line={form.rateLines[selectedRate] || emptyRateLine()}
        onClose={() => setRateDialog(false)}
        onAccept={(line) => {
          updateRate(selectedRate, line);
          setRateDialog(false);
        }}
      />
    </Box>
  );
};

export default MawbForm;
