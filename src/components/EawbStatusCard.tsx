import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AgreementRow, fmtAsOf, listAgreements, registryList, useRegistryCheck } from '../lib/eawbAgreement'
import { useOrgProfile } from '../lib/orgProfile'

const ACCENT = '#8b0000'

/** Estado del e-AWB Agreement de la empresa en Configuración: lista de IATA primero, luego la solicitud propia. */
export function EawbStatusCard() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'es' ? 'es' : 'en'
  const { orgId, profile, loading } = useOrgProfile()
  const { registry } = useRegistryCheck(profile.legalName)
  const [agreement, setAgreement] = useState<AgreementRow | null>(null)

  useEffect(() => {
    if (orgId) listAgreements(orgId).then(r => setAgreement(r.find(a => a.status !== 'rechazado') ?? null)).catch(() => {})
  }, [orgId])

  const onIataList = registry?.status === 'registered'
  const accepted = onIataList || agreement?.status === 'aprobado'
  const inProgress = !accepted && agreement
  const badge = accepted
    ? { text: t('eawb.card.accepted'), color: '#2f7d32', bg: '#eaf6ea' }
    : inProgress ? { text: t(`eawb.s.${agreement.status}`), color: '#8a5a00', bg: '#fff4dc' } : null

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 24, marginTop: 32, border: '1px solid #e8dcdc' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: ACCENT, margin: 0 }}>e-AWB Agreement</h2>
        {!loading && badge && (
          <span style={{ fontSize: 12, fontWeight: 700, color: badge.color, background: badge.bg, borderRadius: 12, padding: '3px 10px' }}>{badge.text}</span>
        )}
      </div>
      {accepted ? (
        <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
          {onIataList && registry
            ? t('eawb.card.onList', { list: registryList(registry), date: registry.asOf ? fmtAsOf(registry.asOf, locale) : '' })
            : t('eawb.card.approved')}
        </p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
            {inProgress ? t(`eawb.card.progress.${agreement.status}`) : t('eawb.card.none')}
          </p>
          <Link to="/eawb-agreement" style={{ color: ACCENT, fontSize: 13, fontWeight: 600 }}>
            {inProgress ? t('eawb.card.viewStatus') : t('eawb.card.request')} →
          </Link>
        </>
      )}
    </div>
  )
}
