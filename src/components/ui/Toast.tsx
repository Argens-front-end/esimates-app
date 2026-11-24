import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/** Small iOS-style HUD banner that hides itself after a few seconds. */
export function Toast({ message, onHide }: { message: string | null; onHide: () => void }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onHide, 3500)
    return () => clearTimeout(t)
  }, [message, onHide])

  if (!message) return null
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+48px)] z-60 flex justify-center px-6">
      <div
        role="status"
        className="pointer-events-auto max-w-sm animate-fade-in rounded-[12px] bg-card/90 px-4 py-2.5 text-center text-[13px] shadow-lg ring-[0.5px] ring-sep backdrop-blur-xl"
        onClick={onHide}
      >
        {message}
      </div>
    </div>,
    document.body,
  )
}
