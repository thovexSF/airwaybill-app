import React from 'react'
import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'
import { AWBData } from '../types/awb'

const RED = '#8B0000'

// ── Dynamic scale: shrinks everything proportionally to fit A4 ──
function getScale(data: AWBData): number {
  const shipperLines  = (data.shipperNameAndAddress  || '').split('\n').length
  const consigneeLines = (data.consigneeNameAndAddress || '').split('\n').length
  const handlingLines = Math.ceil(((data.handlingInformation || '').length) / 55)
  const rateExtra     = Math.max(0, (data.rateItems    || []).length - 3)
  const chargeExtra   = Math.max(0, (data.otherCharges || []).length - 3)

  const pressure = shipperLines + consigneeLines + handlingLines
                 + rateExtra * 2 + chargeExtra * 1.5

  if (pressure <= 6)  return 1.00
  if (pressure <= 9)  return 0.93
  if (pressure <= 12) return 0.87
  if (pressure <= 16) return 0.80
  return 0.73
}

function makeStyles(k: number) {
  const LBL = 6.0 * k   // section/cell label text (was 4.5)
  const TXT = 8.5 * k   // main body text          (was 7.5)
  const XS  = 5.5 * k   // routing & rate-header   (was 3.8)
  const P   = Math.round(4 * k)   // standard cell padding (was 3)
  const P4  = Math.round(5 * k)   // larger padding        (was 4)

  return StyleSheet.create({
    page: { padding: Math.round(12 * k), fontFamily: 'Helvetica', fontSize: TXT, backgroundColor: '#fff' },

    // ---- Header AWB number ----
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    prefixBox: { width: 46 * k, height: 20 * k, borderWidth: 1, borderColor: RED, borderStyle: 'solid', justifyContent: 'center', alignItems: 'center' },
    serialBox: { height: 20 * k, minWidth: 130 * k, borderTopWidth: 1, borderBottomWidth: 1, borderRightWidth: 1, borderLeftWidth: 0, borderColor: RED, borderStyle: 'solid', justifyContent: 'center', paddingLeft: P },
    awbNumLg:   { fontSize: 13 * k, fontFamily: 'Helvetica-Bold' },
    awbNumFull: { fontSize: 12 * k, fontFamily: 'Helvetica-Bold' },

    // ---- Generic ----
    row:  { flexDirection: 'row' },
    lbl:  { fontSize: LBL, color: RED },
    xlbl: { fontSize: XS,  color: RED },
    txt:  { fontSize: TXT },
    bold: { fontFamily: 'Helvetica-Bold' },
    red:  { color: RED },

    // borders helpers
    border:            { borderWidth: 0.5, borderColor: RED, borderStyle: 'solid' },
    borderNoTop:       { borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid' },
    borderNoTopRight:  { borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid' },
    borderRight:       { borderTopWidth: 0.5, borderBottomWidth: 0.5, borderRightWidth: 0.5, borderLeftWidth: 0, borderColor: RED, borderStyle: 'solid' },

    // ---- Section 1: Shipper / Not Negotiable ----
    sec1:        { flexDirection: 'row', minHeight: 76 * k },
    shipperCol:  { flex: 1.1, flexDirection: 'column' },
    shipperName: { flex: 1, borderWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: P },
    shipperAcct: { minHeight: 22 * k, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: P },
    notNegCell:  { flex: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderRightWidth: 0.5, borderLeftWidth: 0, borderColor: RED, borderStyle: 'solid', padding: P4 },
    awbTitle:    { fontSize: 17 * k, fontFamily: 'Helvetica-Bold', color: RED },
    copiesTxt:   { fontSize: XS, color: RED, fontFamily: 'Helvetica-Bold', marginTop: 3 * k },

    // ---- Section 2: Consignee / Conditions ----
    sec2:           { flexDirection: 'row', minHeight: 66 * k },
    consigneeCol:   { flex: 1.1, flexDirection: 'column' },
    consigneeName:  { flex: 1, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: P },
    consigneeAcct:  { minHeight: 22 * k, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: P },
    conditionsCell: { flex: 2, borderTopWidth: 0, borderBottomWidth: 0.5, borderRightWidth: 0.5, borderLeftWidth: 0, borderColor: RED, borderStyle: 'solid', padding: P },
    condTxt:        { fontSize: XS, lineHeight: 1.5 },

    // ---- Section 3: Agent / Accounting ----
    agentCell:      { flex: 1.4, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: P, minHeight: 34 * k },
    accountingCell: { flex: 2, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: P, minHeight: 34 * k },

    // ---- Section 4: IATA / AccountNo ----
    iataCell:      { flex: 1, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: P, minHeight: 24 * k },
    agentAcctCell: { flex: 0.8, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: P, minHeight: 24 * k },

    // ---- Section 5: Departure / Reference ----
    departureCell: { flex: 2, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: P, minHeight: 24 * k },
    referenceCell: { flex: 1.5, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: P, minHeight: 24 * k },
    optionalCell:  { flex: 1.5, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: P, minHeight: 24 * k },

    // ---- Section 6: Routing ----
    routingSec:       { flexDirection: 'row', minHeight: 36 * k },
    toCell:           { width: 28 * k, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: 2 },
    byCell:           { width: 26 * k, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: 2 },
    firstByCell:      { width: 34 * k, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: 2 },
    routingLabelCell: { width: 38 * k, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: 2 },
    currencyCell:     { width: 30 * k, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: 2 },
    chgsCell:         { width: 20 * k, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: 2 },
    wtValCell:        { width: 40 * k, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: 2 },
    otherChgCell:     { width: 40 * k, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: 2 },
    declCarriageCell: { flex: 1, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: 2 },
    declCustomsCell:  { flex: 1, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: 2 },
    ppdCollRow:       { flexDirection: 'row', justifyContent: 'space-around', marginTop: 2 },

    // ---- Section 7: Destination / Flight / Insurance ----
    destSec:    { flexDirection: 'row', minHeight: 30 * k },
    destCell:   { flex: 1, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: P },
    flightCell: { flex: 1, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: P },
    insAmtCell: { flex: 0.5, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: 3, alignItems: 'center', justifyContent: 'center' },
    insTxtCell: { flex: 2.2, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: 3 },

    // ---- Section 8: Handling / SCI ----
    handlingSec:  { flexDirection: 'row', minHeight: 24 * k },
    handlingCell: { flex: 4, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: P },
    sciCell:      { flex: 0.7, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: P },

    // ---- Rate Table ----
    rateHeader:  { flexDirection: 'row', borderTopWidth: 0.5, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid' },
    rateHCell:   { borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: 2, justifyContent: 'center', alignItems: 'center' },
    rateRow:     { flexDirection: 'row', borderTopWidth: 0, borderBottomWidth: 0, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', minHeight: 18 * k },
    rateCell:    { borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: P, justifyContent: 'center' },
    rateLastRow: { flexDirection: 'row', borderWidth: 0.5, borderColor: RED, borderStyle: 'solid', height: 16 * k },
    colPcs:    { width: 28 * k }, colGW:   { width: 40 * k }, colRC:    { width: 38 * k },
    colCW:     { width: 40 * k }, colRate: { width: 46 * k }, colTotal: { width: 52 * k }, colNature: { flex: 1 },

    // ---- Charges ----
    chargesSec:    { flexDirection: 'row', minHeight: 76 * k },
    chargesLeft:   { flex: 1, borderTopWidth: 0, borderBottomWidth: 0, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid' },
    chargesRight:  { flex: 2.2, borderTopWidth: 0, borderBottomWidth: 0, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid' },
    chgRow:        { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: RED, borderStyle: 'solid' },
    chgLabelCell:  { flex: 1, padding: 2, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid' },
    chgValueCell:  { flex: 1, padding: P },

    // ---- Totals / Execution ----
    totalsRow: { flexDirection: 'row', minHeight: 22 * k },
    totalCell: { flex: 1, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: P },
    ccRow:     { flexDirection: 'row', minHeight: 34 * k },
    ccCell:    { flex: 1, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: P },
    execCell:  { flex: 2.2, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', paddingHorizontal: P, paddingVertical: 2, flexDirection: 'row', gap: 4 },
    bottomRow: { flexDirection: 'row', minHeight: 22 * k },
    btmCell:   { flex: 1, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0, borderColor: RED, borderStyle: 'solid', padding: P },

    // ---- Footer ----
    footer:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    footerBrand: { fontSize: 6 * k, color: '#666' },
    footerCopy:  { fontSize: 10 * k, fontFamily: 'Helvetica-Bold', color: RED, textAlign: 'center' },

    // ---- Draft watermark ----
    watermark: { position: 'absolute', top: 260, left: 70, fontSize: 100, color: 'rgba(180,0,0,0.07)', fontFamily: 'Helvetica-Bold', transform: 'rotate(-45deg)' },

    // Signature line
    sigLine: { borderBottomWidth: 0.5, borderColor: '#000', borderStyle: 'solid', marginTop: 8 * k },

    // Exposed sizes for inline use
    _lbl:  LBL,
    _txt:  TXT,
    _xs:   XS,
  } as any)
}

const IATA_CONDITIONS =
  'It is agreed that the goods described herein are accepted in apparent good order and condition (except as noted) for carriage SUBJECT TO THE CONDITIONS OF CONTRACT ON THE REVERSE HEREOF. ALL GOODS MAY BE CARRIED BY ANY OTHER MEANS INCLUDING ROAD OR ANY OTHER CARRIER UNLESS SPECIFIC CONTRARY INSTRUCTIONS ARE GIVEN HEREON BY THE SHIPPER, AND SHIPPER AGREES THAT THE SHIPMENT MAY BE CARRIED VIA INTERMEDIATE STOPPING PLACES WHICH THE CARRIER DEEMS APPROPRIATE. THE SHIPPER\'S ATTENTION IS DRAWN TO THE NOTICE CONCERNING CARRIER\'S LIMITATION OF LIABILITY. Shipper may increase such limitation of liability by declaring a higher value for carriage and paying a supplemental charge if required.'

const INSURANCE_TEXT =
  'INSURANCE – If carrier offers insurance, and such insurance is requested in accordance with the conditions thereof, indicate amount to be insured in figures in box marked "Amount of Insurance".'

const SHIPPER_CERT =
  'Shipper certifies that the particulars on the face hereof are correct and that insofar as any part of the consignment contains dangerous goods, such part is properly described by name and is in proper condition for carriage by air according to the applicable Dangerous Goods Regulations.'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Cell({ label, children, style, s }: { label?: string; children?: React.ReactNode; style?: any; s: any }) {
  return (
    <View style={style}>
      {label && <Text style={s.lbl}>{label}</Text>}
      {children}
    </View>
  )
}

export function AWBDocument({ data }: { data: AWBData }) {
  const scale = getScale(data)
  const s = makeStyles(scale)
  const LBL = s._lbl as number
  const TXT = s._txt as number
  const XS  = s._xs  as number

  const awbFull = data.awbPrefix && data.awbSerial ? `${data.awbPrefix}-${data.awbSerial}` : ''

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {data.isDraft && <Text style={s.watermark}>DRAFT</Text>}

        {/* ── AWB NUMBER HEADER ── */}
        <View style={s.headerRow}>
          <View style={s.row}>
            <View style={s.prefixBox}>
              <Text style={s.awbNumLg}>{data.awbPrefix}</Text>
            </View>
            <View style={s.serialBox}>
              <Text style={s.awbNumLg}>{data.awbSerial}</Text>
            </View>
          </View>
          <Text style={s.awbNumFull}>{awbFull}</Text>
        </View>

        {/* ── SECTION 1: Shipper / Not Negotiable ── */}
        <View style={s.sec1}>
          <View style={s.shipperCol}>
            <View style={s.shipperName}>
              <Text style={s.lbl}>Shipper's Name and Address</Text>
              <Text style={s.txt}>{data.shipperNameAndAddress}</Text>
            </View>
            <View style={s.shipperAcct}>
              <Text style={s.lbl}>Shipper's Account Number</Text>
              <Text style={s.txt}>{data.shipperAccountNumber}</Text>
            </View>
          </View>
          <View style={s.notNegCell}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7 * scale }}>Not Negotiable</Text>
                <Text style={s.awbTitle}>Air Waybill</Text>
                <View style={{ flexDirection: 'row', marginTop: 3 * scale }}>
                  <Text style={[s.lbl, { marginRight: 3 }]}>Issued by</Text>
                  <Text style={{ fontSize: TXT }}>{data.carrierName}</Text>
                </View>
                {data.carrierAddress ? (
                  <Text style={{ fontSize: TXT }}>{data.carrierAddress}</Text>
                ) : null}
              </View>
              {data.carrierLogoUrl ? (
                <Image src={data.carrierLogoUrl} style={{ width: 48 * scale, height: 24 * scale, objectFit: 'contain' }} />
              ) : null}
            </View>
            <Text style={s.copiesTxt}>
              Copies 1, 2 and 3 of this Air Waybill are originals and have the same validity.
            </Text>
          </View>
        </View>

        {/* ── SECTION 2: Consignee / Conditions ── */}
        <View style={s.sec2}>
          <View style={s.consigneeCol}>
            <View style={s.consigneeName}>
              <Text style={s.lbl}>Consignee's Name and Address</Text>
              <Text style={s.txt}>{data.consigneeNameAndAddress}</Text>
            </View>
            <View style={s.consigneeAcct}>
              <Text style={s.lbl}>Consignee's Account Number</Text>
              <Text style={s.txt}>{data.consigneeAccountNumber}</Text>
            </View>
          </View>
          <View style={s.conditionsCell}>
            <Text style={s.condTxt}>{IATA_CONDITIONS}</Text>
          </View>
        </View>

        {/* ── SECTION 3: Agent / Accounting ── */}
        <View style={s.row}>
          <Cell label="Issuing Carrier's Agent Name and City" style={s.agentCell} s={s}>
            <Text style={s.txt}>{data.agentNameAndCity}</Text>
          </Cell>
          <Cell label="Accounting Information" style={s.accountingCell} s={s}>
            <Text style={s.txt}>{data.accountingInformation}</Text>
          </Cell>
        </View>

        {/* ── SECTION 4: IATA Code / Account No ── */}
        <View style={s.row}>
          <Cell label="Agent's IATA Code" style={s.iataCell} s={s}>
            <Text style={s.txt}>{data.agentIataCode}</Text>
          </Cell>
          <Cell label="Account No." style={s.agentAcctCell} s={s}>
            <Text style={s.txt}>{data.agentAccountNumber}</Text>
          </Cell>
        </View>

        {/* ── SECTION 5: Airport of Departure / Reference ── */}
        <View style={s.row}>
          <Cell label="Airport of Departure (Addr. of First Carrier) and Requested Routing" style={s.departureCell} s={s}>
            <Text style={s.txt}>{data.airportOfDeparture}</Text>
          </Cell>
          <Cell label="Reference Number" style={s.referenceCell} s={s}>
            <Text style={s.txt}>{data.referenceNumber}</Text>
          </Cell>
          <Cell label="Optional Shipping Information" style={s.optionalCell} s={s}>
            <Text style={s.txt}>{data.optionalShippingInfo}</Text>
          </Cell>
        </View>

        {/* ── SECTION 6: Routing ── */}
        <View style={s.routingSec}>
          <View style={s.toCell}>
            <Text style={s.xlbl}>To</Text>
            <Text style={s.txt}>{data.routeTo1}</Text>
          </View>
          <View style={s.firstByCell}>
            <Text style={s.xlbl}>By First Carrier</Text>
            <Text style={s.txt}>{data.routeBy1}</Text>
          </View>
          <View style={s.routingLabelCell}>
            <Text style={s.xlbl}>Routing and Destination</Text>
          </View>
          <View style={s.byCell}>
            <Text style={s.xlbl}>to</Text>
            <Text style={s.txt}>{data.routeTo2}</Text>
          </View>
          <View style={s.byCell}>
            <Text style={s.xlbl}>by</Text>
            <Text style={s.txt}>{data.routeBy2}</Text>
          </View>
          <View style={s.byCell}>
            <Text style={s.xlbl}>to</Text>
            <Text style={s.txt}>{data.routeTo3}</Text>
          </View>
          <View style={s.byCell}>
            <Text style={s.xlbl}>by</Text>
            <Text style={s.txt}>{data.routeBy3}</Text>
          </View>
          <View style={s.currencyCell}>
            <Text style={s.xlbl}>Currency</Text>
            <Text style={[s.txt, { marginTop: 1 }]}>{data.currency}</Text>
          </View>
          <View style={s.chgsCell}>
            <Text style={s.xlbl}>CHGS{'\n'}Code</Text>
          </View>
          <View style={s.wtValCell}>
            <Text style={s.xlbl}>WT/VAL</Text>
            <View style={s.ppdCollRow}>
              <View style={{ alignItems: 'center' }}>
                <Text style={s.xlbl}>PPD</Text>
                <Text style={s.txt}>{data.wtValPPD ? 'X' : ''}</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={s.xlbl}>COLL</Text>
                <Text style={s.txt}>{data.wtValCOLL ? 'X' : ''}</Text>
              </View>
            </View>
          </View>
          <View style={s.otherChgCell}>
            <Text style={s.xlbl}>Other</Text>
            <View style={s.ppdCollRow}>
              <View style={{ alignItems: 'center' }}>
                <Text style={s.xlbl}>PPD</Text>
                <Text style={s.txt}>{data.otherPPD ? 'X' : ''}</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={s.xlbl}>COLL</Text>
                <Text style={s.txt}>{data.otherCOLL ? 'X' : ''}</Text>
              </View>
            </View>
          </View>
          <View style={s.declCarriageCell}>
            <Text style={s.xlbl}>Declared Value for Carriage</Text>
            <Text style={s.txt}>{data.declaredValueCarriage}</Text>
          </View>
          <View style={s.declCustomsCell}>
            <Text style={s.xlbl}>Declared Value for Customs</Text>
            <Text style={s.txt}>{data.declaredValueCustoms}</Text>
          </View>
        </View>

        {/* ── SECTION 7: Destination / Flight / Insurance ── */}
        <View style={s.destSec}>
          <Cell label="Airport of Destination" style={s.destCell} s={s}>
            <Text style={s.txt}>{data.airportOfDestination}</Text>
          </Cell>
          <Cell label="Requested Flight/Date" style={s.flightCell} s={s}>
            <Text style={s.txt}>{data.flightNumber}{data.flightNumber && data.flightDate ? '/' : ''}{data.flightDate}</Text>
          </Cell>
          <View style={s.insAmtCell}>
            <Text style={s.xlbl}>Amount of Insurance</Text>
            <Text style={[s.txt, { textAlign: 'center', marginTop: 1 }]}>{data.insuranceAmount}</Text>
          </View>
          <View style={s.insTxtCell}>
            <Text style={{ fontSize: XS, lineHeight: 1.5 }}>{INSURANCE_TEXT}</Text>
          </View>
        </View>

        {/* ── SECTION 8: Handling / SCI ── */}
        <View style={s.handlingSec}>
          <Cell label="Handling Information" style={s.handlingCell} s={s}>
            <Text style={s.txt}>{data.handlingInformation}</Text>
          </Cell>
          <Cell label="SCI" style={s.sciCell} s={s}>
            <Text style={s.txt}>{data.sci}</Text>
          </Cell>
        </View>

        {/* ── RATE TABLE HEADER ── */}
        <View style={s.rateHeader}>
          {[
            { w: s.colPcs,    label: 'No. of\nPieces\nRCP' },
            { w: s.colGW,     label: 'Gross\nWeight\nkg / lb' },
            { w: s.colRC,     label: 'Rate Class\nCommodity\nItem No.' },
            { w: s.colCW,     label: 'Chargeable\nWeight' },
            { w: s.colRate,   label: 'Rate\nCharge' },
            { w: s.colTotal,  label: 'Total' },
          ].map((col, i) => (
            <View key={i} style={[s.rateHCell, col.w]}>
              <Text style={[s.xlbl, { textAlign: 'center' }]}>{col.label}</Text>
            </View>
          ))}
          <View style={[s.rateHCell, s.colNature, { borderRightWidth: 0 }]}>
            <Text style={[s.xlbl, { textAlign: 'center' }]}>Nature and Quantity of Goods{'\n'}(incl. Dimensions or Volume)</Text>
          </View>
        </View>

        {/* Rate rows */}
        {data.rateItems.map((item) => (
          <View key={item.id} style={s.rateRow}>
            <View style={[s.rateCell, s.colPcs]}>
              <Text style={[s.txt, { textAlign: 'center' }]}>{item.pieces}</Text>
            </View>
            <View style={[s.rateCell, s.colGW]}>
              <Text style={[s.txt, { textAlign: 'center' }]}>{item.grossWeight}{item.grossWeight ? ` ${item.weightUnit}` : ''}</Text>
            </View>
            <View style={[s.rateCell, s.colRC]}>
              <Text style={[s.txt, { textAlign: 'center' }]}>{item.rateClass}</Text>
              {item.commodityItemNo ? <Text style={[s.xlbl, { textAlign: 'center', marginTop: 1 }]}>{item.commodityItemNo}</Text> : null}
            </View>
            <View style={[s.rateCell, s.colCW]}>
              <Text style={[s.txt, { textAlign: 'center' }]}>{item.chargeableWeight}</Text>
            </View>
            <View style={[s.rateCell, s.colRate]}>
              <Text style={[s.txt, { textAlign: 'right' }]}>{item.rateCharge}</Text>
            </View>
            <View style={[s.rateCell, s.colTotal]}>
              <Text style={[s.txt, { textAlign: 'right' }]}>{item.total}</Text>
            </View>
            <View style={[s.rateCell, s.colNature, { borderRightWidth: 0 }]}>
              <Text style={s.txt}>{item.natureAndQuantity}</Text>
            </View>
          </View>
        ))}

        {/* Empty rows to pad table */}
        {Array.from({ length: Math.max(0, 5 - data.rateItems.length) }).map((_, i) => (
          <View key={`e${i}`} style={[s.rateRow, { height: 14 * scale }]}>
            {[s.colPcs, s.colGW, s.colRC, s.colCW, s.colRate, s.colTotal].map((w, j) => (
              <View key={j} style={[s.rateCell, w]}><Text> </Text></View>
            ))}
            <View style={[s.rateCell, s.colNature, { borderRightWidth: 0 }]}><Text> </Text></View>
          </View>
        ))}

        {/* Rate totals row */}
        <View style={s.rateLastRow}>
          <View style={[s.rateCell, s.colPcs]}>
            <Text style={[s.txt, { textAlign: 'center' }]}>
              {data.rateItems.reduce((n, r) => n + (parseInt(r.pieces) || 0), 0) || ''}
            </Text>
          </View>
          <View style={[s.rateCell, s.colGW]}><Text> </Text></View>
          <View style={[s.rateCell, { flex: 1 }]}><Text> </Text></View>
          <View style={[s.rateCell, s.colCW]}><Text> </Text></View>
          <View style={[s.rateCell, s.colRate]}><Text> </Text></View>
          <View style={[s.rateCell, s.colTotal]}><Text> </Text></View>
          <View style={[s.rateCell, s.colNature, { borderRightWidth: 0 }]}><Text> </Text></View>
        </View>

        {/* ── CHARGES SECTION ── */}
        <View style={s.chargesSec}>
          <View style={s.chargesLeft}>
            <View style={s.chgRow}>
              <View style={s.chgLabelCell}><Text style={s.xlbl}>Prepaid  Weight Charge</Text></View>
              <View style={s.chgValueCell}><Text style={s.xlbl}>Collect</Text></View>
            </View>
            <View style={s.chgRow}>
              <View style={s.chgLabelCell}><Text style={s.txt}>{data.weightChargePPD}</Text></View>
              <View style={s.chgValueCell}><Text style={s.txt}>{data.weightChargeCOLL}</Text></View>
            </View>
            <View style={[s.chgRow, { minHeight: 10 * scale }]}>
              <View style={{ flex: 2, padding: 1 }}><Text style={s.xlbl}>Valuation Charge</Text></View>
            </View>
            <View style={s.chgRow}>
              <View style={s.chgLabelCell}><Text style={s.txt}>{data.valuationChargePPD}</Text></View>
              <View style={s.chgValueCell}><Text style={s.txt}>{data.valuationChargeCOLL}</Text></View>
            </View>
            <View style={[s.chgRow, { minHeight: 10 * scale }]}>
              <View style={{ flex: 2, padding: 1 }}><Text style={s.xlbl}>Tax</Text></View>
            </View>
            <View style={s.chgRow}>
              <View style={s.chgLabelCell}><Text style={s.txt}>{data.taxPPD}</Text></View>
              <View style={s.chgValueCell}><Text style={s.txt}>{data.taxCOLL}</Text></View>
            </View>
            <View style={[s.chgRow, { minHeight: 10 * scale }]}>
              <View style={{ flex: 2, padding: 1 }}><Text style={s.xlbl}>Total Other Charges Due Agent</Text></View>
            </View>
            <View style={s.chgRow}>
              <View style={s.chgLabelCell}><Text style={s.txt}>{data.totalOtherChargesDueAgent}</Text></View>
              <View style={s.chgValueCell}><Text> </Text></View>
            </View>
            <View style={[s.chgRow, { minHeight: 10 * scale }]}>
              <View style={{ flex: 2, padding: 1 }}><Text style={s.xlbl}>Total Other Charges Due Carrier</Text></View>
            </View>
            <View style={s.chgRow}>
              <View style={s.chgLabelCell}><Text> </Text></View>
              <View style={s.chgValueCell}><Text style={s.txt}>{data.totalOtherChargesDueCarrier}</Text></View>
            </View>
          </View>

          <View style={s.chargesRight}>
            <View style={{ borderBottomWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: 1 }}>
              <Text style={s.xlbl}>Other Charges</Text>
            </View>
            {data.otherCharges.map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', borderBottomWidth: 0.3, borderColor: RED, borderStyle: 'solid', minHeight: 10 * scale }}>
                <View style={{ flex: 2, padding: 1 }}><Text style={s.txt}>{c.description}</Text></View>
                <View style={{ flex: 1, padding: 1, alignItems: 'flex-end' }}><Text style={s.txt}>{c.amount}</Text></View>
              </View>
            ))}
            <View style={{ flex: 1, padding: 3, justifyContent: 'flex-end' }}>
              <Text style={{ fontSize: XS, lineHeight: 1.5 }}>{SHIPPER_CERT}</Text>
              <Text style={[s.lbl, { marginTop: 6 * scale }]}>Signature of Shipper or his Agent</Text>
              <View style={s.sigLine}>
                <Text style={s.txt}>{data.signatureShipper}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── TOTALS ── */}
        <View style={s.totalsRow}>
          <Cell label="Total Prepaid" style={s.totalCell} s={s}>
            <Text style={s.txt}>{data.totalPrepaid}</Text>
          </Cell>
          <Cell label="Total Collect" style={s.totalCell} s={s}>
            <Text style={s.txt}>{data.totalCollect}</Text>
          </Cell>
          <View style={{ flex: 2.2, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid' }} />
        </View>

        {/* ── CURRENCY CONVERSION / EXECUTION ── */}
        <View style={s.ccRow}>
          <Cell label="Currency Conversion Rates" style={s.ccCell} s={s}>
            <Text style={s.txt}>{data.currencyConversionRates}</Text>
          </Cell>
          <Cell label="CC Charges in Dest. Currency" style={s.ccCell} s={s}>
            <Text style={s.txt}>{data.ccChargesInDestCurrency}</Text>
          </Cell>
          <View style={s.execCell}>
            {/* Date sub-column */}
            <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'flex-end' }}>
              <Text style={s.txt}>{data.executedOnDate}</Text>
              <View style={{ borderBottomWidth: 0.5, borderColor: '#000', borderStyle: 'solid' }} />
              <Text style={[s.xlbl, { marginTop: 1 }]}>Executed on (date)</Text>
            </View>
            {/* Place sub-column */}
            <View style={{ flex: 0.9, flexDirection: 'column', justifyContent: 'flex-end' }}>
              <Text style={s.txt}>{data.executedAtPlace}</Text>
              <View style={{ borderBottomWidth: 0.5, borderColor: '#000', borderStyle: 'solid' }} />
              <Text style={[s.xlbl, { marginTop: 1 }]}>at (place)</Text>
            </View>
            {/* Carrier signature sub-column */}
            <View style={{ flex: 1.8, flexDirection: 'column', justifyContent: 'flex-end' }}>
              <View style={{ flex: 1 }} />
              <View style={{ borderBottomWidth: 0.5, borderColor: '#000', borderStyle: 'solid' }} />
              <Text style={[s.xlbl, { marginTop: 1 }]}>Signature of Issuing Carrier or its Agent</Text>
            </View>
          </View>
        </View>

        {/* ── BOTTOM ROW ── */}
        <View style={s.bottomRow}>
          <View style={[s.btmCell, { flex: 0.8 }]}>
            <Text style={s.xlbl}>For Carrier's Use only</Text>
            <Text style={s.xlbl}>at Destination</Text>
          </View>
          <Cell label="Charges at Destination" style={[s.btmCell, { flex: 1 }]} s={s}>
            <Text style={s.txt}>{data.chargesAtDestination}</Text>
          </Cell>
          <View style={{ flex: 1.4, borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: 1 }}>
            <Text style={s.xlbl}>Total Collect Charges</Text>
            <Text style={s.txt}>{data.totalCollectCharges}</Text>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer}>
          <Text style={s.footerBrand}>AIRWAYBILL APP</Text>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.footerCopy}>{data.copyLabel}</Text>
            <Text style={[s.awbNumFull, { marginTop: 1 }]}>{awbFull}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
