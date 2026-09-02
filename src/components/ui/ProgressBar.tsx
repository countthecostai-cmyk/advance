export function ProgressBar({ value, max, tone = 'brand' }: { value: number; max: number; tone?: 'brand' | 'emerald' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
      <div
        className={tone === 'brand' ? 'h-full bg-brand-500 transition-all' : 'h-full bg-emerald-500 transition-all'}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
