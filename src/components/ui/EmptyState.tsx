import { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="cut-corner flex flex-col items-center gap-3 border border-dashed border-ink-300 bg-ink-100 px-6 py-12 text-center">
      <div className="text-3xl opacity-40 grayscale">{icon}</div>
      <h3 className="font-display text-lg font-bold uppercase tracking-wide text-ink-900">{title}</h3>
      <p className="max-w-xs text-sm text-ink-400">{description}</p>
      {action}
    </div>
  )
}
