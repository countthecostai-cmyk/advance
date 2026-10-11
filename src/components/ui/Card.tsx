import clsx from 'clsx'
import { HTMLAttributes } from 'react'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('cut-corner border border-ink-200 bg-ink-100 p-4 shadow-card', className)}
      {...props}
    />
  )
}
