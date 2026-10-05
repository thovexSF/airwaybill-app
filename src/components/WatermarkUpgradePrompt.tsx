import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePostHog } from '@posthog/react'
import { PRICE_IDS } from '../data/plans'
import { openCheckout } from '../lib/paddleService'
import type { Plan } from '../lib/usePlan'

export function WatermarkUpgradePrompt({
  docType = 'document',
  source,
  plan,
  orgId,
  email,
  style,
}: {
  docType?: string
  source: string
  plan: Plan
  orgId: string | null
  email?: string | null
  style?: CSSProperties
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const posthog = usePostHog()
  const [opening, setOpening] = useState(false)

  async function handleUpgrade() {
    const priceId = PRICE_IDS.starter
    const checkoutReady = Boolean(priceId && email && orgId)

    ;(window as any).clarity?.('event', 'watermark_upgrade_clicked')
    posthog?.capture('watermark_upgrade_clicked', {
      doc_type: docType,
      source,
      from_plan: plan,
      target_plan: 'starter',
      checkout_ready: checkoutReady,
    })

    if (!checkoutReady) {
      navigate('/pricing?intent=remove_watermark')
      return
    }

    setOpening(true)
    try {
      posthog?.capture('checkout_opened', {
        plan_id: 'starter',
        from_plan: plan,
        source: 'watermark_upgrade_prompt',
      })
      await openCheckout({ priceId: priceId!, email: email!, orgId: orgId! })
    } catch (error) {
      console.error('Watermark upgrade checkout failed:', error)
      navigate('/pricing?intent=remove_watermark')
    } finally {
      setOpening(false)
    }
  }

  return (
    <div
      style={{
        background: '#fff7e6',
        borderBottom: '1px solid #f2c46d',
        color: '#442900',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        fontSize: 13,
        ...style,
      }}
    >
      <div>
        <div style={{ fontWeight: 800 }}>{t('editor.watermarkUpsell.title')}</div>
        <div style={{ opacity: 0.82, marginTop: 2 }}>{t('editor.watermarkUpsell.body')}</div>
      </div>
      <button
        type="button"
        className="btn-download"
        onClick={handleUpgrade}
        disabled={opening}
        style={{ whiteSpace: 'nowrap', boxShadow: 'none' }}
      >
        {opening ? t('editor.watermarkUpsell.opening') : t('editor.watermarkUpsell.cta')}
      </button>
    </div>
  )
}
