// Auto-hide 10s inactivity — measures Zeyvo interface inactivity only, not OS
export class AutoHideController {
  private timeoutMs: number
  private timer: number | null = null
  private paused = false
  private onHide: () => void
  private enabled = true
  visibility: 'auto10' | 'alwaysCollapsed' | 'custom' | 'hiddenUntilSummoned' | 'hideDuringFullscreen' = 'auto10'

  constructor(onHide: () => void, timeoutMs = 10_000) {
    this.onHide = onHide
    this.timeoutMs = timeoutMs
  }

  setTimeout(ms: number) { this.timeoutMs = ms; this.reset() }
  setVisibility(v: typeof this.visibility, customMs?: number) {
    this.visibility = v
    if (v === 'auto10') this.timeoutMs = 10_000
    if (v === 'custom' && customMs) this.timeoutMs = customMs
    if (v === 'alwaysCollapsed' || v === 'hiddenUntilSummoned') this.enabled = false
    else this.enabled = true
  }

  pause() { this.paused = true; this.clear() }
  resume() { this.paused = false; this.reset() }

  // Called on any Zeyvo interaction
  interact() {
    if (this.paused) return
    if (!this.enabled) return
    this.reset()
  }

  // Critical exceptions: don't hide while typing, capturing voice, approval, drag, privacy warning
  shouldSuppress(state: string, opts: { isTyping: boolean; isCapturing: boolean; hasApproval: boolean; isDragging: boolean; hasPrivacyWarning: boolean }): boolean {
    if (opts.isTyping && ['expanded','thinking','speaking'].includes(state)) return true
    if (opts.isCapturing) return true
    if (opts.hasApproval) return true
    if (opts.isDragging) return true
    if (opts.hasPrivacyWarning) return true
    if (state === 'listening' || state === 'transcribing') return true
    return false
  }

  private reset() {
    this.clear()
    if (!this.enabled || this.paused) return
    this.timer = window.setTimeout(() => {
      this.onHide()
    }, this.timeoutMs)
  }

  private clear() {
    if (this.timer) window.clearTimeout(this.timer)
    this.timer = null
  }

  destroy() { this.clear() }
}
