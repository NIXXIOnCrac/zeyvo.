// Real streaming platform adapters — OAuth + API, with capability detection

export interface PlatformAdapter {
  platform: 'twitch'|'kick'|'youtube'
  connect(code?:string): Promise<{ username:string; scopes:string[] }>
  disconnect(): Promise<void>
  getMetadata(): Promise<{ title:string; category:string; isLive:boolean }>
  updateTitle(title:string): Promise<void>
  updateCategory(category:string): Promise<void>
  getStatus(): Promise<{ connected:boolean; lastError?:string }>
  test():Promise<{ok:boolean;error?:string}>
}

// OAuth PKCE helper (generates code_verifier/challenge)
export async function pkcePair(): Promise<{ verifier:string; challenge:string }>{
  const verifier = [...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('')
  const enc = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', enc)
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')
  return { verifier, challenge }
}

// Twitch — official API: https://dev.twitch.tv/docs/api/
export class TwitchAdapter implements PlatformAdapter {
  platform='twitch' as const
  private clientId = '' // configured via Settings → Integrations → Twitch OAuth app
  private redirectUri = 'http://localhost:5173/oauth/callback'
  constructor(private tokenStore: { get:()=>Promise<string|null>; set:(t:string)=>Promise<void> }){}
  async connect(code?:string):Promise<any>{
    if (!code) {
      const { verifier, challenge } = await pkcePair()
      sessionStorage.setItem('twitch_verifier', verifier)
      const url=`https://id.twitch.tv/oauth2/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&scope=${encodeURIComponent('channel:manage:broadcast chat:read moderation:read')}&code_challenge=${challenge}&code_challenge_method=S256`
      if ('__TAURI__' in window) { /* @ts-ignore */ await (window.__TAURI__ as any).core.invoke('open_browser', { url }) } else window.open(url,'_blank')
      return { username:'', scopes:[] }
    }
    const verifier=sessionStorage.getItem('twitch_verifier')||''
    const res=await fetch('https://id.twitch.tv/oauth2/token',{ method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({ client_id:this.clientId, client_secret:'', code, grant_type:'authorization_code', redirect_uri:this.redirectUri, code_verifier:verifier })})
    if(!res.ok) throw new Error(`Twitch token ${res.status}: ${await res.text()}`)
    const j=await res.json(); await this.tokenStore.set(j.access_token); return { username:'twitch_user', scopes: j.scope||[] }
  }
  async disconnect(){ await this.tokenStore.set('') }
  async getMetadata(){ const tok=await this.tokenStore.get(); if(!tok) throw new Error('Twitch not connected'); const res=await fetch('https://api.twitch.tv/helix/channels?broadcaster_id=me',{ headers:{ Authorization:`Bearer ${tok}`, 'Client-Id': this.clientId } }); if(!res.ok) throw new Error(`Twitch ${res.status}`); const j=await res.json(); return { title:j.data?.[0]?.title||'', category:j.data?.[0]?.game_name||'', isLive:false } }
  async updateTitle(title:string){ const tok=await this.tokenStore.get(); if(!tok) throw new Error('not connected'); const res=await fetch('https://api.twitch.tv/helix/channels?broadcaster_id=me',{ method:'PATCH', headers:{ Authorization:`Bearer ${tok}`, 'Client-Id': this.clientId, 'Content-Type':'application/json' }, body: JSON.stringify({ title }) }); if(!res.ok) throw new Error(`Twitch updateTitle ${res.status}: ${await res.text()} — verify Client ID and scope channel:manage:broadcast`) }
  async updateCategory(category:string){ const tok=await this.tokenStore.get(); if(!tok) throw new Error('not connected'); // Need game_id lookup
    const sRes=await fetch(`https://api.twitch.tv/helix/games?name=${encodeURIComponent(category)}`,{ headers:{ Authorization:`Bearer ${tok}`, 'Client-Id': this.clientId } }); if(sRes.ok){ const j=await sRes.json(); const gameId=j.data?.[0]?.id; if(gameId){ const uRes=await fetch('https://api.twitch.tv/helix/channels?broadcaster_id=me',{ method:'PATCH', headers:{ Authorization:`Bearer ${tok}`, 'Client-Id': this.clientId, 'Content-Type':'application/json' }, body: JSON.stringify({ game_id: gameId }) }); if(!uRes.ok) throw new Error(`Twitch updateCategory ${uRes.status}`); return } }
    throw new Error(`Could not resolve category "${category}" to Twitch game_id`)
  }
  async getStatus(){ const t=await this.tokenStore.get(); return { connected: !!t } }
  async test(){ try{ await this.getMetadata(); return {ok:true} }catch(e:any){ return {ok:false, error:e.message} } }
}

export class YoutubeAdapter implements PlatformAdapter {
  platform='youtube' as const
  constructor(private tokenStore:{get:()=>Promise<string|null>;set:(t:string)=>Promise<void>}){}
  async connect(_code?:string): Promise<any> { throw new Error('YouTube OAuth via Google connector — connect Gmail/YouTube in Integrations') }
  async disconnect(){ await this.tokenStore.set('') }
  async getMetadata():Promise<any>{
    const tok=await this.tokenStore.get(); if(!tok) throw new Error('YouTube not connected')
    // YouTube LiveBroadcasts list — note videoCategory vs game distinction
    const res=await fetch('https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet&broadcastStatus=active&broadcastType=all',{ headers:{ Authorization:`Bearer ${tok}` }})
    if(!res.ok) throw new Error(`YouTube ${res.status}: ${await res.text()} — distinguish categoryId (YouTube video category, e.g., 20=gaming) from game title (use liveChatId or snippet.gameTitle where available)`)
    const j=await res.json(); const item=j.items?.[0]; return { title:item?.snippet?.title||'', category:item?.snippet?.categoryId||'', isLive: !!item }
  }
  async updateTitle(title:string){
    // YouTube broadcast update requires broadcast id
    const tok=await this.tokenStore.get(); if(!tok) throw new Error('not connected')
    // fetch active broadcast first
    const list=await fetch('https://www.googleapis.com/youtube/v3/liveBroadcasts?part=id,snippet&broadcastStatus=active',{ headers:{ Authorization:`Bearer ${tok}` }})
    if(!list.ok) throw new Error(`YouTube list ${list.status}`)
    const j=await list.json(); const id=j.items?.[0]?.id; if(!id) throw new Error('No active YouTube broadcast to update')
    const res=await fetch('https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet',{ method:'PUT', headers:{ Authorization:`Bearer ${tok}`, 'Content-Type':'application/json' }, body: JSON.stringify({ id, snippet:{ title } })})
    if(!res.ok) throw new Error(`YouTube update ${res.status}: ${await res.text()}`)
  }
  async updateCategory(category:string){
    // YouTube uses categoryId (numeric) not game name — must map
    throw new Error(`YouTube category is numeric video category (e.g., 20=Gaming), not game title "${category}" — use channel's game metadata where supported, else update title only`)
  }
  async getStatus(){ const t=await this.tokenStore.get(); return { connected: !!t } }
  async test(){ try{ await this.getMetadata(); return {ok:true}}catch(e:any){ return {ok:false, error:e.message} } }
}

export class KickAdapter implements PlatformAdapter {
  platform='kick' as const
  constructor(private tokenStore:{get:()=>Promise<string|null>;set:(t:string)=>Promise<void>}){}
  async connect(_code?:string): Promise<any> { throw new Error('Kick official API is limited — see docs.kick.com. Auth via OAuth where supported; otherwise manual title/category in Kick dashboard.') }
  async disconnect(){ await this.tokenStore.set('') }
  async getMetadata(): Promise<any> { throw new Error('Kick API capability varies — verify docs.kick.com for supported title/category endpoints') }
  async updateTitle(_title:string): Promise<any> { throw new Error('Kick updateTitle — verify Kick API supports it for your app, else use manual dashboard') }
  async updateCategory(_c:string): Promise<any> { throw new Error('Kick updateCategory limited — manual may be required') }
  async getStatus(){ const t=await this.tokenStore.get(); return { connected: !!t } }
  async test(){ return { ok:false, error:'Kick API capabilities limited — see platform docs' } }
}
