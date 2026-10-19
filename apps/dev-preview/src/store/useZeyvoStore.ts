import { create } from 'zustand'
import type { NotchState, ApprovalCard, OBSState, StreamMetadata, PlatformConnection, DetectedGame, GameDetectionState, WorkflowDefinition, WorkflowRun, CreatorStyleProfile, AppSettings } from '../../../../packages/shared-types/src'
import { getNextState, reduceContext, type NotchEvent, type NotchContext, initialContext } from '../lib/notchMachine'
import { obsMock, platformMock, gameDetector, defaultCreatorStyle, generateTitle, sampleWorkflow, voiceMock } from '../lib/mockAdapters'
import { router as providerRouter } from '../lib/providers/router'
import { visionEngine } from '../lib/vision/engine'
import { automationEngine } from '../lib/automation/engine'
import { obsAdapter } from '../lib/obs/adapter'
import { workflowRuntime } from '../lib/workflowRuntime/runtime'

const defaultSettings: AppSettings = {
  appearance: {
    theme: 'dark',
    accent: '#0a84ff',
    scale: 1,
    reducedMotion: false,
    notchPosition: 'top-center',
    showCharacter: false,
    characterScale: 1
  },
  behavior: {
    launchAtStartup: false,
    startMinimized: true,
    closeToTray: true,
    globalHotkey: 'Ctrl+Alt+Z',
    pushToTalkKey: 'Space',
    wakePhrase: 'Hey Zeyvo',
    handsFree: false
  },
  voice: {
    provider: 'local',
    voiceId: 'default',
    speed: 1,
    volume: 1
  },
  privacy: {
    screenObservationEnabled: false,
    computerControlEnabled: false,
    privacyShieldEnabled: true,
    protectedRules: []
  },
  stream: {
    obsAutoConnect: false,
    approvalPolicy: { streamTitles: 'askThenAct', categories: 'askThenAct', obsSceneChanges: 'askThenAct', audioChanges: 'askThenAct', workflowExecution: 'askThenAct', desktopControl: 'askThenAct', chatModeration: 'askThenAct', publishing: 'askThenAct', fileModification: 'askThenAct' },
    creatorStyle: defaultCreatorStyle,
    autopilotEnabled: true,
    cohostMode: 'private'
  },
  performance: { mode: 'balanced', hardwareAcceleration: true }
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem('zeyvo_settings')
    if (raw) return { ...defaultSettings, ...JSON.parse(raw), appearance: { ...defaultSettings.appearance, ...JSON.parse(raw).appearance }, behavior: { ...defaultSettings.behavior, ...JSON.parse(raw).behavior } }
  } catch {}
  return defaultSettings
}

interface ZeyvoState {
  notchState: NotchState
  notchContext: NotchContext
  dispatch: (e: NotchEvent) => void
  setNotchState: (s: NotchState) => void

  obs: OBSState
  platforms: Record<string, PlatformConnection>
  streamMeta: StreamMetadata
  currentGame: DetectedGame | null
  gameState: GameDetectionState
  pendingGame: DetectedGame | null
  gameUpdateTitle: string | null
  cards: ApprovalCard[]
  workflows: WorkflowDefinition[]
  activeRun: WorkflowRun | null
  creatorStyle: CreatorStyleProfile
  isListening: boolean
  transcript: string
  audioLevel: number
  tasks: WorkflowRun[]
  privacyTriggered: boolean
  privacyRuleName?: string
  reducedMotion: boolean
  showCharacter: boolean
  autopilotEnabled: boolean
  approvalPolicy: { streamTitles: string; categories: string }
  settings: AppSettings
  // Chat persistence
  messages: { role:'user'|'assistant'; content:string; ts:number }[]

  init: () => void
  expand: (trigger?: string) => void
  collapse: () => void
  approveCard: (id: string) => void
  dismissCard: (id: string) => void
  triggerGameDetection: (exe: string) => void
  confirmGameUpdate: () => void
  updateTitle: (title: string) => void
  toggleOBSConnect: () => void
  startWorkflow: (id: string) => void
  setCreatorStyle: (s: CreatorStyleProfile) => void
  toggleAutopilot: () => void
  sendMessage: (text: string) => Promise<void>
  requestScreenVision: (prompt: string) => Promise<void>
  updateSettings: (patch: Partial<AppSettings>) => void
  // Expose for testing
  addCard: (c: ApprovalCard) => void
}

export const useZeyvoStore = create<ZeyvoState>((set, get) => ({
  notchState: 'idle',
  notchContext: initialContext,
  obs: obsMock.getState(),
  platforms: { ...platformMock.connections },
  streamMeta: { ...platformMock.metadata },
  currentGame: null,
  gameState: 'noGame',
  pendingGame: null,
  gameUpdateTitle: null,
  cards: [],
  workflows: [sampleWorkflow],
  activeRun: null,
  creatorStyle: defaultCreatorStyle,
  isListening: false,
  transcript: '',
  audioLevel: 0,
  tasks: [],
  privacyTriggered: false,
  reducedMotion: false,
  showCharacter: true,
  autopilotEnabled: true,
  approvalPolicy: { streamTitles: 'askThenAct', categories: 'askThenAct' },
  settings: loadSettings(),
  messages: (()=>{ try{ return JSON.parse(localStorage.getItem('zeyvo_messages')||'[]')}catch{ return []}})(),

  dispatch: (event) => {
    const { notchState, notchContext } = get()
    const next = getNextState(notchState, event)
    if (!next) return
    const newCtx = reduceContext(notchContext, event, next)
    set({ notchState: next, notchContext: newCtx })
    if (next === 'expanding') {
      setTimeout(() => get().dispatch({ type: 'EXPANDED' }), 420)
    }
    if (next === 'collapsing') {
      setTimeout(() => get().dispatch({ type: 'COLLAPSED' }), 380)
    }
    if (next === 'transcribing') {
      // real LLM flow via sendMessage will handle thinking
      setTimeout(() => get().dispatch({ type: 'THINKING' }), 300)
    }
    if (next === 'success' || next === 'warning' || next === 'error') {
      setTimeout(() => get().dispatch({ type: 'COLLAPSE' }), 2600)
    }
  },

  setNotchState: (s) => set({ notchState: s }),
  expand: () => get().dispatch({ type: 'HOTKEY' }),
  collapse: () => get().dispatch({ type: 'COLLAPSE' }),
  addCard: (c) => set(s=>({ cards: [...s.cards, c]})),
  approveCard: (id) => {
    const card = get().cards.find(c => c.id === id)
    if (!card) return
    if (card.type === 'streamTitleUpdate') {
      const newTitle = card.metadata?.proposedTitle as string
      if (newTitle) {
        platformMock.metadata = { ...platformMock.metadata, title: newTitle }
        set({ streamMeta: { ...platformMock.metadata }, cards: get().cards.filter(c => c.id !== id) })
        get().dispatch({ type: 'SUCCESS', message: `Title updated to “${newTitle}”` })
      }
    } else {
      set({ cards: get().cards.filter(c => c.id !== id) })
      get().dispatch({ type: 'SUCCESS', message: 'Approved' })
    }
  },
  dismissCard: (id) => set({ cards: get().cards.filter(c => c.id !== id) }),

  triggerGameDetection: (exe) => gameDetector.detect(exe),
  confirmGameUpdate: () => gameDetector.confirmUpdate(),
  updateTitle: (title) => {
    platformMock.metadata = { ...platformMock.metadata, title }
    set({ streamMeta: { ...platformMock.metadata } })
  },
  toggleOBSConnect: async () => {
    const s = get().obs
    if (s.connected) { obsMock.disconnect(); set({ obs: obsMock.getState() }); return }
    // Try real obsAdapter first, fallback to mock
    try {
      const real = await obsAdapter.connect()
      set({ obs: real })
    } catch {
      await obsMock.connect()
      set({ obs: obsMock.getState() })
    }
  },
  startWorkflow: async (id) => {
    const wf = get().workflows.find(w => w.id === id)
    if (!wf) return
    get().dispatch({ type: 'ACTION_START', label: wf.name })
    // Run via real runtime with progress
    const run = await workflowRuntime.run(wf, {}, (r)=>{
      set({ activeRun: r })
      if (r.state==='waitingApproval') {
        set(s=>({ cards:[...s.cards, {
          id:'card_'+Date.now(),
          type:'workflowComplete',
          title:'YouTube Short draft ready',
          description:'Preview is available. Approval required before publish.',
          actions:[{id:'open', label:'Open Preview', variant:'primary', handlerId:'open'}, {id:'view', label:'View Workflow', variant:'secondary', handlerId:'view'}],
          createdAt:Date.now(), priority:'medium'
        }]}))
        get().dispatch({ type:'APPROVAL_REQUIRED', id:'wf' })
      }
      if (r.state==='completed') get().dispatch({ type:'SUCCESS', message:'Workflow completed' })
    })
    set(s=>({ tasks:[run, ...s.tasks] }))
  },
  setCreatorStyle: (s) => set({ creatorStyle: s }),
  toggleAutopilot: () => set({ autopilotEnabled: !get().autopilotEnabled }),
  updateSettings: (patch) => {
    const next = { ...get().settings, ...patch, appearance: { ...get().settings.appearance, ...(patch as any).appearance }, behavior: { ...get().settings.behavior, ...(patch as any).behavior } }
    localStorage.setItem('zeyvo_settings', JSON.stringify(next))
    set({ settings: next })
  },
  sendMessage: async (text) => {
    const { messages } = get()
    const nextMsgs = [...messages, { role:'user' as const, content:text, ts:Date.now() }]
    set({ messages: nextMsgs, transcript: text })
    localStorage.setItem('zeyvo_messages', JSON.stringify(nextMsgs))
    // Expand and think
    if (get().notchState==='idle' || get().notchState==='collapsed') get().dispatch({ type:'EXPAND' })
    get().dispatch({ type:'THINKING' })
    try {
      // Stream via provider router
      let full=''
      const sysPrompt = `You are Zeyvo, a helpful Windows AI companion. Keep answers concise (under 120 words unless asked). You help with desktop, streaming, workflows. Today is ${new Date().toDateString()}. User loves: ${get().creatorStyle.examples.join(', ')}.`
      await providerRouter.chat({
        messages: [
          { role:'system', content: sysPrompt },
          ...nextMsgs.slice(-10).map(m=>({ role:m.role, content:m.content } as const))
        ]
      }, (chunk)=>{
        full += chunk.delta
        if (!chunk.done) set(s=>({ notchContext: { ...s.notchContext, responseText: full }}))
      })
      const assistantMsg = { role:'assistant' as const, content: full || '[No response — check provider config]', ts:Date.now() }
      const finalMsgs = [...nextMsgs, assistantMsg]
      set({ messages: finalMsgs, notchContext: { ...get().notchContext, responseText: full } })
      localStorage.setItem('zeyvo_messages', JSON.stringify(finalMsgs))
      get().dispatch({ type:'SPEAKING', text: full.slice(0,200) })
      setTimeout(()=> get().dispatch({ type:'SUCCESS', message:'Done' }), 1800)
    } catch (e:any) {
      const err = e.message || 'Provider error'
      set({ notchContext: { ...get().notchContext, responseText: `⚠️ ${err}` }})
      get().dispatch({ type:'ERROR', message: err })
    }
  },
  requestScreenVision: async (prompt) => {
    get().dispatch({ type:'ACTION_START', label:'Capturing screen…' })
    try {
      const cap = await visionEngine.capture('fullscreen')
      const res = await visionEngine.askVision({ image: cap.imageUrl, prompt })
      // Show result as card/message
      set(s=>({ cards:[...s.cards, {
        id:'vision_'+Date.now(),
        type:'privacyWarning',
        title:'Screen understanding',
        description: res.text,
        actions:[{id:'ok', label:'Got it', variant:'primary', handlerId:'ok'}],
        createdAt:Date.now(), priority:'medium'
      }]}))
      get().dispatch({ type:'SUCCESS', message:'Screen analyzed' })
    } catch (e:any) {
      const msg = e.message.includes('permission') ? 'Screen capture permission required — grant in Settings → Privacy (Screen viewing), then retry. On Windows native, Graphics Capture consent appears.' : e.message
      set(s=>({ cards:[...s.cards, { id:'err_'+Date.now(), type:'privacyWarning', title:'Cannot capture', description: msg, actions:[{id:'settings', label:'Open Settings', variant:'primary', handlerId:'settings'}], createdAt:Date.now(), priority:'high'}]}))
      get().dispatch({ type:'ERROR', message: msg.slice(0,80) })
    }
  },
  init: () => {
    obsMock.onChange((obs) => set({ obs }))
    voiceMock.onLevel((lvl) => set({ audioLevel: lvl }))
    gameDetector.onChange((game, state) => {
      const pending = gameDetector.getPending()
      const current = gameDetector.getCurrent()
      let title: string | null = null
      if (state === 'updatePending' && pending) title = generateTitle(pending.displayName, get().creatorStyle)
      set({ gameState: state, pendingGame: pending, currentGame: current, gameUpdateTitle: title })
      if (state === 'updatePending' && pending && title) {
        const policy = get().approvalPolicy.streamTitles
        if (policy === 'askThenAct') {
          set(state => ({
            cards: [...state.cards.filter(c => c.type !== 'streamTitleUpdate'), {
              id: 'game_' + Date.now(),
              type: 'streamTitleUpdate',
              title: `${pending.displayName} detected`,
              description: `Proposed title: ${title}`,
              metadata: { proposedTitle: title, game: pending.displayName },
              actions: [{ id: 'approve', label: 'Approve', variant: 'primary', handlerId: 'approve' }, { id: 'edit', label: 'Edit', variant: 'secondary', handlerId: 'edit' }, { id: 'ignore', label: 'Ignore', variant: 'ghost', handlerId: 'ignore' }],
              createdAt: Date.now(),
              priority: 'high'
            } as ApprovalCard],
            notchState: state.notchState === 'idle' || state.notchState === 'collapsed' ? 'success' : state.notchState
          }))
          if (get().notchState === 'idle') get().dispatch({ type: 'EXPAND' })
        } else if (policy === 'actAndNotify' || policy === 'automatic') {
          platformMock.metadata = { ...platformMock.metadata, title, category: pending.displayName }
          set({ streamMeta: { ...platformMock.metadata } })
          get().dispatch({ type: 'SUCCESS', message: `Auto-updated to ${pending.displayName}` })
        }
      }
      if (state === 'completed') setTimeout(() => set({ gameState: 'gameConfirmed' }), 1500)
    })
    setInterval(() => obsMock.simulateAudioTick(), 120)
    set({ notchState: 'idle' })
  }
}))
