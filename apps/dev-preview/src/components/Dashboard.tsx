import { useState, useEffect } from 'react'
import { useZeyvoStore } from '../store/useZeyvoStore'
import { gameDatabase } from '../lib/mockAdapters'
import ProviderPanel from './settings/ProviderPanel'
import ControlCenter from './settings/ControlCenter'
import IntegrationsPanel from './settings/IntegrationsPanel'
import AccountPanel from './account/AccountPanel'
import AdminConsole from './admin/AdminConsole'

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#141414] border border-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-semibold text-white">{title}</div>
        {action}
      </div>
      {children}
    </div>
  )
}

export default function Dashboard({ section }: { section: string }) {
  const { obs, platforms, streamMeta, gameState, currentGame, pendingGame, gameUpdateTitle, creatorStyle, workflows, activeRun, cards, autopilotEnabled, toggleAutopilot, triggerGameDetection, confirmGameUpdate, toggleOBSConnect, startWorkflow, setCreatorStyle } = useZeyvoStore()
  const [titleDraft, setTitleDraft] = useState(streamMeta.title)
  const [toast, setToast] = useState<string| null>(null)

  useEffect(()=> setTitleDraft(streamMeta.title), [streamMeta.title])
  const showToast = (m:string)=>{ setToast(m); setTimeout(()=>setToast(null), 2500)}

  if (section==='account') {
    return <div className="p-6 max-w-[1100px] mx-auto w-full"><AccountPanel /></div>
  }
  if (section==='admin') {
    return <div className="p-6 max-w-[1100px] mx-auto w-full"><AdminConsole /></div>
  }
  if (section==='live') {
    return (
      <div className="p-6 space-y-4 max-w-[1200px] mx-auto w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-[18px] font-semibold text-white">Live Studio</h1>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${obs.streaming?'bg-red-500 text-white':'bg-white/10 text-white/60'}`}>{obs.streaming?'● LIVE':'OFFLINE'}</span>
            <span className={`px-2.5 py-1 rounded-full text-[11px] ${obs.connected?'bg-emerald-500 text-white':'bg-white/10 text-white/60'}`}>{obs.connected?'OBS connected':'OBS disconnected'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title="OBS Control" action={<button onClick={toggleOBSConnect} className={`text-[11px] px-3 py-1 rounded-full ${obs.connected?'bg-white/10 text-white':'bg-white text-black'}`}>{obs.connected?'Disconnect':'Connect (mock)'}</button>}>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[12px]"><span className="text-white/60">Current scene</span><span className="text-white font-medium">{obs.currentScene}</span></div>
              <div className="grid grid-cols-3 gap-2">
                {obs.scenes.map(s=>(
                  <button key={s} onClick={()=> obs.connected && (obs as any).currentScene!==s && showToast(`Switch to ${s} — requires OBS WebSocket approval`)} className={`text-[12px] py-2 rounded-lg border ${obs.currentScene===s?'bg-white text-black border-white':'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'}`}>{s}</button>
                ))}
              </div>
              <div className="space-y-2 pt-2 border-t border-white/5">
                {obs.audioSources.map(a=>(
                  <div key={a.name} className="flex items-center gap-3">
                    <span className="text-[12px] text-white/70 w-28">{a.name}</span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-white" style={{ width: `${Math.min(100, a.level*140)}%`, opacity: a.muted?0.2:1 }} />
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full ${a.muted?'bg-red-500 text-white':'bg-emerald-500 text-white'}`}>{a.muted?'MUTED':'LIVE'}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button className="text-[12px] bg-white text-black py-2 rounded-lg font-medium">Get stream ready</button>
                <button className="text-[12px] bg-white/10 text-white py-2 rounded-lg">Save replay</button>
              </div>
            </div>
          </Card>

          <Card title="Game Detection" action={<span className={`text-[10px] px-2 py-1 rounded-full font-bold ${gameState==='gameConfirmed'?'bg-emerald-500 text-white':gameState==='updatePending'?'bg-amber-500 text-black':'bg-white/10 text-white/60'}`}>{gameState.toUpperCase()}</span>}>
            <div className="space-y-3">
              <div className="rounded-xl bg-white/[0.04] border border-white/5 p-3">
                <div className="text-[11px] uppercase tracking-widest text-white/40">Current game</div>
                <div className="text-[14px] font-semibold text-white mt-1">{currentGame?.displayName ?? 'No game'}</div>
                <div className="text-[12px] text-white/50">{currentGame?.processName ?? '—'}</div>
              </div>
              {pendingGame && gameState==='updatePending' && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                  <div className="text-[12px] font-medium text-amber-300">New game detected: {pendingGame.displayName}</div>
                  <div className="text-[12px] text-white/70 mt-1">Proposed title</div>
                  <div className="text-[13px] font-semibold text-white bg-black/30 p-2 rounded-lg mt-1">{gameUpdateTitle}</div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={()=>confirmGameUpdate()} className="flex-1 bg-white text-black text-[12px] py-1.5 rounded-full font-medium">Approve</button>
                    <button onClick={()=>showToast('Edit — opens title editor')} className="flex-1 bg-white/10 text-white text-[12px] py-1.5 rounded-full">Edit</button>
                    <button onClick={()=>useZeyvoStore.getState().dismissCard('game')} className="text-[12px] text-white/60 px-2">Ignore</button>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {Object.keys(gameDatabase).slice(0,5).map(exe=>(
                  <button key={exe} onClick={()=>triggerGameDetection(exe)} className="text-[11px] bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 px-2.5 py-1.5 rounded-full">{gameDatabase[exe].displayName}</button>
                ))}
              </div>
              <div className="text-[11px] text-white/30">Alt-Tab to Discord is debounced — won’t trigger category change. Unknown games show “unknown” state.</div>
            </div>
          </Card>

          <Card title="Stream Metadata">
            <div className="space-y-3">
              <div>
                <div className="text-[11px] text-white/50 uppercase tracking-wide">Title</div>
                <input value={titleDraft} onChange={e=>setTitleDraft(e.target.value)} className="w-full mt-1 bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white outline-none" />
                <div className="flex gap-2 mt-2">
                  <button onClick={()=>{ useZeyvoStore.getState().updateTitle(titleDraft); showToast('Title updated (mock)') }} className="bg-white text-black text-[12px] px-3 py-1.5 rounded-full font-medium">Update title</button>
                  <button onClick={()=>setTitleDraft(titleDraft.slice(0,80))} className="bg-white/10 text-white text-[12px] px-3 py-1.5 rounded-full">Trim to 80</button>
                </div>
              </div>
              <div className="flex gap-2">
                {(['twitch','kick','youtube'] as const).map(p=>(
                  <div key={p} className={`flex-1 rounded-lg border p-2 text-center ${platforms[p]?.connected?'bg-emerald-500/10 border-emerald-500/20':'bg-white/5 border-white/5'}`}>
                    <div className="text-[11px] uppercase tracking-wide text-white/60">{p}</div>
                    <div className="text-[12px] font-medium text-white">{platforms[p]?.connected?'Connected':'Not connected'}</div>
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 text-[12px] text-white/70"><input type="checkbox" checked={autopilotEnabled} onChange={toggleAutopilot} /> Stream Autopilot enabled</label>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Pre-stream Checklist">
            <div className="space-y-2">
              {[
                { ok: obs.connected, label: 'OBS connected via WebSocket' },
                { ok: !obs.audioSources[0]?.muted, label: 'Microphone not muted' },
                { ok: obs.audioSources[0]?.level>0.05, label: 'Mic receiving audio (level > 5%)' },
                { ok: !!obs.currentScene, label: 'Scene selected' },
                { ok: platforms.twitch.connected || platforms.youtube.connected, label: 'At least one platform connected' },
                { ok: streamMeta.title.length>10, label: 'Stream title set' },
              ].map(r=>(
                <div key={r.label} className="flex items-center gap-2 text-[12px]">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${r.ok?'bg-emerald-500 text-white':'bg-amber-500 text-black'}`}>{r.ok?'✓':'!'}</span>
                  <span className={r.ok?'text-white/80':'text-amber-300'}>{r.label}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Activity & Privacy">
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between"><span className="text-white/50">Privacy Shield</span><span className="text-emerald-400">Active • 3 rules</span></div>
              <div className="rounded-lg bg-white/[0.04] border border-white/5 p-2.5">
                <div className="text-white/70">If protected window (Discord DM, password, document) risks capture, Zeyvo will switch to “Privacy Shield” safe scene and notify.</div>
                <div className="text-white/30 text-[11px] mt-1">Preventive allowlist + safe-scene switching — not just post- leak detection.</div>
              </div>
              <div className="flex gap-2">
                <span className="text-white/50">Recent:</span>
                <span className="text-white/80">{cards.length? `${cards.length} pending approval(s)`:'No alerts'}</span>
              </div>
            </div>
          </Card>
        </div>
        {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white text-black text-[13px] px-4 py-2 rounded-full shadow-xl">{toast}</div>}
      </div>
    )
  }

  if (section==='workflow') {
    return (
      <div className="p-6 space-y-4 max-w-[1200px] mx-auto w-full">
        <h1 className="text-[18px] font-semibold text-white">Workflow Studio</h1>
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
          <div className="space-y-4">
            <Card title="Teach Mode">
              <div className="space-y-2">
                <div className="rounded-xl bg-white/[0.04] border border-white/5 p-3">
                  <div className="text-[13px] font-medium text-white">“Watch me do this”</div>
                  <div className="text-[12px] text-white/50 mt-1">Zeyvo observes permitted UI events → compiles into editable, versioned JSON workflow (not mouse coordinates).</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>showToast('Teach Mode: recording (mock) — click actions simulated')} className="flex-1 bg-white text-black text-[12px] py-2 rounded-full font-medium">● Start watching</button>
                  <button onClick={()=>showToast('Paused')} className="bg-white/10 text-white text-[12px] px-3 py-2 rounded-full">Pause</button>
                </div>
                <div className="text-[11px] text-white/30">Visible indicator • Pause/Resume • Delete recording • App exclusions</div>
              </div>
            </Card>
            <Card title="Library" action={<span className="text-[11px] text-white/40">{workflows.length} workflows</span>}>
              <div className="space-y-2">
                {workflows.map(w=>(
                  <div key={w.id} className="rounded-xl bg-white/[0.04] border border-white/5 p-3">
                    <div className="text-[13px] font-medium text-white">{w.name}</div>
                    <div className="text-[12px] text-white/50 leading-snug mt-1">{w.description}</div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={()=>startWorkflow(w.id)} className="bg-white text-black text-[12px] px-3 py-1 rounded-full font-medium">Run</button>
                      <button onClick={()=>showToast('Dry-run preview (mock)')} className="bg-white/10 text-white text-[12px] px-3 py-1 rounded-full">Dry run</button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="rounded-2xl bg-[#0f0f0f] border border-white/5 overflow-hidden flex flex-col min-h-[560px]">
            <div className="h-10 flex items-center justify-between px-4 border-b border-white/5">
              <div className="flex gap-2">
                <button className="text-[12px] bg-white text-black px-3 py-1 rounded-full">Simple</button>
                <button className="text-[12px] bg-white/10 text-white px-3 py-1 rounded-full">Visual</button>
                <button className="text-[12px] bg-white/10 text-white px-3 py-1 rounded-full">Advanced JSON</button>
              </div>
              <div className="text-[11px] text-white/40">Canonical model • versioned • validated</div>
            </div>

            {/* Visual node graph mock */}
            <div className="flex-1 relative bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-[size:20px_20px] p-6 overflow-auto">
              <div className="min-w-[800px]">
                <div className="text-[11px] uppercase tracking-widest text-white/30 mb-3">Create YouTube Short — 12 nodes (mock execution)</div>
                <div className="flex gap-3 flex-wrap">
                  {['Start','Select Video','Validate','Analyze','Propose Clips','9:16 Crop','Transcribe','Captions','Export','Verify','Preview','Approval','Done'].map((label, i)=>(
                    <div key={label} className="flex items-center gap-2">
                      <div className={`px-3 py-2 rounded-xl border text-[12px] font-medium whitespace-nowrap ${activeRun?.currentNodeId===`n_${label.toLowerCase().replace(/[^a-z]/g,'')}` || activeRun?.currentNodeId===`n_${['start','input','validate','analyze','clips','crop','transcribe','captions','export','verify','preview','approval','done'][i]}` ? 'bg-white text-black border-white shadow-lg scale-105' : 'bg-zinc-900 text-white border-white/10'}`}>
                        {label}
                      </div>
                      {i<12 && <span className="text-white/20">→</span>}
                    </div>
                  ))}
                </div>
                {activeRun && (
                  <div className="mt-6 rounded-xl bg-white text-black p-3 max-w-2xl">
                    <div className="text-[12px] font-semibold">Run {activeRun.id} • {activeRun.state}</div>
                    <div className="text-[12px] text-black/60">Current: {activeRun.currentNodeId} • logs {activeRun.logs.length}</div>
                    <div className="mt-2 space-y-1 max-h-40 overflow-auto">
                      {activeRun.logs.map((l, idx)=><div key={idx} className="text-[11px] font-mono bg-black/5 rounded px-2 py-1">{new Date(l.timestamp).toLocaleTimeString()} [{l.level}] {l.message}</div>)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-white/5 flex gap-2">
              <button onClick={()=>showToast('Explain in natural language (mock)')} className="text-[12px] bg-white/10 text-white px-3 py-1.5 rounded-full">Explain workflow</button>
              <button onClick={()=>showToast('Workflow JSON exported')} className="text-[12px] bg-white/10 text-white px-3 py-1.5 rounded-full">Export JSON</button>
              <span className="ml-auto text-[11px] text-white/30">All 3 editors share one canonical model</span>
            </div>
          </div>
        </div>
        {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white text-black text-[13px] px-4 py-2 rounded-full shadow-xl">{toast}</div>}
      </div>
    )
  }

  if (section==='control') {
    return <div className="p-6 max-w-[1000px] mx-auto w-full"><ControlCenter /></div>
  }
  if (section==='providers') {
    return <div className="p-6 max-w-[900px] mx-auto w-full"><ProviderPanel /></div>
  }
  if (section==='integrations') {
    return <div className="p-6 max-w-[1100px] mx-auto w-full"><h1 className="text-[18px] font-semibold text-white mb-4">Integrations</h1><IntegrationsPanel /></div>
  }
  if (section==='settings') {
    return (
      <div className="p-6 max-w-[900px] mx-auto w-full space-y-4">
        <h1 className="text-[18px] font-semibold text-white">Settings</h1>
        <div className="rounded-2xl bg-[#141414] border border-white/5 p-4 space-y-4">
          <div className="text-[13px] font-semibold text-white">Appearance — Notch</div>
          <label className="flex items-center justify-between text-[12px] text-white/70">Reduced motion <input type="checkbox" checked={useZeyvoStore.getState().settings.appearance.reducedMotion} onChange={e=>useZeyvoStore.getState().updateSettings({ appearance: { ...useZeyvoStore.getState().settings.appearance, reducedMotion: e.target.checked }} as any)} /></label>
          <label className="flex items-center justify-between text-[12px] text-white/70">Auto-hide timeout (ms) <input type="number" defaultValue={10000} onChange={e=>useZeyvoStore.getState().updateSettings({ appearance: { ...useZeyvoStore.getState().settings.appearance, autoHideTimeoutMs: parseInt(e.target.value)||10000 }} as any)} className="bg-white/10 border border-white/10 rounded px-2 py-1 w-28 text-white" /></label>
          <label className="flex items-center justify-between text-[12px] text-white/70">Show over fullscreen <input type="checkbox" /></label>
          <div className="text-[11px] text-white/30">Notch visibility: Auto-hide after 10s (default) • Always show collapsed • Custom • Hide during fullscreen — configurable via appearance.notchVisibility</div>
        </div>
        <div className="rounded-2xl bg-[#141414] border border-white/5 p-4">
          <div className="text-[13px] font-semibold text-white">Background</div>
          <label className="flex items-center gap-2 text-[12px] text-white/70"><input type="checkbox" checked={useZeyvoStore.getState().settings.behavior.launchAtStartup} onChange={e=>useZeyvoStore.getState().updateSettings({ behavior:{ ...useZeyvoStore.getState().settings.behavior, launchAtStartup: e.target.checked }} as any)} /> Launch at Windows sign-in</label>
          <label className="flex items-center gap-2 text-[12px] text-white/70"><input type="checkbox" defaultChecked /> Minimize to tray</label>
          <div className="text-[11px] text-white/30 mt-1">Tauri autostart plugin handles startup when enabled (no large dashboard).</div>
        </div>
        <div className="rounded-2xl bg-[#141414] border border-white/5 p-4">
          <div className="text-[13px] font-semibold text-white">Hotkeys</div>
          <div className="text-[12px] text-white/60">Open/close notch: <span className="bg-white/10 px-2 py-1 rounded">Ctrl+Alt+Z</span> (global) • Toggle: <span className="bg-white/10 px-2 py-1 rounded">⌘K</span> • Push-to-talk: <span className="bg-white/10 px-2 py-1 rounded">Space</span> • Emergency stop: <span className="bg-white/10 px-2 py-1 rounded">Ctrl+Shift+Esc</span></div>
        </div>
        <div className="rounded-2xl bg-[#141414] border border-white/5 p-4">
          <div className="text-[13px] font-semibold text-white">Onboarding</div>
          <div className="text-[12px] text-white/50">First run: Welcome → Notch → Voice → AI Provider → Control Profile → Permissions → Autostart → Credentials → Streaming → Connectors → Privacy → Finish. No hidden monitoring, no forced account.</div>
          <button onClick={()=>alert('Onboarding wizard would launch here (12 stages)')} className="mt-2 bg-white text-black text-[12px] px-3 py-1.5 rounded-full">Launch onboarding</button>
        </div>
      </div>
    )
  }
  if (section==='agents') {
    return (
      <div className="p-6 max-w-[1100px] mx-auto w-full space-y-4">
        <h1 className="text-[18px] font-semibold text-white">Agents — Task Orchestration</h1>
        <div className="rounded-2xl bg-[#141414] border border-white/5 p-4">
          <div className="text-[13px] font-semibold text-white">Intent Router → Context → Planner → Tool Registry → Executor → Verifier → Task Manager</div>
          <div className="grid grid-cols-4 gap-2 mt-3 text-[11px]">{['General','Desktop Operator','Stream Director','Workflow Builder','Research','Coding','Content','Diagnostics'].map(r=><div key={r} className="bg-white/5 border border-white/5 rounded-lg p-2 text-white/70">{r}</div>)}</div>
          <div className="text-[11px] text-white/30 mt-2">Treat external content (webpages, emails, chat) as untrusted data — never privileged. Cancellation supported.</div>
        </div>
        <div className="rounded-2xl bg-[#141414] border border-white/5 p-4">
          <div className="text-[13px] font-semibold text-white">Gmail Example (real Gmail API when connected)</div>
          <div className="flex gap-2 mt-2">
            <input id="gmail_q" placeholder="search Gmail (e.g., from:teacher assignment)" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white" />
            <button onClick={async()=>{
              const q=(document.getElementById('gmail_q') as HTMLInputElement).value||'in:inbox';
              const { gmailClient } = await import('../lib/connectors/gmail');
              try { const msgs= await gmailClient.search(q); alert(`Found ${msgs.length} messages (live). First: ${msgs[0]?.subject||'none'}`)} catch(e:any){
                // contract mock fallback
                const mock=gmailClient.mockSearch(q); alert(`[Contract mock] Gmail not connected — would search for "${q}". Mock result: ${mock[0].subject} from ${mock[0].from}. Connect Gmail in Integrations to go live.`)
              }
            }} className="bg-white text-black text-[12px] px-4 py-2 rounded-full">Search Gmail</button>
          </div>
          <div className="text-[11px] text-white/30 mt-1">Read/search/summarize allowed per scope; sending requires approval showing recipient/content. No silent external sends.</div>
        </div>
      </div>
    )
  }
  if (section==='memory') {
    return (
      <div className="p-6 max-w-[900px] mx-auto w-full space-y-4">
        <h1 className="text-[18px] font-semibold text-white">Memory</h1>
        <div className="rounded-2xl bg-[#141414] border border-white/5 p-4">
          <div className="text-[12px] text-white/60">8 categories: writingStyle, creatorStyle, appPrefs, voice, streamPrefs, workflows, agentPrefs, instructions. View/edit/delete/export/reset supported. Credentials stored separately in Windows protected storage.</div>
          <div className="flex flex-wrap gap-2 mt-2">{['writingStyle','creatorStyle','appPrefs','voice','streamPrefs','workflows','agentPrefs','instructions'].map(c=><span key={c} className="text-[11px] bg-white/10 text-white/70 px-2.5 py-1 rounded-full">{c}</span>)}</div>
        </div>
      </div>
    )
  }
  if (section==='creator') {
    return (
      <div className="p-6 space-y-4 max-w-[900px] mx-auto w-full">
        <h1 className="text-[18px] font-semibold text-white">Creator Profile</h1>
        <Card title="Creator Style Memory">
          <div className="space-y-3">
            <div className="text-[12px] text-white/60">Zeyvo learns your title style from examples, edits, and rejects — not generic AI clickbait.</div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[12px] text-white/70">Tone <select value={creatorStyle.tone} onChange={e=>setCreatorStyle({...creatorStyle, tone: e.target.value as any})} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white"><option value="casual">Casual</option><option value="humorous">Humorous</option><option value="hype">Hype</option><option value="chill">Chill</option></select></label>
              <label className="text-[12px] text-white/70">Capitalization <select value={creatorStyle.capitalization} onChange={e=>setCreatorStyle({...creatorStyle, capitalization: e.target.value as any})} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white"><option value="mixed">Mixed</option><option value="upper">Upper</option><option value="normal">Normal</option><option value="title">Title</option></select></label>
              <label className="text-[12px] text-white/70">Emoji <select value={creatorStyle.emojiFrequency} onChange={e=>setCreatorStyle({...creatorStyle, emojiFrequency: e.target.value as any})} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white"><option value="none">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
              <label className="text-[12px] text-white/70">Max length <input type="range" min={40} max={120} value={creatorStyle.maxLength} onChange={e=>setCreatorStyle({...creatorStyle, maxLength: parseInt(e.target.value)})} className="w-full" /><span className="text-white">{creatorStyle.maxLength}</span></label>
            </div>
            <div>
              <div className="text-[12px] text-white/70">Examples</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {creatorStyle.examples.map((ex,i)=><span key={i} className="text-[12px] bg-white/5 border border-white/10 text-white/80 px-2 py-1 rounded-full">{ex}</span>)}
              </div>
            </div>
            <div className="text-[11px] text-white/30">Try: “Make my titles short and funny. Sometimes use caps, but don’t sound like AI clickbait.” Stored as editable Creator Style Profile.</div>
          </div>
        </Card>
      </div>
    )
  }

  // Home default
  return (
    <div className="p-6 space-y-4 max-w-[1100px] mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-white">Home</h1>
          <div className="text-[13px] text-white/50">ZEYVO — Your computer. Your companion. • VoiceOS notch is the primary interaction.</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/40">Lifecycle: </span>
          <span className="px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 text-[11px]">Idle • Tray • Notch • Hotkeys</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Assistant Status">
          <div className="space-y-2">
            <div className="flex justify-between text-[12px]"><span className="text-white/50">State machine</span><span className="text-white">16 visual states</span></div>
            <div className="flex justify-between text-[12px]"><span className="text-white/50">Current</span><span className="text-white font-mono text-[11px] bg-white/5 px-1.5 py-0.5 rounded">idle</span></div>
            <div className="text-[11px] text-white/30">Interruptible expand/collapse — clicking during collapse reopens smoothly.</div>
            <button onClick={()=>useZeyvoStore.getState().expand()} className="w-full mt-2 bg-white text-black text-[12px] py-2 rounded-full font-medium">Expand notch (⌘K)</button>
          </div>
        </Card>
        <Card title="Quick Actions">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={()=>useZeyvoStore.getState().requestScreenVision('What is on my screen? Describe the active window and any important controls.')} className="text-left bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-3"><div className="text-[12px] font-medium text-white">What’s on my screen?</div><div className="text-[11px] text-white/50">Real capture → vision provider</div></button>
            <button onClick={()=>useZeyvoStore.getState().requestScreenVision('Where should I click to change graphics settings? Point to the control and explain.')} className="text-left bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-3"><div className="text-[12px] font-medium text-white">Show me where to click</div><div className="text-[11px] text-white/50">Point & highlight (UIA)</div></button>
            <button onClick={()=>useZeyvoStore.getState().dispatch({type:'START_LISTENING'})} className="text-left bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-3"><div className="text-[12px] font-medium text-white">Dictation</div><div className="text-[11px] text-white/50">Punctuation & edits</div></button>
            <button onClick={()=>useZeyvoStore.getState().startWorkflow('wf_youtube_short')} className="text-left bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-3"><div className="text-[12px] font-medium text-white">Run workflow</div><div className="text-[11px] text-white/50">Create YouTube Short</div></button>
          </div>
        </Card>
        <Card title="Active Tasks" action={<span className="text-[11px] bg-white/10 text-white/60 px-2 py-1 rounded-full">{useZeyvoStore.getState().tasks.length} queued</span>}>
          <div className="space-y-2">
            {(useZeyvoStore.getState().tasks[0] ? [useZeyvoStore.getState().tasks[0]] : []).map(t=>(
              <div key={t.id} className="rounded-lg bg-white/[0.04] border border-white/5 p-2.5">
                <div className="text-[12px] font-medium text-white">{t.workflowId}</div>
                <div className="text-[11px] text-white/50">{t.state} • {t.currentNodeId}</div>
                <div className="h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden"><div className="h-full bg-white" style={{ width: '60%' }} /></div>
              </div>
            ))}
            {!useZeyvoStore.getState().tasks.length && <div className="text-[12px] text-white/40">No tasks — notch stays collapsed while background tasks run.</div>}
            <div className="text-[11px] text-white/30">Background API tasks continue when notch collapsed. Foreground tasks require desktop focus.</div>
          </div>
        </Card>
      </div>

      <div className="rounded-2xl bg-[#141414] border border-white/5 p-4">
        <div className="text-[13px] font-semibold text-white">Windows background runtime</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-[11px]">
          {['Startup • Tray • Autostart','Transparent overlay • Topmost • Click-through','Multi-monitor • DPI scaling','Hotkeys • Voice activation • Notifications','Sleep/Resume • Lock/Unlock • Display change','Crash recovery • Reconnect OBS/Mic','No control over locked session','Foreground vs background task rules'].map(s=>(
            <div key={s} className="rounded-lg bg-white/[0.04] border border-white/5 px-3 py-2 text-white/60 leading-snug">{s}</div>
          ))}
        </div>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white text-black text-[13px] px-4 py-2 rounded-full shadow-xl">{toast}</div>}
    </div>
  )
}
