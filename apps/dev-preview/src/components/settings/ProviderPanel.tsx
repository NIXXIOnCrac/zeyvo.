import { useEffect, useState } from 'react'
import { router } from '../../lib/providers/router'
import { credentialStore } from '../../lib/storage/secure'

export default function ProviderPanel(){
  const [providers, setProviders]=useState(router.listConfigs())
  const [active,setActive]=useState(router.getActive()?.id || 'mock')
  const [testRes,setTestRes]=useState<Record<string, any>>({})

  useEffect(()=>{ setProviders(router.listConfigs()); setActive(router.getActive()?.id||'mock') },[])

  const saveKey = async (id:string, key:string)=>{
    await credentialStore.set(`provider:${id}`, key)
    alert(`Key saved securely for ${id} (Windows Credential Manager in native, encrypted localStorage in preview)`)
  }

  const test = async (id:string)=>{
    setTestRes(s=>({...s,[id]:{loading:true}}))
    const r=await router.test(id)
    setTestRes(s=>({...s,[id]:r}))
  }

  return (
    <div className="space-y-4">
      <div className="text-[14px] font-semibold text-white">AI Providers</div>
      <div className="grid gap-3">
        {[
          {id:'openai', name:'OpenAI', endpoint:'https://api.openai.com/v1', models:'gpt-4o, gpt-4o-mini'},
          {id:'anthropic', name:'Anthropic', endpoint:'https://api.anthropic.com/v1', models:'claude-3-5-sonnet'},
          {id:'gemini', name:'Gemini', endpoint:'https://generativelanguage.googleapis.com/v1beta', models:'gemini-1.5-flash'},
          {id:'openrouter', name:'OpenRouter', endpoint:'https://openrouter.ai/api/v1', models:'auto'},
          {id:'ollama', name:'Ollama (local)', endpoint:'http://localhost:11434', models:'llama3.1 (run ollama pull)'},
          {id:'lmstudio', name:'LM Studio', endpoint:'http://localhost:1234/v1', models:'local gguf'},
          {id:'mock', name:'Mock (dev)', endpoint:'—', models:'mock-gpt'},
        ].map(p=>{
          const cfg=providers.find(x=>x.id===p.id)
          return (
            <div key={p.id} className={`rounded-xl border p-3 ${active===p.id?'bg-white text-black border-white':'bg-white/[0.04] border-white/10 text-white'}`}>
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-medium">{p.name} <span className="text-[11px] opacity-60">{p.endpoint}</span></div>
                <button onClick={()=>{ router.setActive(p.id); setActive(p.id as any)}} className={`text-[11px] px-2.5 py-1 rounded-full ${active===p.id?'bg-black text-white':'bg-white text-black'}`}>{active===p.id?'Active':'Use'}</button>
              </div>
              <div className="text-[11px] opacity-70 mt-1">Models: {p.models} • {testRes[p.id]?.ok?'✅ connected':testRes[p.id]?.error||'not tested'}</div>
              {p.id!=='mock' && p.id!=='ollama' && p.id!=='lmstudio' && (
                <div className="flex gap-2 mt-2">
                  <input id={`key-${p.id}`} placeholder="API key (stored securely)" type="password" className="flex-1 bg-black/10 border border-black/10 rounded-lg px-2 py-1.5 text-[12px] placeholder:opacity-50" />
                  <button onClick={()=>{ const v=(document.getElementById(`key-${p.id}`) as HTMLInputElement).value; if(v) saveKey(p.id,v)}} className="bg-black text-white text-[11px] px-3 py-1 rounded-full">Save key</button>
                  <button onClick={()=>test(p.id)} className="bg-white/20 text-[11px] px-3 py-1 rounded-full">{testRes[p.id]?.loading?'Testing…':'Test'}</button>
                </div>
              )}
              {(p.id==='ollama'||p.id==='lmstudio') && (
                <div className="flex gap-2 mt-2">
                  <input placeholder="Endpoint" defaultValue={p.endpoint} className="flex-1 bg-black/5 border border-black/10 rounded-lg px-2 py-1.5 text-[12px]" />
                  <button onClick={()=>test(p.id)} className="bg-black text-white text-[11px] px-3 py-1 rounded-full">Test local</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="text-[11px] text-white/40">Keys never leave your machine. In native Windows build they go to Credential Manager. Never committed to Git.</div>
    </div>
  )
}
