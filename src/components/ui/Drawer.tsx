import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  width?: 'sm' | 'md' | 'lg'
}

const widthClasses = { sm: 'w-96', md: 'w-[28rem]', lg: 'w-[36rem]' }

export function Drawer({ open, onClose, title, children, footer, width = 'md' }: DrawerProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 transition-opacity',
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
      )}
    >
      <div className="absolute inset-0 bg-inverse-surface/40" onClick={onClose} />
      <aside
        className={cn(
          'absolute right-0 top-0 h-full bg-surface-container-lowest shadow-2xl transition-transform flex flex-col',
          widthClasses[width],
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-center justify-between p-6 border-b border-outline-variant/20">
          <h2 className="text-title-lg font-bold text-on-surface">{title}</h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
            aria-label="Close drawer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <footer className="p-6 border-t border-outline-variant/20 bg-surface-container-low">{footer}</footer>
        )}
      </aside>
    </div>
  )
}
