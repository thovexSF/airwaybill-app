export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise'

export interface PlanConfig {
  id: PlanId
  name: string
  priceDisplay: string
  period: string
  description: string
  features: string[]
  highlight: boolean
  cta: string
  ctaLink?: string // for non-checkout plans (free, enterprise)
}

export const PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    priceDisplay: '$0',
    period: 'forever',
    description: 'Try real document PDF generation at no cost',
    features: ['10 free documents/month (any type)', 'AWB, HAWB, DGD, Manifest, Label, B/L, Proforma…', 'Save and edit documents', 'DRAFT watermark', '1 user'],
    highlight: false,
    cta: 'Get Started Free',
    ctaLink: '/signup',
  },
  {
    id: 'starter',
    name: 'Starter',
    priceDisplay: '$19',
    period: 'per month',
    description: 'For small freight forwarders',
    features: ['Unlimited AWB PDF downloads', 'No watermark', 'Custom carrier logo', 'AWB check digit validation', '2 users', 'Email support'],
    highlight: false,
    cta: 'Start 7-day Trial',
  },
  {
    id: 'pro',
    name: 'Pro',
    priceDisplay: '$35',
    period: 'per month',
    description: 'For active freight forwarders',
    features: ['Everything in Starter', 'HAWB + DGD + Manifest', 'Flight manifest export', '5 users', 'Priority support'],
    highlight: true,
    cta: 'Start 7-day Trial',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceDisplay: 'Custom',
    period: '',
    description: 'For airlines & large agencies',
    features: ['Everything in Pro', 'Unlimited users', 'API access', 'Cargo-IMP / CUSCAR export', 'Custom domain', 'SSO / SAML', 'Dedicated support'],
    highlight: false,
    cta: 'Contact Sales',
    ctaLink: '/contact',
  },
]

export const PRICE_IDS: Partial<Record<PlanId, string>> = {
  starter: import.meta.env.VITE_PADDLE_PRICE_STARTER,
  pro: import.meta.env.VITE_PADDLE_PRICE_PRO,
}
