// Mock adapters for cloud-first development — real interfaces, simulated backends

import type { OBSState, PlatformConnection, StreamMetadata, DetectedGame, GameDetectionState, CreatorStyleProfile, WorkflowDefinition, WorkflowRun } from '../../../../packages/shared-types/src'

// --- OBS Mock ---
export class MockOBSAdapter {
  private state: OBSState = {
    connected: false,
    streaming: false,
    recording: false,
    scenes: ['Starting Soon', 'Gameplay', 'Just Chatting', 'BRB', 'Ending', 'Privacy Shield'],
    currentScene: 'Starting Soon',
    sources: [
      { name: 'Game Capture', type: 'game_capture', visible: true },
      { name: 'Webcam', type: 'v4l2_input', visible: true },
      { name: 'Alerts', type: 'browser_source', visible: true },
      { name: 'Chat Overlay', type: 'browser_source', visible: false }
    ],
    audioSources: [
      { name: 'Mic/Aux', muted: false, volume: 0.85, level: 0.32 },
      { name: 'Desktop Audio', muted: false, volume: 0.7, level: 0.45 }
    ],
    stats: { cpuUsage: 2.3, fps: 60, renderMissed: 0, outputSkipped: 0, bitrate: 5800, droppedFrames: 0 }
  }
  private listeners: ((s: OBSState) => void)[] = []

  connect() {
    this.state = { ...this.state, connected: true }
    this.emit()
    return Promise.resolve(this.state)
  }
  disconnect() {
    this.state = { ...this.state, connected: false, streaming: false }
    this.emit()
  }
  switchScene(name: string) {
    if (!this.state.scenes.includes(name)) throw new Error(`Scene ${name} not found`)
    this.state = { ...this.state, currentScene: name }
    this.emit()
    return Promise.resolve()
  }
  toggleMute(source: string) {
    this.state = {
      ...this.state,
      audioSources: this.state.audioSources.map(a => a.name === source ? { ...a, muted: !a.muted } : a)
    }
    this.emit()
  }
  startStreaming() {
    this.state = { ...this.state, streaming: true }
    this.emit()
  }
  stopStreaming() {
    this.state = { ...this.state, streaming: false }
    this.emit()
  }
  getState() { return this.state }
  onChange(cb: (s: OBSState) => void) { this.listeners.push(cb); return () => { this.listeners = this.listeners.filter(l => l !== cb) } }
  private emit() { this.listeners.forEach(l => l(this.state)) }

  // Simulate random audio fluctuation
  simulateAudioTick() {
    this.state = {
      ...this.state,
      audioSources: this.state.audioSources.map(a => ({ ...a, level: Math.random() * 0.6 + 0.1 }))
    }
    this.emit()
  }
}

export const obsMock = new MockOBSAdapter()

// --- Platform Mocks ---
export function createMockPlatform(platform: 'twitch' | 'kick' | 'youtube', connected = false): PlatformConnection {
  const caps: Record<string,string[]> = {
    twitch: ['read:stream', 'update:title', 'update:category', 'chat:read', 'moderation'],
    kick: ['read:stream', 'update:title', 'update:category', 'chat:read'],
    youtube: ['read:stream', 'update:title', 'update:category', 'analytics:read']
  }
  return {
    platform,
    connected,
    username: connected ? `zeyvo_${platform}_user` : undefined,
    avatarUrl: connected ? `https://avatars.example.com/${platform}.jpg` : undefined,
    scopes: connected ? caps[platform] : [],
    capabilities: caps[platform],
    lastError: connected ? undefined : 'Not connected'
  }
}

export class MockPlatformAdapter {
  metadata: StreamMetadata = {
    title: 'CHILL CODING STREAM // building ZEYVO 💻',
    category: 'Software Development',
    isLive: false,
    viewerCount: 0
  }
  connections: Record<string, PlatformConnection> = {
    twitch: createMockPlatform('twitch', true),
    kick: createMockPlatform('kick', false),
    youtube: createMockPlatform('youtube', true)
  }
  connect(platform: string) {
    this.connections[platform] = { ...this.connections[platform], connected: true, username: `user_${platform}` }
  }
  disconnect(platform: string) {
    this.connections[platform] = { ...this.connections[platform], connected: false, username: undefined }
  }
  updateTitle(platform: string, title: string) {
    if (!this.connections[platform]?.connected) throw new Error(`${platform} not connected`)
    this.metadata = { ...this.metadata, title }
    return Promise.resolve(this.metadata)
  }
  updateCategory(platform: string, category: string) {
    this.metadata = { ...this.metadata, category }
    return Promise.resolve(this.metadata)
  }
}
export const platformMock = new MockPlatformAdapter()

// --- Game Detection Mock ---
export const gameDatabase: Record<string, { displayName: string; category: string }> = {
  'FortniteClient-Win64-Shipping.exe': { displayName: 'Fortnite', category: 'Fortnite' },
  'RobloxPlayerBeta.exe': { displayName: 'Roblox', category: 'Roblox' },
  'cod.exe': { displayName: 'Call of Duty', category: 'Call of Duty' },
  'VALORANT-Win64-Shipping.exe': { displayName: 'VALORANT', category: 'VALORANT' },
  'Minecraft.exe': { displayName: 'Minecraft', category: 'Minecraft' },
  'Discord.exe': { displayName: 'Discord', category: 'Discord' }
}

export class MockGameDetector {
  private current: DetectedGame | null = null
  private state: GameDetectionState = 'noGame'
  private pendingGame: DetectedGame | null = null
  private stabilityTimer?: number
  private listeners: ((g: DetectedGame | null, s: GameDetectionState) => void)[] = []

  detect(exeName: string) {
    const entry = gameDatabase[exeName]
    if (!entry) {
      this.setState('unknown', null)
      return
    }
    if (entry.displayName === 'Discord') {
      // Alt-tab to Discord should not trigger category change - require stability
      this.setState('potentialTransition', null)
      this.pendingGame = { processName: exeName, windowTitle: entry.displayName, executablePath: `C:\\...\\${exeName}`, gameId: exeName, displayName: entry.displayName, confidence: 0.6, detectedAt: Date.now() }
      // debounce 5s
      window.clearTimeout(this.stabilityTimer)
      this.stabilityTimer = window.setTimeout(() => {
        // still Discord after 5s? ignore, revert
        this.setState('gameConfirmed', this.current)
      }, 5000)
      return
    }
    const game: DetectedGame = {
      processName: exeName,
      windowTitle: entry.displayName,
      executablePath: `C:\\Games\\${exeName}`,
      gameId: exeName,
      displayName: entry.displayName,
      confidence: 0.95,
      detectedAt: Date.now()
    }
    if (!this.current || this.current.gameId !== game.gameId) {
      this.setState('potentialTransition', game)
      this.pendingGame = game
      window.clearTimeout(this.stabilityTimer)
      this.stabilityTimer = window.setTimeout(() => {
        this.setState('verifying', game)
        setTimeout(() => {
          this.current = game
          this.setState('newGameConfirmed', game)
          setTimeout(() => this.setState('updatePending', game), 300)
        }, 800)
      }, 1500)
    }
  }

  confirmUpdate() {
    if (this.state === 'updatePending' && this.pendingGame) {
      this.setState('updating', this.pendingGame)
      setTimeout(() => {
        this.current = this.pendingGame
        this.setState('completed', this.current)
        setTimeout(() => this.setState('gameConfirmed', this.current), 2000)
      }, 1200)
    }
  }

  dismissUpdate() {
    this.setState('gameConfirmed', this.current)
  }

  manualOverride(gameId: string) {
    this.setState('manualOverride', this.current)
    const entry = gameDatabase[gameId]
    if (entry) {
      this.current = { processName: gameId, windowTitle: entry.displayName, executablePath: '', gameId, displayName: entry.displayName, confidence: 1, detectedAt: Date.now() }
      this.setState('gameConfirmed', this.current)
    }
  }

  getCurrent() { return this.current }
  getState() { return this.state }
  getPending() { return this.pendingGame }
  onChange(cb: (g: DetectedGame | null, s: GameDetectionState) => void) { this.listeners.push(cb); return () => { this.listeners = this.listeners.filter(l => l !== cb) } }
  private setState(s: GameDetectionState, game: DetectedGame | null) { this.state = s; this.listeners.forEach(l => l(game ?? this.pendingGame, s)) }
}
export const gameDetector = new MockGameDetector()

// --- Creator Style ---
export const defaultCreatorStyle: CreatorStyleProfile = {
  tone: 'casual',
  capitalization: 'mixed',
  emojiFrequency: 'medium',
  maxLength: 80,
  preferredPhrases: ['POV:', 'I tried', 'No way'],
  avoidWords: ['clickbait', 'INSANE!!!!'],
  examples: [
    'PLAYING THE WORST ROBLOX HORROR GAMES 😭',
    'pov: you forgot to mute on stream',
    'FORTNITE but every kill = 1 pushup 💀'
  ]
}

export function generateTitle(gameName: string, style: CreatorStyleProfile): string {
  const templates: Record<string, string[]> = {
    Roblox: ['PLAYING THE WORST ROBLOX HORROR GAMES 😭', 'ROBLOX IS UNHINGED TODAY', 'trying cursed ROBLOX games so you dont have to'],
    Fortnite: ['FORTNITE RANKED GRIND TO UNREAL', 'no building = pain 😭 FORTNITE', 'POV: fortnite actually good again'],
    VALORANT: ['VALORANT RANKED // no tilt challenge', 'immortal lobbies are TERRIFYING 😭', 'VALORANT but chat chooses my agent'],
    Minecraft: ['MINECRAFT HARDCORE DAY 100', 'minecraft but one block randomizes', 'building until chat is impressed'],
  }
  const opts = templates[gameName] ?? [`PLAYING ${gameName.toUpperCase()} 🔥`]
  let t = opts[Math.floor(Math.random() * opts.length)]
  // apply style
  if (style.capitalization === 'upper') t = t.toUpperCase()
  if (style.capitalization === 'normal') t = t.toLowerCase()
  if (style.emojiFrequency === 'none') t = t.replace(/[^\w\s:\/]/g, '').trim()
  if (style.emojiFrequency === 'high' && !/[😭💀🔥]/.test(t)) t += ' 🔥'
  // truncate
  if (t.length > style.maxLength) t = t.slice(0, style.maxLength - 1) + '…'
  return t
}

// --- Workflow Mock ---
export const sampleWorkflow: WorkflowDefinition = {
  id: 'wf_youtube_short',
  name: 'Create YouTube Short',
  description: 'Input video → analyze → 9:16 crop → captions → export → preview → approve publish',
  version: 3,
  variables: [
    { name: 'inputVideo', type: 'file', required: true },
    { name: 'generateCaptions', type: 'boolean', defaultValue: true, required: false },
    { name: 'reviewBeforePublish', type: 'boolean', defaultValue: true, required: false }
  ],
  nodes: [
    { id: 'n_start', type: 'start', label: 'Start', config: {}, position: { x: 100, y: 100 } },
    { id: 'n_input', type: 'input', label: 'Select Video', config: { prompt: 'Ask each time' }, position: { x: 250, y: 100 } },
    { id: 'n_validate', type: 'verification', label: 'Validate File', config: { check: 'exists & readable' }, position: { x: 400, y: 100 } },
    { id: 'n_analyze', type: 'action', label: 'Analyze Footage', config: { tool: 'ffprobe' }, position: { x: 550, y: 100 } },
    { id: 'n_clips', type: 'action', label: 'Propose Clips', config: { ai: true }, position: { x: 700, y: 100 } },
    { id: 'n_crop', type: 'action', label: '9:16 Vertical Crop', config: { ffmpeg: 'crop=1080:1920' }, position: { x: 700, y: 250 } },
    { id: 'n_transcribe', type: 'action', label: 'Transcribe', config: { model: 'whisper' }, position: { x: 550, y: 250 } },
    { id: 'n_captions', type: 'action', label: 'Generate Captions', config: { style: 'bold yellow stroke' }, position: { x: 400, y: 250 } },
    { id: 'n_export', type: 'action', label: 'Export Draft', config: { ffmpeg: true }, position: { x: 250, y: 250 } },
    { id: 'n_verify', type: 'verification', label: 'Verify Export', config: {}, position: { x: 100, y: 250 } },
    { id: 'n_preview', type: 'action', label: 'Show Preview', config: {}, position: { x: 100, y: 400 } },
    { id: 'n_approval', type: 'approval', label: 'Require Approval', config: { gate: 'publish' }, position: { x: 250, y: 400 } },
    { id: 'n_done', type: 'completion', label: 'Complete', config: {}, position: { x: 400, y: 400 } }
  ],
  edges: [
    { id: 'e1', source: 'n_start', target: 'n_input' },
    { id: 'e2', source: 'n_input', target: 'n_validate' },
    { id: 'e3', source: 'n_validate', target: 'n_analyze' },
    { id: 'e4', source: 'n_analyze', target: 'n_clips' },
    { id: 'e5', source: 'n_clips', target: 'n_crop' },
    { id: 'e6', source: 'n_crop', target: 'n_transcribe' },
    { id: 'e7', source: 'n_transcribe', target: 'n_captions' },
    { id: 'e8', source: 'n_captions', target: 'n_export' },
    { id: 'e9', source: 'n_export', target: 'n_verify' },
    { id: 'e10', source: 'n_verify', target: 'n_preview' },
    { id: 'e11', source: 'n_preview', target: 'n_approval' },
    { id: 'e12', source: 'n_approval', target: 'n_done' }
  ],
  permissions: ['file:read', 'file:write', 'ffmpeg:execute'],
  createdAt: Date.now() - 1000000,
  updatedAt: Date.now()
}

// --- Voice Mock ---
export class MockVoiceEngine {
  private listening = false
  private level = 0
  private listeners: ((lvl: number) => void)[] = []
  startListening() {
    this.listening = true
    const iv = setInterval(() => {
      this.level = Math.random() * 0.9 + 0.1
      this.listeners.forEach(l => l(this.level))
      if (!this.listening) clearInterval(iv)
    }, 80)
  }
  stopListening() { this.listening = false; this.level = 0 }
  isListening() { return this.listening }
  onLevel(cb: (lvl: number) => void) { this.listeners.push(cb); return () => { this.listeners = this.listeners.filter(l => l !== cb) } }
  speak(text: string): Promise<void> {
    // simulate TTS duration based on text length
    const dur = Math.min(4000, 500 + text.length * 30)
    return new Promise(res => setTimeout(res, dur))
  }
}
export const voiceMock = new MockVoiceEngine()

// --- Teach Mode Mock ---
export interface TeachSession {
  id: string
  app: string
  actions: { type: string; label: string; timestamp: number }[]
  startedAt: number
  status: 'recording' | 'paused' | 'stopped' | 'compiling' | 'ready'
}
export class MockTeachMode {
  session: TeachSession | null = null
  start(app: string) {
    this.session = { id: 'teach_' + Date.now(), app, actions: [], startedAt: Date.now(), status: 'recording' }
    return this.session
  }
  recordAction(type: string, label: string) {
    if (this.session && this.session.status === 'recording') {
      this.session.actions.push({ type, label, timestamp: Date.now() })
    }
  }
  pause() { if (this.session) this.session.status = 'paused' }
  resume() { if (this.session) this.session.status = 'recording' }
  stop() { if (this.session) this.session.status = 'stopped' }
  compile(): WorkflowDefinition {
    if (!this.session) throw new Error('No session')
    this.session.status = 'compiling'
    const def: WorkflowDefinition = {
      id: 'wf_' + this.session.id,
      name: `Teach: ${this.session.app} task`,
      description: `Learned from demonstration in ${this.session.app} — ${this.session.actions.length} actions`,
      version: 1,
      variables: [],
      nodes: [
        { id: 'n_start', type: 'start', label: 'Start', config: {}, position: { x: 100, y: 100 } },
        ...this.session.actions.map((a, i) => ({
          id: `n_${i}`, type: 'action' as const, label: a.label, config: { actionType: a.type }, position: { x: 200 + i * 120, y: 100 }
        })),
        { id: 'n_done', type: 'completion', label: 'Done', config: {}, position: { x: 200 + this.session.actions.length * 120, y: 100 } }
      ],
      edges: [],
      permissions: ['ui:control'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    // edges linear
    const ids = def.nodes.map(n => n.id)
    for (let i = 0; i < ids.length - 1; i++) def.edges.push({ id: `e${i}`, source: ids[i], target: ids[i+1] })
    this.session.status = 'ready'
    return def
  }
}
export const teachMock = new MockTeachMode()

// --- Privacy Shield Mock ---
export const privacyRulesMock = [
  { id: 'r1', name: 'Discord DMs', protectedApps: ['Discord.exe'], protectedWindowTitles: ['Direct Messages'], protectedKeywords: ['DM'], safeScene: 'Privacy Shield', enabled: true },
  { id: 'r2', name: 'Password fields', protectedApps: ['*'], protectedWindowTitles: ['*password*', '*login*'], protectedKeywords: ['password'], safeScene: 'Privacy Shield', enabled: true },
  { id: 'r3', name: 'Personal docs', protectedApps: ['WINWORD.EXE', 'Acrobat.exe'], protectedWindowTitles: [], protectedKeywords: [], safeScene: 'Privacy Shield', enabled: true }
]

export class MockPrivacyShield {
  triggered = false
  lastTrigger?: string
  checkWindow(title: string, app: string) {
    for (const r of privacyRulesMock) {
      if (!r.enabled) continue
      const matchApp = r.protectedApps.includes(app) || r.protectedApps.includes('*')
      const titleLower = title.toLowerCase()
      const matchTitle = r.protectedWindowTitles.some(p => titleLower.includes(p.replace(/\*/g, '').toLowerCase()))
      const matchKey = r.protectedKeywords.some(k => titleLower.includes(k.toLowerCase()))
      if ((matchApp && (matchTitle || matchKey)) || (r.name === 'Personal docs' && ['WINWORD.EXE'].includes(app))) {
        this.triggered = true
        this.lastTrigger = r.name
        return r
      }
    }
    this.triggered = false
    return null
  }
}
export const privacyMock = new MockPrivacyShield()

// --- Background Task mock ---
export class MockTaskManager {
  tasks: WorkflowRun[] = []
  create(workflowId: string): WorkflowRun {
    const run: WorkflowRun = {
      id: 'run_' + Date.now(),
      workflowId,
      state: 'running',
      currentNodeId: 'n_input',
      variables: {},
      logs: [{ timestamp: Date.now(), level: 'info', message: 'Workflow started' }],
      startedAt: Date.now()
    }
    this.tasks.unshift(run)
    // simulate progression
    let idx = 0
    const nodes = sampleWorkflow.nodes.map(n => n.id)
    const iv = setInterval(() => {
      idx++
      if (idx < nodes.length) {
        run.currentNodeId = nodes[idx]
        run.logs.push({ timestamp: Date.now(), nodeId: nodes[idx], level: 'info', message: `Executed ${nodes[idx]}` })
      } else {
        run.state = 'waitingApproval'
        run.logs.push({ timestamp: Date.now(), level: 'info', message: 'Awaiting approval before publish' })
        clearInterval(iv)
      }
    }, 900)
    // cleanup after a while if component unmount? keep
    return run
  }
}
export const taskManager = new MockTaskManager()
