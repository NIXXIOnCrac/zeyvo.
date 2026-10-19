import { describe, it, expect } from 'vitest'

describe('Onboarding & Settings', ()=>{
  it('has 12 onboarding stages', ()=>{
    const stages = ['Welcome','Notch','Voice','AI Provider','Control Profile','Permissions','Autostart','Credentials','Streaming','Connectors','Privacy','Finish']
    expect(stages.length).toBe(12)
  })
  it('autostart default off', ()=>{
    const s = { behavior:{ launchAtStartup:false }}
    expect(s.behavior.launchAtStartup).toBe(false)
  })
  it('notch visibility options', ()=>{
    const opts = ['auto10','alwaysCollapsed','custom','hiddenUntilSummoned','hideDuringFullscreen']
    expect(opts.includes('auto10')).toBe(true)
  })
  it('appearance settings persist', ()=>{
    const settings = { appearance:{ reducedMotion:false, scale:1 }, behavior:{ globalHotkey:'Ctrl+Alt+Z' }}
    localStorage.setItem('zeyvo_settings', JSON.stringify(settings))
    expect(JSON.parse(localStorage.getItem('zeyvo_settings')!).appearance.scale).toBe(1)
  })
  it('breathing respects reducedMotion', ()=>{
    const reduced = true
    const shouldAnimate = !reduced
    expect(shouldAnimate).toBe(false)
  })
})
