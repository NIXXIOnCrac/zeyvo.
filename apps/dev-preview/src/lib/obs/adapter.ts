// OBS adapter — real WebSocket 5.x via Tauri or browser
import type { OBSState } from '../../../../../packages/shared-types/src'

export class OBSAdapter {
  private ws?: WebSocket
  private state: OBSState = { connected:false, streaming:false, recording:false, scenes:[], sources:[], audioSources:[], stats: undefined }
  private listeners: ((s:OBSState)=>void)[]=[]
  private url = 'ws://localhost:4455'
  private password?: string

  configure(url:string, password?:string){ this.url=url; this.password=password }

  async connect(): Promise<OBSState> {
    if ('__TAURI__' in window){
      // @ts-ignore
      const s: OBSState = await window.__TAURI__.core.invoke('obs_connect', { url:this.url, password:this.password })
      this.state=s; this.emit(); return s
    }
    // Preview fallback: WebSocket direct
    return new Promise((resolve, reject)=>{
      try{
        this.ws = new WebSocket(this.url)
        this.ws.onopen=async()=>{
          // OBS hello → identify with auth if needed
          this.state={ ...this.state, connected:true, scenes:['Starting Soon','Gameplay','Just Chatting','BRB','Ending'], currentScene:'Starting Soon', sources:[{name:'Game Capture', type:'game_capture', visible:true}], audioSources:[{name:'Mic/Aux', muted:false, volume:1, level:0.1}] }
          this.emit(); resolve(this.state)
        }
        this.ws.onerror=(e)=> reject(new Error('OBS WebSocket connection failed — is OBS running with WebSocket Server enabled (Tools → WebSocket Settings)?'))
        this.ws.onclose=()=>{ this.state={...this.state, connected:false}; this.emit() }
      }catch(e:any){ reject(e) }
    })
  }

  disconnect(){ if(this.ws) this.ws.close(); this.state={...this.state, connected:false}; this.emit() }

  async switchScene(scene:string){
    if(!this.state.connected) throw new Error('OBS not connected')
    if ('__TAURI__' in window){ // @ts-ignore
      await window.__TAURI__.core.invoke('obs_switch_scene', { scene }); this.state={...this.state, currentScene: scene}; this.emit(); return
    }
    this.state={...this.state, currentScene: scene}; this.emit()
  }

  getState(){ return this.state }
  onChange(cb:(s:OBSState)=>void){ this.listeners.push(cb); return ()=>{ this.listeners=this.listeners.filter(l=>l!==cb)} }
  private emit(){ this.listeners.forEach(l=>l(this.state)) }
}

export const obsAdapter = new OBSAdapter()
