import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '../../store/sessionStore'
import { supabase } from '../../lib/supabase'

export function TopBar() {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const user = useSessionStore((s) => s.user)
  const clear = useSessionStore((s) => s.clear)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  const onLogout = async () => {
    await supabase?.auth.signOut()
    clear()
    navigate('/login')
  }

  return (
    <header className="h-16 sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-outline-variant/15 px-8 flex items-center gap-6">
      <form onSubmit={onSubmit} className="flex-1 max-w-2xl">
        <div className="relative">
          <span className="material-symbols-outlined text-outline absolute inset-y-0 left-0 pl-3 flex items-center text-lg">
            search
          </span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search citation #, plate, party name, DL number…"
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-highest rounded-xl text-sm placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </form>
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high" aria-label="Notifications">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high" aria-label="Help">
          <span className="material-symbols-outlined">help</span>
        </button>
        <div className="flex items-center gap-3 pl-3 ml-1 border-l border-outline-variant/20">
          <div className="text-right hidden md:block">
            <div className="text-sm font-semibold text-on-surface leading-tight">{user?.displayName ?? '—'}</div>
            <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
              {user?.role}
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-dim text-on-primary flex items-center justify-center font-bold text-sm">
            {user?.displayName?.[0] ?? '?'}
          </div>
          <button onClick={onLogout} className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high" aria-label="Log out">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}
