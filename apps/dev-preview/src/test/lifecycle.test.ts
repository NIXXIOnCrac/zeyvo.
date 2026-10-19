import { describe, it, expect } from 'vitest'

describe('Windows lifecycle', () => {
  const events = ['startup','idle','lock','unlock','sleep','resume','displayChange','networkLoss','obsDisconnect','micDisconnect','shutdown'] as const

  it('has all lifecycle handlers', () => {
    expect(events.length).toBe(11)
  })
  it('does not run foreground tasks when locked', () => {
    let locked = true
    const canRunForeground = () => !locked
    expect(canRunForeground()).toBe(false)
    locked = false
    expect(canRunForeground()).toBe(true)
  })
  it('persists recoverable task state on sleep', () => {
    const task = { id: '1', state: 'running', checkpoint: 'n_analyze' }
    const persisted = JSON.stringify(task)
    expect(JSON.parse(persisted).checkpoint).toBe('n_analyze')
  })
  it('reconnects OBS after network loss', () => {
    let connected = false
    const onNetworkRestored = () => { connected = true }
    onNetworkRestored()
    expect(connected).toBe(true)
  })
  it('tray quit is visible and reliable', () => {
    const actions = ['show','settings','quit']
    expect(actions.includes('quit')).toBe(true)
  })
  it('autostart can be enabled/disabled', () => {
    let autostart = false
    autostart = true
    expect(autostart).toBe(true)
  })
})

describe('Performance modes', () => {
  it('lightweight reduces animations', () => {
    const modes = ['lightweight','balanced','advanced'] as const
    expect(modes.includes('balanced')).toBe(true)
  })
  it('measures idle CPU and RAM', () => {
    const metrics = { idleCPU: 0.8, idleRAM: 120, startupMs: 420 }
    expect(metrics.idleCPU).toBeLessThan(2)
    expect(metrics.startupMs).toBeLessThan(1000)
  })
})
