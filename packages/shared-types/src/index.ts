// ZEYVO Shared Types — canonical type definitions for all modules

export type NotchState =
  | 'hidden'
  | 'idle'
  | 'collapsed'
  | 'hovered'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'expanding'
  | 'expanded'
  | 'actionInProgress'
  | 'approvalRequested'
  | 'success'
  | 'warning'
  | 'error'
  | 'collapsing'

export type NotchTrigger = 'click' | 'hotkey' | 'voice' | 'hover' | 'api' | 'streamEvent' | 'privacyAlert'

export interface NotchContext {
  trigger?: NotchTrigger
  transcript?: string
  agentMessage?: string
  approvalCard?: ApprovalCard
}

export type CardType =
  | 'streamTitleUpdate'
  | 'obsWarning'
  | 'workflowComplete'
  | 'taskApproval'
  | 'privacyWarning'
  | 'agentProgress'
  | 'streamChecklist'
  | 'message'
  | 'voiceWaveform'

export interface ApprovalCard {
  id: string
  type: CardType
  title: string
  description?: string
  metadata?: Record<string, unknown>
  actions: CardAction[]
  createdAt: number
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface CardAction {
  id: string
  label: string
  variant: 'primary' | 'secondary' | 'destructive' | 'ghost'
  handlerId: string
}

export interface TranscriptionSegment {
  text: string
  isFinal: boolean
  confidence: number
  timestamp: number
}

export type VoiceMode = 'dictation' | 'conversation' | 'agent' | 'stream' | 'teach'

export interface VoiceState {
  mode: VoiceMode
  isListening: boolean
  isSpeaking: boolean
  transcript: string
  interimTranscript: string
  audioLevel: number
  deviceId?: string
}

export type BackgroundTaskType = 'api' | 'foreground' | 'cloud'

export interface BackgroundTask {
  id: string
  type: BackgroundTaskType
  title: string
  status: 'queued' | 'running' | 'paused' | 'verifying' | 'completed' | 'failed' | 'cancelled' | 'waitingApproval'
  progress: number
  createdAt: number
  updatedAt: number
  logs: string[]
}

export interface OBSState {
  connected: boolean
  streaming: boolean
  recording: boolean
  currentScene?: string
  scenes: string[]
  sources: OBSSource[]
  audioSources: OBSAudioSource[]
  stats?: OBSStats
  lastError?: string
}

export interface OBSSource {
  name: string
  type: string
  visible: boolean
}

export interface OBSAudioSource {
  name: string
  muted: boolean
  volume: number
  level: number
}

export interface OBSStats {
  cpuUsage: number
  fps: number
  renderMissed: number
  outputSkipped: number
  bitrate: number
  droppedFrames: number
}

export type StreamPlatform = 'twitch' | 'kick' | 'youtube'

export interface PlatformConnection {
  platform: StreamPlatform
  connected: boolean
  username?: string
  avatarUrl?: string
  scopes: string[]
  tokenExpiresAt?: number
  lastError?: string
  capabilities: string[]
}

export interface StreamMetadata {
  title: string
  category: string
  gameId?: string
  tags?: string[]
  isLive: boolean
  viewerCount?: number
}

export type GameDetectionState =
  | 'unknown'
  | 'noGame'
  | 'gameConfirmed'
  | 'potentialTransition'
  | 'verifying'
  | 'newGameConfirmed'
  | 'updatePending'
  | 'updating'
  | 'completed'
  | 'error'
  | 'manualOverride'

export interface DetectedGame {
  processName: string
  windowTitle: string
  executablePath: string
  gameId: string
  displayName: string
  confidence: number
  detectedAt: number
}

export interface CreatorStyleProfile {
  tone: 'casual' | 'formal' | 'humorous' | 'hype' | 'chill'
  capitalization: 'normal' | 'title' | 'upper' | 'mixed'
  emojiFrequency: 'none' | 'low' | 'medium' | 'high'
  maxLength: number
  preferredPhrases: string[]
  avoidWords: string[]
  examples: string[]
  platformOverrides?: Record<StreamPlatform, Partial<CreatorStyleProfile>>
}

export type ApprovalMode = 'askThenAct' | 'actAndNotify' | 'automatic'

export interface ApprovalPolicy {
  streamTitles: ApprovalMode
  categories: ApprovalMode
  obsSceneChanges: ApprovalMode
  audioChanges: ApprovalMode
  workflowExecution: ApprovalMode
  desktopControl: ApprovalMode
  chatModeration: ApprovalMode
  publishing: ApprovalMode
  fileModification: ApprovalMode
}

export interface PrivacyRule {
  id: string
  name: string
  protectedApps: string[]
  protectedWindowTitles: string[]
  protectedKeywords: string[]
  safeScene: string
  enabled: boolean
}

export interface WorkflowDefinition {
  id: string
  name: string
  description: string
  version: number
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  variables: WorkflowVariable[]
  permissions: string[]
  createdAt: number
  updatedAt: number
}

export type WorkflowNodeType =
  | 'start'
  | 'trigger'
  | 'input'
  | 'variable'
  | 'action'
  | 'apiCall'
  | 'uiAction'
  | 'condition'
  | 'loop'
  | 'wait'
  | 'approval'
  | 'verification'
  | 'retry'
  | 'errorHandler'
  | 'subWorkflow'
  | 'completion'

export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  label: string
  config: Record<string, unknown>
  position: { x: number; y: number }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  condition?: string
  label?: string
}

export interface WorkflowVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'file' | 'json'
  defaultValue?: unknown
  required: boolean
}

export type WorkflowRunState =
  | 'ready'
  | 'running'
  | 'waiting'
  | 'waitingApproval'
  | 'paused'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface WorkflowRun {
  id: string
  workflowId: string
  state: WorkflowRunState
  currentNodeId?: string
  variables: Record<string, unknown>
  logs: WorkflowLogEntry[]
  startedAt: number
  completedAt?: number
  error?: string
}

export interface WorkflowLogEntry {
  timestamp: number
  nodeId?: string
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
}

export interface AgentTool {
  id: string
  name: string
  description: string
  scope: string
  requiresApproval: boolean
  sideEffect: 'none' | 'read' | 'write' | 'destructive'
  inputSchema: Record<string, unknown>
}

export interface MemoryEntry {
  id: string
  category: 'writingStyle' | 'creatorStyle' | 'appPrefs' | 'voice' | 'streamPrefs' | 'workflows' | 'agentPrefs' | 'instructions'
  key: string
  value: unknown
  createdAt: number
  updatedAt: number
}

export interface AppSettings {
  appearance: {
    theme: 'dark' | 'light' | 'system'
    accent: string
    scale: number
    reducedMotion: boolean
    notchPosition: 'top-center' | 'top-left' | 'top-right'
    showCharacter: boolean
    characterScale: number
    notchVisibility?: 'auto10' | 'alwaysCollapsed' | 'custom' | 'hiddenUntilSummoned' | 'hideDuringFullscreen'
    autoHideTimeoutMs?: number
    notchSize?: 'small' | 'medium' | 'large'
    topEdgeReveal?: boolean
    showOverFullscreen?: boolean
  }
  behavior: {
    launchAtStartup: boolean
    startMinimized: boolean
    closeToTray: boolean
    globalHotkey: string
    pushToTalkKey: string
    wakePhrase: string
    handsFree: boolean
  }
  voice: {
    provider: 'local' | 'cloud' | 'elevenlabs'
    voiceId: string
    speed: number
    volume: number
    outputDevice?: string
    inputDevice?: string
  }
  privacy: {
    screenObservationEnabled: boolean
    computerControlEnabled: boolean
    privacyShieldEnabled: boolean
    protectedRules: PrivacyRule[]
  }
  stream: {
    obsAutoConnect: boolean
    approvalPolicy: ApprovalPolicy
    creatorStyle: CreatorStyleProfile
    autopilotEnabled: boolean
    cohostMode: 'private' | 'cohost' | 'silent'
  }
  performance: {
    mode: 'lightweight' | 'balanced' | 'advanced'
    hardwareAcceleration: boolean
  }
}
