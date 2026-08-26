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
  try {
    const q = new URLSearchParams(window.location.search)
    theme = q.get('theme') || sessionStorage.getItem('awb_partner_theme') || ''
    embed = q.get('embed') === '1' || sessionStorage.getItem('awb_partner_embed') === '1'
  } catch {
    /* ignore */
  }

  if (theme === 'b2b' || embed) {
    document.documentElement.setAttribute('data-partner-theme', 'b2b')
    document.documentElement.style.setProperty('--red', B2B_ORANGE)
    document.documentElement.style.setProperty('--red-light', '#ff8533')
    try {
      localStorage.setItem('lang', 'es')
    } catch {
      /* ignore */
    }
  }

  if (embed) {
    document.documentElement.setAttribute('data-partner-embed', '1')
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
