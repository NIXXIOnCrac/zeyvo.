export default function TopBar() {
  return (
    <div className="h-9 flex items-center justify-between px-4 bg-[#0f0f0f] border-b border-white/5 text-[12px]">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-white/70">ZEYVO dev preview • cloud-first</span>
        <span className="hidden md:inline text-white/30">— notch interaction is the primary interface</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-2 py-1 rounded-full bg-white/5 border border-white/5 text-white/60">⌘K to toggle notch</span>
        <span className="px-2 py-1 rounded-full bg-zeyvo-accent text-white">Tauri 2 + Rust ready for Windows</span>
      </div>
    </div>
  )
}
