import { useEffect, useState } from 'react'
import Notch from './components/Notch'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Dashboard from './components/Dashboard'
import { useZeyvoStore } from './store/useZeyvoStore'

export default function App() {
  const [section, setSection] = useState('home')
  const init = useZeyvoStore(s=>s.init)

  useEffect(()=>{ init() }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Notch lives at top center regardless of route */}
      <Notch />

      {/* Spacer for notch in dev preview — real overlay is transparent */}
      <div className="h-[52px] shrink-0" />

      <TopBar />

      <div className="flex flex-1 min-h-0">
        <Sidebar active={section} onChange={setSection} />
        <div className="flex-1 overflow-auto bg-[#080808]">
          <Dashboard section={section} />
          {/* Bottom info bar */}
          <div className="px-6 pb-6 max-w-[1200px] mx-auto w-full">
            <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4 flex flex-wrap gap-3 text-[11px] text-white/40">
              <span>Cloud preview: React notch state machine is real. Windows native overlay/tray/hotkeys are stubbed for handoff.</span>
              <span className="ml-auto">Build: Tauri 2 • Rust • Win32 • SQLite • OBS WebSocket • Playwright • FFmpeg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
