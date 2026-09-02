import clsx from 'clsx'
import { HTMLAttributes } from 'react'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('rounded-xl2 border border-ink-100 bg-white p-4 shadow-card', className)}
      {...props}
    />
  )
}
