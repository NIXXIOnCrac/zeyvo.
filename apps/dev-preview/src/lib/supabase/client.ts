import { createClient } from '@supabase/supabase-js'

// Supabase project for ZEYVO (managed AI backend)
// Values are public anon key — safe to ship. Service role key NEVER in client.
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jldyaqxxdiznhkeuerzl.supabase.co'
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'zeyvo-auth',
    // Tauri uses file protocol — localStorage works in preview, Tauri persistent via plugin
  }
})

// Helper: get session and refresh entitlement
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function signOut() {
  await supabase.auth.signOut()
  localStorage.removeItem('zeyvo-entitlement')
}

export async function getEntitlement() {
  const session = await getSession()
  if (!session) return null
  // Fetch from entitlements table via RLS (user own)
  const { data } = await supabase.from('entitlements').select('plan_id,status,features').eq('user_id', session.user.id).single()
  if (data) {
    localStorage.setItem('zeyvo-entitlement', JSON.stringify(data))
    return data
  }
  return null
}
