import { useCallback, useRef, useState } from 'react'
import type { Estimate, Invoice, Project } from '../lib/types'
import { formatDate, plural } from '../lib/money'
import { useNavigate } from 'react-router'
import { paths } from '../lib/router'
import { type BackupData, exportBackup, readBackup } from '../lib/backup'
import type { ImportResult } from '../lib/storage'
import { Toast } from './ui/Toast'
import { BarButton, NavBar } from './ui/NavBar'
import { ActionSheet } from './ui/Sheet'
import { SwipeRow } from './ui/SwipeRow'
import { Cell, Group } from './ui/Group'
import { ChevronRight, DocText, Ellipsis, Folder, FolderPlus, Search, Trash, XCircleFill } from './ui/icons'
import { BottomBar } from './ui/BottomBar'
import { ProjectDeleteSheet } from './ProjectDeleteSheet'

interface Props {
  projects: Project[]
  estimates: Estimate[]
  invoices: Invoice[]
  onCreateProject: () => void
  onDeleteProject: (id: string) => void
  onImport: (data: BackupData) => ImportResult
  onClearAll: () => void
}

const byUpdated = (a: { updatedAt: string }, b: { updatedAt: string }) => b.updatedAt.localeCompare(a.updatedAt)

export function EstimateList({
  projects,
  estimates,
  invoices,
  onCreateProject,
  onDeleteProject,
  onImport,
  onClearAll,
}: Props) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [openSwipe, setOpenSwipe] = useState<string | null>(null)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const hideToast = useCallback(() => setToast(null), [])
  const fileInput = useRef<HTMLInputElement>(null)

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const data = await readBackup(file)
      if (data.estimates.length === 0 && data.projects.length === 0) return setToast('В файле нет смет')
      const { added, updated, skipped } = onImport(data)
      const parts = [
        added && `добавлено ${added}`,
        updated && `обновлено ${updated}`,
        skipped && `без изменений ${skipped}`,
      ].filter(Boolean)
      setToast(`Восстановлено: ${parts.join(', ') || 'объекты'}`)
    } catch (e) {
      setToast((e as Error).message)
    }
  }

  const exportAll = async () => {
    await exportBackup({ projects, estimates, invoices })
  }

  const q = query.trim().toLowerCase()
  const matches = (e: Estimate) => e.title.toLowerCase().includes(q) || e.rows.some((r) => r.name.toLowerCase().includes(q))
  const estimatesOf = (projectId: string) => estimates.filter((e) => e.projectId === projectId)
  const invoicesOf = (projectId: string) => invoices.filter((i) => i.projectId === projectId)
  const invoiceMatches = (i: Invoice) => i.title.toLowerCase().includes(q) || i.number.toLowerCase().includes(q)
  const filteredProjects = projects
    .filter((p) => !q || p.title.toLowerCase().includes(q) || estimatesOf(p.id).some(matches) || invoicesOf(p.id).some(invoiceMatches))
    .sort(byUpdated)
  const isEmpty = projects.length === 0

  return (
    <div className="min-h-dvh pb-[calc(env(safe-area-inset-bottom)+60px)]">
      <NavBar
        title="Объекты"
        largeTitle
        right={
          <BarButton label="Резервная копия" onClick={() => setMenuOpen(true)}>
            <Ellipsis className="size-[21px]" />
          </BarButton>
        }
      >
        {!isEmpty && (
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

      {isEmpty ? (
        <div className="mx-auto flex max-w-xs flex-col items-center px-6 pt-[18vh] text-center">
          <DocText className="size-12 text-label3" />
          <h2 className="mt-3 text-[18px] font-bold">Нет объектов</h2>
          <p className="mt-1 text-[13px] text-label2">
            Создайте объект и добавьте в него сметы — всё сохранится в памяти этого браузера.
          </p>
          <button
            type="button"
            onClick={onCreateProject}
            className="mt-5 h-10 w-full rounded-[10px] bg-tint text-[15px] font-semibold text-white active:opacity-70"
          >
            Создать объект
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="mt-2 h-10 w-full text-[15px] text-tint active:opacity-30"
          >
            Восстановить из резервной копии
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <p className="pt-16 text-center text-label2">Ничего не найдено</p>
      ) : (
        <Group footer="Смахните объект влево, чтобы удалить его вместе со сметами и инвойсами.">
          {filteredProjects.map((p) => (
            <SwipeRow
              key={p.id}
              open={openSwipe === p.id}
              onOpenChange={(open) => setOpenSwipe(open ? p.id : null)}
              onClick={() => navigate(paths.project(p.id))}
              actions={[
                { label: 'Удалить', icon: <Trash className="size-4" />, className: 'bg-red', onSelect: () => setProjectToDelete(p) },
              ]}
            >
              <Cell className="min-h-[52px] cursor-pointer">
                <Folder className="size-[22px] shrink-0 text-tint" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{p.title || 'Без названия'}</div>
                  <div className="truncate text-[12px] text-label2">Создан {formatDate(p.createdAt)}</div>
                </div>
                <ChevronRight className="h-3 w-[7px] shrink-0 text-label3" />
              </Cell>
            </SwipeRow>
          ))}
        </Group>
      )}

      {!isEmpty && (
        <BottomBar>
          <div className="w-10" />
          <div className="flex-1 text-center text-[10px] text-label2">
            {projects.length} {plural(projects.length, 'объект', 'объекта', 'объектов')}
          </div>
          <button
            type="button"
            aria-label="Новый объект"
            onClick={onCreateProject}
            className="flex size-10 items-center justify-center text-tint active:opacity-30"
          >
            <FolderPlus className="size-6" />
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
          ...(!isEmpty ? [{ label: 'Сохранить копию', onSelect: () => void exportAll() }] : []),
          { label: 'Восстановить из файла', onSelect: () => fileInput.current?.click() },
          ...(!isEmpty ? [{ label: 'Удалить все данные', destructive: true, onSelect: () => setConfirmClear(true) }] : []),
        ]}
      />

      <ActionSheet
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Удалить все данные?"
        message={`Все объекты (${projects.length}), сметы (${estimates.length}) и инвойсы (${invoices.length}) будут удалены из этого браузера без возможности восстановления. Если данные могут понадобиться, сначала сохраните резервную копию.`}
        actions={[
          { label: 'Сохранить копию', onSelect: () => void exportAll() },
          {
            label: 'Удалить всё',
            destructive: true,
            onSelect: () => {
              onClearAll()
              setQuery('')
              setToast('Все данные удалены')
            },
          },
        ]}
      />

      <Toast message={toast} onHide={hideToast} />

      <ProjectDeleteSheet
        project={projectToDelete}
        estimateCount={projectToDelete ? estimatesOf(projectToDelete.id).length : 0}
        invoiceCount={projectToDelete ? invoicesOf(projectToDelete.id).length : 0}
        onClose={() => setProjectToDelete(null)}
        onDelete={onDeleteProject}
      />
    </div>
  )
}
