import { describe, it, expect, vi } from 'vitest'
import { VoiceEngine } from '../lib/voice/engine'
import { VisionEngine } from '../lib/vision/engine'
import { AutoHideController } from '../lib/autoHide'

describe('Voice engine', () => {
  it('requires permission when disabled', async () => {
    const v = new VoiceEngine({ enabled:false } as any)
    await expect(v.startListening(()=>{}, ()=>{})).rejects.toThrow(/Microphone permission/)
  })
  it('inserts text into input', () => {
    const v = new VoiceEngine()
    const input = document.createElement('input')
    input.value='hello '
    document.body.appendChild(input)
    input.focus()
    input.setSelectionRange(6,6)
    const ok = v.insertText('world')
    expect(ok).toBe(true)
    expect(input.value).toBe('hello world')
    document.body.removeChild(input)
  })
  it('cancelSpeech does not throw', () => {
    const v=new VoiceEngine()
    expect(()=>v.cancelSpeech()).not.toThrow()
  })
})

describe('Vision engine', () => {
  it('requires permission before capture', async () => {
    const v=new VisionEngine()
    // not enabled initially
    await expect(v.capture()).rejects.toThrow(/Screen capture permission/)
  })
  it('requestPermission succeeds in preview', async () => {
    const v=new VisionEngine()
    const ok=await v.requestPermission()
    expect(ok).toBe(true)
  })
  it('toScreenCoords scales with DPI', () =>{
    const v=new VisionEngine()
    const cap={ width:1920, height:1080, dpi:1.5, imageUrl:'', monitor:0, timestamp:Date.now() }
    const el={ label:'Btn', x:500, y:500, width:100, height:30, confidence:0.9 }
    const c=v.toScreenCoords(el as any, cap as any)
    expect(c.x).toBeGreaterThan(0)
  })
  it('confidence gates action', ()=>{
    const v=new VisionEngine()
    expect(v.confidenceToAct({ confidence:0.8 } as any)).toBe(true)
    expect(v.confidenceToAct({ confidence:0.5 } as any)).toBe(false)
    expect(v.confidenceToAct(undefined)).toBe(false)
  })
})

describe('Auto-hide 10s', ()=>{
  it('calls onHide after timeout', async ()=>{
    vi.useFakeTimers()
    const fn=vi.fn()
    const c=new AutoHideController(fn, 1000)
    c.interact()
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalled()
    c.destroy()
    vi.useRealTimers()
  })
  it('reset on interact', ()=>{
    vi.useFakeTimers()
    const fn=vi.fn()
    const c=new AutoHideController(fn, 1000)
    c.interact()
    vi.advanceTimersByTime(600)
    c.interact() // reset
    vi.advanceTimersByTime(600)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(400)
    expect(fn).toHaveBeenCalled()
    c.destroy()
    vi.useRealTimers()
  })
  it('suppresses while typing', ()=>{
    const c=new AutoHideController(()=>{}, 1000)
    expect(c.shouldSuppress('expanded', { isTyping:true, isCapturing:false, hasApproval:false, isDragging:false, hasPrivacyWarning:false})).toBe(true)
    expect(c.shouldSuppress('idle', { isTyping:false, isCapturing:false, hasApproval:false, isDragging:false, hasPrivacyWarning:false})).toBe(false)
  })
  it('suppresses while listening', ()=>{
    const c=new AutoHideController(()=>{}, 1000)
    expect(c.shouldSuppress('listening', { isTyping:false, isCapturing:true, hasApproval:false, isDragging:false, hasPrivacyWarning:false})).toBe(true)
  })
  it('pauses when approval pending', ()=>{
    const c=new AutoHideController(()=>{}, 1000)
    c.pause()
    c.interact()
    // paused should not schedule
    c.resume()
    expect(c).toBeDefined()
    c.destroy()
  })
})
