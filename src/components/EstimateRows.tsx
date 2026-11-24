import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import type { Estimate } from '../lib/types'
import { estimateTotal, formatMoney, formatShortDate, plural } from '../lib/money'
import { paths } from '../lib/router'
import { ExportSheet } from './ExportSheet'
import { ActionSheet } from './ui/Sheet'
import { SwipeRow } from './ui/SwipeRow'
import { Cell, Group } from './ui/Group'
import { ChevronRight, Copy, Share, Trash } from './ui/icons'

interface Props {
  estimates: Estimate[]
  header?: ReactNode
  footer?: ReactNode
  /** Extra rows rendered after the estimates (e.g. an "add" button). */
  children?: ReactNode
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}

/** Grouped list of estimates with swipe actions: export, duplicate, delete. */
export function EstimateRows({ estimates, header, footer, children, onDelete, onDuplicate }: Props) {
  const navigate = useNavigate()
  const [openSwipe, setOpenSwipe] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Estimate | null>(null)
  const [toExport, setToExport] = useState<Estimate | null>(null)

  return (
    <>
      <Group header={header} footer={footer}>
        {estimates.map((e) => (
          <SwipeRow
            key={e.id}
            open={openSwipe === e.id}
            onOpenChange={(open) => setOpenSwipe(open ? e.id : null)}
            onClick={() => navigate(paths.estimate(e.id))}
            actions={[
              { label: 'Экспорт', icon: <Share className="size-4" />, className: 'bg-tint', onSelect: () => setToExport(e) },
              { label: 'Копия', icon: <Copy className="size-4" />, className: 'bg-gray', onSelect: () => onDuplicate(e.id) },
              { label: 'Удалить', icon: <Trash className="size-4" />, className: 'bg-red', onSelect: () => setToDelete(e) },
            ]}
          >
            <Cell className="min-h-[52px] cursor-pointer">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{e.title || 'Без названия'}</div>
                <div className="truncate text-[12px] text-label2">
                  {formatShortDate(e.updatedAt)} · {e.rows.length} {plural(e.rows.length, 'позиция', 'позиции', 'позиций')}
                </div>
              </div>
              <div className="shrink-0 text-right text-[15px] tabular-nums">{formatMoney(estimateTotal(e), e.currency)}</div>
              <ChevronRight className="h-3 w-[7px] shrink-0 text-label3" />
            </Cell>
          </SwipeRow>
        ))}
        {children}
      </Group>

      <ExportSheet estimate={toExport} onClose={() => setToExport(null)} />

      <ActionSheet
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        message={`Смета «${toDelete?.title || 'Без названия'}» будет удалена без возможности восстановления.`}
        actions={[{ label: 'Удалить смету', destructive: true, onSelect: () => toDelete && onDelete(toDelete.id) }]}
      />
    </>
  )
}
