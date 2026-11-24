import { useCallback, useRef, useState } from 'react'
import type { Estimate } from '../lib/types'
import { estimateTotal, formatMoney, formatShortDate, plural } from '../lib/money'
import { navigate } from '../lib/router'
import { exportEstimateToExcel } from '../lib/exportExcel'
import { exportBackup, readBackup } from '../lib/backup'
import type { ImportResult } from '../lib/storage'
import { Toast } from './ui/Toast'
import { BarButton, NavBar } from './ui/NavBar'
import { ActionSheet } from './ui/Sheet'
import { SwipeRow } from './ui/SwipeRow'
import { Cell } from './ui/Group'
import { ChevronRight, Copy, DocText, Ellipsis, Search, Table, Trash, XCircleFill } from './ui/icons'
import { BottomBar } from './ui/BottomBar'

interface Props {
  estimates: Estimate[]
  onCreate: () => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onImport: (estimates: Estimate[]) => ImportResult
}

export function EstimateList({ estimates, onCreate, onDelete, onDuplicate, onImport }: Props) {
  const [query, setQuery] = useState('')
  const [openSwipe, setOpenSwipe] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Estimate | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const hideToast = useCallback(() => setToast(null), [])
  const fileInput = useRef<HTMLInputElement>(null)

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const list = await readBackup(file)
      if (list.length === 0) return setToast('В файле нет смет')
      const { added, updated, skipped } = onImport(list)
      const parts = [
        added && `добавлено ${added}`,
        updated && `обновлено ${updated}`,
        skipped && `без изменений ${skipped}`,
      ].filter(Boolean)
      setToast(`Восстановлено: ${parts.join(', ')}`)
    } catch (e) {
      setToast((e as Error).message)
    }
  }

  const exportAll = async () => {
    await exportBackup(estimates)
  }

  const q = query.trim().toLowerCase()
  const filtered = estimates
    .filter((e) => e.title.toLowerCase().includes(q) || e.rows.some((r) => r.name.toLowerCase().includes(q)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <div className="min-h-dvh pb-[calc(env(safe-area-inset-bottom)+60px)]">
      <NavBar
        title="Сметы"
        largeTitle
        right={
          <BarButton label="Резервная копия" onClick={() => setMenuOpen(true)}>
            <Ellipsis className="size-[21px]" />
          </BarButton>
        }
      >
        {estimates.length > 0 && (
          <label className="mt-1.5 flex h-8 items-center gap-1.5 rounded-[9px] bg-fill px-2 text-label2">
            <Search className="size-3.5 shrink-0" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск"
              enterKeyHint="search"
              className="h-full w-full min-w-0 bg-transparent text-[15px] text-label outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button type="button" aria-label="Очистить" onClick={() => setQuery('')} className="text-label3">
                <XCircleFill className="size-4" />
              </button>
            )}
          </label>
        )}
      </NavBar>

      {estimates.length === 0 ? (
        <div className="mx-auto flex max-w-xs flex-col items-center px-6 pt-[18vh] text-center">
          <DocText className="size-12 text-label3" />
          <h2 className="mt-3 text-[18px] font-bold">Нет смет</h2>
          <p className="mt-1 text-[13px] text-label2">Создайте первую смету — она сохранится в памяти этого браузера.</p>
          <button
            type="button"
            onClick={onCreate}
            className="mt-5 h-10 w-full rounded-[10px] bg-tint text-[15px] font-semibold text-white active:opacity-70"
          >
            Создать смету
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="mt-2 h-10 w-full text-[15px] text-tint active:opacity-30"
          >
            Восстановить из резервной копии
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="pt-16 text-center text-label2">Ничего не найдено</p>
      ) : (
        <section className="mx-auto mt-1.5 max-w-2xl px-3">
          <div className="overflow-hidden rounded-[9px] bg-card [&>:last-child_.cell-sep]:border-b-0">
            {filtered.map((e) => (
              <SwipeRow
                key={e.id}
                open={openSwipe === e.id}
                onOpenChange={(open) => setOpenSwipe(open ? e.id : null)}
                onClick={() => navigate({ page: 'edit', id: e.id })}
                actions={[
                  { label: 'Excel', icon: <Table className="size-4" />, className: 'bg-tint', onSelect: () => exportEstimateToExcel(e) },
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
          </div>
          <p className="px-3 pt-1 text-[11px] text-label2">Смахните строку влево, чтобы выгрузить, скопировать или удалить смету.</p>
        </section>
      )}

      {estimates.length > 0 && (
        <BottomBar>
          <div className="w-10" />
          <div className="flex-1 text-center text-[10px] text-label2">
            {estimates.length} {plural(estimates.length, 'смета', 'сметы', 'смет')}
          </div>
          <button
            type="button"
            aria-label="Новая смета"
            onClick={onCreate}
            className="flex size-10 items-center justify-center text-tint active:opacity-30"
          >
            <ComposeIcon />
          </button>
        </BottomBar>
      )}

      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          void handleImportFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Резервная копия"
        message="Сметы хранятся только в этом браузере. Сохраните копию в файл, чтобы перенести их на другое устройство или не потерять при очистке браузера."
        actions={[
          ...(estimates.length > 0
            ? [{ label: `Сохранить копию (${estimates.length})`, onSelect: () => void exportAll() }]
            : []),
          { label: 'Восстановить из файла', onSelect: () => fileInput.current?.click() },
        ]}
      />

      <Toast message={toast} onHide={hideToast} />

      <ActionSheet
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        message={`Смета «${toDelete?.title || 'Без названия'}» будет удалена без возможности восстановления.`}
        actions={[{ label: 'Удалить смету', destructive: true, onSelect: () => toDelete && onDelete(toDelete.id) }]}
      />
    </div>
  )
}

const ComposeIcon = () => (
  <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
    <path d="M17.5 3.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 8.5-8.5Z" />
  </svg>
)
