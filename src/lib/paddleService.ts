import { initializePaddle, type Paddle, type PaddleEventData } from '@paddle/paddle-js'

let paddle: Paddle | undefined
type CheckoutEventHandler = (event: PaddleEventData) => void

const checkoutEventHandlers = new Set<CheckoutEventHandler>()

function notifyCheckoutEventHandlers(event: PaddleEventData) {
  checkoutEventHandlers.forEach(handler => handler(event))
}

function isTerminalCheckoutEvent(eventName?: string) {
  return (
    eventName === 'checkout.closed' ||
    eventName === 'checkout.completed' ||
    eventName === 'checkout.error' ||
    eventName === 'checkout.failed'
  )
}

export async function getPaddle(): Promise<Paddle> {
  if (paddle) return paddle
  paddle = await initializePaddle({
    environment: (import.meta.env.VITE_PADDLE_ENV ?? 'sandbox') as 'sandbox' | 'production',
    token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN,
    eventCallback: notifyCheckoutEventHandlers,
  })
  if (!paddle) throw new Error('Paddle failed to initialize')
  return paddle
}

export async function openCheckout({
  priceId,
  email,
  orgId,
  onSuccess,
  onEvent,
}: {
  priceId: string
  email: string
  orgId: string
  onSuccess?: () => void
  onEvent?: CheckoutEventHandler
}) {
  const p = await getPaddle()
  let checkoutHandler: CheckoutEventHandler | undefined

  if (onEvent || onSuccess) {
    checkoutHandler = (event) => {
      onEvent?.(event)
      if (event.name === 'checkout.completed') onSuccess?.()
      if (isTerminalCheckoutEvent(event.name)) {
        checkoutEventHandlers.delete(checkoutHandler!)
      }
    }
    checkoutEventHandlers.add(checkoutHandler)
  }

  try {
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
  } catch (error) {
    if (checkoutHandler) checkoutEventHandlers.delete(checkoutHandler)
    throw error
  }
}
