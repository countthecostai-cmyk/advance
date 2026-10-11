export function ProgressBar({ value, max, tone = 'brand' }: { value: number; max: number; tone?: 'brand' | 'emerald' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-[3px] w-full overflow-hidden bg-ink-200">
      <div
        className={
          tone === 'brand'
            ? 'h-full bg-brand-500 shadow-[0_0_6px_rgb(255_46_62_/_0.6)] transition-all'
            : 'h-full bg-emerald-500 transition-all'
        }
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
