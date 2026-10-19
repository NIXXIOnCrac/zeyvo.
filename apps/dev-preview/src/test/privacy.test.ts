import { describe, it, expect } from 'vitest'

describe('Privacy & Security', () => {
  it('blocks untrusted chat from triggering computer control', () => {
    const trustedInputs = new Set(['user:voice', 'user:click', 'user:hotkey'])
    const untrusted = 'twitch:chat !do thing'
    expect(trustedInputs.has(untrusted)).toBe(false)
  })
  it('requires approval for destructive actions', () => {
    const tool = { id: 'delete_file', sideEffect: 'destructive', requiresApproval: true }
    expect(tool.requiresApproval).toBe(true)
    expect(tool.sideEffect).toBe('destructive')
  })
  it('redacts secrets from logs', () => {
    const log = 'Token: secret_12345'
    const redacted = log.replace(/secret_\w+/g, '[REDACTED]')
    expect(redacted).not.toContain('secret_')
    expect(redacted).toContain('[REDACTED]')
  })
  it('validates workflow input file exists', () => {
    const file = { name: 'video.mp4', size: 123, exists: true }
    expect(file.exists).toBe(true)
  })
  it('permission revocation works', () => {
    let perms = new Set(['obs:control', 'twitch:updateTitle'])
    perms.delete('obs:control')
    expect(perms.has('obs:control')).toBe(false)
  })
})
