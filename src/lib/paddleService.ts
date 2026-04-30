import { initializePaddle, type Paddle } from '@paddle/paddle-js'

let paddle: Paddle | undefined

export async function getPaddle(): Promise<Paddle> {
  if (paddle) return paddle
  paddle = await initializePaddle({
    environment: (import.meta.env.VITE_PADDLE_ENV ?? 'sandbox') as 'sandbox' | 'production',
    token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN,
  })
  if (!paddle) throw new Error('Paddle failed to initialize')
  return paddle
}

export async function openCheckout({
  priceId,
  email,
  orgId,
  onSuccess,
}: {
  priceId: string
  email: string
  orgId: string
  onSuccess?: () => void
}) {
  const p = await getPaddle()
  p.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: { email },
    customData: { org_id: orgId },
    settings: {
      successUrl: window.location.origin + '/billing/success',
      displayMode: 'overlay',
      theme: 'light',
      locale: 'en',
    },
  })
}
