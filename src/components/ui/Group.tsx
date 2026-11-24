import type { ReactNode } from 'react'

/** Inset grouped section (iOS Settings style). */
export function Group({ header, footer, children }: { header?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-auto mt-4 max-w-2xl px-3 first:mt-1.5">
      {header && <div className="px-3 pb-1 text-[11px] text-label2 uppercase">{header}</div>}
      <div className="overflow-hidden rounded-[9px] bg-card [&>:last-child_.cell-sep]:border-b-0">{children}</div>
      {footer && <div className="px-3 pt-1 text-[11px] text-label2">{footer}</div>}
    </section>
  )
}

/** Content wrapper for a row inside a Group; draws the inset separator except on the last row. */
export function Cell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className="pl-3">
      <div
        className={`cell-sep flex min-h-10 items-center gap-2.5 border-b-[0.5px] border-sep py-2 pr-3 ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
