const items = [
  { id: 'home', label: 'Home', icon: '◧' },
  { id: 'account', label: 'Account & Billing', icon: '👤' },
  { id: 'live', label: 'Live Studio', icon: '●', badge: 'LIVE' },
  { id: 'workflow', label: 'Workflow Studio', icon: '◇' },
  { id: 'agents', label: 'Agents', icon: '◆' },
  { id: 'creator', label: 'Creator Profile', icon: '✦' },
  { id: 'memory', label: 'Memory', icon: '◎' },
  { id: 'control', label: 'Control Center', icon: '🛡️' },
  { id: 'providers', label: 'AI Providers', icon: '🧠' },
  { id: 'integrations', label: 'Integrations', icon: '⬢' },
  { id: 'admin', label: 'Admin Console', icon: '🔒' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export default function Sidebar({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  return (
    <div className="w-[220px] shrink-0 bg-[#0f0f0f] border-r border-white/5 flex flex-col">
      <div className="p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold text-[13px]">Z</div>
        <div>
          <div className="text-[13px] font-semibold text-white leading-none">ZEYVO</div>
          <div className="text-[11px] text-white/40">Your companion</div>
        </div>
      </div>
      <div className="px-2 space-y-1 flex-1 overflow-auto">
        {items.map(it => (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors ${active===it.id ? 'bg-white text-black font-medium' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
          >
            <span className="w-5 text-center">{it.icon}</span>
            <span className="flex-1">{it.label}</span>
            {it.badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white">{it.badge}</span>}
          </button>
        ))}
      </div>
      <div className="p-3 border-t border-white/5">
        <div className="rounded-xl bg-white/[0.04] border border-white/5 p-3">
          <div className="text-[12px] font-medium text-white">Managed AI</div>
          <div className="text-[11px] text-white/50 leading-snug mt-1">No API keys — sign in & subscribe. Backend enforces quotas securely.</div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-white/60">Cloud gateway • Stripe • RLS</span>
          </div>
        </div>
      </div>
    </div>
  )
}
