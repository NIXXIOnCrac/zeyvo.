import type { ProviderAdapter, ChatRequest, ChatChunk, ProviderConfig } from './types'

export class OllamaAdapter implements ProviderAdapter {
  id:any='ollama'; name='Ollama (local)'; capabilities:ProviderAdapter['capabilities']=['chat','stream']
  constructor(private cfg:ProviderConfig){}
  private base(){ return (this.cfg.endpoint||'http://localhost:11434').replace(/\/$/,'') }
  async chat(req:ChatRequest, signal?:AbortSignal):Promise<ChatChunk>{
    const res=await fetch(`${this.base()}/api/chat`,{ method:'POST', signal, headers:{'Content-Type':'application/json'}, body:JSON.stringify({ model: req.model||this.cfg.model||'llama3.1', messages: req.messages.filter(m=>m.role!=='tool').map(m=>({role:m.role, content:m.content})), stream:false })})
    if(!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}. Is Ollama running?`)
    const j=await res.json()
    return { delta: j.message?.content||'', done:true }
  }
  async chatStream(req:ChatRequest, onChunk:(c:ChatChunk)=>void, signal?:AbortSignal):Promise<ChatChunk>{
    const res=await fetch(`${this.base()}/api/chat`,{ method:'POST', signal, headers:{'Content-Type':'application/json'}, body:JSON.stringify({ model:req.model||this.cfg.model||'llama3.1', messages:req.messages, stream:true })})
    if(!res.ok) throw new Error(`Ollama ${res.status}`)
    const reader=res.body!.getReader(); const dec=new TextDecoder(); let full=''
    while(true){ const {value,done}=await reader.read(); if(done) break; const lines=dec.decode(value,{stream:true}).split('\n').filter(Boolean); for(const l of lines){ try{ const j=JSON.parse(l); const d=j.message?.content||''; if(d){full+=d; onChunk({delta:d,done:false})}}catch{}}}
    onChunk({delta:'',done:true}); return {delta:full,done:true}
  }
  async testConnection(){ const s=Date.now(); try{ const r=await fetch(`${this.base()}/api/tags`); if(!r.ok) throw new Error(`${r.status}`); const j=await r.json(); return { ok:true, latencyMs:Date.now()-s, models: j.models?.map((m:any)=>m.name)||[] } }catch(e:any){ return {ok:false, latencyMs:Date.now()-s, error:e.message} } }
  async listModels(){ const c=await this.testConnection(); return c.models||[] }
}

export class LMStudioAdapter extends OllamaAdapter {
  constructor(cfg:ProviderConfig){ super({ ...cfg, endpoint: cfg.endpoint||'http://localhost:1234/v1' }); (this as any).id='lmstudio'; this.name='LM Studio' }
}
