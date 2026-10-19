// ZEYVO Notch State Machine — VoiceOS-inspired state orchestration
// 16 required visual states with interruptible, morphing transitions

import type { NotchState } from '../../../../packages/shared-types/src'

export type NotchEvent =
  | { type: 'HIDE' }
  | { type: 'SHOW' }
  | { type: 'HOVER_ENTER' }
  | { type: 'HOVER_LEAVE' }
  | { type: 'CLICK' }
  | { type: 'HOTKEY' }
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING'; transcript: string }
  | { type: 'TRANSCRIBING'; text: string }
  | { type: 'THINKING' }
  | { type: 'SPEAKING'; text: string }
  | { type: 'EXPAND' }
  | { type: 'EXPANDED' }
  | { type: 'ACTION_START'; label: string }
  | { type: 'APPROVAL_REQUIRED'; id: string }
  | { type: 'SUCCESS'; message: string }
  | { type: 'WARNING'; message: string }
  | { type: 'ERROR'; message: string }
  | { type: 'COLLAPSE' }
  | { type: 'COLLAPSED' }
  | { type: 'DISMISS' }
  | { type: 'RESET' }

export interface NotchContext {
  transcript: string
  responseText: string
  actionLabel?: string
  notificationMessage?: string
  lastExpandedAt?: number
  isHovered: boolean
  queueDepth: number
}

export const initialContext: NotchContext = {
  transcript: '',
  responseText: '',
  actionLabel: undefined,
  notificationMessage: undefined,
  isHovered: false,
  queueDepth: 0
}

// Deterministic state transition table
const transitions: Record<NotchState, Partial<Record<NotchEvent['type'], NotchState>>> = {
  hidden: { SHOW: 'idle', HOVER_ENTER: 'idle' },
  idle: {
    HIDE: 'hidden',
    HOVER_ENTER: 'hovered',
    CLICK: 'expanding',
    HOTKEY: 'expanding',
    START_LISTENING: 'listening',
    WARNING: 'warning',
    ERROR: 'error'
  },
  collapsed: {
    HOVER_ENTER: 'hovered',
    CLICK: 'expanding',
    HOTKEY: 'expanding',
    START_LISTENING: 'listening',
    EXPAND: 'expanding',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
  },
  hovered: {
    HOVER_LEAVE: 'idle',
    CLICK: 'expanding',
    HOTKEY: 'expanding',
    START_LISTENING: 'listening',
    HIDE: 'hidden'
  },
  listening: {
    STOP_LISTENING: 'transcribing',
    TRANSCRIBING: 'transcribing',
    DISMISS: 'collapsing',
    ERROR: 'error'
  },
  transcribing: {
    THINKING: 'thinking',
    DISMISS: 'collapsing',
    ERROR: 'error'
  },
  thinking: {
    SPEAKING: 'speaking',
    EXPAND: 'expanding',
    EXPANDED: 'expanded',
    ACTION_START: 'actionInProgress',
    APPROVAL_REQUIRED: 'approvalRequested',
    SUCCESS: 'success',
    ERROR: 'error',
    DISMISS: 'collapsing'
  },
  speaking: {
    ACTION_START: 'actionInProgress',
    APPROVAL_REQUIRED: 'approvalRequested',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    DISMISS: 'collapsing',
    COLLAPSE: 'collapsing',
    STOP_LISTENING: 'transcribing'
  },
  expanding: {
    EXPANDED: 'expanded',
    COLLAPSE: 'collapsing',
    DISMISS: 'collapsing',
    // interruptible: clicking while expanding should not flicker
    CLICK: 'expanding',
    HOTKEY: 'expanding'
  },
  expanded: {
    COLLAPSE: 'collapsing',
    DISMISS: 'collapsing',
    HIDE: 'hidden',
    ACTION_START: 'actionInProgress',
    APPROVAL_REQUIRED: 'approvalRequested',
    START_LISTENING: 'listening',
    THINKING: 'thinking',
    SPEAKING: 'speaking',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    CLICK: 'collapsing'
  },
  actionInProgress: {
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    APPROVAL_REQUIRED: 'approvalRequested',
    COLLAPSE: 'collapsing',
    DISMISS: 'collapsing'
  },
  approvalRequested: {
    SUCCESS: 'success',
    ERROR: 'error',
    ACTION_START: 'actionInProgress',
    COLLAPSE: 'collapsing',
    DISMISS: 'collapsing'
  },
  success: {
    COLLAPSE: 'collapsing',
    DISMISS: 'collapsing',
    HIDE: 'hidden',
    CLICK: 'expanding',
    HOTKEY: 'expanding',
    SHOW: 'idle',
    RESET: 'idle'
  },
  warning: {
    COLLAPSE: 'collapsing',
    DISMISS: 'collapsing',
    CLICK: 'expanding',
    RESET: 'idle'
  },
  error: {
    COLLAPSE: 'collapsing',
    DISMISS: 'collapsing',
    CLICK: 'expanding',
    RESET: 'idle'
  },
  collapsing: {
    COLLAPSED: 'collapsed',
    // critical requirement: activation during collapse reopens smoothly
    CLICK: 'expanding',
    HOTKEY: 'expanding',
    HOVER_ENTER: 'expanding',
    START_LISTENING: 'listening',
    EXPAND: 'expanding',
    SHOW: 'idle'
  }
}

export function getNextState(current: NotchState, event: NotchEvent): NotchState | null {
  const next = transitions[current]?.[event.type as keyof typeof transitions[typeof current]]
  return next ?? null
}

export function reduceContext(ctx: NotchContext, event: NotchEvent, nextState: NotchState): NotchContext {
  switch (event.type) {
    case 'HOVER_ENTER':
      return { ...ctx, isHovered: true }
    case 'HOVER_LEAVE':
      return { ...ctx, isHovered: false }
    case 'STOP_LISTENING':
      return { ...ctx, transcript: event.transcript }
    case 'TRANSCRIBING':
      return { ...ctx, transcript: event.text }
    case 'SPEAKING':
      return { ...ctx, responseText: event.text }
    case 'ACTION_START':
      return { ...ctx, actionLabel: event.label }
    case 'SUCCESS':
    case 'WARNING':
    case 'ERROR':
      return { ...ctx, notificationMessage: event.message }
    case 'EXPANDED':
      return { ...ctx, lastExpandedAt: Date.now() }
    case 'COLLAPSED':
    case 'RESET':
    case 'DISMISS':
      return { ...ctx, transcript: '', responseText: '', notificationMessage: undefined, actionLabel: undefined }
    default:
      if (nextState === 'collapsed' || nextState === 'idle') {
        return { ...ctx, transcript: '', responseText: '' }
      }
      return ctx
  }
}

// Helper to determine visual grouping for animations
export function isExpandedState(s: NotchState): boolean {
  return ['expanded', 'actionInProgress', 'approvalRequested', 'thinking', 'speaking'].includes(s)
}

export function isNotificationState(s: NotchState): boolean {
  return ['success', 'warning', 'error'].includes(s)
}

export function isOverlayState(s: NotchState): boolean {
  return ['listening', 'transcribing', 'thinking', 'speaking', 'expanding', 'expanded', 'actionInProgress', 'approvalRequested', 'success', 'warning', 'error'].includes(s)
}

export const notchStateDescriptions: Record<NotchState, string> = {
  hidden: 'Hidden - app running in tray only',
  idle: 'Idle - slim black pill at top center',
  collapsed: 'Collapsed - minimal pill with activity dot',
  hovered: 'Hovered - pill subtly glows',
  listening: 'Listening - waveform animates inside notch',
  transcribing: 'Transcribing - showing interim text',
  thinking: 'Thinking - subtle pulse animation',
  speaking: 'Speaking - AI voice active',
  expanding: 'Expanding - morphing downward',
  expanded: 'Expanded - contextual panel visible',
  actionInProgress: 'Action in progress - progress indicator',
  approvalRequested: 'Approval requested - awaiting user',
  success: 'Success - brief confirmation',
  warning: 'Warning - attention needed',
  error: 'Error - failure state',
  collapsing: 'Collapsing - retracting to pill'
}
