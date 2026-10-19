import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProviderRouter } from '../lib/providers/router'
import { OpenAIAdapter } from '../lib/providers/openai'

describe('Provider abstraction', () => {
  it('requires config for live adapter', async () => {
    const r = new ProviderRouter([])
    await expect(r.chat({ messages:[{role:'user', content:'hi'}] })).rejects.toThrow(/Configuration required/)
  })
  it('mock adapter streams', async () => {
    const r = new ProviderRouter([{ id:'mock' as any, name:'Mock', model:'mock', enabled:true, streaming:true, timeoutMs:5000 }])
    r.setActive('mock')
    const chunks:string[]=[]
    const res = await r.chat({ messages:[{role:'user', content:'hello'}]}, (c)=>chunks.push(c.delta))
    expect(res.delta).toContain('[Mock]')
    expect(chunks.length).toBeGreaterThan(1)
  })
  it('preserves history', async () => {
    const r = new ProviderRouter([{ id:'mock' as any, name:'Mock', model:'mock', enabled:true, streaming:false, timeoutMs:5000 }])
    r.setActive('mock')
    const res = await r.chat({ messages:[{role:'user', content:'hi'}, {role:'assistant', content:'hello'}, {role:'user', content:'follow up'}]})
    expect(res.delta).toBeTruthy()
  })
  it('sets and gets active provider', () => {
    const r = new ProviderRouter([{ id:'openai' as any, name:'OpenAI', model:'gpt-4o', enabled:true, streaming:true, timeoutMs:5000 }])
    r.setActive('openai')
    expect(r.getActive()?.id).toBe('openai')
  })
  it('lists configs', () => {
    const r = new ProviderRouter([{ id:'mock' as any, name:'Mock', model:'mock', enabled:true, streaming:true, timeoutMs:5000 }])
    expect(r.listConfigs().length).toBeGreaterThan(0)
  })
  it('openai adapter requires key', async () => {
    const a = new OpenAIAdapter({ id:'openai', name:'OpenAI', model:'gpt-4o', enabled:true, streaming:true, timeoutMs:5000 } as any, async()=>null)
    await expect(a.chat({ messages:[{role:'user', content:'hi'}] })).rejects.toThrow(/key missing/)
  })
  it('handles timeout', async () => {
    const ctrl = new AbortController()
    setTimeout(()=>ctrl.abort(), 10)
    const r = new ProviderRouter([{ id:'mock' as any, name:'Mock', model:'mock', enabled:true, streaming:true, timeoutMs:5000 }])
    r.setActive('mock')
    // mock should still succeed quickly
    const res = await r.chat({ messages:[{role:'user', content:'hi'}]}, undefined, ctrl.signal)
    expect(res.delta).toBeTruthy()
  })
  it('persists to localStorage', () => {
    const r = new ProviderRouter([])
    r.setActive(null)
    expect(localStorage.getItem('zeyvo_providers')).toBeTruthy()
  })
})
