import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

function useLockBodyScroll(active: boolean) {
  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [active])
}

function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, onClose])
}

export interface SheetAction {
  label: string
  onSelect: () => void
  destructive?: boolean
  icon?: ReactNode
}

interface ActionSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  message?: string
  actions: SheetAction[]
}

/** iOS action sheet: stacked options with a separate "Cancel" button. */
export function ActionSheet({ open, onClose, title, message, actions }: ActionSheetProps) {
  useLockBodyScroll(open)
  useEscape(open, onClose)
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-sm animate-sheet-in px-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        <div className="overflow-hidden rounded-[12px] bg-card/95 backdrop-blur-xl">
          {(title || message) && (
            <div className="border-b-[0.5px] border-sep px-4 py-2.5 text-center">
              {title && <div className="text-[12px] font-semibold text-label2">{title}</div>}
              {message && <div className="mt-0.5 text-[12px] text-label2">{message}</div>}
            </div>
          )}
          {actions.map((a, i) => (
            <button
              key={a.label}
              type="button"
              onClick={() => {
                onClose()
                a.onSelect()
              }}
              className={`flex h-12 w-full items-center justify-center gap-2 text-[17px] active:bg-card-pressed ${
                a.destructive ? 'text-red' : 'text-tint'
              } ${i > 0 ? 'border-t-[0.5px] border-sep' : ''}`}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-1.5 h-12 w-full rounded-[12px] bg-card text-[17px] font-semibold text-tint active:bg-card-pressed"
        >
          Отменить
        </button>
      </div>
    </div>,
    document.body,
  )
}
