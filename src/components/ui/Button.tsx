'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'lg' | 'md' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'cut-corner border border-brand-500 bg-brand-50 text-brand-600 shadow-glow active:bg-brand-100 disabled:border-ink-300 disabled:bg-transparent disabled:text-ink-400 disabled:shadow-none',
  secondary:
    'cut-corner border border-ink-300 bg-ink-100 text-ink-800 active:bg-ink-200 disabled:text-ink-400',
  danger:
    'cut-corner border border-red-500 bg-red-950 text-red-400 active:bg-red-900 disabled:border-ink-300 disabled:bg-transparent disabled:text-ink-400',
  ghost: 'bg-transparent text-brand-600 active:bg-brand-50 disabled:text-ink-400',
}

const sizeClasses: Record<Size, string> = {
  lg: 'h-14 px-6 text-[13px]',
  md: 'h-12 px-5 text-[12.5px]',
  sm: 'h-10 px-4 text-[12px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'lg', loading, fullWidth, className, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wider transition active:scale-[0.98]',
        'tap-target select-none',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
})
