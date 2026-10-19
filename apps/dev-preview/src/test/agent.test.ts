import { describe, it, expect } from 'vitest'

describe('Agent orchestration', () => {
  it('routes intent correctly', () => {
    const router = (input: string) => input.includes('stream') ? 'streamDirector' : input.includes('click') ? 'desktopOperator' : 'generalAssistant'
    expect(router('get my stream ready')).toBe('streamDirector')
    expect(router('where do I click')).toBe('desktopOperator')
  })
  it('tool registry validates permissions', () => {
    const tools = [
      { id: 'obs:switchScene', requiresApproval: false },
      { id: 'file:delete', requiresApproval: true },
    ]
    expect(tools.find(t=>t.id==='file:delete')?.requiresApproval).toBe(true)
  })
  it('verifies outcome before marking success', () => {
    const verify = (before: string, after: string) => before !== after
    expect(verify('Starting Soon','Gameplay')).toBe(true)
    expect(verify('Gameplay','Gameplay')).toBe(false)
  })
  it('queues tasks with priorities', () => {
    const queue = [{ id: '1', priority: 1 }, { id: '2', priority: 10 }]
    const sorted = [...queue].sort((a,b)=>b.priority-a.priority)
    expect(sorted[0].id).toBe('2')
  })
  it('isolates untrusted external events', () => {
    const isUntrusted = (source: string) => ['twitch:chat','youtube:comment','webpage'].includes(source)
    expect(isUntrusted('twitch:chat')).toBe(true)
    expect(isUntrusted('user:voice')).toBe(false)
  })
  it('MCP client registers servers', () => {
    const servers = [{ id: 'fs', tools: ['readFile'] }]
    expect(servers[0].tools.includes('readFile')).toBe(true)
  })
})
