import { useRef, useState, type ReactNode } from 'react'

export interface SwipeAction {
  label: string
  icon?: ReactNode
  className: string
  onSelect: () => void
}

interface Props {
  actions: SwipeAction[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onClick: () => void
  children: ReactNode
}

const ACTION_WIDTH = 62

/** List row that reveals trailing actions on a left swipe, like iOS Mail. */
export function SwipeRow({ actions, open, onOpenChange, onClick, children }: Props) {
  const width = actions.length * ACTION_WIDTH
  const [drag, setDrag] = useState<number | null>(null)
  const gesture = useRef<{ x: number; y: number; base: number; axis?: 'x' | 'y' } | null>(null)
  const suppressClick = useRef(false)

  const offset = drag ?? (open ? -width : 0)
  // Actions stay hidden while the row is closed so they don't bleed through the hairline separators.
  const [revealed, setRevealed] = useState(false)
  if (offset !== 0 && !revealed) setRevealed(true)

  return (
    <div className="relative overflow-hidden bg-card">
      <div
        className={`absolute inset-y-0 right-0 flex ${revealed ? '' : 'invisible'}`}
        style={{ width }}
        aria-hidden={!open}
      >
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            tabIndex={open ? 0 : -1}
            onClick={() => {
              onOpenChange(false)
              a.onSelect()
            }}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-white ${a.className}`}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>
      <div
        className={`relative touch-pan-y bg-card select-none active:bg-card-pressed ${
          drag === null ? 'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]' : ''
        }`}
        style={{ transform: `translateX(${offset}px)` }}
        onTransitionEnd={() => offset === 0 && setRevealed(false)}
        onPointerDown={(e) => {
          gesture.current = { x: e.clientX, y: e.clientY, base: open ? -width : 0 }
        }}
        onPointerMove={(e) => {
          const g = gesture.current
          if (!g) return
          const dx = e.clientX - g.x
          const dy = e.clientY - g.y
          if (!g.axis) {
            if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
              g.axis = 'x'
              e.currentTarget.setPointerCapture(e.pointerId)
            } else if (Math.abs(dy) > 8) {
              g.axis = 'y'
            }
          }
          if (g.axis === 'x') {
            const next = g.base + dx
            // Rubber-band resistance past the fully open position.
            setDrag(next < -width ? -width + (next + width) / 3 : Math.min(0, next))
          }
        }}
        onPointerUp={() => {
          const g = gesture.current
          gesture.current = null
          if (g?.axis === 'x') {
            suppressClick.current = true
            onOpenChange((drag ?? 0) < -width / 2)
            setDrag(null)
          }
        }}
        onPointerCancel={() => {
          gesture.current = null
          setDrag(null)
        }}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false
            return
          }
          if (open) onOpenChange(false)
          else onClick()
        }}
      >
        {children}
      </div>
    </div>
  )
}
