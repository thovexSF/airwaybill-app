/**
 * Consulta de la lista pública "Freight Forwarders and Affiliates" del Multilateral e-AWB
 * Agreement de IATA (https://matchmaker.iata.org/efReport/ffAndAffiliatesAgrReport).
 *
 * TODO: implementar la lectura de la tabla aquí. Solo se necesita el país de la solicitud
 * (el reporte es enorme; filtrar por país antes de leer) y comparar `companyName` sin
 * mayúsculas ni puntuación ("S.P.A." == "SPA"). Mientras devuelva `available: false`,
 * el admin sigue haciendo la revisión manual desde el link del reporte.
 */
export interface IataRegistryMatch {
  companyName: string
  city: string
  joiningDate: string | null
  comments: string | null // PARENT / AFFILIATE
}

export interface IataRegistryResult {
  available: boolean
  matches: IataRegistryMatch[]
}

export async function lookupIataRegistry(_country: string, _companyName: string): Promise<IataRegistryResult> {
  return { available: false, matches: [] }
}
