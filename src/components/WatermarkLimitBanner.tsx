import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePostHog } from '@posthog/react'

export function WatermarkLimitBanner({ source }: { source: string }) {
  const { t } = useTranslation()
  const posthog = usePostHog()

  return (
    <div style={{ background: '#fff3cd', borderBottom: '1px solid #ffc107', padding: '8px 20px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span>{t('editor.limitBanner')}</span>
      <Link
        to="/pricing"
        onClick={() => posthog?.capture('watermark_upgrade_clicked', { source })}
        style={{ fontWeight: 700, color: 'var(--red)', textDecoration: 'none', whiteSpace: 'nowrap' }}
      >
        {t('editor.upgradeNow')}
      </Link>
    </div>
  )
}
