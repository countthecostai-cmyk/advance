'use client'

import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '@/components/ui/Icons'

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div
        className="safe-bottom max-h-[85vh] w-full overflow-y-auto border-t border-ink-300 bg-ink-100 p-5 sm:max-w-md sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-ink-200 pb-3">
          <h2 className="font-display text-xl font-bold uppercase tracking-wide text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="tap-target flex h-9 w-9 items-center justify-center text-ink-500 active:bg-ink-200"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
