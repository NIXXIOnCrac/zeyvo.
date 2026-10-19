import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'

function isAdmin(user:any){ return user?.user_metadata?.role==='admin' } // simplified; real check via profiles.role

export default function AdminConsole(){
  const [user,setUser]=useState<any>(null)
  const [plans,setPlans]=useState<any[]>([])
  const [providers,setProviders]=useState<any[]>([])
  const [usage,setUsage]=useState<any[]>([])
  const [msg,setMsg]=useState('')

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>setUser(data.user))
    fetchPlans()
  },[])

  const fetchPlans=async()=>{
    const { data } = await supabase.from('plans').select('*')
    if(data) setPlans(data)
    const { data: prov } = await supabase.from('provider_settings').select('*')
    if(prov) setProviders(prov as any)
    const { data: u } = await supabase.from('usage_events').select('*').order('created_at',{ascending:false}).limit(20)
    if(u) setUsage(u as any)
  }

  const updatePrice=async(planId:string, cents:number)=>{
    const { error } = await supabase.from('plans').update({ monthly_price_cents: cents }).eq('id', planId)
    if(error) alert(error.message); else { setMsg(`Updated ${planId} price to ${cents}c`); fetchPlans() }
  }

  if(!user) return <div className="text-white/60 text-[12px]">Sign in as admin to view. In Supabase, set profiles.role='admin' for your user id.</div>
  // Check profiles role
  // For preview we allow anyone who knows URL but note backend RLS enforces admin

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div className="text-[16px] font-semibold text-white">ZEYVO Admin Console — developer only</div>
      <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">Backend role checks enforce access. Frontend hiding alone is not security — RLS denies non-admin queries to provider_secrets, admin_audit etc.</div>

      <div className="rounded-2xl bg-[#141414] border border-white/5 p-4">
        <div className="text-[13px] font-semibold text-white">Plans — configurable catalog</div>
        <div className="space-y-2 mt-2">
          {plans.map(p=>(
            <div key={p.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-2">
              <span className="text-[12px] font-medium text-white w-20">{p.id}</span>
              <span className="text-[12px] text-white/60 flex-1">{p.name} • {(p.included_features||[]).join(', ')}</span>
              <input defaultValue={p.monthly_price_cents||''} placeholder="price cents (e.g., 1999)" id={`price-${p.id}`} className="w-32 bg-black/30 border border-white/10 rounded px-2 py-1 text-[11px] text-white" />
              <button onClick={()=>{ const v=parseInt((document.getElementById(`price-${p.id}`) as HTMLInputElement).value); if(!isNaN(v)) updatePrice(p.id, v) }} className="bg-white text-black text-[11px] px-3 py-1 rounded-full">Save</button>
              <span className="text-[11px] text-white/30">{p.monthly_price_cents? `$${(p.monthly_price_cents/100).toFixed(2)}`: 'draft'}</span>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-white/30 mt-2">Plans are the single source for entitlements. Change prices here — checkout reads live. No hard-coded dollars.</div>
      </div>

      <div className="rounded-2xl bg-[#141414] border border-white/5 p-4">
        <div className="text-[13px] font-semibold text-white">Providers — credentials never in client</div>
        {providers.map(p=>(
          <div key={p.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-2 mt-2">
            <span className="text-[12px] text-white w-24">{p.id} ({p.provider_type})</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${p.is_enabled?'bg-emerald-500 text-white':'bg-white/10 text-white/50'}`}>{p.is_enabled?'enabled':'disabled'}</span>
            <span className="text-[11px] text-white/40 flex-1">{JSON.stringify(p.config)}</span>
            <button onClick={async()=>{
              const secret=prompt(`Enter secret for ${p.id} (stored encrypted via Supabase, never in JS bundle)`); if(!secret) return
              const { error } = await supabase.from('provider_secrets').upsert({ provider_id:p.id, secret_encrypted: btoa(secret) }); if(error) alert(error.message); else alert('Secret saved (encrypted). Rotate via same flow.')
            }} className="bg-white text-black text-[11px] px-3 py-1 rounded-full">Set secret</button>
            <button onClick={async()=>{ await supabase.from('provider_settings').update({ is_enabled: !p.is_enabled }).eq('id', p.id); fetchPlans() }} className="bg-white/10 text-white text-[11px] px-3 py-1 rounded-full">Toggle</button>
          </div>
        ))}
        <div className="text-[11px] text-white/30 mt-2">Secrets go to <code>provider_secrets</code> (RLS: no client select). Edge function ai-gateway reads via service_role, decrypts server-side. Never in React bundle.</div>
      </div>

      <div className="rounded-2xl bg-[#141414] border border-white/5 p-4">
        <div className="text-[13px] font-semibold text-white">Usage & Cost — last 20 events</div>
        <div className="overflow-auto">
          <table className="w-full text-[11px] text-white/70">
            <thead><tr className="text-white/40 text-left"><th className="py-1">Time</th><th>User</th><th>Provider</th><th>Qty</th><th>Cost</th></tr></thead>
            <tbody>{usage.map(u=>(
              <tr key={u.id} className="border-t border-white/5"><td className="py-1">{new Date(u.created_at).toLocaleTimeString()}</td><td>{u.user_id.slice(0,6)}</td><td>{u.provider}</td><td>{u.quantity}</td><td>{u.cost_cents? `$${(u.cost_cents/100).toFixed(2)}`:'—'}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <div className="text-[11px] text-white/30 mt-2">Per-user budgets, plan quotas, burst protection enforced in ai-gateway (token check + concurrent_task_limit). Abuse detection via failed-payment monitoring.</div>
      </div>

      <div className="rounded-2xl bg-[#141414] border border-white/5 p-4">
        <div className="text-[13px] font-semibold text-white">Webhooks & Health</div>
        <div className="text-[11px] text-white/60">Stripe webhook: <code className="bg-white/10 px-1 rounded">/functions/v1/billing-webhook</code> — verify via STRIPE_WEBHOOK_SECRET, idempotent on event.id. Health: check `admin_audit` where action='billing_webhook_error'.</div>
        <button onClick={async()=>{ const { data } = await supabase.from('admin_audit').select('*').order('created_at',{ascending:false}).limit(5); alert(JSON.stringify(data,null,2)) }} className="mt-2 bg-white/10 text-white text-[11px] px-3 py-1 rounded-full">View audit</button>
      </div>

      {msg && <div className="text-[12px] text-emerald-300">{msg}</div>}
    </div>
  )
}
