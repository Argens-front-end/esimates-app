import { useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { Estimate, Invoice, Project } from '../lib/types'
import { type Totals, addToTotals, formatDate, formatTotals, formatTotalsMap, plural } from '../lib/money'
import { formatInvoiceTotal, invoiceLabel, invoiceTotals } from '../lib/invoice'
import { invoiceDoc } from '../lib/exportDoc'
import { type ProjectTab, paths } from '../lib/router'
import { BarButton, NavBar } from './ui/NavBar'
import { ActionSheet } from './ui/Sheet'
import { BottomBar } from './ui/BottomBar'
import { Cell, Group } from './ui/Group'
import { Segmented } from './ui/Segmented'
import { SwipeRow } from './ui/SwipeRow'
import { ChevronLeft, ChevronRight, DocText, Ellipsis, Plus, Receipt, Share, Trash } from './ui/icons'
import { EstimateRows } from './EstimateRows'
import { ExportSheet } from './ExportSheet'
import { ProjectDeleteSheet } from './ProjectDeleteSheet'

interface Props {
  project: Project
  estimates: Estimate[]
  invoices: Invoice[]
  onDelete: (id: string) => void
  onCreateEstimate: () => void
  onDeleteEstimate: (id: string) => void
  onDuplicateEstimate: (id: string) => void
  onCreateInvoice: () => void
  onDeleteInvoice: (id: string) => void
}

const byUpdated = (a: { updatedAt: string }, b: { updatedAt: string }) => b.updatedAt.localeCompare(a.updatedAt)

/** Read-only project page with "Сметы" and "Инвойсы" tabs; editing the project itself happens on a separate screen. */
export function ProjectView({
  project,
  estimates,
  invoices,
  onDelete,
  onCreateEstimate,
  onDeleteEstimate,
  onDuplicateEstimate,
  onCreateInvoice,
  onDeleteInvoice,
}: Props) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: ProjectTab = searchParams.get('tab') === 'invoices' ? 'invoices' : 'estimates'
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const name = project.title || 'Без названия'

  const invoicesTotal: Totals = new Map()
  for (const inv of invoices) for (const [c, sum] of invoiceTotals(inv, estimates)) addToTotals(invoicesTotal, c, sum)
  const count = tab === 'estimates' ? estimates.length : invoices.length

  return (
    <div className="min-h-dvh pb-[calc(env(safe-area-inset-bottom)+72px)]">
      <NavBar
        title={name}
        largeTitle
        left={
          <BarButton onClick={() => navigate(paths.list())}>
            <ChevronLeft className="h-[17px] w-[10px]" />
            Объекты
          </BarButton>
        }
        right={
          <BarButton label="Действия" onClick={() => setMenuOpen(true)}>
            <Ellipsis className="size-[21px]" />
          </BarButton>
        }
      >
        <div className="mt-2">
          <Segmented
            value={tab}
            onChange={(t) =>
              setSearchParams(t === 'invoices' ? { tab: t } : {}, {
                replace: true,
              })
            }
            options={[
              {
                value: 'estimates',
                label: 'Сметы',
                icon: <DocText className="size-4" />,
                badge: estimates.length,
              },
              {
                value: 'invoices',
                label: 'Инвойсы',
                icon: <Receipt className="size-4" />,
                badge: invoices.length,
              },
            ]}
          />
        </div>
      </NavBar>

      {/* Re-keyed per tab so the list fades in on switch; pt compensates for Group's `first:` margin inside the wrapper. */}
      <div key={tab} className="animate-fade-in pt-2.5 motion-reduce:animate-none">
        {tab === 'estimates' ? (
          <EstimateRows
            project={project}
            estimates={[...estimates].sort(byUpdated)}
            header="Сметы объекта"
            footer={
              estimates.length > 0
                ? 'Смахните строку влево, чтобы выгрузить, скопировать или удалить смету.'
                : undefined
            }
            onDelete={onDeleteEstimate}
            onDuplicate={onDuplicateEstimate}
          >
            <AddButton label="Добавить смету" onClick={onCreateEstimate} />
          </EstimateRows>
        ) : (
          <InvoiceRows
            project={project}
            invoices={[...invoices].sort(byUpdated)}
            estimates={estimates}
            onDelete={onDeleteInvoice}
          >
            <AddButton label="Добавить инвойс" onClick={onCreateInvoice} />
          </InvoiceRows>
        )}
      </div>

      {count > 0 && (
        <BottomBar>
          <div className="min-w-0 flex-1 pl-2">
            <div className="text-[11px] text-label2">
              Итого · {count}{' '}
              {tab === 'estimates'
                ? plural(count, 'смета', 'сметы', 'смет')
                : plural(count, 'инвойс', 'инвойса', 'инвойсов')}
            </div>
            <div className="truncate py-0.5 text-[18px] leading-6 font-bold tabular-nums">
              {tab === 'estimates' ? formatTotals(estimates) : formatTotalsMap(invoicesTotal, invoices[0]?.currency)}
            </div>
          </div>
        </BottomBar>
      )}

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={name}
        actions={[
          { label: 'Новая смета', onSelect: onCreateEstimate },
          { label: 'Новый инвойс', onSelect: onCreateInvoice },
          {
            label: 'Изменить объект',
            onSelect: () => void navigate(paths.editProject(project.id)),
          },
          {
            label: 'Удалить объект',
            destructive: true,
            onSelect: () => setConfirmDelete(true),
          },
        ]}
      />

      <ProjectDeleteSheet
        project={confirmDelete ? project : null}
        estimateCount={estimates.length}
        invoiceCount={invoices.length}
        onClose={() => setConfirmDelete(false)}
        onDelete={(id) => {
          onDelete(id)
          void navigate(paths.list())
        }}
      />
    </div>
  )
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="block w-full text-left text-tint active:bg-card-pressed">
      <Cell>
        <Plus className="size-4" />
        {label}
      </Cell>
    </button>
  )
}

function InvoiceRows({
  project,
  invoices,
  estimates,
  onDelete,
  children,
}: {
  project: Project
  invoices: Invoice[]
  estimates: Estimate[]
  onDelete: (id: string) => void
  children: ReactNode
}) {
  const navigate = useNavigate()
  const [openSwipe, setOpenSwipe] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Invoice | null>(null)
  const [toExport, setToExport] = useState<Invoice | null>(null)

  return (
    <>
      <Group
        header="Инвойсы объекта"
        footer={invoices.length > 0 ? 'Смахните строку влево, чтобы выгрузить или удалить инвойс.' : undefined}
      >
        {invoices.map((inv) => (
          <SwipeRow
            key={inv.id}
            open={openSwipe === inv.id}
            onOpenChange={(open) => setOpenSwipe(open ? inv.id : null)}
            onClick={() => navigate(paths.invoice(inv.id))}
            actions={[
              {
                label: 'Экспорт',
                icon: <Share className="size-4" />,
                className: 'bg-tint',
                onSelect: () => setToExport(inv),
              },
              {
                label: 'Удалить',
                icon: <Trash className="size-4" />,
                className: 'bg-red',
                onSelect: () => setToDelete(inv),
              },
            ]}
          >
            <Cell className="min-h-[52px] cursor-pointer">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{invoiceLabel(inv)}</div>
                <div className="truncate text-[12px] text-label2">Создан {formatDate(inv.createdAt)}</div>
              </div>
              <div className="shrink-0 text-right text-[15px] tabular-nums">{formatInvoiceTotal(inv, estimates)}</div>
              <ChevronRight className="h-3 w-[7px] shrink-0 text-label3" />
            </Cell>
          </SwipeRow>
        ))}
        {children}
      </Group>

      <ExportSheet doc={toExport && invoiceDoc(toExport, estimates, project)} onClose={() => setToExport(null)} />

      <ActionSheet
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        message={`Инвойс «${toDelete ? invoiceLabel(toDelete) : ''}» будет удалён без возможности восстановления.`}
        actions={[
          {
            label: 'Удалить инвойс',
            destructive: true,
            onSelect: () => toDelete && onDelete(toDelete.id),
          },
        ]}
      />
    </>
  )
}
