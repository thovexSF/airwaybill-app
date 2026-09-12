export type AuthAttribution = {
  source: string
  intent: string
  doc_type?: string
  from?: string
}

export function authAttributionFrom(search: string, state: unknown): AuthAttribution {
  const params = new URLSearchParams(search)
  const stateFrom = typeof state === 'object' && state !== null && 'from' in state
    ? String((state as { from?: unknown }).from ?? '')
    : ''

  const source = params.get('source') || (stateFrom ? 'protected_route' : 'direct')
  const intent = params.get('intent') || (source === 'demo' ? 'download_pdf' : 'create_account')
  const docType = params.get('doc_type') || undefined
  const from = params.get('from') || stateFrom || undefined

  return {
    source,
    intent,
    ...(docType ? { doc_type: docType } : {}),
    ...(from ? { from } : {}),
  }
}

export function authEventProps(
  attribution: AuthAttribution,
  extra: Record<string, string | boolean | number | undefined> = {},
) {
  return {
    ...attribution,
    ...Object.fromEntries(Object.entries(extra).filter(([, value]) => value !== undefined)),
  }
}

export function classifyAuthError(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('already registered') || normalized.includes('already exists')) return 'account_exists'
  if (normalized.includes('invalid login') || normalized.includes('invalid credentials')) return 'invalid_credentials'
  if (normalized.includes('password')) return 'password'
  if (normalized.includes('email')) return 'email'
  if (normalized.includes('rate limit') || normalized.includes('too many')) return 'rate_limited'
  return 'unknown'
}
