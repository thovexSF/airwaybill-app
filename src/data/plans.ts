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
    description: 'Get started at no cost',
    features: ['10 AWBs per month', 'PDF download', 'DRAFT watermark', 'Basic AWB form', '1 user'],
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
    features: ['Unlimited AWBs', 'No watermark', 'Custom carrier logo', 'AWB check digit validation', '2 users', 'Email support'],
    highlight: false,
    cta: 'Start 14-day Trial',
  },
  {
    id: 'pro',
    name: 'Pro',
    priceDisplay: '$35',
    period: 'per month',
    description: 'For active freight forwarders',
    features: ['Everything in Starter', 'HAWB + DGD + Manifest', 'Flight manifest export', '5 users', 'Priority support'],
    highlight: true,
    cta: 'Start 14-day Trial',
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
