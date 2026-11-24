import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { Estimate, Invoice, Project } from '../lib/types'
import { estimateTotal, formatMoney, plural } from '../lib/money'
import { type ExportFormat, exportDoc, invoiceDoc } from '../lib/exportDoc'
import { formatInvoiceTotal, invoiceLabel, resolveLines } from '../lib/invoice'
import { uid } from '../lib/storage'
import { paths } from '../lib/router'
import { ExportSheet } from './ExportSheet'
import { BarButton, NavBar } from './ui/NavBar'
import { ActionSheet } from './ui/Sheet'
import { SwipeRow } from './ui/SwipeRow'
import { BottomBar } from './ui/BottomBar'
import { Cell, Group } from './ui/Group'
import { ChevronLeft, ChevronRight, Ellipsis, Plus, Share, Trash } from './ui/icons'

interface Props {
  invoice: Invoice
  project: Project | undefined
  /** Estimates of the invoice's project. */
  estimates: Estimate[]
  onChange: (invoice: Invoice) => void
  onDelete: (id: string) => void
}

export function InvoiceEditor({ invoice, project, estimates, onChange, onDelete }: Props) {
  const navigate = useNavigate()
  const [openSwipe, setOpenSwipe] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const set = (patch: Partial<Invoice>) => onChange({ ...invoice, ...patch })
  const parentPath = paths.project(invoice.projectId, 'invoices')
  const lines = resolveLines(invoice, estimates)
  const linked = new Set(invoice.lines.flatMap((l) => (l.type === 'estimate' ? [l.estimateId] : [])))
  const available = estimates.filter((e) => !linked.has(e.id)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const addEstimate = (estimateId: string) =>
    set({ lines: [...invoice.lines, { id: uid(), type: 'estimate', estimateId }] })
  const removeLine = (id: string) => set({ lines: invoice.lines.filter((l) => l.id !== id) })

  const runExport = async (format: ExportFormat) => {
    setExporting(true)
    try {
      await exportDoc(invoiceDoc(invoice, estimates, project), format)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-dvh pb-[calc(env(safe-area-inset-bottom)+72px)]">
      <NavBar
        title={invoiceLabel(invoice)}
        left={
          <BarButton onClick={() => navigate(parentPath)}>
            <ChevronLeft className="h-[17px] w-[10px] shrink-0" />
            <span className="max-w-[28vw] truncate sm:max-w-40">{project?.title || 'Объект'}</span>
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
              autoFocus={!invoice.title && invoice.lines.length === 0}
              value={invoice.title}
              placeholder="Название инвойса"
              enterKeyHint="done"
              onChange={(e) => set({ title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="w-full min-w-0 bg-transparent text-[17px] font-semibold outline-none"
            />
          </Cell>
        </label>
        <Cell>
          <span className="flex-1">Номер</span>
          <span className="text-label2 tabular-nums">{invoice.number || '—'}</span>
        </Cell>
      </Group>

      <Group
        header={`Строки${lines.length ? ` · ${lines.length}` : ''}`}
        footer={
          lines.length > 0
            ? 'Сумма строки «Смета» всегда равна текущему итогу сметы. Смахните строку влево, чтобы удалить её.'
            : undefined
        }
      >
        {lines.map(({ line, name, amount, currency, estimate, missing }) => (
          <SwipeRow
            key={line.id}
            open={openSwipe === line.id}
            onOpenChange={(open) => setOpenSwipe(open ? line.id : null)}
            onClick={() => {
              if (line.type === 'item') void navigate(paths.invoiceLine(invoice.id, line.id))
              else if (estimate) void navigate(paths.estimate(estimate.id))
            }}
            actions={[{ label: 'Удалить', icon: <Trash className="size-4" />, className: 'bg-red', onSelect: () => removeLine(line.id) }]}
          >
            <Cell className={missing ? '' : 'cursor-pointer'}>
              <div className="min-w-0 flex-1">
                <div className={`line-clamp-2 ${name && !missing ? '' : 'text-label3'}`}>
                  {line.type === 'estimate' && <LineTag>Смета</LineTag>}
                  {name || 'Без названия'}
                </div>
                {line.type === 'estimate' && (
                  <div className="text-[12px] text-label2 tabular-nums">
                    {estimate
                      ? `${estimate.rows.length} ${plural(estimate.rows.length, 'позиция', 'позиции', 'позиций')}`
                      : 'Смета была удалена из объекта'}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right font-medium tabular-nums">{missing ? '—' : formatMoney(amount, currency)}</div>
              {!missing && <ChevronRight className="h-3 w-[7px] shrink-0 text-label3" />}
            </Cell>
          </SwipeRow>
        ))}
        <button type="button" onClick={() => setPickerOpen(true)} className="block w-full text-left text-tint active:bg-card-pressed">
          <Cell>
            <Plus className="size-4" />
            Добавить смету
          </Cell>
        </button>
        <button
          type="button"
          onClick={() => navigate(paths.invoiceLine(invoice.id, null))}
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
            Итого · {lines.length} {plural(lines.length, 'строка', 'строки', 'строк')}
          </div>
          <div className="truncate text-[18px] leading-6 font-bold tabular-nums">{formatInvoiceTotal(invoice, estimates)}</div>
        </div>
        <button
          type="button"
          disabled={exporting}
          onClick={() => setExportOpen(true)}
          className="my-1.5 flex h-8 shrink-0 items-center gap-1 rounded-full bg-tint px-3.5 text-[14px] font-semibold text-white active:opacity-70 disabled:opacity-60"
        >
          <Share className="size-[15px]" />
          {exporting ? 'Готовлю…' : 'Экспорт'}
        </button>
      </BottomBar>

      <ActionSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Добавить смету"
        message={
          estimates.length === 0
            ? 'В этом объекте пока нет смет.'
            : available.length === 0
              ? 'Все сметы объекта уже добавлены в инвойс.'
              : 'Сумма строки будет обновляться вместе со сметой.'
        }
        actions={available.map((e) => ({
          label: `${e.title || 'Без названия'} — ${formatMoney(estimateTotal(e), e.currency)}`,
          onSelect: () => addEstimate(e.id),
        }))}
      />

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={invoiceLabel(invoice)}
        actions={[
          { label: 'Экспорт…', onSelect: () => setExportOpen(true) },
          { label: 'Удалить инвойс', destructive: true, onSelect: () => setConfirmDelete(true) },
        ]}
      />

      <ExportSheet
        doc={exportOpen ? invoiceDoc(invoice, estimates, project) : null}
        onClose={() => setExportOpen(false)}
        onExport={(format) => void runExport(format)}
      />

      <ActionSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        message="Инвойс будет удалён без возможности восстановления. Сметы останутся в объекте."
        actions={[
          {
            label: 'Удалить инвойс',
            destructive: true,
            onSelect: () => {
              onDelete(invoice.id)
              void navigate(parentPath)
            },
          },
        ]}
      />
    </div>
  )
}

function LineTag({ children }: { children: string }) {
  return (
    <span className="mr-1.5 inline-block rounded-[4px] bg-tint/15 px-1 align-[1px] text-[10px] font-semibold text-tint uppercase">
      {children}
    </span>
  )
}
