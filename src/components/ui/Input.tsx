'use client'

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...props },
  ref
) {
  const inputId = id || props.name
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="mono-label text-[10.5px] text-ink-500">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={clsx(
          'tap-target h-12 w-full border border-ink-300 bg-ink-100 px-4 text-ink-900',
          'placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-50',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-950',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-ink-400">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-400">{error}</p>}
    </div>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, id, ...props },
  ref
) {
  const inputId = id || props.name
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="mono-label text-[10.5px] text-ink-500">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={clsx(
          'w-full border border-ink-300 bg-ink-100 px-4 py-3 text-ink-900',
          'placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-50',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-950',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-ink-400">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-400">{error}</p>}
    </div>
  )
})
