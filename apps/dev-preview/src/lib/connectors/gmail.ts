// Gmail integration — real Gmail API when OAuth configured, contract-tested
import { loadOAuth } from '../storage/secure'

export interface GmailMessage {
  id: string
  threadId: string
  snippet: string
  subject: string
  from: string
  date: string
  body: string
  labels: string[]
}

export class GmailClient {
  private base = 'https://gmail.googleapis.com/gmail/v1/users/me'

  private async token(): Promise<string> {
    const t = await loadOAuth('gmail')
    if (!t?.accessToken) throw new Error('Gmail not connected — connect in Settings → Integrations → Gmail (OAuth PKCE).')
    return t.accessToken
  }

  async search(query: string, maxResults=10): Promise<GmailMessage[]> {
    const tok = await this.token()
    const q = encodeURIComponent(query)
    const res = await fetch(`${this.base}/messages?q=${q}&maxResults=${maxResults}`, { headers:{ Authorization:`Bearer ${tok}` }})
    if (!res.ok) throw new Error(`Gmail search ${res.status}: ${await res.text()}`)
    const j = await res.json()
    const ids: {id:string,threadId:string}[] = j.messages||[]
    const msgs: GmailMessage[] = []
    for (const {id, threadId} of ids.slice(0,maxResults)) {
      const mRes = await fetch(`${this.base}/messages/${id}?format=full`, { headers:{ Authorization:`Bearer ${tok}` }})
      if (!mRes.ok) continue
      const m = await mRes.json()
      const headers: Record<string,string> = {}
      for (const h of m.payload?.headers||[]) headers[h.name.toLowerCase()] = h.value
      msgs.push({ id, threadId, snippet: m.snippet||'', subject: headers.subject||'', from: headers.from||'', date: headers.date||'', body: m.snippet||'', labels: m.labelIds||[] })
    }
    return msgs
  }

  async readThread(threadId: string): Promise<GmailMessage[]> {
    const tok = await this.token()
    const res = await fetch(`${this.base}/threads/${threadId}`, { headers:{ Authorization:`Bearer ${tok}` }})
    if (!res.ok) throw new Error(`Gmail thread ${res.status}`)
    const j=await res.json()
    return (j.messages||[]).map((m:any)=>({ id:m.id, threadId, snippet:m.snippet, subject:'', from:'', date:'', body:m.snippet, labels:m.labelIds||[] }))
  }

  async summarize(messages: GmailMessage[]): Promise<string> {
    // Use vision provider for summarization
    const { router } = await import('../providers/router')
    const prompt = `Summarize these ${messages.length} emails succinctly. Highlight urgent, questions, commitments:\n` + messages.map(m=>`From ${m.from} Subject "${m.subject}" ${m.snippet}`).join('\n')
    const r = await router.chat({ messages:[{role:'user', content:prompt}] })
    return r.delta
  }

  async draft(to:string, subject:string, body:string): Promise<string> {
    const tok=await this.token()
    const raw = `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${body}`
    const encoded = btoa(unescape(encodeURIComponent(raw))).replace(/\+/g,'-').replace(/\//g,'_')
    const res=await fetch(`${this.base}/drafts`,{ method:'POST', headers:{ Authorization:`Bearer ${tok}`, 'Content-Type':'application/json' }, body: JSON.stringify({ message:{ raw:encoded }})})
    if(!res.ok) throw new Error(`Gmail draft ${res.status}: ${await res.text()}`)
    const j=await res.json(); return j.id
  }

  // Sending requires explicit confirmation UI (never auto-send)
  async send(draftId:string, requireConfirm=true): Promise<void> {
    if (requireConfirm) throw new Error('Send requires user confirmation — show recipient/content in notch and get approval.')
    const tok=await this.token()
    const res=await fetch(`${this.base}/drafts/send`,{ method:'POST', headers:{ Authorization:`Bearer ${tok}`, 'Content-Type':'application/json' }, body: JSON.stringify({ id:draftId })})
    if(!res.ok) throw new Error(`Gmail send ${res.status}`)
  }

  // Mock contract test helper
  mockSearch(query:string): GmailMessage[] {
    // deterministic contract test data
    return [{ id:'mock1', threadId:'t1', subject:`Re: ${query}`, from:'teacher@school.edu', date:new Date().toISOString(), snippet:'Assignment due Friday', body:'Please submit', labels:['INBOX'] }]
  }
}

export const gmailClient = new GmailClient()
