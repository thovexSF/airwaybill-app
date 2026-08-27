const B2B_ORANGE = '#ff6600'

/** Persist + apply partner chrome (B2B orange, embed flags, español). */
export function applyPartnerTheme(theme: string, embed: boolean) {
  try {
    if (theme) sessionStorage.setItem('awb_partner_theme', theme)
    if (embed) sessionStorage.setItem('awb_partner_embed', '1')
    if (embed || theme === 'b2b') localStorage.setItem('lang', 'es')
  } catch {
    /* ignore */
  }
  bootPartnerTheme()
}

export function bootPartnerTheme() {
  let theme = ''
  let embed = false
  let hubModal = false
  let lang = ''
  try {
    const q = new URLSearchParams(window.location.search)
    theme = q.get('theme') || sessionStorage.getItem('awb_partner_theme') || ''
    embed = q.get('embed') === '1' || sessionStorage.getItem('awb_partner_embed') === '1'
    hubModal = q.get('modal') === '1'
    lang = q.get('lang') || ''
  } catch {
    /* ignore */
  }

  if (lang === 'es' || theme === 'b2b' || embed) {
    try {
      localStorage.setItem('lang', 'es')
    } catch {
      /* ignore */
    }
  }

  if (theme === 'b2b' || embed) {
    document.documentElement.setAttribute('data-partner-theme', 'b2b')
    document.documentElement.style.setProperty('--red', B2B_ORANGE)
    document.documentElement.style.setProperty('--red-light', '#ff8533')
  }

  if (embed) {
    document.documentElement.setAttribute('data-partner-embed', '1')
    try {
      sessionStorage.setItem('awb_partner_embed', '1')
      sessionStorage.setItem('awb_partner_theme', theme || 'b2b')
    } catch {
      /* ignore */
    }
  }

  // Editor opened inside the hub modal — hide duplicate chrome, keep brand colors.
  if (hubModal) {
    document.documentElement.setAttribute('data-hub-modal', '1')
  }
}

export function isPartnerEmbed(): boolean {
  try {
    return (
      sessionStorage.getItem('awb_partner_embed') === '1' ||
      document.documentElement.getAttribute('data-partner-embed') === '1'
    )
  } catch {
    return false
  }
}

/** Append modal=1 for hub iframe editors. */
export function withHubModal(path: string): string {
  const [base, qs = ''] = path.split('?')
  const params = new URLSearchParams(qs)
  params.set('modal', '1')
  return `${base}?${params.toString()}`
}
