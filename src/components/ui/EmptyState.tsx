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
    <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-ink-200 bg-white px-6 py-12 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      <p className="max-w-xs text-sm text-ink-400">{description}</p>
      {action}
    </div>
  )
}
