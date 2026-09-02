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
  primary: 'bg-brand-500 text-white active:bg-brand-600 disabled:bg-ink-200 disabled:text-ink-400',
  secondary: 'bg-white text-ink-900 border border-ink-200 active:bg-ink-50 disabled:text-ink-300',
  danger: 'bg-red-600 text-white active:bg-red-700 disabled:bg-ink-200 disabled:text-ink-400',
  ghost: 'bg-transparent text-brand-600 active:bg-brand-50 disabled:text-ink-300',
}

const sizeClasses: Record<Size, string> = {
  lg: 'h-14 px-6 text-base rounded-2xl',
  md: 'h-12 px-5 text-sm rounded-xl',
  sm: 'h-10 px-4 text-sm rounded-lg',
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
        'inline-flex items-center justify-center gap-2 font-semibold transition active:scale-[0.98]',
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
