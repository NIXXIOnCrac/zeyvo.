export type ConnectorId = 'gmail' | 'gcalendar' | 'gdrive' | 'gdocs' | 'gsheets' | 'gcontacts' | 'github' | 'obs' | 'twitch' | 'kick' | 'youtube' | 'discord' | 'notion' | 'slack' | 'mcp'
export type AuthType = 'oauth' | 'apiKey' | 'mcp'
export interface ConnectorDef {
  id: ConnectorId
  name: string
  description: string
  provider: string
  authType: AuthType
  scopes?: string[]
  capabilities: string[]
  category: 'google'|'dev'|'streaming'|'chat'|'productivity'|'computer'|'mcp'
  docsUrl?: string
}

export const CONNECTORS: ConnectorDef[] = [
  { id:'gmail', name:'Gmail', description:'Search, read, draft and send email', provider:'Google', authType:'oauth', scopes:['https://www.googleapis.com/auth/gmail.readonly','https://www.googleapis.com/auth/gmail.send'], capabilities:['search','read','draft','send','archive'], category:'google', docsUrl:'https://developers.google.com/gmail/api' },
  { id:'gcalendar', name:'Google Calendar', description:'List, search, create events', provider:'Google', authType:'oauth', scopes:['https://www.googleapis.com/auth/calendar'], capabilities:['list','search','create','update','availability'], category:'google' },
  { id:'gdrive', name:'Google Drive', description:'Search and manage files', provider:'Google', authType:'oauth', scopes:['https://www.googleapis.com/auth/drive.file','https://www.googleapis.com/auth/drive.readonly'], capabilities:['search','read','create','update'], category:'google' },
  { id:'gdocs', name:'Google Docs', description:'Read/create docs', provider:'Google', authType:'oauth', scopes:['https://www.googleapis.com/auth/documents'], capabilities:['read','create'], category:'google' },
  { id:'gsheets', name:'Google Sheets', description:'Read/update sheets', provider:'Google', authType:'oauth', scopes:['https://www.googleapis.com/auth/spreadsheets'], capabilities:['read','update'], category:'google' },
  { id:'gcontacts', name:'Google Contacts', description:'Search contacts', provider:'Google', authType:'oauth', scopes:['https://www.googleapis.com/auth/contacts.readonly'], capabilities:['search','read'], category:'google' },
  { id:'github', name:'GitHub', description:'Repos, issues, PRs', provider:'GitHub', authType:'oauth', scopes:['repo','read:user'], capabilities:['listRepos','search','readFile','createIssue'], category:'dev' },
  { id:'obs', name:'OBS Studio', description:'Scenes, audio, stream control', provider:'OBS', authType:'apiKey', capabilities:['connect','switchScene','mute','stats','safeScene'], category:'streaming' },
  { id:'twitch', name:'Twitch', description:'Title/category, chat, moderation', provider:'Twitch', authType:'oauth', scopes:['channel:manage:broadcast','chat:read','moderation:read'], capabilities:['readTitle','updateTitle','readCategory','updateCategory'], category:'streaming' },
  { id:'kick', name:'Kick', description:'Stream metadata (where API supports)', provider:'Kick', authType:'oauth', capabilities:['readTitle','updateTitle'], category:'streaming' },
  { id:'youtube', name:'YouTube Live', description:'Title/category/analytics (verify video category vs game distinction)', provider:'YouTube', authType:'oauth', scopes:['https://www.googleapis.com/auth/youtube'], capabilities:['readTitle','updateTitle','liveState'], category:'streaming' },
  { id:'discord', name:'Discord', description:'Official API allowed actions', provider:'Discord', authType:'oauth', capabilities:['readMessages','post'], category:'chat' },
  { id:'notion', name:'Notion', description:'Pages and databases', provider:'Notion', authType:'oauth', capabilities:['read','write'], category:'productivity' },
  { id:'slack', name:'Slack', description:'Official Slack API', provider:'Slack', authType:'oauth', capabilities:['read','write'], category:'chat' },
  { id:'mcp', name:'MCP Server', description:'Custom MCP tools', provider:'MCP', authType:'mcp', capabilities:['tools','resources'], category:'mcp' },
]

export interface ConnectorState {
  id: ConnectorId
  connected: boolean
  username?: string
  scopesGranted?: string[]
  lastError?: string
  health: 'ok'|'warn'|'error'|'unknown'
  toolsEnabled: Record<string, boolean>
}

export class ConnectorRegistry {
  private states = new Map<ConnectorId, ConnectorState>()

  load(){
    try { const raw=localStorage.getItem('zeyvo_connectors'); if(raw) { const arr:ConnectorState[]=JSON.parse(raw); arr.forEach(s=>this.states.set(s.id,s)) } } catch {}
  }
  save(){ localStorage.setItem('zeyvo_connectors', JSON.stringify([...this.states.values()])) }

  listDefs(){ return CONNECTORS }

  getState(id:ConnectorId): ConnectorState | undefined { return this.states.get(id) }

  setConnected(id:ConnectorId, info:{ username?:string, scopes?:string[]}){
    this.states.set(id, { id, connected:true, username:info.username, scopesGranted:info.scopes, health:'ok', toolsEnabled:{} })
    this.save()
  }
  disconnect(id:ConnectorId){
    this.states.set(id, { id, connected:false, health:'unknown', toolsEnabled:{} })
    this.save()
  }
  // OAuth PKCE flow starter — opens system browser via Tauri or new window
  async connectOAuth(id:ConnectorId, authUrl:string, redirectUri:string){
    if ('__TAURI__' in window){
      // @ts-ignore
      await window.__TAURI__.core.invoke('oauth_start', { provider:id, authUrl, redirectUri })
    } else {
      // preview: open popup and simulate callback
      window.open(authUrl, '_blank')
      // instruct user to paste code
      const code = prompt(`OAuth for ${id}: Paste authorization code (preview simulation)`)
      if (code) {
        this.setConnected(id as any, { username:`${id}_user_preview`, scopes: CONNECTORS.find(c=>c.id===id)?.scopes })
      }
    }
  }
}

export const connectorRegistry = new ConnectorRegistry()
connectorRegistry.load()
