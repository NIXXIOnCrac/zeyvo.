import { useEffect, useState } from 'react'
import { supabase, getEntitlement } from '../../lib/supabase/client'
import { listPlans, getCurrentSubscription, getUsageBalance, createCheckout, openBillingPortal } from '../../lib/billing/entitlement'

export default function AccountPanel(){
  const [user,setUser]=useState<any>(null)
  const [ent,setEnt]=useState<any>(null)
  const [plans,setPlans]=useState<any[]>([])
  const [sub,setSub]=useState<any>(null)
  const [balance,setBalance]=useState<any>(null)
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [msg,setMsg]=useState('')

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=> setUser(data.user))
    getEntitlement().then(setEnt)
    listPlans().then(setPlans)
    getCurrentSubscription().then(setSub)
    getUsageBalance().then(setBalance)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session)=> setUser(session?.user||null))
    return ()=>subscription.unsubscribe()
  },[])

  const signUp=async()=>{
    setMsg('Signing up...')
    const { error } = await supabase.auth.signUp({ email, password, options:{ data:{ display_name: email.split('@')[0]} }})
    if(error) setMsg(error.message); else setMsg('Check your email to confirm.')
  }
  const signIn=async()=>{
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if(error) setMsg(error.message); else setMsg('Signed in — refreshing entitlement...'); setTimeout(()=>getEntitlement().then(setEnt),500)
  }
  const signOut=async()=>{ await supabase.auth.signOut(); setUser(null); setEnt(null); setMsg('Signed out') }

  if(!user){
    return (
      <div className="space-y-4 max-w-[520px]">
        <h2 className="text-[16px] font-semibold text-white">Create your ZEYVO account</h2>
        <p className="text-[12px] text-white/60">You don’t need API keys. Sign up, choose a plan, and ZEYVO’s managed AI works immediately after payment verification.</p>
        <div className="rounded-2xl bg-[#141414] border border-white/5 p-4 space-y-3">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white" />
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password (6+ chars)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white" />
          <div className="flex gap-2">
            <button onClick={signUp} className="bg-white text-black text-[13px] px-4 py-2 rounded-full font-medium">Sign up</button>
            <button onClick={signIn} className="bg-white/10 text-white text-[13px] px-4 py-2 rounded-full">Sign in</button>
            <button onClick={async()=>{ const { error } = await supabase.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: window.location.origin } }); if(error) setMsg(error.message)}} className="bg-white/10 text-white text-[13px] px-4 py-2 rounded-full">Google</button>
          </div>
          {msg && <div className="text-[12px] text-amber-300">{msg}</div>}
        </div>
        <div className="text-[11px] text-white/30">OAuth state is server-verified. After signup, pick a plan below — checkout is hosted (Stripe), entitlements activate only via verified webhook, not client screen.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[900px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-white">Account & Subscription</h2>
        <button onClick={signOut} className="text-[12px] bg-white/10 text-white px-3 py-1.5 rounded-full">Sign out</button>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#141414] border border-white/5 p-3">
          <div className="text-[11px] uppercase tracking-wide text-white/40">Account</div>
          <div className="text-[13px] font-medium text-white mt-1">{user.email}</div>
          <div className="text-[11px] text-white/50">ID {user.id.slice(0,8)}… • {user.email_confirmed_at? 'verified':'unverified'}</div>
        </div>
        <div className="rounded-xl bg-[#141414] border border-white/5 p-3">
          <div className="text-[11px] uppercase tracking-wide text-white/40">Plan</div>
          <div className="text-[13px] font-medium text-white mt-1">{ent?.plan_id ? ent.plan_id.toUpperCase() : 'No subscription'}</div>
          <div className={`text-[11px] mt-1 ${ent?.status==='active'?'text-emerald-400': ent?.status==='past_due'?'text-amber-300':'text-white/50'}`}>{ent?.status || 'inactive'} {sub?.current_period_end? `• renews ${new Date(sub.current_period_end).toLocaleDateString()}`:''}</div>
          <div className="text-[11px] text-white/30 mt-1">Features: {(ent?.features||[]).join(', ') || '—'}</div>
        </div>
        <div className="rounded-xl bg-[#141414] border border-white/5 p-3">
          <div className="text-[11px] uppercase tracking-wide text-white/40">Usage this period</div>
          {balance ? (
            <>
              <div className="text-[12px] text-white/80 mt-1">AI tokens {balance.ai_tokens_used} / {balance.ai_tokens_limit}</div>
              <div className="h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden"><div className="h-full bg-white" style={{ width: `${Math.min(100, Math.round(balance.ai_tokens_used/balance.ai_tokens_limit*100))}%` }} /></div>
              <div className="text-[11px] text-white/50 mt-1">Voice {Math.round(balance.voice_seconds_used/60)}m / {Math.round(balance.voice_seconds_limit/60)}m • Vision {balance.vision_requests_used}/{balance.vision_requests_limit}</div>
            </>
          ) : <div className="text-[11px] text-white/40 mt-1">No usage yet — start chatting to meter.</div>}
        </div>
      </div>

      <div>
        <h3 className="text-[13px] font-semibold text-white mb-2">Choose a plan</h3>
        <div className="grid md:grid-cols-3 gap-3">
          {plans.map(p=>(
            <div key={p.id} className={`rounded-2xl border p-4 ${ent?.plan_id===p.id?'bg-white text-black border-white':'bg-[#141414] border-white/5 text-white'}`}>
              <div className="text-[14px] font-semibold">{p.name}</div>
              <div className="text-[11px] opacity-70 mt-1">{p.description}</div>
              <div className="text-[12px] mt-2">{p.monthly_price_cents ? `$${(p.monthly_price_cents/100).toFixed(2)}/mo` : 'Pricing set by admin — contact sales'} {p.annual_price_cents? `• $${(p.annual_price_cents/100).toFixed(2)}/yr`:''}</div>
              <div className="text-[11px] opacity-60 mt-1">Includes: {(p.included_features||[]).join(', ')}</div>
              <button onClick={async()=>{
                try{ const { url } = await createCheckout(p.id,'monthly'); if(url) window.location.href=url }catch(e:any){ alert(e.message) }
              }} className={`mt-3 w-full text-[12px] py-2 rounded-full font-medium ${ent?.plan_id===p.id?'bg-black text-white':'bg-white text-black'}`}>{ent?.plan_id===p.id?'Current plan':'Choose plan — hosted checkout'}</button>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-white/30 mt-2">Checkout is Stripe hosted. Entitlement activates only after verified webhook — client “success” screen alone does not grant access. Grace period applies on failed payment.</div>
      </div>

      <div className="flex gap-2">
        <button onClick={async()=>{ try{ const url=await openBillingPortal(); window.location.href=url }catch(e:any){ alert(e.message)}} } className="bg-white/10 text-white text-[12px] px-4 py-2 rounded-full">Manage billing → Stripe portal</button>
        <button onClick={()=>alert('Delete account request — admin will process within 7 days per GDPR/CCPA')} className="text-[12px] text-white/40 hover:text-white">Request delete account</button>
      </div>
      {msg && <div className="text-[12px] text-white/60">{msg}</div>}
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
        <div className="text-[12px] font-medium text-amber-300">Local data stays safe</div>
        <div className="text-[11px] text-white/70">If subscription expires, cloud AI pauses but your local workflows, settings, and files remain. Export from Settings → Memory. No deletion on expiry.</div>
      </div>
    </div>
  )
}
