import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { NeppexData } from '../types/neppex'

/** A4 — office prints SERNAPESCA on A4 (official blank is Oficio; we fit to A4). */
const NAVY = '#1a3a5c'
const LINE = '#222'

const s = StyleSheet.create({
  page: { padding: 22, fontFamily: 'Helvetica', fontSize: 7, backgroundColor: '#fff' },
  watermark: { position: 'absolute', top: 300, left: 80, fontSize: 80, color: 'rgba(0,40,100,0.05)', fontFamily: 'Helvetica-Bold', transform: 'rotate(-45deg)' },
  header: { fontSize: 7, color: '#555', textAlign: 'right', marginBottom: 4 },
  title: { fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center', color: NAVY, marginBottom: 2 },
  neppexNo: { fontSize: 8, textAlign: 'right', marginBottom: 6 },
  section: { borderWidth: 0.8, borderColor: LINE, marginBottom: 4 },
  sectionTitle: { backgroundColor: '#e8eef5', padding: '3 5', fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: NAVY, borderBottomWidth: 0.5, borderBottomColor: LINE },
  row: { flexDirection: 'row' },
  cell: { borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: LINE, padding: '2 4', minHeight: 16 },
  cellLast: { borderBottomWidth: 0.5, borderColor: LINE, padding: '2 4', minHeight: 16 },
  lbl: { fontSize: 5.5, color: '#555', marginBottom: 1 },
  val: { fontSize: 7.5 },
  bold: { fontFamily: 'Helvetica-Bold' },
  checkRow: { flexDirection: 'row', gap: 10, padding: '3 5', borderBottomWidth: 0.5, borderColor: LINE },
  check: { fontSize: 7 },
  tblHead: { flexDirection: 'row', backgroundColor: '#f0f4f8', borderBottomWidth: 0.5, borderColor: LINE },
  tblH: { borderRightWidth: 0.5, borderColor: LINE, padding: '2 3', justifyContent: 'center' },
  tblRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: LINE, minHeight: 18 },
  tblC: { borderRightWidth: 0.5, borderColor: LINE, padding: '2 3', justifyContent: 'center' },
  totals: { flexDirection: 'row', padding: '3 5', gap: 16, borderTopWidth: 0.5, borderColor: LINE, backgroundColor: '#f8fafc' },
  sigBox: { borderWidth: 0.5, borderColor: LINE, padding: 6, marginTop: 4, minHeight: 48 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  footerTxt: { fontSize: 5.5, color: '#999' },
  instruct: { fontSize: 6, lineHeight: 1.35, color: '#333', marginBottom: 2 },
  valueTable: { marginTop: 6, borderWidth: 0.5, borderColor: LINE, width: 220 },
})

function mark(on: boolean) {
  return on ? '☑' : '☐'
}

function FieldCell({ label, value, flex = 1, last = false }: { label: string; value: string; flex?: number; last?: boolean }) {
  return (
    <View style={[last ? s.cellLast : s.cell, { flex }]}>
      <Text style={s.lbl}>{label}</Text>
      <Text style={s.val}>{value || ' '}</Text>
    </View>
  )
}

const CERT_VALUES = [
  ['≤ 20 kg. (muestra)', '0,5'],
  ['S > a 20 ó <1000 kg.', '1'],
  ['S > 1000 Kg.', '4'],
  ['S. especies acuáticas', '1,5'],
  ['Acreditación de origen legal ICCAT', '1,5'],
  ['Especial', '1,5'],
  ['Acreditación de origen legal U.E.', '1,5'],
]

export function NeppexDocument({ data }: { data: NeppexData }) {
  const products = data.products.length ? data.products : [{ id: '1', elaborador: '', descripcion: '', numEnvases: '', fechaElaboracion: '', kgNetos: '' }]
  const certs = data.certificates.length ? data.certificates : [{ id: '1', numero: '', tipoCertificado: '', valorUf: '', folioAsociado: '' }]

  return (
    <Document>
      {/* ── CARA (A–D) ── */}
      <Page size="A4" style={s.page}>
        {data.isDraft && <Text style={s.watermark}>DRAFT</Text>}
        <Text style={s.header}>Manual de Inocuidad y Certificación / Octubre 2024</Text>
        <Text style={s.neppexNo}>Nº NEPPEX: <Text style={s.bold}>{data.neppexNumber || '______________'}</Text></Text>
        <Text style={s.title}>NOTIFICACIÓN DE EMBARQUE DE PRODUCTOS PESQUEROS DE EXPORTACIÓN (NEPPEX)</Text>

        {/* A */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>A.- ANTECEDENTES</Text>
          <View style={s.row}>
            <FieldCell label="RUT Exportador" value={data.rutExportador} flex={1.2} />
            <FieldCell label="Razón Social del Exportador" value={data.razonSocialExportador} flex={2} last />
          </View>
          <View style={s.row}>
            <FieldCell label="Dirección exportador" value={data.direccionExportador} last />
          </View>
          <View style={s.row}>
            <FieldCell label="País de destino" value={data.paisDestino} />
            <FieldCell label="Puerto de destino" value={data.puertoDestino} last />
          </View>
          <View style={s.row}>
            <FieldCell label="Puerto de Embarque" value={data.puertoEmbarque} flex={1.4} />
            <FieldCell label="Oficina" value={data.oficina} />
            <FieldCell label="Fecha de Zarpe/salida" value={data.fechaZarpe} last />
          </View>
          <View style={s.row}>
            <FieldCell label="N° de Bill of Lading" value={data.billOfLading} last />
          </View>
          <View style={s.row}>
            <FieldCell label="Nº de Contenedor" value={data.numContenedor} />
            <FieldCell label="ID medio de transporte" value={data.idMedioTransporte} last />
          </View>
          <View style={s.row}>
            <FieldCell label="N° de Sello" value={data.numSello} />
            <FieldCell label="Rut Conductor (terrestre)" value={data.rutConductor} last />
          </View>
          <View style={s.row}>
            <FieldCell label="Datos del consignatario" value={data.consignatario} last />
          </View>
          <View style={s.row}>
            <FieldCell label="Agencia Aduana/embarque (nombre/teléfono)" value={data.agenciaAduana} last />
          </View>
          <View style={s.checkRow}>
            <Text style={s.check}>{mark(data.esMuestra)} Muestras</Text>
            <Text style={s.check}>{mark(data.esComercial)} Comercial</Text>
            <Text style={s.check}>{mark(data.consumoHumano)} Consumo Humano</Text>
            <Text style={s.check}>{mark(data.consumoNoHumano)} Consumo no humano</Text>
          </View>
        </View>

        {/* B */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>B.- IDENTIFICACIÓN DEL PRODUCTO</Text>
          <View style={s.tblHead}>
            <View style={[s.tblH, { width: 130 }]}><Text style={s.lbl}>Elaborador Nº y nombre</Text></View>
            <View style={[s.tblH, { flex: 1 }]}><Text style={s.lbl}>Descripción (nombre común y científico)</Text></View>
            <View style={[s.tblH, { width: 48 }]}><Text style={s.lbl}>Nº envases</Text></View>
            <View style={[s.tblH, { width: 62 }]}><Text style={s.lbl}>Fecha elaboración</Text></View>
            <View style={[s.tblH, { width: 48, borderRightWidth: 0 }]}><Text style={s.lbl}>kg Netos</Text></View>
          </View>
          {products.map((p) => (
            <View key={p.id} style={s.tblRow} wrap={false}>
              <View style={[s.tblC, { width: 130 }]}><Text style={s.val}>{p.elaborador}</Text></View>
              <View style={[s.tblC, { flex: 1 }]}><Text style={s.val}>{p.descripcion}</Text></View>
              <View style={[s.tblC, { width: 48 }]}><Text style={[s.val, { textAlign: 'center' }]}>{p.numEnvases}</Text></View>
              <View style={[s.tblC, { width: 62 }]}><Text style={[s.val, { textAlign: 'center' }]}>{p.fechaElaboracion}</Text></View>
              <View style={[s.tblC, { width: 48, borderRightWidth: 0 }]}><Text style={[s.val, { textAlign: 'right' }]}>{p.kgNetos}</Text></View>
            </View>
          ))}
          {Array.from({ length: Math.max(0, 4 - products.length) }).map((_, i) => (
            <View key={`e${i}`} style={[s.tblRow, { height: 16 }]}>
              <View style={[s.tblC, { width: 130 }]}><Text> </Text></View>
              <View style={[s.tblC, { flex: 1 }]}><Text> </Text></View>
              <View style={[s.tblC, { width: 48 }]}><Text> </Text></View>
              <View style={[s.tblC, { width: 62 }]}><Text> </Text></View>
              <View style={[s.tblC, { width: 48, borderRightWidth: 0 }]}><Text> </Text></View>
            </View>
          ))}
          <View style={s.totals}>
            <Text style={s.val}><Text style={s.bold}>Total Envases:</Text> {data.totalEnvases || '—'}</Text>
            <Text style={s.val}><Text style={s.bold}>Total kg. Brutos:</Text> {data.totalKgBrutos || '—'}</Text>
            <Text style={s.val}><Text style={s.bold}>Total kg. Netos:</Text> {data.totalKgNetos || '—'}</Text>
          </View>
        </View>

        {/* C */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>C.- RESPALDOS DE LA AUTORIZACIÓN DEL PROGRAMA DE INOCUIDAD Y CERTIFICACIÓN</Text>
          <View style={s.checkRow}>
            <Text style={s.check}>{mark(data.declaracionCertificacionOrigen)} Declaración Certificación Origen</Text>
            <Text style={s.check}>{mark(data.declaracionJuradaProductosAfectos)} Declaración Jurada Productos Afectos</Text>
          </View>
          <View style={s.row}>
            <FieldCell label="Nº AOCS" value={data.numAocs} />
            <FieldCell label="Nº SMAE" value={data.numSmae} last />
          </View>
          <View style={s.row}>
            <FieldCell label="Nº informe Brasil/ UEE" value={data.numInformeBrasilUee} />
            <FieldCell label="Nº SIPP/SUI" value={data.numSippSui} last />
          </View>
          <View style={s.row}>
            <FieldCell label="Nº y nombre del lugar de Almacenamiento" value={data.lugarAlmacenamiento} last />
          </View>
          <View style={s.row}>
            <FieldCell label="Lugar de consolidación" value={data.lugarConsolidacion} last />
          </View>
        </View>

        {/* D */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>D.- AUTORIZACIÓN PROGRAMA FISCALIZACIÓN</Text>
          <View style={s.row}>
            <FieldCell label="Nº FIP" value={data.numFip} />
            <FieldCell label="Nombre" value={data.nombreInspector} last />
          </View>
          <View style={s.row}>
            <FieldCell label="Nº G.D." value={data.numGuiaDespacho} />
            <FieldCell label="Oficina" value={data.oficinaFiscalizacion} last />
          </View>
          <View style={s.sigBox}>
            <Text style={s.lbl}>Firma y timbre único SERNAPESCA</Text>
          </View>
        </View>

        <View style={s.footer}>
          <Text style={s.footerTxt}>AIRWAYBILL APP · SERNAPESCA F15 NEPPEX</Text>
          <Text style={s.footerTxt}>A4 · Cara</Text>
        </View>
      </Page>

      {/* ── CONTRACARA (E–F + instrucciones) ── */}
      <Page size="A4" style={s.page}>
        {data.isDraft && <Text style={s.watermark}>DRAFT</Text>}
        <Text style={s.header}>Manual de Inocuidad y Certificación / Octubre 2024</Text>
        <Text style={s.neppexNo}>Nº NEPPEX: <Text style={s.bold}>{data.neppexNumber || '______________'}</Text></Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>E.- DETALLE DE CERTIFICACIÓN SOLICITADA Y COBROS</Text>
          <View style={[s.checkRow, { borderBottomWidth: 0.5 }]}>
            <Text style={s.check}>
              {mark(data.noSolicitaCertificados)} Declaro que no solicitaré certificados para esta exportación
            </Text>
          </View>
          <View style={s.tblHead}>
            <View style={[s.tblH, { width: 36 }]}><Text style={s.lbl}>Nº</Text></View>
            <View style={[s.tblH, { flex: 1 }]}><Text style={s.lbl}>Tipo de Certificado</Text></View>
            <View style={[s.tblH, { width: 55 }]}><Text style={s.lbl}>Valor (UF)</Text></View>
            <View style={[s.tblH, { width: 90, borderRightWidth: 0 }]}><Text style={s.lbl}>Folio Asociado</Text></View>
          </View>
          {certs.map((c) => (
            <View key={c.id} style={s.tblRow} wrap={false}>
              <View style={[s.tblC, { width: 36 }]}><Text style={[s.val, { textAlign: 'center' }]}>{c.numero}</Text></View>
              <View style={[s.tblC, { flex: 1 }]}><Text style={s.val}>{c.tipoCertificado}</Text></View>
              <View style={[s.tblC, { width: 55 }]}><Text style={[s.val, { textAlign: 'center' }]}>{c.valorUf}</Text></View>
              <View style={[s.tblC, { width: 90, borderRightWidth: 0 }]}><Text style={s.val}>{c.folioAsociado}</Text></View>
            </View>
          ))}
          {Array.from({ length: Math.max(0, 5 - certs.length) }).map((_, i) => (
            <View key={`ce${i}`} style={[s.tblRow, { height: 16 }]}>
              <View style={[s.tblC, { width: 36 }]}><Text> </Text></View>
              <View style={[s.tblC, { flex: 1 }]}><Text> </Text></View>
              <View style={[s.tblC, { width: 55 }]}><Text> </Text></View>
              <View style={[s.tblC, { width: 90, borderRightWidth: 0 }]}><Text> </Text></View>
            </View>
          ))}
          <View style={{ padding: 5 }}>
            <Text style={[s.instruct, { fontStyle: 'italic' }]}>
              “Si se avisa de un resultado desfavorable en producto embarcado, la empresa exportadora se hace responsable de su devolución. Si eso no ocurre, se avisará a la autoridad en destino.”
            </Text>
          </View>
          <View style={s.row}>
            <FieldCell label="Nombre" value={data.responsableNombre} />
            <FieldCell label="RUT" value={data.responsableRut} last />
          </View>
          <View style={s.sigBox}>
            <Text style={s.lbl}>Firma responsable / Firma y timbre único SERNAPESCA</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>F.- RECHAZO</Text>
          <View style={s.row}>
            <FieldCell label="Fecha" value={data.rechazoFecha} flex={0.8} />
            <FieldCell label="Causa" value={data.rechazoCausa} flex={2} last />
          </View>
        </View>

        <Text style={[s.sectionTitle, { marginTop: 6, marginBottom: 4 }]}>INSTRUCCIONES DE LLENADO NEPPEX</Text>
        <Text style={s.instruct}>- Completar en forma adecuada para ser evaluada. Campos (6) son de llenado obligatorio por el interesado.</Text>
        <Text style={s.instruct}>- (2) Identificar número, nombre de M/N, vuelo, patente de camión. Si el espacio no alcanza, usar contracara.</Text>
        <Text style={s.instruct}>- (7) Completar solo si se usó materia prima importada o reingresada. (8) Obligatorio para NEPPEX en X y VIII región.</Text>
        <Text style={s.instruct}>- En caso de rechazo el funcionario completa ítem F; la empresa puede representar una vez solucionada la causa.</Text>

        <Text style={[s.bold, { fontSize: 7.5, marginTop: 8, marginBottom: 3 }]}>VALOR DE CERTIFICADOS</Text>
        <View style={s.valueTable}>
          <View style={[s.tblHead, { borderBottomWidth: 0.5 }]}>
            <View style={[s.tblH, { flex: 1 }]}><Text style={s.lbl}>Tipo de Certificado</Text></View>
            <View style={[s.tblH, { width: 50, borderRightWidth: 0 }]}><Text style={s.lbl}>Valor (UF)</Text></View>
          </View>
          {CERT_VALUES.map(([tipo, uf]) => (
            <View key={tipo} style={s.tblRow}>
              <View style={[s.tblC, { flex: 1 }]}><Text style={s.val}>{tipo}</Text></View>
              <View style={[s.tblC, { width: 50, borderRightWidth: 0 }]}><Text style={[s.val, { textAlign: 'center' }]}>{uf}</Text></View>
            </View>
          ))}
        </View>

        <View style={s.footer}>
          <Text style={s.footerTxt}>AIRWAYBILL APP · SERNAPESCA F15 NEPPEX</Text>
          <Text style={s.footerTxt}>A4 · Contracara</Text>
        </View>
      </Page>
    </Document>
  )
}
