import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePostHog } from '@posthog/react'
import { useAuth } from '../auth/AuthContext'
import type { Plan } from '../lib/usePlan'
import { openCheckout } from '../lib/paddleService'
import { PRICE_IDS } from '../data/plans'

export function WatermarkUpgradePrompt({ source, docType, plan, orgId, docsUsed, docLimit }: {
  source: string
  docType?: string
  plan: Plan
  orgId: string | null
  docsUsed: number
  docLimit: number | null
}) {
  const { t } = useTranslation()
  const posthog = usePostHog()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(window as any).clarity?.('event', 'watermark_upgrade_prompt_shown')
    posthog?.capture('watermark_upgrade_prompt_shown', { source, doc_type: docType, plan })
  }, [docType, plan, posthog, source])

  async function startCheckout() {
    const priceId = PRICE_IDS.starter
    ;(window as any).clarity?.('event', 'watermark_upgrade_clicked')
    posthog?.capture('watermark_upgrade_clicked', { source, doc_type: docType, plan_id: 'starter', from_plan: plan })

    if (!priceId || !user?.email || !orgId) {
      navigate('/pricing?intent=remove_watermark&source=watermark_upgrade')
      return
    }

    setBusy(true)
    setError(null)
    try {
      ;(window as any).clarity?.('event', 'checkout_opened')
      posthog?.capture('checkout_opened', { source, plan_id: 'starter', from_plan: plan, intent: 'remove_watermark' })
      await openCheckout({ priceId, email: user.email, orgId })
    } catch (e: any) {
      setError(e?.message ?? t('editor.watermarkUpgradeError'))
    } finally {
      setBusy(false)
    }
  }

  const usage = docLimit === null ? null : `${docsUsed}/${docLimit}`

  return (
    <div style={{ background: '#fff7e6', borderBottom: '1px solid #f0b429', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ color: '#5f370e', fontSize: 13, lineHeight: 1.35 }}>
        <strong style={{ display: 'block', fontSize: 14 }}>{t('editor.watermarkUpgradeTitle')}</strong>
        <span>{t('editor.watermarkUpgradeBody', { usage: usage ?? t('editor.freeDocsShort') })}</span>
        {error && (
          <span style={{ display: 'block', color: '#9b1c1c', marginTop: 4 }}>
            {error} <Link to="/pricing?intent=remove_watermark" style={{ color: 'var(--red)', fontWeight: 700 }}>{t('editor.watermarkUpgradePricing')}</Link>
          </span>
        )}
      </div>
      <button type="button" className="btn-download" onClick={startCheckout} disabled={busy} style={{ color: '#fff', background: 'var(--red)', whiteSpace: 'nowrap' }}>
        {busy ? t('editor.watermarkUpgradeOpening') : t('editor.watermarkUpgradeCta')}
      </button>
    </div>
  )
}
