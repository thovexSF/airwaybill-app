export interface NeppexProductRow {
  id: string
  elaborador: string
  descripcion: string
  numEnvases: string
  fechaElaboracion: string
  kgNetos: string
}

export interface NeppexCertRow {
  id: string
  numero: string
  tipoCertificado: string
  valorUf: string
  folioAsociado: string
}

export interface NeppexData {
  docType: 'neppex'

  // A. Antecedentes
  neppexNumber: string
  rutExportador: string
  razonSocialExportador: string
  direccionExportador: string
  paisDestino: string
  puertoDestino: string
  puertoEmbarque: string
  oficina: string
  fechaZarpe: string
  billOfLading: string
  numContenedor: string
  idMedioTransporte: string
  numSello: string
  rutConductor: string
  consignatario: string
  agenciaAduana: string
  esMuestra: boolean
  esComercial: boolean
  consumoHumano: boolean
  consumoNoHumano: boolean

  // B. Producto
  products: NeppexProductRow[]
  totalEnvases: string
  totalKgBrutos: string
  totalKgNetos: string

  // C. Respaldos
  declaracionCertificacionOrigen: boolean
  declaracionJuradaProductosAfectos: boolean
  numAocs: string
  numSmae: string
  numInformeBrasilUee: string
  numSippSui: string
  lugarAlmacenamiento: string
  lugarConsolidacion: string

  // D. Fiscalización
  numFip: string
  nombreInspector: string
  numGuiaDespacho: string
  oficinaFiscalizacion: string

  // E. Certificación
  noSolicitaCertificados: boolean
  certificates: NeppexCertRow[]
  responsableNombre: string
  responsableRut: string

  // F. Rechazo
  rechazoFecha: string
  rechazoCausa: string

  isDraft: boolean
}

export const defaultNeppexData: NeppexData = {
  docType: 'neppex',
  neppexNumber: '',
  rutExportador: '',
  razonSocialExportador: '',
  direccionExportador: '',
  paisDestino: '',
  puertoDestino: '',
  puertoEmbarque: '',
  oficina: '',
  fechaZarpe: '',
  billOfLading: '',
  numContenedor: '',
  idMedioTransporte: '',
  numSello: '',
  rutConductor: '',
  consignatario: '',
  agenciaAduana: '',
  esMuestra: false,
  esComercial: true,
  consumoHumano: true,
  consumoNoHumano: false,
  products: [
    { id: '1', elaborador: '', descripcion: '', numEnvases: '', fechaElaboracion: '', kgNetos: '' },
  ],
  totalEnvases: '',
  totalKgBrutos: '',
  totalKgNetos: '',
  declaracionCertificacionOrigen: false,
  declaracionJuradaProductosAfectos: false,
  numAocs: '',
  numSmae: '',
  numInformeBrasilUee: '',
  numSippSui: '',
  lugarAlmacenamiento: '',
  lugarConsolidacion: '',
  numFip: '',
  nombreInspector: '',
  numGuiaDespacho: '',
  oficinaFiscalizacion: '',
  noSolicitaCertificados: false,
  certificates: [
    { id: '1', numero: '', tipoCertificado: '', valorUf: '', folioAsociado: '' },
  ],
  responsableNombre: '',
  responsableRut: '',
  rechazoFecha: '',
  rechazoCausa: '',
  isDraft: true,
}
