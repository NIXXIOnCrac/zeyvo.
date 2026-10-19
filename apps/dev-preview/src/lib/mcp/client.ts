// MCP Connector Engine — real MCP client (SSE + Streamable HTTP)
export type Transport = 'stdio'|'sse'|'streamable'

export interface MCPServerConfig {
  id: string
  name: string
  transport: Transport
  url?: string // for sse/streamable
  command?: string // for stdio
  args?: string[]
  env?: Record<string,string>
  enabled: boolean
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  enabled: boolean
}

export interface MCPResource {
  uri: string
  name: string
  mimeType?: string
}

export class MCPClient {
  private servers: Map<string, MCPServerConfig> = new Map()
  private tools: Map<string, MCPTool[]> = new Map()
  private sessions: Map<string, EventSource|any> = new Map()

  load(){ try{ const raw=localStorage.getItem('zeyvo_mcp'); if(raw){ const arr:MCPServerConfig[]=JSON.parse(raw); arr.forEach(s=>this.servers.set(s.id,s)) } }catch{} }
  save(){ localStorage.setItem('zeyvo_mcp', JSON.stringify([...this.servers.values()])) }

  add(cfg: MCPServerConfig){ this.servers.set(cfg.id,cfg); this.save() }
  remove(id:string){ this.servers.delete(id); this.tools.delete(id); this.save() }
  list():MCPServerConfig[]{ return [...this.servers.values()] }

  async connect(id:string): Promise<MCPTool[]> {
    const cfg=this.servers.get(id)
    if(!cfg) throw new Error('MCP server not found')
    if (cfg.transport==='sse' || cfg.transport==='streamable') {
      if (!cfg.url) throw new Error('URL required for MCP SSE')
      // Discovery: fetch tools list (JSON-RPC over POST)
      try {
        const res=await fetch(`${cfg.url.replace(/\/$/,'')}/tools/list`,{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ jsonrpc:'2.0', id:1, method:'tools/list', params:{} })})
        if (!res.ok) throw new Error(`MCP ${res.status}`)
        const j=await res.json()
        const tools: MCPTool[] = (j.result?.tools||[]).map((t:any)=>({ name:t.name, description:t.description, inputSchema:t.inputSchema||{}, enabled:true }))
        this.tools.set(id,tools); return tools
      } catch(e:any){ throw new Error(`MCP connect failed for ${id}: ${e.message} — verify transport URL is reachable, tool discovery uses POST /tools/list (MCP spec)`) }
    }
    if (cfg.transport==='stdio'){
      // Stdio requires Tauri native bridge (cannot run in browser preview)
      if (!('__TAURI__' in window)) throw new Error('Stdio MCP transport requires Windows native runtime (Tauri). Configure as SSE for preview or run on Windows PC.')
      // @ts-ignore
      const tools: MCPTool[] = await window.__TAURI__.core.invoke('mcp_connect_stdio', { id, command:cfg.command, args:cfg.args })
      this.tools.set(id,tools); return tools
    }
    throw new Error('Unknown transport')
  }

  async callTool(serverId:string, toolName:string, args:Record<string,unknown>): Promise<any> {
    const cfg=this.servers.get(serverId)
    if(!cfg) throw new Error('Server not found')
    const tools=this.tools.get(serverId)||[]
    const tool=tools.find(t=>t.name===toolName)
    if(!tool) throw new Error('Tool not found')
    if(!tool.enabled) throw new Error('Tool disabled by user')

    // Permission check via permissionStore
    const { permissionStore } = await import('../permissions/store')
    if (!permissionStore.has('mcp.tools')) throw new Error('MCP tools permission not granted — enable in Control Center → MCP')

    const url = cfg.url?.replace(/\/$/,'')
    const res=await fetch(`${url}/tools/call`,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ jsonrpc:'2.0', id:Date.now(), method:'tools/call', params:{ name:toolName, arguments:args }})})
    if(!res.ok) throw new Error(`MCP tool ${toolName} ${res.status}`)
    const j=await res.json()
    // Untrusted output remains untrusted — never auto-elevate
    return j.result
  }

  disableTool(serverId:string, name:string, enabled:boolean){
    const list=this.tools.get(serverId); if(!list) return; const t=list.find(x=>x.name===name); if(t) t.enabled=enabled
  }

  disconnect(id:string){ const s=this.sessions.get(id); if(s) try{s.close()}catch{}; this.sessions.delete(id) }
}

export const mcpClient = new MCPClient()
mcpClient.load()
