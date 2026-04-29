import { supabase } from './supabase'

export async function createCheckoutSession(plan: 'starter' | 'pro'): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        plan,
        successUrl: window.location.origin + '/billing/success',
        cancelUrl:  window.location.origin + '/pricing',
      }),
    }
  )

  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Checkout failed')
  return data.url as string
}
