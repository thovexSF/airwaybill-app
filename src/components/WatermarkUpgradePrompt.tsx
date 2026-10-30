import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePostHog } from '@posthog/react'
import { openCheckout } from '../lib/paddleService'
import { PLANS, PRICE_IDS } from '../data/plans'

export function WatermarkUpgradePrompt({
  docType,
  placement,
  userEmail,
  orgId,
  plan = 'free',
}: {
  docType: string
  placement: string
  userEmail?: string | null
  orgId?: string | null
  plan?: string
}) {
  const { t } = useTranslation()
  const posthog = usePostHog()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const starterPrice = useMemo(() => {
    const starter = PLANS.find(p => p.id === 'starter')
    return starter?.priceDisplay ? `${starter.priceDisplay}/mo` : 'Starter'
  }, [])
  const starterPriceId = PRICE_IDS.starter
  const canOpenCheckout = !!starterPriceId && !!userEmail && !!orgId

  useEffect(() => {
    ;(window as any).clarity?.('event', 'watermark_upgrade_prompt_shown')
    posthog?.capture('watermark_upgrade_prompt_shown', { doc_type: docType, placement, plan })
  }, [docType, placement, plan, posthog])

  async function handleCheckout() {
    if (!starterPriceId || !userEmail || !orgId || loading) return
    setLoading(true)
    setError(null)
    try {
      ;(window as any).clarity?.('event', 'watermark_upgrade_clicked')
      posthog?.capture('watermark_upgrade_clicked', { doc_type: docType, placement, plan, target_plan: 'starter' })
      await openCheckout({ priceId: starterPriceId, email: userEmail, orgId })
    } catch (e) {
      console.error('Starter checkout failed:', e)
      setError(t('editor.watermarkUpgradeError'))
    } finally {
      setLoading(false)
    }
  }

  const ctaLabel = t('editor.watermarkUpgradeCta', { price: starterPrice })

  return (
    <div style={{
      background: '#fff3cd',
      borderBottom: '1px solid #ffc107',
      padding: '10px 20px',
      fontSize: 13,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <strong style={{ color: '#5c2b00' }}>{t('editor.watermarkUpgradeTitle')}</strong>
        <span style={{ color: '#5c2b00' }}>{t('editor.watermarkUpgradeBody')}</span>
        {error && <span style={{ color: 'var(--red)', fontSize: 12 }}>{error}</span>}
      </div>
      {canOpenCheckout ? (
        <button
          type="button"
          className="btn-download"
          onClick={handleCheckout}
          disabled={loading}
          style={{ whiteSpace: 'nowrap' }}
        >
          {loading ? t('pricing.opening') : ctaLabel}
        </button>
      ) : (
        <Link
          to="/pricing?source=watermark_limit&intent=remove_watermark"
          className="btn-download"
          style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {t('editor.watermarkUpgradePricing')}
        </Link>
      )}
    </div>
  )
}
