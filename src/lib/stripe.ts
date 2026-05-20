import { loadStripe, type Stripe } from '@stripe/stripe-js'

const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined
export const STRIPE_ENABLED = !!key

let _stripe: Promise<Stripe | null> | null = null

export function getStripe(): Promise<Stripe | null> {
  if (!key) return Promise.resolve(null)
  if (!_stripe) _stripe = loadStripe(key)
  return _stripe
}
