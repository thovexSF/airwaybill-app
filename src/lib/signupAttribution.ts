export type SignupAttribution = {
  source: string
  intent?: string
  doc_type?: string
  placement?: string
  from?: string
}

type DemoSignupLinkOptions = {
  docType?: string
  placement: string
  intent?: string
  from?: string
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

export function demoSignupPath({
  docType,
  placement,
  intent = 'download_pdf',
  from,
}: DemoSignupLinkOptions): string {
  const params = new URLSearchParams({
    source: 'demo',
    intent,
    placement,
  })

  if (docType) params.set('doc_type', docType)
  if (from) params.set('from', from)

  return `/signup?${params.toString()}`
}

export function signupAttributionFromSearch(
  searchParams: URLSearchParams,
  state: unknown,
): SignupAttribution {
  const stateObj = state && typeof state === 'object' ? state as Record<string, unknown> : {}
  const from = searchParams.get('from') || stringValue(stateObj.from)
  const source = (
    searchParams.get('source') ||
    stringValue(stateObj.source) ||
    (from?.startsWith('/demo') ? 'demo' : 'direct')
  )

  return {
    source,
    intent: searchParams.get('intent') || stringValue(stateObj.intent),
    doc_type: (
      searchParams.get('doc_type') ||
      stringValue(stateObj.doc_type) ||
      stringValue(stateObj.docType)
    ),
    placement: searchParams.get('placement') || stringValue(stateObj.placement),
    from,
  }
}
