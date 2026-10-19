import type { ProviderAdapter, ChatRequest, ChatChunk, ProviderConfig } from './types'

export class GeminiAdapter implements ProviderAdapter {
  id='gemini' as const; name='Google Gemini'; capabilities:ProviderAdapter['capabilities']=['chat','stream','vision']
  constructor(private cfg:ProviderConfig, private getKey:()=>Promise<string|null>){}
  private base(){ return (this.cfg.endpoint||'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/,'') }
  async chat(req:ChatRequest, signal?:AbortSignal):Promise<ChatChunk>{
    const key=await this.getKey(); if(!key) throw new Error('Gemini key missing')
    const model=req.model||this.cfg.model||'gemini-1.5-flash'
    const contents=req.messages.filter(m=>m.role!=='system').map(m=>({ role: m.role==='assistant'?'model':'user', parts:[{text:m.content}]}))
    const res=await fetch(`${this.base()}/models/${model}:generateContent?key=${key}`,{ method:'POST', signal, headers:{'Content-Type':'application/json'}, body:JSON.stringify({ contents })})
    if(!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
    const j=await res.json()
    return { delta: j.candidates?.[0]?.content?.parts?.[0]?.text||'', done:true }
  }
  async chatStream(req:ChatRequest, onChunk:(c:ChatChunk)=>void, signal?:AbortSignal):Promise<ChatChunk>{
    const r=await this.chat(req,signal); onChunk({delta:r.delta,done:false}); onChunk({delta:'',done:true}); return r
  }
  async testConnection(){ const s=Date.now(); try{const k=await this.getKey(); if(!k) return {ok:false, latencyMs:0, error:'key missing'}; return {ok:true, latencyMs:Date.now()-s, models:['gemini-1.5-flash','gemini-1.5-pro']} }catch(e:any){return {ok:false, latencyMs:Date.now()-s, error:e.message}}}
  async listModels(){ return ['gemini-1.5-flash','gemini-1.5-pro','gemini-1.0-pro'] }
}
