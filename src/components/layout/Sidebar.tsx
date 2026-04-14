import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'

const navItems = [
  { to: '/dashboard', icon: 'space_dashboard', label: 'Dashboard' },
  { to: '/search', icon: 'search', label: 'Search' },
  { to: '/lookups', icon: 'plagiarism', label: 'Registration Lookups' },
  { to: '/notices', icon: 'mail', label: 'Notices' },
]

export function Sidebar() {
  const navigate = useNavigate()
  return (
    <aside className="w-64 shrink-0 bg-surface-container-low h-screen sticky top-0 flex flex-col border-r border-outline-variant/20">
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">account_balance</span>
          </span>
          <div>
            <div className="text-on-surface font-extrabold leading-tight">POD New System</div>
            <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
              Parking Ops Dept
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )
            }
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4">
        <Button
          variant="primary"
          size="md"
          iconLeft="add"
          className="w-full"
          onClick={() => navigate('/search')}
        >
          New Citation
        </Button>
      </div>

      <div className="p-4 pt-0 text-xs text-on-surface-variant flex items-center justify-between">
        <a href="#" className="hover:text-primary">Help</a>
        <a href="#" className="hover:text-primary">Status</a>
        <span className="text-outline-variant">v0.1</span>
      </div>
    </aside>
  )
}
