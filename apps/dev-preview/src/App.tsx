import { useEffect, useState } from 'react'
import Notch from './components/Notch'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Dashboard from './components/Dashboard'
import { useZeyvoStore } from './store/useZeyvoStore'
import { supabase } from './lib/supabase/client'

export default function App() {
  const [section, setSection] = useState('home')
  const init = useZeyvoStore(s=>s.init)

  useEffect(()=>{ init()
    // Handle OAuth callback (Supabase sets session via URL hash)
    supabase.auth.getSession().then(({ data })=>{
      if (data.session) {
        // After Stripe checkout redirect, refresh entitlement
        const params = new URLSearchParams(window.location.search)
        if (params.get('checkout')==='success') {
          // Entitlement will be created via webhook, but we can show message
          window.history.replaceState({}, '', window.location.pathname)
        }
      }
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Notch />
      <div className="h-[52px] shrink-0" />
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar active={section} onChange={setSection} />
        <div className="flex-1 overflow-auto bg-[#080808]">
          <Dashboard section={section} />
          <div className="px-6 pb-6 max-w-[1200px] mx-auto w-full">
            <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4 flex flex-wrap gap-3 text-[11px] text-white/40">
              <span>Managed AI via ZEYVO Cloud • Supabase jldyaqxxdiznhkeuerzl • No API keys needed — subscription unlocks gateway.</span>
              <span className="ml-auto">Build: Tauri 2 • Rust • Win32 • Stripe webhooks • RLS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
