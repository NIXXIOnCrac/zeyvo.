import { useState, useEffect } from 'react'
import { permissionStore, PERMISSIONS, PROFILE_DEFAULTS } from '../../lib/permissions/store'

export default function ControlCenter(){
  const [profile,setProfile]=useState(permissionStore.getProfile())
  const [list,setList]=useState(permissionStore.list())

  const apply=(p:any)=>{ permissionStore.applyProfile(p); setProfile(p); setList(permissionStore.list()) }
  const toggle=(key:string,v:boolean)=>{ permissionStore.set(key,v); setList(permissionStore.list()) }

  return (
    <div className="space-y-4">
      <div className="text-[14px] font-semibold text-white">AI Control & Permissions — Control Center</div>
      <div className="grid grid-cols-4 gap-2">
        {(['assistantOnly','supervised','autonomous','highAutonomy'] as const).map(p=>(
          <button key={p} onClick={()=>apply(p)} className={`p-3 rounded-xl border text-left ${profile===p?'bg-white text-black border-white':'bg-white/[0.04] border-white/10 text-white'}`}>
            <div className="text-[12px] font-semibold">{p}</div>
            <div className="text-[11px] opacity-70 leading-snug mt-1">{PROFILE_DEFAULTS[p].grants.length} capabilities • {PROFILE_DEFAULTS[p].approval}</div>
          </button>
        ))}
      </div>
      <div className="rounded-xl bg-[#141414] border border-white/5 p-3 space-y-2 max-h-[380px] overflow-auto">
        <div className="text-[12px] font-medium text-white">Per-category permissions (enforced in backend)</div>
        {list.map(({def,granted})=>(
          <label key={def.key} className="flex items-start gap-3 py-1.5 border-b border-white/5 last:border-0">
            <input type="checkbox" checked={granted} onChange={e=>toggle(def.key, e.target.checked)} className="mt-1" />
            <div className="flex-1">
              <div className="text-[12px] text-white flex items-center gap-2">{def.label} <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${def.risk==='critical'?'bg-red-500 text-white':def.risk==='high'?'bg-amber-500 text-black':def.risk==='medium'?'bg-yellow-500/20 text-yellow-300':'bg-white/10 text-white/60'}`}>{def.risk}</span> <span className="text-[10px] text-white/40">{def.category}</span></div>
              <div className="text-[11px] text-white/50">{def.description}</div>
            </div>
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={()=>alert('Emergency stop — all foreground automation cancelled')} className="bg-red-500 text-white text-[12px] px-4 py-2 rounded-full">⏹ Emergency Stop</button>
        <span className="text-[11px] text-white/40 py-2">High-impact actions (publish, delete, install) always require confirmation even in High Autonomy. Session/one-time/persistent scopes supported. Frontend reflects enforced backend state.</span>
      </div>
    </div>
  )
}
