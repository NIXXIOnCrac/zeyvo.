// Screen Vision — permission-scoped capture via Tauri, with preview fallback using getDisplayMedia
export type CaptureScope = 'fullscreen' | 'window' | 'foreground'
export interface CaptureResult {
  imageUrl: string // data URL
  width: number
  height: number
  dpi: number
  monitor: number
  timestamp: number
}

export interface VisionRequest {
  image: string // base64 data url or url
  prompt: string
  system?: string
}

export interface VisionResponse {
  text: string
  elements?: DetectedElement[]
}

export interface DetectedElement {
  label: string
  x: number // normalized 0..1000
  y: number
  width: number
  height: number
  confidence: number
  action?: string // UIA selector
}

export class VisionEngine {
  private permissionGranted = false
  private provider: 'openai' | 'gemini' | 'mock' = 'mock'
  private enabled = false

  setProvider(p:'openai'|'gemini'|'mock'){ this.provider=p }
  setEnabled(v:boolean){ this.enabled=v }

  async requestPermission(): Promise<boolean> {
    // On Windows: triggers Graphics Capture consent dialog via Rust
    if ('__TAURI__' in window) {
      try {
        // @ts-ignore
        const ok: boolean = await window.__TAURI__.core.invoke('screen_request_permission')
        this.permissionGranted = ok
        return ok
      } catch { return false }
    }
    // Preview: use browser getDisplayMedia (user consent)
    this.permissionGranted = true
    return true
  }

  async capture(scope: CaptureScope = 'fullscreen'): Promise<CaptureResult> {
    if (!this.permissionGranted) throw new Error('Screen capture permission required — grant in Settings → Privacy → Screen viewing, then retry.')
    if (!this.enabled) throw new Error('Screen observation disabled — enable in Settings → Privacy.')

    if ('__TAURI__' in window) {
      // @ts-ignore
      return await window.__TAURI__.core.invoke('screen_capture', { scope })
    }

    // Preview fallback: request screen share
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: scope === 'window' ? 'window' : 'monitor' } as any })
    const track = stream.getVideoTracks()[0]
    const settings = track.getSettings()
    // create offscreen canvas to snapshot
    const video = document.createElement('video')
    video.srcObject = stream
    await video.play()
    await new Promise(r=>setTimeout(r,300))
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || settings.width || 1280
    canvas.height = video.videoHeight || settings.height || 720
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video,0,0)
    stream.getTracks().forEach(t=>t.stop())
    const url = canvas.toDataURL('image/jpeg', 0.8)
    return { imageUrl: url, width: canvas.width, height: canvas.height, dpi: window.devicePixelRatio, monitor:0, timestamp:Date.now() }
  }

  async askVision(req: VisionRequest): Promise<VisionResponse> {
    // Route to configured LLM with vision capability
    const { router } = await import('../providers/router')
    const adapter = router.getAdapter()
    if (!adapter || !adapter.capabilities.includes('vision')) {
      // mock fallback that explains configuration
      if (this.provider === 'mock' || !adapter) {
        return { text: `[Vision mock] I would analyze your screen for: "${req.prompt}". To get real vision, configure an OpenAI (gpt-4o) or Gemini (1.5-flash) provider in Settings → AI Providers, enable screen permission, then click “What's on my screen?” again. Image received: ${req.image.slice(0,60)}...` }
      }
    }
    // For real providers, encode image as content part
    // OpenAI vision expects messages with array content
    const messages:any = [{ role:'user', content: [{ type:'text', text:req.prompt }, { type:'image_url', image_url:{ url:req.image }}]}]
    const res = await router.chat({ messages, maxTokens: 512 } as any)
    return { text: res.delta, elements: [] }
  }

  // Pointing: convert normalized coords to screen coords with DPI
  toScreenCoords(el: DetectedElement, capture: CaptureResult): { x:number, y:number } {
    const x = (el.x/1000)*capture.width
    const y = (el.y/1000)*capture.height
    // Apply DPI
    return { x: x * capture.dpi, y: y * capture.dpi }
  }

  // Validate before acting — never invent locations
  confidenceToAct(el?: DetectedElement): boolean {
    if (!el) return false
    return el.confidence >= 0.7
  }
}

export const visionEngine = new VisionEngine()
