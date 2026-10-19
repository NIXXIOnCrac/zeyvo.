import type { ProviderAdapter, ChatRequest, ChatChunk, ProviderConfig } from './types'

export class OpenAIAdapter implements ProviderAdapter {
  id = 'openai' as const
  name = 'OpenAI'
  capabilities: ProviderAdapter['capabilities'] = ['chat','stream','tools','vision']
  constructor(private cfg: ProviderConfig, private getKey: ()=>Promise<string| null>) {}

  private base(): string { return (this.cfg.endpoint || 'https://api.openai.com/v1').replace(/\/$/,'') }

  async chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatChunk> {
    const key = await this.getKey()
    if (!key) throw new Error('OpenAI API key missing — configure in Settings → AI Providers')
    const res = await fetch(`${this.base()}/chat/completions`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: req.model || this.cfg.model || 'gpt-4o-mini',
        messages: req.messages,
        temperature: req.temperature ?? this.cfg.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? this.cfg.maxTokens,
        tools: req.tools?.map(t=>({ type:'function', function:{ name:t.name, description:t.description, parameters:t.parameters }})),
        stream: false
      })
    })
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
    const j = await res.json()
    return { delta: j.choices?.[0]?.message?.content || '', done: true, usage: j.usage }
  }

  async chatStream(req: ChatRequest, onChunk: (c:ChatChunk)=>void, signal?: AbortSignal): Promise<ChatChunk> {
    const key = await this.getKey()
    if (!key) throw new Error('OpenAI API key missing')
    const res = await fetch(`${this.base()}/chat/completions`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type':'application/json','Authorization':`Bearer ${key}` },
      body: JSON.stringify({
        model: req.model || this.cfg.model || 'gpt-4o-mini',
        messages: req.messages,
        temperature: req.temperature ?? this.cfg.temperature,
        stream: true,
        tools: req.tools?.map(t=>({ type:'function', function:{ name:t.name, description:t.description, parameters:t.parameters }}))
      })
    })
    if (!res.ok || !res.body) throw new Error(`OpenAI stream ${res.status}`)
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''
    let usage: any
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      const text = decoder.decode(value, { stream:true })
      for (const line of text.split('\n')) {
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (data === '[DONE]') continue
        try {
          const j = JSON.parse(data)
          const delta = j.choices?.[0]?.delta?.content || ''
          if (delta) { full+=delta; onChunk({ delta, done:false }) }
          if (j.usage) usage=j.usage
        } catch {}
      }
    }
    const fin = { delta:'', done:true, usage }
    onChunk(fin)
    return { delta: full, done:true, usage }
  }

  async testConnection(): Promise<{ ok:boolean; latencyMs:number; error?:string; models?:string[] }> {
    const start=Date.now()
    try {
      const key = await this.getKey()
      if (!key) return { ok:false, latencyMs:0, error:'API key missing' }
      const res = await fetch(`${this.base()}/models`, { headers:{ Authorization:`Bearer ${key}` }})
      if (!res.ok) throw new Error(`${res.status}`)
      const j=await res.json()
      return { ok:true, latencyMs: Date.now()-start, models: j.data?.map((m:any)=>m.id).slice(0,20) }
    } catch(e:any){ return { ok:false, latencyMs: Date.now()-start, error: e.message }}
  }

  async listModels(): Promise<string[]> {
    const c = await this.testConnection()
    return c.models || []
  }
}
