import { useState } from 'react'
import type { Estimate, EstimateRow } from '../lib/types'
import { CURRENCIES } from '../lib/types'
import { currencyName, estimateTotal, formatMoney, formatNumber, plural, rowSum } from '../lib/money'
import { newRow } from '../lib/storage'
import { navigate } from '../lib/router'
import { exportEstimateToExcel } from '../lib/exportExcel'
import { RowSheet } from './RowSheet'
import { BarButton, NavBar } from './ui/NavBar'
import { ActionSheet } from './ui/Sheet'
import { SwipeRow } from './ui/SwipeRow'
import { BottomBar } from './ui/BottomBar'
import { Cell, Group } from './ui/Group'
import { ChevronLeft, ChevronRight, ChevronUpDown, Ellipsis, Plus, Share, Trash } from './ui/icons'

interface Props {
  estimate: Estimate
  onChange: (estimate: Estimate) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => Estimate | undefined
}

type Editing = { row: EstimateRow; isNew: boolean } | null

export function EstimateEditor({ estimate, onChange, onDelete, onDuplicate }: Props) {
  const [editing, setEditing] = useState<Editing>(null)
  const [openSwipe, setOpenSwipe] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [exporting, setExporting] = useState(false)

  const set = (patch: Partial<Estimate>) => onChange({ ...estimate, ...patch })

  const saveRow = (row: EstimateRow) =>
    set({
      rows: estimate.rows.some((r) => r.id === row.id)
        ? estimate.rows.map((r) => (r.id === row.id ? row : r))
        : [...estimate.rows, row],
    })

  const moveRow = (row: EstimateRow, delta: -1 | 1) => {
    const rows = estimate.rows.map((r) => (r.id === row.id ? row : r))
    const i = rows.findIndex((r) => r.id === row.id)
    const j = i + delta
    if (i < 0 || j < 0 || j >= rows.length) return
    ;[rows[i], rows[j]] = [rows[j], rows[i]]
    set({ rows })
  }

  const removeRow = (id: string) => set({ rows: estimate.rows.filter((r) => r.id !== id) })

  const exportExcel = async () => {
    setExporting(true)
    try {
      await exportEstimateToExcel(estimate)
    } finally {
      setExporting(false)
    }
  }

  const currencies: string[] = (CURRENCIES as readonly string[]).includes(estimate.currency)
    ? [...CURRENCIES]
    : [estimate.currency, ...CURRENCIES]

  const editingIndex = editing ? estimate.rows.findIndex((r) => r.id === editing.row.id) : -1

  return (
    <div className="min-h-dvh pb-[calc(env(safe-area-inset-bottom)+72px)]">
      <NavBar
        title={estimate.title || 'Без названия'}
        left={
          <BarButton onClick={() => navigate({ page: 'list' })}>
            <ChevronLeft className="h-[17px] w-[10px]" />
            Сметы
          </BarButton>
        }
        right={
          <BarButton label="Действия" onClick={() => setMenuOpen(true)}>
            <Ellipsis className="size-[21px]" />
          </BarButton>
        }
      />

      <Group>
        <label className="block">
          <Cell>
            <input
              autoFocus={!estimate.title && estimate.rows.length === 0}
              value={estimate.title}
              placeholder="Название сметы"
              enterKeyHint="done"
              onChange={(e) => set({ title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="w-full min-w-0 bg-transparent text-[17px] font-semibold outline-none"
            />
          </Cell>
        </label>
        <label className="relative block active:bg-card-pressed">
          <Cell>
            <span className="flex-1">Валюта</span>
            <span className="text-label2">{estimate.currency}</span>
            <ChevronUpDown className="h-3 w-2 text-label3" />
          </Cell>
          <select
            aria-label="Валюта"
            value={estimate.currency}
            onChange={(e) => set({ currency: e.target.value })}
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c} — {currencyName(c)}
              </option>
            ))}
          </select>
        </label>
      </Group>

      <Group
        header={`Позиции${estimate.rows.length ? ` · ${estimate.rows.length}` : ''}`}
        footer={estimate.rows.length > 0 ? 'Нажмите на позицию, чтобы изменить её, или смахните влево, чтобы удалить.' : undefined}
      >
        {estimate.rows.map((row) => (
          <SwipeRow
            key={row.id}
            open={openSwipe === row.id}
            onOpenChange={(open) => setOpenSwipe(open ? row.id : null)}
            onClick={() => setEditing({ row, isNew: false })}
            actions={[{ label: 'Удалить', icon: <Trash className="size-4" />, className: 'bg-red', onSelect: () => removeRow(row.id) }]}
          >
            <Cell className="cursor-pointer">
              <div className="min-w-0 flex-1">
                <div className={`line-clamp-2 ${row.name ? '' : 'text-label3'}`}>{row.name || 'Без названия'}</div>
                <div className="text-[12px] text-label2 tabular-nums">
                  {formatNumber(row.quantity)} {row.unit} × {formatMoney(row.price, estimate.currency)}
                </div>
              </div>
              <div className="shrink-0 text-right font-medium tabular-nums">{formatMoney(rowSum(row), estimate.currency)}</div>
              <ChevronRight className="h-3 w-[7px] shrink-0 text-label3" />
            </Cell>
          </SwipeRow>
        ))}
        <button
          type="button"
          onClick={() => setEditing({ row: newRow(), isNew: true })}
          className="block w-full text-left text-tint active:bg-card-pressed"
        >
          <Cell>
            <Plus className="size-4" />
            Добавить позицию
          </Cell>
        </button>
      </Group>

      <BottomBar>
        <div className="min-w-0 flex-1 pl-2">
          <div className="text-[11px] text-label2">
            Итого · {estimate.rows.length} {plural(estimate.rows.length, 'позиция', 'позиции', 'позиций')}
          </div>
          <div className="truncate text-[18px] leading-6 font-bold tabular-nums">
            {formatMoney(estimateTotal(estimate), estimate.currency)}
          </div>
        </div>
        <button
          type="button"
          disabled={exporting}
          onClick={exportExcel}
          className="my-1.5 flex h-8 shrink-0 items-center gap-1 rounded-full bg-tint px-3.5 text-[14px] font-semibold text-white active:opacity-70 disabled:opacity-60"
        >
          <Share className="size-[15px]" />
          {exporting ? 'Готовлю…' : 'Excel'}
        </button>
      </BottomBar>

      {editing && (
        <RowSheet
          key={editing.row.id}
          row={editing.row}
          isNew={editing.isNew}
          currency={estimate.currency}
          canMoveUp={editingIndex > 0}
          canMoveDown={editingIndex >= 0 && editingIndex < estimate.rows.length - 1}
          onSave={saveRow}
          onMove={moveRow}
          onDelete={() => removeRow(editing.row.id)}
          onClose={() => setEditing(null)}
        />
      )}

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={estimate.title || 'Без названия'}
        actions={[
          { label: 'Экспорт в Excel', onSelect: exportExcel },
          {
            label: 'Дублировать',
            onSelect: () => {
              const copy = onDuplicate(estimate.id)
              if (copy) navigate({ page: 'edit', id: copy.id })
            },
          },
          { label: 'Удалить смету', destructive: true, onSelect: () => setConfirmDelete(true) },
        ]}
      />

      <ActionSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        message="Смета будет удалена без возможности восстановления."
        actions={[
          {
            label: 'Удалить смету',
            destructive: true,
            onSelect: () => {
              onDelete(estimate.id)
              navigate({ page: 'list' })
            },
          },
        ]}
      />
    </div>
  )
}
