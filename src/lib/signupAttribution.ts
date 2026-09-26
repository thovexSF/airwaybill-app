type SignupAttribution = {
  source: string
  intent: string
  docType?: string
}

export function buildSignupUrl({ source, intent, docType }: SignupAttribution): string {
  const params = new URLSearchParams()
  params.set('source', source)
  params.set('intent', intent)
  if (docType) params.set('doc_type', docType)
  return `/signup?${params.toString()}`
}

export function demoDocTypeFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/demo\/([^/?#]+)/)
  return match?.[1]
}
