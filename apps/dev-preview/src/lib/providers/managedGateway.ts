// Managed AI Gateway — Windows app calls Supabase edge function, never provider directly
import { getSession } from '../supabase/client'

export type GatewayRequest = {
  feature?: string // e.g. fast_assistant, advanced_reasoning, vision
  model?: string
  messages: { role:'system'|'user'|'assistant'; content:string }[]
  stream?: boolean
}

export async function callManagedGateway(req: GatewayRequest, onChunk?: (delta:string)=>void): Promise<{ text:string; usage?:any; requestId?:string }> {
  const session = await getSession()
  if (!session) throw new Error('Not signed in — please sign in via Settings → Account & Subscription.')

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-gateway`, {
    method:'POST',
    headers:{
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type':'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'x-request-id': crypto.randomUUID()
    },
    body: JSON.stringify(req)
  })

  if (!res.ok) {
    const j = await res.json().catch(()=>({error: res.statusText}))
    // Map backend errors to user-friendly
    if (res.status===402) throw new Error(j.message || 'Subscription required — upgrade in Account & Subscription')
    if (res.status===429) throw new Error(j.message || 'Quota exceeded — upgrade or wait for renewal')
    if (res.status===503) throw new Error(j.message || 'AI gateway awaiting configuration by admin')
    throw new Error(j.error || j.message || `Gateway error ${res.status}`)
  }

  // Streaming via SSE? For now handle JSON
  if (req.stream && res.body) {
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let full=''
    while(true){
      const { value, done } = await reader.read()
      if(done) break
      const chunk = dec.decode(value,{stream:true})
      full+=chunk
      onChunk?.(chunk)
    }
    return { text: full }
  }

  const j = await res.json()
  return { text: j.text, usage: j.usage, requestId: j.requestId }
}
