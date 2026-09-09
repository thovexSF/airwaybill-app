export type FunnelContext = {
  source?: string
  intent?: string
  doc_type?: string
  from?: string
  route?: string
}

const CONTEXT_KEYS: Array<keyof Omit<FunnelContext, 'route'>> = ['source', 'intent', 'doc_type', 'from']

function cleanValue(value: string | null): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, 80)
}

function cleanFrom(value: string | null): string | undefined {
  const cleaned = cleanValue(value)
  if (!cleaned?.startsWith('/')) return undefined
  return cleaned.split('?')[0]?.slice(0, 80)
}

export function getFunnelContext(search: string, route?: string): FunnelContext {
  const params = new URLSearchParams(search)
  return {
    source: cleanValue(params.get('source')),
    intent: cleanValue(params.get('intent')),
    doc_type: cleanValue(params.get('doc_type')),
    from: cleanFrom(params.get('from')),
    route,
  }
}

export function getDemoDocType(pathname: string): string | undefined {
  return pathname.match(/^\/demo\/([^/?#]+)/)?.[1]
}

export function buildPathWithFunnelContext(
  path: string,
  context: FunnelContext,
  overrides: FunnelContext = {},
): string {
  const params = new URLSearchParams()
  const merged = { ...context, ...overrides }

  for (const key of CONTEXT_KEYS) {
    const value = key === 'from' ? cleanFrom(merged[key] ?? null) : cleanValue(merged[key] ?? null)
    if (value) params.set(key, value)
  }

  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export function buildSignupPath(context: FunnelContext, overrides: FunnelContext = {}): string {
  return buildPathWithFunnelContext('/signup', context, overrides)
}

export function viewportProps() {
  if (typeof window === 'undefined') return {}
  return {
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    viewport_mobile: window.innerWidth < 768,
  }
}

export function authErrorCode(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('already') || lower.includes('registered')) return 'already_registered'
  if (lower.includes('password')) return 'password'
  if (lower.includes('email')) return 'email'
  if (lower.includes('rate') || lower.includes('too many')) return 'rate_limited'
  if (lower.includes('network') || lower.includes('fetch')) return 'network'
  return 'auth_error'
}
