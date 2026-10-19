export type ControlProfile = 'assistantOnly' | 'supervised' | 'autonomous' | 'highAutonomy'

export interface PermissionDef {
  key: string
  label: string
  description: string
  category: 'screen'|'mic'|'control'|'files'|'connectors'|'streaming'|'workflow'|'mcp'
  risk: 'low'|'medium'|'high'|'critical'
  requiresApproval: boolean
}

export const PERMISSIONS: PermissionDef[] = [
  { key:'screen.view', label:'Screen viewing', description:'Allow Zeyvo to capture authorized screenshots', category:'screen', risk:'high', requiresApproval:true },
  { key:'mic.access', label:'Microphone', description:'Allow voice capture', category:'mic', risk:'medium', requiresApproval:true },
  { key:'control.keyboard', label:'Keyboard control', description:'Control keyboard', category:'control', risk:'high', requiresApproval:true },
  { key:'control.mouse', label:'Mouse control', description:'Control mouse', category:'control', risk:'high', requiresApproval:true },
  { key:'control.appLaunch', label:'Application launching', description:'Launch apps', category:'control', risk:'medium', requiresApproval:true },
  { key:'files.read', label:'Files read (approved scopes)', description:'Read files', category:'files', risk:'medium', requiresApproval:false },
  { key:'files.write', label:'Files write', description:'Write files', category:'files', risk:'high', requiresApproval:true },
  { key:'terminal.run', label:'Terminal commands', description:'Run terminal commands', category:'files', risk:'critical', requiresApproval:true },
  { key:'obs.control', label:'OBS control', description:'Control OBS', category:'streaming', risk:'medium', requiresApproval:false },
  { key:'twitch.manage', label:'Twitch metadata', description:'Manage Twitch', category:'streaming', risk:'low', requiresApproval:false },
  { key:'youtube.manage', label:'YouTube management', description:'Manage YouTube', category:'streaming', risk:'low', requiresApproval:false },
  { key:'gmail.read', label:'Gmail read', description:'Read Gmail', category:'connectors', risk:'medium', requiresApproval:true },
  { key:'gmail.send', label:'Gmail send', description:'Send Gmail', category:'connectors', risk:'high', requiresApproval:true },
  { key:'calendar.manage', label:'Calendar manage', description:'Manage Calendar', category:'connectors', risk:'medium', requiresApproval:true },
  { key:'drive.read', label:'Drive read', description:'Read Drive', category:'connectors', risk:'medium', requiresApproval:true },
  { key:'workflow.execute', label:'Workflow execution', description:'Execute workflows', category:'workflow', risk:'medium', requiresApproval:true },
  { key:'mcp.tools', label:'MCP tools', description:'Use MCP tools', category:'mcp', risk:'high', requiresApproval:true },
]

export const PROFILE_DEFAULTS: Record<ControlProfile, { grants: string[]; approval: string }> = {
  assistantOnly: { grants: ['screen.view','mic.access','files.read'], approval:'alwaysAsk' },
  supervised: { grants: ['screen.view','mic.access','control.appLaunch','files.read','obs.control','twitch.manage','gmail.read','drive.read'], approval:'askOncePerSession' },
  autonomous: { grants: ['screen.view','mic.access','control.keyboard','control.mouse','control.appLaunch','files.read','files.write','obs.control','twitch.manage','youtube.manage','gmail.read','gmail.send','calendar.manage','workflow.execute'], approval:'actAndNotify' },
  highAutonomy: { grants: PERMISSIONS.map(p=>p.key), approval:'actAutomaticallyAndLog' }
}

export class PermissionStore {
  private grants = new Map<string, { granted:boolean; scope?:string }>()
  private profile: ControlProfile = 'assistantOnly'

  load() {
    try {
      const raw = localStorage.getItem('zeyvo_permissions')
      if (raw) {
        const j = JSON.parse(raw)
        this.profile = j.profile || 'assistantOnly'
        Object.entries(j.grants||{}).forEach(([k,v]:any)=>this.grants.set(k,v))
      } else {
        this.applyProfile('assistantOnly')
      }
    } catch { this.applyProfile('assistantOnly')}
  }
  save(){
    localStorage.setItem('zeyvo_permissions', JSON.stringify({ profile:this.profile, grants: Object.fromEntries(this.grants) }))
  }
  applyProfile(p: ControlProfile){
    this.profile = p
    const def = PROFILE_DEFAULTS[p]
    PERMISSIONS.forEach(per=> this.grants.set(per.key, { granted: def.grants.includes(per.key) }))
    this.save()
  }
  set(key:string, granted:boolean, scope?:string){ this.grants.set(key, { granted, scope }); this.save() }
  has(key:string):boolean{ return this.grants.get(key)?.granted || false }
  getProfile():ControlProfile{ return this.profile }
  list(): { def:PermissionDef; granted:boolean }[] {
    return PERMISSIONS.map(def=>({ def, granted: this.has(def.key) }))
  }
  // High-impact still gated even in highAutonomy
  canAutoAct(key:string, isHighImpact:boolean):boolean{
    if (isHighImpact) return false // always require confirmation
    if (this.profile==='assistantOnly') return false
    if (this.profile==='supervised') return this.has(key) && !isHighImpact
    return this.has(key)
  }
}

export const permissionStore = new PermissionStore()
permissionStore.load()
