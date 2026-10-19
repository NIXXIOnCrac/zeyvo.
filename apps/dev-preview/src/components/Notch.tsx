import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useZeyvoStore } from '../store/useZeyvoStore'
import { AutoHideController } from '../lib/autoHide'
import { BreathingGlow } from './BreathingGlow'

function Waveform({ level, active }: { level: number; active: boolean }) {
  const bars = 14
  if (!active) return null
  return (
    <div className="flex items-center gap-[2.5px] h-4">
      {Array.from({ length: bars }).map((_, i) => {
        const h = active ? (0.25 + Math.abs(Math.sin(Date.now()/180 + i*0.7)) * 0.7 + level*0.6) : 0.3
        return (
          <motion.div
            key={i}
            className="w-[2.5px] bg-white rounded-full"
            animate={{ scaleY: active ? 0.4 + Math.random()*0.9 + level : 0.3 }}
            transition={{ duration: 0.12, repeat: active ? Infinity : 0, repeatType: 'reverse', delay: i*0.015 }}
            style={{ height: '14px', opacity: 0.9 - i*0.02 }}
          />
        )
      })}
    </div>
  )
}

function StatusDot({ state }: { state: string }) {
  const color =
    state === 'success' ? 'bg-zeyvo-success' :
    state === 'warning' ? 'bg-zeyvo-warning' :
    state === 'error' ? 'bg-zeyvo-error' :
    state === 'listening' ? 'bg-zeyvo-accent' :
    state === 'thinking' ? 'bg-zinc-400' : 'bg-white/60'
  return <span className={`w-1.5 h-1.5 rounded-full ${color} ${state==='listening'?'animate-pulse':''}`} />
}

export default function Notch() {
  const { notchState, notchContext, dispatch, cards, audioLevel, isListening: _isListening } = useZeyvoStore()
  const [hovered, setHovered] = useState(false)
  const [typed, setTyped] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const hasApproval = cards.some(c=> c.priority==='critical' || c.type==='taskApproval')
  const hasPrivacyWarning = notchState==='warning' && cards.some(c=>c.type==='privacyWarning')
  const autoHideRef = useRef<AutoHideController | null>(null)
  const settings = useZeyvoStore(s=> s.settings)

  // Auto-hide controller (10s default, measures Zeyvo interaction only)
  useEffect(()=>{
    const c = new AutoHideController(()=>{
      // Smooth hide sequence: collapse → hidden
      if (['expanded','actionInProgress','approvalRequested','thinking','speaking','success','warning','error'].includes(notchState)) dispatch({ type: 'COLLAPSE' })
      // after collapse anim, hide
      setTimeout(()=> dispatch({ type: 'HIDE' }), 500)
    }, settings?.appearance?.autoHideTimeoutMs ?? 10000)
    c.setVisibility((settings?.appearance?.notchVisibility as any)||'auto10')
    autoHideRef.current=c
    return ()=>c.destroy()
  }, [settings?.appearance?.autoHideTimeoutMs, settings?.appearance?.notchVisibility])

  useEffect(()=>{
    if (!autoHideRef.current) return
    const suppress = autoHideRef.current.shouldSuppress(notchState as any, { isTyping, isCapturing: notchState==='listening', hasApproval, isDragging, hasPrivacyWarning })
    if (suppress) autoHideRef.current.pause()
    else { autoHideRef.current.resume(); autoHideRef.current.interact() }
  }, [notchState, isTyping, isDragging, hasApproval, hasPrivacyWarning])

  const notifyInteract = () => autoHideRef.current?.interact()

  // keyboard shortcut: Cmd+K / Ctrl+K to toggle notch, Ctrl+Alt+Z global (registered in Tauri)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        notifyInteract()
        if (notchState === 'expanded' || notchState === 'expanding') dispatch({ type: 'COLLAPSE' })
        else dispatch({ type: 'HOTKEY' })
      }
      if ((e.ctrlKey && e.altKey && e.key.toLowerCase()==='z')) {
        e.preventDefault()
        notifyInteract()
        if (notchState==='hidden') dispatch({ type: 'SHOW' })
        else if (notchState==='expanded') dispatch({ type:'COLLAPSE' })
        else dispatch({ type:'HOTKEY' })
      }
      if (e.key === 'Escape' && (notchState === 'expanded' || notchState === 'expanding')) {
        dispatch({ type: 'COLLAPSE' })
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [notchState, settings])

  const isExpanded = ['expanded','actionInProgress','approvalRequested','thinking','speaking'].includes(notchState)
  const isListeningState = notchState === 'listening' || notchState === 'transcribing'
  const isCollapsing = notchState === 'collapsing'
  const isExpanding = notchState === 'expanding'

  // collapsed pill width logic
  const pillWidth =
    notchState === 'hidden' ? 0 :
    notchState === 'idle' ? 240 :
    notchState === 'collapsed' ? 220 :
    notchState === 'hovered' ? 260 :
    isListeningState ? 300 :
    notchState === 'thinking' ? 200 :
    notchState === 'success' || notchState === 'warning' || notchState === 'error' ? 360 :
    isExpanded || isExpanding || isCollapsing ? 560 : 240

  const handlePillClick = () => {
    if (notchState === 'idle' || notchState === 'collapsed' || notchState === 'hovered' || notchState === 'success' || notchState === 'warning' || notchState === 'error') {
      dispatch({ type: 'CLICK' })
    } else if (isExpanded) {
      dispatch({ type: 'COLLAPSE' })
    } else if (notchState === 'collapsing') {
      // interrupt collapsing — reopen
      dispatch({ type: 'CLICK' })
    }
  }

  const handleVoicePress = async () => {
    if (isListeningState) {
      try { const { voiceEngine } = await import('../lib/voice/engine'); voiceEngine.stopListening() } catch {}
      dispatch({ type: 'STOP_LISTENING', transcript: typed || notchContext.transcript || 'Get my stream ready' })
      setTyped('')
    } else {
      dispatch({ type: 'START_LISTENING' })
      try {
        const { voiceEngine } = await import('../lib/voice/engine')
        const cfg = useZeyvoStore.getState().settings
        voiceEngine.setConfig({ enabled: true, wakePhrase: cfg.behavior.wakePhrase, inputDeviceId: (cfg.voice as any).inputDevice })
        await voiceEngine.startListening((text, isFinal)=>{
          if (isFinal) {
            useZeyvoStore.getState().sendMessage(text)
          } else {
            // interim
            useZeyvoStore.setState(s=>({ notchContext: { ...s.notchContext, transcript: text }}))
          }
        }, (lvl)=> useZeyvoStore.setState({ audioLevel: lvl }))
      } catch (e:any) {
        dispatch({ type:'ERROR', message: e.message })
      }
    }
  }

  const handleSend = () => {
    if (!typed.trim()) return
    const text = typed
    setTyped('')
    setIsTyping(false)
    notifyInteract()
    // Real provider path — if unconfigured, router will return config-required error (not fake)
    const s = useZeyvoStore.getState()
    s.sendMessage(text)
  }

  return (
    <div className="fixed top-0 left-0 w-full flex justify-center pointer-events-none z-50" style={{ paddingTop: notchState==='hidden'?0:0 }}>
      {/* Screen edge anchor */}
      <motion.div
        layout
        onHoverStart={() => { setHovered(true); if (notchState==='idle') dispatch({ type: 'HOVER_ENTER' })}}
        onHoverEnd={() => { setHovered(false); if (notchState==='hovered') dispatch({ type: 'HOVER_LEAVE' })}}
        onClick={()=>{ notifyInteract(); handlePillClick()}}
        onMouseMove={notifyInteract}
        className={`pointer-events-auto cursor-pointer select-none notch-glass relative overflow-hidden flex flex-col items-center ${isExpanded||isExpanding||isCollapsing ? 'notch-glass-expanded' : ''}`}
        animate={{
          width: pillWidth,
          height: isExpanded || isExpanding ? 520 : isCollapsing ? 44 : notchState==='success'||notchState==='warning'||notchState==='error' ? 52 : 36,
          borderRadius: isExpanded || isExpanding || isCollapsing ? 20 : 999,
          y: notchState==='hidden' ? -40 : 0,
          opacity: notchState==='hidden' ? 0 : 1
        }}
        transition={{
          type: 'spring',
          stiffness: 380,
          damping: 28,
          mass: 0.7
        }}
        style={{ marginTop: 8 }}
      >
        <BreathingGlow state={notchState} reducedMotion={!!settings?.appearance?.reducedMotion} />
        {/* Top pill content — always visible strip */}
        <div className="w-full h-9 flex items-center justify-between px-3 shrink-0" style={{ minHeight: 36 }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center">
              <span className="text-[10px] font-semibold tracking-widest text-white">Z</span>
            </div>
            {notchState==='idle' && <span className="text-[12px] font-medium text-white/90 tracking-tight">Zeyvo</span>}
            {notchState==='hovered' && <span className="text-[12px] text-white/70">Click to open • ⌘K</span>}
            {isListeningState && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[12px] text-white">Listening</span>
                <Waveform level={audioLevel} active={true} />
              </div>
            )}
            {notchState==='thinking' && (
              <div className="flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay:'0ms' }} />
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay:'150ms' }} />
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay:'300ms' }} />
                </span>
                <span className="text-[12px] text-white/80">Thinking</span>
              </div>
            )}
            {notchState==='speaking' && <span className="text-[12px] text-white/90 line-clamp-1">{notchContext.responseText.slice(0,42)}</span>}
            {(notchState==='success' || notchState==='warning' || notchState==='error') && (
              <div className="flex items-center gap-2 min-w-0">
                <StatusDot state={notchState} />
                <span className="text-[12px] text-white truncate">{notchContext.notificationMessage}</span>
              </div>
            )}
            {notchState==='actionInProgress' && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-[12px] text-white/80">{notchContext.actionLabel}</span>
              </div>
            )}
            {notchState==='approvalRequested' && <span className="text-[12px] text-amber-300">Approval required</span>}
          </div>
          <div className="flex items-center gap-1.5">
            {/* activity indicators */}
            {cards.length > 0 && notchState!=='expanded' && (
              <span className="w-5 h-5 rounded-full bg-zeyvo-accent text-[10px] font-bold flex items-center justify-center text-white">{cards.length}</span>
            )}
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors">
              <span className="text-[11px]">{isExpanded ? '×' : '⌘'}</span>
            </div>
          </div>
        </div>

        {/* Expanded panel — morphs from same surface */}
        <AnimatePresence>
          {(isExpanded || isExpanding) && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex flex-col min-h-0"
            >
              {/* live waveform area */}
              {isListeningState && (
                <div className="mx-3 mb-2 p-3 rounded-xl bg-white/[0.04] border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase tracking-widest text-white/50">Voice input</span>
                    <span className="text-[11px] text-white/40">Push-to-talk • Hold Space</span>
                  </div>
                  <Waveform level={audioLevel} active={true} />
                  <div className="mt-2 text-[13px] text-white/80 min-h-[20px]">{notchContext.transcript || <span className="text-white/30">Say something…</span>}</div>
                </div>
              )}

              {/* Cards */}
              <div className="px-3 pb-2 space-y-2 max-h-[340px] overflow-auto">
                {cards.length === 0 && !isListeningState && notchState!=='thinking' && notchState!=='speaking' && (
                  <div className="rounded-xl bg-white/[0.04] border border-white/5 p-3">
                    <div className="text-[12px] font-medium text-white">Quick actions</div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button onClick={() => dispatch({ type: 'TRANSCRIBING', text: 'Get my stream ready' })} className="text-left text-[12px] bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg px-3 py-2 transition-colors">🎬 Get my stream ready</button>
                      <button onClick={() => dispatch({ type: 'TRANSCRIBING', text: 'Where do I change graphics settings?' })} className="text-left text-[12px] bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg px-3 py-2 transition-colors">🖥️ Where to click?</button>
                      <button onClick={() => dispatch({ type: 'START_LISTENING' })} className="text-left text-[12px] bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg px-3 py-2 transition-colors">🎙️ Start dictation</button>
                      <button onClick={() => dispatch({ type: 'ACTION_START', label: 'Analyzing screen…' })} className="text-left text-[12px] bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg px-3 py-2 transition-colors">👁️ Explain my screen</button>
                    </div>
                  </div>
                )}

                {cards.map(card => (
                  <div key={card.id} className="rounded-xl bg-zinc-900 border border-white/10 p-3 shadow-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-white/50">{card.type.replace(/([A-Z])/g,' $1')}</div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${card.priority==='high'?'bg-amber-500/20 text-amber-300':card.priority==='critical'?'bg-red-500/20 text-red-300':'bg-white/10 text-white/60'}`}>{card.priority}</span>
                    </div>
                    <div className="text-[13px] font-medium text-white mt-1">{card.title}</div>
                    {card.description && <div className="text-[12px] text-white/60 mt-1 leading-snug">{card.description}</div>}
                    {card.type==='streamTitleUpdate' && card.metadata?.proposedTitle && (
                      <div className="mt-2 p-2.5 rounded-lg bg-white/[0.06] border border-white/10">
                        <div className="text-[11px] text-white/40 uppercase tracking-wide">Proposed title</div>
                        <div className="text-[13px] font-semibold text-white">{String(card.metadata.proposedTitle)}</div>
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      {card.actions.map(a => (
                        <button
                          key={a.id}
                          onClick={(e) => { e.stopPropagation(); if (a.label==='Approve') { const s=useZeyvoStore.getState(); s.approveCard(card.id)} else if (a.label==='Ignore') { useZeyvoStore.getState().dismissCard(card.id)} else if (a.label==='Edit') { const t=prompt('Edit title', String(card.metadata?.proposedTitle||'')); if(t) useZeyvoStore.getState().updateTitle(t)} else { useZeyvoStore.getState().dismissCard(card.id)} }}
                          className={`text-[12px] font-medium px-3 py-1.5 rounded-full transition-colors ${a.variant==='primary'?'bg-white text-black hover:bg-zinc-200':a.variant==='secondary'?'bg-white/10 text-white hover:bg-white/15':'bg-transparent text-white/60 hover:text-white'}`}
                        >{a.label}</button>
                      ))}
                      <button onClick={(e)=>{e.stopPropagation(); useZeyvoStore.getState().dismissCard(card.id)}} className="ml-auto text-[12px] text-white/40 hover:text-white">Dismiss</button>
                    </div>
                  </div>
                ))}

                {/* Thought / speaking bubble */}
                {notchContext.responseText && (notchState==='thinking' || notchState==='speaking' || notchState==='expanded') && (
                  <div className="rounded-xl bg-white text-black p-3">
                    <div className="text-[13px] leading-relaxed">{notchContext.responseText}</div>
                    <div className="text-[11px] text-black/50 mt-1">Zeyvo • now</div>
                  </div>
                )}
              </div>

              {/* Input bar */}
              <div className="p-3 flex gap-2 items-center border-t border-white/5 mt-1">
                <button onClick={(e)=>{e.stopPropagation(); handleVoicePress()}} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isListeningState?'bg-red-500 text-white':'bg-white/10 text-white hover:bg-white/15'}`}>
                  <span className="text-[13px]">🎤</span>
                </button>
                <input
                  ref={inputRef}
                  value={typed}
                  onChange={e=>{ setTyped(e.target.value); setIsTyping(true); notifyInteract() }}
                  onFocus={()=>setIsTyping(true)}
                  onBlur={()=>setIsTyping(false)}
                  onKeyDown={e=>{ if(e.key==='Enter') handleSend(); e.stopPropagation()}}
                  onClick={e=>e.stopPropagation()}
                  placeholder="Ask Zeyvo… (⌘K) or hold Space to talk"
                  className="flex-1 bg-white/[0.06] border border-white/10 rounded-full px-3.5 py-2 text-[13px] text-white placeholder:text-white/40 outline-none focus:border-white/20 focus:bg-white/[0.08]"
                />
                <button onClick={(e)=>{e.stopPropagation(); handleSend()}} className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-100">↑</button>
              </div>

              {/* bottom meta */}
              <div className="px-3 pb-3 flex items-center justify-between">
                <span className="text-[11px] text-white/30">ZEYVO • Your computer. Your companion.</span>
                <span className="text-[11px] text-white/30">Esc to close</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Click outside to collapse */}
      {isExpanded && <div className="fixed inset-0 -z-10 pointer-events-auto" onClick={() => dispatch({ type: 'COLLAPSE' })} />}
    </div>
  )
}
