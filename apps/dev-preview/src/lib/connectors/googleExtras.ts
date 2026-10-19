import { loadOAuth } from '../storage/secure'

export class GoogleCalendarClient {
  private base='https://www.googleapis.com/calendar/v3'
  private async token(){ const t=await loadOAuth('gcalendar'); if(!t?.accessToken) throw new Error('Calendar not connected — Settings → Integrations → Google Calendar'); return t.accessToken }
  async listEvents(calendarId='primary', max=10){
    const tok=await this.token()
    const res=await fetch(`${this.base}/calendars/${encodeURIComponent(calendarId)}/events?maxResults=${max}&orderBy=startTime&singleEvents=true&timeMin=${new Date().toISOString()}`,{ headers:{ Authorization:`Bearer ${tok}` }})
    if(!res.ok) throw new Error(`Calendar ${res.status}`)
    const j=await res.json(); return j.items||[]
  }
  async createEvent(calendarId='primary', evt:{ summary:string; start:{dateTime:string}; end:{dateTime:string}; description?:string }){
    const tok=await this.token()
    const res=await fetch(`${this.base}/calendars/${encodeURIComponent(calendarId)}/events`,{ method:'POST', headers:{ Authorization:`Bearer ${tok}`, 'Content-Type':'application/json' }, body:JSON.stringify(evt)})
    if(!res.ok) throw new Error(`Calendar create ${res.status}: ${await res.text()}`)
    return await res.json()
  }
  async checkConflicts(start:string, end:string){
    const evts=await this.listEvents('primary',20)
    return evts.filter((e:any)=> e.start?.dateTime && e.start.dateTime < end && e.end?.dateTime > start)
  }
}
export const calendarClient = new GoogleCalendarClient()

export class GoogleDriveClient {
  private base='https://www.googleapis.com/drive/v3'
  private async token(){ const t=await loadOAuth('gdrive'); if(!t?.accessToken) throw new Error('Drive not connected'); return t.accessToken }
  async search(query:string, pageSize=10){
    const tok=await this.token()
    const res=await fetch(`${this.base}/files?q=${encodeURIComponent(query)}&pageSize=${pageSize}&fields=files(id,name,mimeType,modifiedTime)`,{ headers:{ Authorization:`Bearer ${tok}` }})
    if(!res.ok) throw new Error(`Drive ${res.status}`)
    const j=await res.json(); return j.files||[]
  }
  async readFile(fileId:string){
    const tok=await this.token()
    const res=await fetch(`${this.base}/files/${fileId}?alt=media`,{ headers:{ Authorization:`Bearer ${tok}` }})
    if(!res.ok) throw new Error(`Drive read ${res.status}`)
    return await res.text()
  }
}
export const driveClient = new GoogleDriveClient()
