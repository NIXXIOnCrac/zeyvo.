import { describe, it, expect } from 'vitest'
import { ConnectorRegistry } from '../lib/connectors/registry'
import { GmailClient } from '../lib/connectors/gmail'
import { MCPClient } from '../lib/mcp/client'

describe('Connector registry', ()=>{
  it('lists connectors', ()=>{
    const r=new ConnectorRegistry()
    expect(r.listDefs().length).toBeGreaterThan(10)
    expect(r.listDefs().find(c=>c.id==='gmail')).toBeDefined()
  })
  it('connects and disconnects', ()=>{
    const r=new ConnectorRegistry()
    r.setConnected('gmail', { username:'me', scopes:['gmail.readonly'] })
    expect(r.getState('gmail')?.connected).toBe(true)
    r.disconnect('gmail')
    expect(r.getState('gmail')?.connected).toBe(false)
  })
})

describe('Gmail client', ()=>{
  it('mockSearch returns contract data', ()=>{
    const c=new GmailClient()
    const msgs=c.mockSearch('assignment')
    expect(msgs[0].from).toContain('teacher')
    expect(msgs[0].subject).toContain('assignment')
  })
  it('requires OAuth when not connected', async ()=>{
    const c=new GmailClient()
    // delete any stored token
    localStorage.removeItem('_zeyvo_cred_oauth:gmail')
    await expect(c.search('test')).rejects.toThrow(/Gmail not connected/)
  })
})

describe('MCP client', ()=>{
  it('adds and lists servers', ()=>{
    const m=new MCPClient()
    m.add({ id:'t1', name:'Test', transport:'sse', url:'http://localhost:3001/mcp', enabled:true })
    expect(m.list().find(x=>x.id==='t1')).toBeDefined()
    m.remove('t1')
    expect(m.list().find(x=>x.id==='t1')).toBeUndefined()
  })
  it('requires URL for SSE', async ()=>{
    const m=new MCPClient()
    m.add({ id:'bad', name:'Bad', transport:'sse', enabled:true } as any)
    await expect(m.connect('bad')).rejects.toThrow(/URL required/)
  })
  it('stdio requires Tauri in preview', async ()=>{
    const m=new MCPClient()
    m.add({ id:'s1', name:'stdioTest', transport:'stdio', command:'node server.js', enabled:true })
    await expect(m.connect('s1')).rejects.toThrow(/requires Windows native/)
  })
})

describe('Permission store', ()=>{
  it('applies profile defaults', async ()=>{
    const { permissionStore } = await import('../lib/permissions/store')
    permissionStore.applyProfile('assistantOnly')
    expect(permissionStore.has('screen.view')).toBe(true)
    expect(permissionStore.has('terminal.run')).toBe(false)
    permissionStore.applyProfile('highAutonomy')
    expect(permissionStore.has('terminal.run')).toBe(true)
  })
  it('high-impact gated even in autonomy', async ()=>{
    const { permissionStore } = await import('../lib/permissions/store')
    permissionStore.applyProfile('highAutonomy')
    expect(permissionStore.canAutoAct('gmail.send', true)).toBe(false)
    expect(permissionStore.canAutoAct('gmail.send', false)).toBe(true)
  })
})

describe('Automation engine', ()=>{
  it('blocks protected targets', async ()=>{
    const { automationEngine } = await import('../lib/automation/engine')
    automationEngine.setEnabled(true)
    automationEngine.grant('appLaunch')
    await expect(automationEngine.launchApp('VALORANT')).rejects.toThrow(/protected/)
  })
  it('requires permission', async ()=>{
    const { automationEngine } = await import('../lib/automation/engine')
    automationEngine.setEnabled(true)
    // remove permission
    automationEngine.revoke('appLaunch')
    await expect(automationEngine.launchApp('OBS')).rejects.toThrow(/Permission denied/)
  })
})

describe('Workflow runtime', ()=>{
  it('dryRun validates', async ()=>{
    const { workflowRuntime } = await import('../lib/workflowRuntime/runtime')
    const { sampleWorkflow } = await import('../lib/mockAdapters')
    const r=await workflowRuntime.dryRun(sampleWorkflow)
    expect(r.ok).toBe(true)
    expect(r.steps.length).toBeGreaterThan(0)
  })
  it('compiles from teach actions', async ()=>{
    const { workflowRuntime } = await import('../lib/workflowRuntime/runtime')
    const wf=workflowRuntime.compileFromTeach([{type:'click',label:'Click Button'},{type:'type',label:'Type text'}])
    expect(wf.nodes.length).toBeGreaterThan(2)
    expect(wf.id).toContain('wf_teach')
  })
})

describe('Streaming adapters', ()=>{
  it('twitch update requires token', async ()=>{
    const { TwitchAdapter } = await import('../lib/streaming/liveAdapters')
    const a=new TwitchAdapter({ get:async()=>null, set:async()=>{} })
    await expect(a.updateTitle('new title')).rejects.toThrow(/not connected/)
  })
  it('youtube getMetadata requires token', async ()=>{
    const { YoutubeAdapter } = await import('../lib/streaming/liveAdapters')
    const a=new YoutubeAdapter({ get:async()=>null, set:async()=>{} })
    await expect(a.getMetadata()).rejects.toThrow(/not connected/)
  })
})
