import type { ReactNode } from 'react'

/** Segmented control; a tinted thumb slides under the selected segment so the current section is obvious. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string; icon?: ReactNode; badge?: number }[]
  onChange: (value: T) => void
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  const n = options.length

  return (
    <div role="tablist" className="relative flex h-10 gap-1 rounded-[11px] bg-fill p-1">
      {/* Thumb: segments are equal-width, so it is one segment wide and shifted by whole segments (+ gap). */}
      <div
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-[8px] bg-tint shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
        style={{
          width: `calc((100% - 0.5rem - ${n - 1} * 0.25rem) / ${n})`,
          transform: `translateX(calc(${index} * (100% + 0.25rem)))`,
        }}
      />
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(o.value)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-[8px] text-[14px] transition-colors duration-300 ${
              selected ? 'font-semibold text-white' : 'text-label2 active:opacity-60'
            }`}
          >
            {o.icon}
            {o.label}
            {o.badge !== undefined && o.badge > 0 && (
              <span
                className={`min-w-5 rounded-full px-1.5 text-[11px] leading-5 font-semibold tabular-nums transition-colors duration-300 ${
                  selected ? 'bg-white/25 text-white' : 'bg-fill text-label2'
                }`}
              >
                {o.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
