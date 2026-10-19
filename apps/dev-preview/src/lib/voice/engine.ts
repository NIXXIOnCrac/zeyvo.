// Voice engine — real Web Speech API + media capture, with Tauri native fallback
export type VoiceMode = 'conversation' | 'dictation' | 'editing' | 'agent' | 'stream' | 'teach'

export interface VoiceConfig {
  sttProvider: 'webspeech' | 'whisper-cloud' | 'local'
  ttsProvider: 'webspeech' | 'elevenlabs' | 'local'
  elevenLabsKey?: string
  voiceId?: string
  pitch?: number
  rate?: number
  volume?: number
  inputDeviceId?: string
  outputDeviceId?: string
  wakePhrase: string
  pushToTalkKey: string
  enabled: boolean
}

export class VoiceEngine {
  private recognition: any = null
  private listening = false
  private speaking = false
  private config: VoiceConfig
  private onTranscript: ((text:string, isFinal:boolean)=>void) | null = null
  private onLevel: ((lvl:number)=>void) | null = null
  private analyser?: AnalyserNode
  private stream?: MediaStream
  private raf?: number

  constructor(cfg: Partial<VoiceConfig> = {}) {
    this.config = {
      sttProvider: 'webspeech',
      ttsProvider: 'webspeech',
      wakePhrase: 'Hey Zeyvo',
      pushToTalkKey: 'Space',
      enabled: false,
      ...cfg
    }
  }

  setConfig(patch: Partial<VoiceConfig>) { this.config = { ...this.config, ...patch } }

  async listDevices(): Promise<MediaDeviceInfo[]> {
    try { const devs = await navigator.mediaDevices.enumerateDevices(); return devs.filter(d=>d.kind==='audioinput' || d.kind==='audiooutput') } catch { return [] }
  }

  async startListening(onTranscript:(t:string,final:boolean)=>void, onLevel?:(lvl:number)=>void): Promise<void> {
    if (this.listening) return
    if (!this.config.enabled) throw new Error('Microphone permission not granted — enable in Settings → Voice')
    this.onTranscript = onTranscript
    this.onLevel = onLevel || null
    this.listening = true

    // Try Web Speech API
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SR && this.config.sttProvider === 'webspeech') {
      this.recognition = new SR()
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = navigator.language || 'en-US'
      this.recognition.onresult = (e:any) => {
        let interim='', final=''
        for (let i=e.resultIndex;i<e.results.length;i++){
          const t=e.results[i][0].transcript
          if(e.results[i].isFinal) final+=t; else interim+=t
        }
        if (final) this.onTranscript?.(final, true)
        else if (interim) this.onTranscript?.(interim, false)
      }
      this.recognition.onerror=(e:any)=>{ console.warn('STT error',e) }
      this.recognition.start()
    }

    // Capture audio for level visualization (even when using Web Speech)
    try {
      const constraints: MediaStreamConstraints = { audio: this.config.inputDeviceId ? { deviceId:{ exact:this.config.inputDeviceId }} : true }
      this.stream = await navigator.mediaDevices.getUserMedia(constraints)
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const src = ctx.createMediaStreamSource(this.stream)
      this.analyser = ctx.createAnalyser()
      this.analyser.fftSize = 256
      src.connect(this.analyser)
      const data = new Uint8Array(this.analyser.frequencyBinCount)
      const tick=()=>{
        if(!this.listening) return
        this.analyser!.getByteFrequencyData(data)
        const avg = data.reduce((a,b)=>a+b,0)/data.length/255
        this.onLevel?.(avg)
        this.raf = requestAnimationFrame(tick)
      }
      tick()
    } catch (err) {
      console.warn('mic capture failed', err)
      throw new Error('Microphone access denied or no device. Check browser permission and Settings → Voice → Input Device.')
    }
  }

  stopListening() {
    this.listening = false
    try { this.recognition?.stop() } catch {}
    this.recognition = null
    if (this.stream) { this.stream.getTracks().forEach(t=>t.stop()); this.stream=undefined }
    if (this.raf) cancelAnimationFrame(this.raf)
    this.onTranscript=null
    this.onLevel=null
  }

  async speak(text: string, voiceId?: string): Promise<void> {
    if (this.config.ttsProvider === 'elevenlabs' && this.config.elevenLabsKey) {
      return this.speakEleven(text, voiceId)
    }
    return this.speakWeb(text, voiceId)
  }

  private speakWeb(text:string, voiceId?:string): Promise<void> {
    return new Promise((resolve, reject)=>{
      if (!('speechSynthesis' in window)) return reject(new Error('TTS not supported'))
      this.speaking = true
      const u = new SpeechSynthesisUtterance(text)
      if (voiceId) { const v = speechSynthesis.getVoices().find(v=>v.voiceURI===voiceId || v.name===voiceId); if(v) u.voice=v }
      u.rate = this.config.rate ?? 1
      u.pitch = this.config.pitch ?? 1
      u.volume = this.config.volume ?? 1
      u.onend=()=>{ this.speaking=false; resolve() }
      u.onerror=(e)=>{ this.speaking=false; reject(e) }
      speechSynthesis.speak(u)
    })
  }

  private async speakEleven(text:string, voiceId?:string): Promise<void> {
    const key = this.config.elevenLabsKey
    if (!key) throw new Error('ElevenLabs key missing')
    const vid = voiceId || this.config.voiceId || '21m00Tcm4TlvDq8ikWAM'
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
      method:'POST', headers:{ 'xi-api-key': key, 'Content-Type':'application/json' }, body: JSON.stringify({ text, model_id:'eleven_monolingual_v1' })
    })
    if(!res.ok) throw new Error(`ElevenLabs ${res.status}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    if (this.config.outputDeviceId && 'setSinkId' in audio) await (audio as any).setSinkId(this.config.outputDeviceId)
    this.speaking=true
    await new Promise<void>((res,rej)=>{ audio.onended=()=>{this.speaking=false; res()}; audio.onerror=e=>{this.speaking=false; rej(e)}; audio.play() })
  }

  cancelSpeech(){ try{ speechSynthesis.cancel()}catch{}; this.speaking=false }
  isListening(){ return this.listening }
  isSpeaking(){ return this.speaking }

  // Dictation insertion — attempts to insert into focused editable element via execCommand/insertText
  insertText(text: string): boolean {
    const el = document.activeElement as HTMLElement
    if (!el) return false
    // For contenteditable / input / textarea in Zeyvo's own dashboard we can insert
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const start = el.selectionStart ?? el.value.length
      const end = el.selectionEnd ?? el.value.length
      el.value = el.value.slice(0,start) + text + el.value.slice(end)
      el.dispatchEvent(new Event('input', { bubbles:true }))
      el.setSelectionRange(start+text.length, start+text.length)
      return true
    }
    if (el.isContentEditable) {
      document.execCommand('insertText', false, text)
      return true
    }
    // For external OS focused field, we would need Tauri to send keys (Windows SendInput via Rust)
    // Expose invoke for that path
    if ('__TAURI__' in window) {
      // @ts-ignore
      window.__TAURI__.core.invoke('voice_insert_text', { text }).catch(()=>{})
      return true
    }
    return false
  }
}

export const voiceEngine = new VoiceEngine()
