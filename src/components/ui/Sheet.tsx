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

interface SheetProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  left?: ReactNode
  right?: ReactNode
  children: ReactNode
}

/** iOS "page sheet": slides up from the bottom and nearly fills the screen. */
export function Sheet({ open, onClose, title, left, right, children }: SheetProps) {
  useLockBodyScroll(open)
  useEscape(open, onClose)
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[calc(100dvh-env(safe-area-inset-top)-12px)] min-h-[60dvh] max-w-2xl animate-sheet-in flex-col overflow-hidden rounded-t-[10px] bg-sheet shadow-2xl"
      >
        <div className="mx-auto mt-1 h-1 w-8 shrink-0 rounded-full bg-label3" />
        <div className="grid h-10 shrink-0 grid-cols-[1fr_auto_1fr] items-center px-2">
          <div className="flex justify-start">{left}</div>
          <div className="truncate text-center text-[15px] font-semibold">{title}</div>
          <div className="flex justify-end">{right}</div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+24px)]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
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
