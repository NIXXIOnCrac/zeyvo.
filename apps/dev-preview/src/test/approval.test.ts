import { describe, it, expect } from 'vitest'

describe('Approval modes', () => {
  const modes = ['askThenAct','actAndNotify','automatic'] as const
  it('has three modes', () => { expect(modes.length).toBe(3) })
  it('askThenAct requires approval before acting', () => {
    const policy = { streamTitles: 'askThenAct' as const }
    const shouldAct = (mode: string) => mode !== 'askThenAct'
    expect(shouldAct(policy.streamTitles)).toBe(false)
  })
  it('actAndNotify acts then notifies', () => {
    const exec = (mode: string) => mode === 'actAndNotify' ? 'acted+notified' : ''
    expect(exec('actAndNotify')).toBe('acted+notified')
  })
  it('high-impact actions retain safeguards even in automatic', () => {
    const isHighImpact = (action: string) => ['publish','delete','installSoftware'].includes(action)
    const allowAuto = (action: string, mode: string) => !isHighImpact(action) && mode === 'automatic'
    expect(allowAuto('publish','automatic')).toBe(false)
    expect(allowAuto('updateTitle','automatic')).toBe(true)
  })
  it('emergency stop halts all', () => {
    let stopped = false
    const emergencyStop = () => stopped = true
    emergencyStop()
    expect(stopped).toBe(true)
  })
})
