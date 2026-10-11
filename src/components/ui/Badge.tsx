import clsx from 'clsx'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const toneClasses: Record<Tone, string> = {
  neutral: 'border-ink-300 text-ink-500',
  success: 'border-emerald-700 text-emerald-400',
  warning: 'border-amber-700 text-amber-400',
  danger: 'border-red-700 text-red-400',
  info: 'border-brand-500 text-brand-600',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        'mono-label inline-flex items-center border bg-ink-50 px-2 py-0.5 text-[9.5px]',
        toneClasses[tone]
      )}
    >
      {children}
    </span>
  )
}
