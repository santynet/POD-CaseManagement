import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-6">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-surface-container-high mb-4">
        <span className="material-symbols-outlined text-on-surface-variant text-3xl">{icon}</span>
      </div>
      <h3 className="text-title-lg font-bold text-on-surface mb-1">{title}</h3>
      {description && <p className="text-sm text-on-surface-variant max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
