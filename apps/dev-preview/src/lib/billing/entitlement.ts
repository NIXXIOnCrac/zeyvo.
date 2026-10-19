import { supabase, getSession } from '../supabase/client'

export type Plan = {
  id: string
  name: string
  description: string
  monthly_price_cents: number | null
  annual_price_cents: number | null
  currency: string
  included_features: string[]
  monthly_allowance: any
  is_active: boolean
}

export async function listPlans(): Promise<Plan[]> {
  const { data } = await supabase.from('plans').select('*').eq('is_active', true)
  return (data as Plan[]) || []
}

export async function getCurrentSubscription() {
  const session = await getSession()
  if (!session) return null
  const { data } = await supabase.from('subscriptions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(1).single()
  return data
}

export async function getUsageBalance() {
  const session = await getSession()
  if (!session) return null
  const { data } = await supabase.from('usage_balances').select('*').eq('user_id', session.user.id).order('period_start', { ascending: false }).limit(1).single()
  return data
}

export async function createCheckout(planId: string, interval: 'monthly'|'annual'='monthly') {
  const session = await getSession()
  if (!session) throw new Error('Not authenticated')
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
    body: JSON.stringify({ plan_id: planId, interval })
  })
  const j = await res.json()
  if (!res.ok) throw new Error(j.error || j.message || 'Checkout failed')
  return j // { url }
}

export async function openBillingPortal() {
  const session = await getSession()
  if (!session) throw new Error('Not authenticated')
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/billing-portal`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${session.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY }
  })
  const j = await res.json()
  if (!res.ok) throw new Error(j.error || 'Portal failed')
  return j.url as string
}

export function hasFeature(entitlement: any, feature: string): boolean {
  if (!entitlement) return false
  if (entitlement.status !== 'active' && entitlement.status !== 'trialing') return false
  return (entitlement.features || []).includes(feature)
}
