import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePostHog } from '@posthog/react'
import { useAuth } from '../auth/AuthContext'
import { PRICE_IDS } from '../data/plans'
import { openCheckout } from '../lib/paddleService'
import { usePlan } from '../lib/usePlan'

type WatermarkUpgradePromptProps = {
  docType?: string
  placement?: string
}

const PRICING_URL = '/pricing?source=watermark_limit&intent=remove_watermark'

export function WatermarkUpgradePrompt({
  docType = 'document',
  placement = 'editor_limit_banner',
}: WatermarkUpgradePromptProps) {
  const { t } = useTranslation()
  const posthog = usePostHog()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { orgId, plan } = usePlan()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(window as any).clarity?.('event', 'watermark_upgrade_prompt_shown')
    posthog?.capture('watermark_upgrade_prompt_shown', { doc_type: docType, placement, plan })
  }, [docType, placement, plan, posthog])

  async function handleUpgrade() {
    const priceId = PRICE_IDS.starter
    setError(null)
    ;(window as any).clarity?.('event', 'watermark_upgrade_clicked')
    posthog?.capture('watermark_upgrade_clicked', {
      doc_type: docType,
      placement,
      plan,
      has_checkout: Boolean(priceId && user?.email && orgId),
    })

    if (!priceId || !user?.email || !orgId) {
      navigate(PRICING_URL)
      return
    }

    setLoading(true)
    try {
      await openCheckout({ priceId, email: user.email, orgId })
    } catch (e) {
      console.error('Watermark upgrade checkout failed:', e)
      posthog?.capture('watermark_upgrade_checkout_failed', { doc_type: docType, placement, plan })
      setError(t('editor.watermarkUpgradeError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: '#fff7e6',
      borderBottom: '1px solid #ffc45c',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
      fontSize: 13,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <strong style={{ color: '#6b3d00' }}>{t('editor.watermarkUpgradeTitle')}</strong>
        <span style={{ color: '#5f4a22' }}>{t('editor.watermarkUpgradeBody')}</span>
        {error && (
          <Link to={PRICING_URL} style={{ color: 'var(--red)', fontWeight: 700, textDecoration: 'none' }}>
            {error}
          </Link>
        )}
      </div>
      <button
        className="btn-download"
        type="button"
        onClick={handleUpgrade}
        disabled={loading}
        style={{ whiteSpace: 'nowrap' }}
      >
        {loading ? t('common.loading') : t('editor.watermarkUpgradeCta')}
      </button>
    </div>
  )
}
