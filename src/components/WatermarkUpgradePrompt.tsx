import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePostHog } from '@posthog/react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { usePlan } from '../lib/usePlan'
import { openCheckout } from '../lib/paddleService'
import { PRICE_IDS } from '../data/plans'

export function WatermarkUpgradePrompt({ source }: { source: string }) {
  const { t } = useTranslation()
  const posthog = usePostHog()
  const { user } = useAuth()
  const { plan, orgId } = usePlan()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const starterPriceId = PRICE_IDS.starter
  const canOpenCheckout = Boolean(user?.email && orgId && starterPriceId)

  async function handleUpgrade() {
    if (!user?.email || !orgId || !starterPriceId || loading) return
    setLoading(true)
    setError(null)
    try {
      ;(window as any).clarity?.('event', 'watermark_upgrade_clicked')
      posthog?.capture('watermark_upgrade_clicked', {
        source,
        target_plan: 'starter',
        from_plan: plan,
        intent: 'remove_watermark',
      })
      posthog?.capture('checkout_opened', {
        plan_id: 'starter',
        from_plan: plan,
        source,
        intent: 'remove_watermark',
      })
      await openCheckout({ priceId: starterPriceId, email: user.email, orgId })
    } catch (e: any) {
      setError(e?.message ?? t('editor.upgradeError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="watermark-upgrade-banner">
      <div className="watermark-upgrade-copy">
        <strong>{t('editor.watermarkUpsellTitle')}</strong>
        <span>{t('editor.watermarkUpsellBody')}</span>
        {error && <span className="watermark-upgrade-error">{error}</span>}
      </div>
      {canOpenCheckout ? (
        <button className="watermark-upgrade-cta" type="button" onClick={handleUpgrade} disabled={loading}>
          {loading ? t('pricing.opening') : t('editor.upgradeNow')}
        </button>
      ) : (
        <Link className="watermark-upgrade-cta" to="/pricing?intent=remove_watermark">
          {t('editor.upgradeNow')}
        </Link>
      )}
    </div>
  )
}
