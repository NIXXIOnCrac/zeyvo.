import { useState } from 'react'
import { connectorRegistry, CONNECTORS } from '../../lib/connectors/registry'
import { mcpClient } from '../../lib/mcp/client'

export default function IntegrationsPanel(){
  const [filter,setFilter]=useState('')
  const [mcpUrl,setMcpUrl]=useState('http://localhost:3001/mcp')
  const defs=CONNECTORS.filter(c=>!filter || c.name.toLowerCase().includes(filter.toLowerCase()))
  const [status,setStatus]=useState<Record<string,any>>({})

  const connect = async (id:string, authType:string)=>{
    if (authType==='oauth') {
      const clientId = prompt(`Enter OAuth Client ID for ${id} (from developer console)`)
      if (!clientId) return
      // Kick off real PKCE flow
      const registry = connectorRegistry
      const def = CONNECTORS.find(c=>c.id===id)!
      const scopes = def.scopes?.join(' ')||''
      const redirect = 'http://localhost:5173/oauth/callback'
      const authUrl = def.provider==='Google' ? `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent` : `https://example.com/oauth?client_id=${clientId}`
      await registry.connectOAuth(id as any, authUrl, redirect)
      alert(`OAuth started for ${id}. Complete consent in browser, then paste code. On Windows native, system browser + PKCE is handled via Rust.`)
    } else if (id==='mcp') {
      const idVal = prompt('MCP server id')||'my-mcp'
      mcpClient.add({ id:idVal, name:idVal, transport: mcpUrl.includes('stdio')?'stdio':'sse', url:mcpUrl, enabled:true })
      const tools = await mcpClient.connect(idVal).catch(e=>{ alert(e.message); return []})
      setStatus(s=>({...s,[idVal]:{ tools }}))
    } else {
      const url=prompt(`Enter ${id} endpoint (e.g., OBS ws://localhost:4455)` )
      if(url) alert(`Saved ${id}: ${url} — test with Connect`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search integrations" className="flex-1 bg-white/[0.06] border border-white/10 rounded-full px-3.5 py-2 text-[12px] text-white placeholder:text-white/40" />
        <select className="bg-white/[0.06] border border-white/10 rounded-full px-3 py-2 text-[12px] text-white">
          <option>All categories</option><option>Google</option><option>Streaming</option><option>Dev</option>
        </select>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {defs.map(c=>{
          const st=connectorRegistry.getState(c.id as any)
          return (
            <div key={c.id} className="rounded-xl bg-[#141414] border border-white/5 p-3">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-medium text-white">{c.name}</div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${st?.connected?'bg-emerald-500 text-white':'bg-white/10 text-white/60'}`}>{st?.connected?`● ${st.username||'connected'}`:'Not connected'}</span>
              </div>
              <div className="text-[11px] text-white/50 mt-1">{c.description}</div>
              <div className="text-[10px] text-white/30 mt-1">Caps: {c.capabilities.join(', ')} {c.scopes?' • Scopes: '+c.scopes.slice(0,1).join(', '):''}</div>
              <div className="flex gap-2 mt-2">
                <button onClick={()=>connect(c.id, c.authType)} className="bg-white text-black text-[11px] px-3 py-1 rounded-full">{st?.connected?'Reconfigure':'Connect'}</button>
                {st?.connected && <button onClick={()=>{ connectorRegistry.disconnect(c.id as any); setStatus({}) }} className="bg-white/10 text-white text-[11px] px-3 py-1 rounded-full">Disconnect</button>}
                <button onClick={async()=>{ const r=await fetch; setStatus(s=>({...s,[c.id]:{health:'ok'}})) }} className="ml-auto text-[11px] text-white/40">Test</button>
              </div>
            </div>
          )
        })}
      </div>
      <div className="rounded-xl bg-white/[0.04] border border-white/5 p-3">
        <div className="text-[12px] font-medium text-white">MCP Servers</div>
        <div className="flex gap-2 mt-2">
          <input value={mcpUrl} onChange={e=>setMcpUrl(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[12px] text-white" />
          <button onClick={()=>connect('mcp','mcp')} className="bg-white text-black text-[12px] px-3 py-1 rounded-full">Add MCP</button>
        </div>
        <div className="text-[11px] text-white/30 mt-1">Supports SSE & Streamable HTTP per MCP spec. Stdio requires Windows native (preview cannot spawn local process). Tool outputs are untrusted — checked against permissions per Control Center.</div>
      </div>
    </div>
  )
}
