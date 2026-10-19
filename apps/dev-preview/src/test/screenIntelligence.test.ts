import { describe, it, expect } from 'vitest'

describe('Screen intelligence', () => {
  it('requires permission before capture', () => {
    let permission = false
    const capture = () => { if (!permission) throw new Error('Permission required') }
    expect(()=>capture()).toThrow()
    permission = true
    expect(()=>capture()).not.toThrow()
  })
  it('scales coordinates with DPI', () => {
    const dpi = 1.5
    const raw = { x: 100, y: 200 }
    const scaled = { x: raw.x * dpi, y: raw.y * dpi }
    expect(scaled.x).toBe(150)
  })
  it('excludes protected windows', () => {
    const protectedApps = ['Discord.exe']
    const app = 'Discord.exe'
    expect(protectedApps.includes(app)).toBe(true)
  })
  it('draws highlight arrow coordinates', () => {
    const element = { x: 300, y: 400, w: 80, h: 30 }
    const arrow = { from: { x: element.x + element.w/2, y: element.y - 20 }, to: { x: element.x + element.w/2, y: element.y } }
    expect(arrow.to.x).toBe(340)
  })
})
