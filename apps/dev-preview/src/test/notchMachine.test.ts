import { describe, it, expect } from 'vitest'
import { getNextState, reduceContext, initialContext, isExpandedState, isNotificationState } from '../lib/notchMachine'

describe('Notch state machine — VoiceOS 16 states', () => {
  it('idle -> hovered on HOVER_ENTER', () => {
    expect(getNextState('idle', { type: 'HOVER_ENTER' })).toBe('hovered')
  })
  it('hovered -> idle on HOVER_LEAVE', () => {
    expect(getNextState('hovered', { type: 'HOVER_LEAVE' })).toBe('idle')
  })
  it('idle -> expanding on CLICK', () => {
    expect(getNextState('idle', { type: 'CLICK' })).toBe('expanding')
  })
  it('idle -> expanding on HOTKEY', () => {
    expect(getNextState('idle', { type: 'HOTKEY' })).toBe('expanding')
  })
  it('expanding -> expanded on EXPANDED', () => {
    expect(getNextState('expanding', { type: 'EXPANDED' })).toBe('expanded')
  })
  it('expanded -> collapsing on COLLAPSE', () => {
    expect(getNextState('expanded', { type: 'COLLAPSE' })).toBe('collapsing')
  })
  it('collapsing -> collapsed after animation', () => {
    expect(getNextState('collapsing', { type: 'COLLAPSED' })).toBe('collapsed')
  })
  it('collapsing can be interrupted by CLICK -> expanding (critical requirement)', () => {
    expect(getNextState('collapsing', { type: 'CLICK' })).toBe('expanding')
  })
  it('collapsing can be interrupted by HOTKEY', () => {
    expect(getNextState('collapsing', { type: 'HOTKEY' })).toBe('expanding')
  })
  it('listening -> transcribing', () => {
    expect(getNextState('listening', { type: 'TRANSCRIBING', text: 'hi' })).toBe('transcribing')
  })
  it('transcribing -> thinking', () => {
    expect(getNextState('transcribing', { type: 'THINKING' })).toBe('thinking')
  })
  it('thinking -> speaking', () => {
    expect(getNextState('thinking', { type: 'SPEAKING', text: 'hello' })).toBe('speaking')
  })
  it('expanded -> actionInProgress', () => {
    expect(getNextState('expanded', { type: 'ACTION_START', label: 'Doing' })).toBe('actionInProgress')
  })
  it('actionInProgress -> approvalRequested', () => {
    expect(getNextState('actionInProgress', { type: 'APPROVAL_REQUIRED', id: 'x' })).toBe('approvalRequested')
  })
  it('approvalRequested -> success', () => {
    expect(getNextState('approvalRequested', { type: 'SUCCESS', message: 'ok' })).toBe('success')
  })
  it('success -> collapsing via DISMISS', () => {
    expect(getNextState('success', { type: 'DISMISS' })).toBe('collapsing')
  })
  it('warning and error are notification states', () => {
    expect(isNotificationState('warning')).toBe(true)
    expect(isNotificationState('error')).toBe(true)
    expect(isNotificationState('success')).toBe(true)
    expect(isNotificationState('idle')).toBe(false)
  })
  it('expanded states detection', () => {
    expect(isExpandedState('expanded')).toBe(true)
    expect(isExpandedState('actionInProgress')).toBe(true)
    expect(isExpandedState('idle')).toBe(false)
  })
  it('idle -> listening via voice', () => {
    expect(getNextState('idle', { type: 'START_LISTENING' })).toBe('listening')
  })
  it('hidden -> idle on SHOW', () => {
    expect(getNextState('hidden', { type: 'SHOW' })).toBe('idle')
  })
  it('invalid transition returns null', () => {
    expect(getNextState('idle', { type: 'COLLAPSED' })).toBe(null)
  })
  it('context reduces transcript on STOP_LISTENING', () => {
    const ctx = reduceContext(initialContext, { type: 'STOP_LISTENING', transcript: 'hello' }, 'transcribing')
    expect(ctx.transcript).toBe('hello')
  })
  it('context captures response on SPEAKING', () => {
    const ctx = reduceContext(initialContext, { type: 'SPEAKING', text: 'hi there' }, 'speaking')
    expect(ctx.responseText).toBe('hi there')
  })
  it('context clears on DISMISS', () => {
    const withText = { ...initialContext, transcript: 'hi', responseText: 'hello' }
    const ctx = reduceContext(withText, { type: 'DISMISS' }, 'collapsing')
    expect(ctx.transcript).toBe('')
  })
})
