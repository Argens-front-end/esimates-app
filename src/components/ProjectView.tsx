import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { Estimate, Project } from '../lib/types'
import { formatTotals, plural } from '../lib/money'
import { paths } from '../lib/router'
import { BarButton, NavBar } from './ui/NavBar'
import { ActionSheet } from './ui/Sheet'
import { BottomBar } from './ui/BottomBar'
import { Cell } from './ui/Group'
import { ChevronLeft, Ellipsis, Plus } from './ui/icons'
import { EstimateRows } from './EstimateRows'
import { ProjectDeleteSheet } from './ProjectDeleteSheet'

interface Props {
  project: Project
  estimates: Estimate[]
  onDelete: (id: string) => void
  onCreateEstimate: () => void
  onDeleteEstimate: (id: string) => void
  onDuplicateEstimate: (id: string) => void
}

/** Read-only project page with its estimates; editing the project itself happens on a separate screen. */
export function ProjectView({
  project,
  estimates,
  onDelete,
  onCreateEstimate,
  onDeleteEstimate,
  onDuplicateEstimate,
}: Props) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const sorted = [...estimates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const name = project.title || 'Без названия'

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
      />

      <EstimateRows
        estimates={sorted}
        header={`Сметы${estimates.length ? ` · ${estimates.length}` : ''}`}
        footer={estimates.length > 0 ? 'Смахните строку влево, чтобы выгрузить, скопировать или удалить смету.' : undefined}
        onDelete={onDeleteEstimate}
        onDuplicate={onDuplicateEstimate}
      >
        <button type="button" onClick={onCreateEstimate} className="block w-full text-left text-tint active:bg-card-pressed">
          <Cell>
            <Plus className="size-4" />
            Добавить смету
          </Cell>
        </button>
      </EstimateRows>

      {estimates.length > 0 && (
        <BottomBar>
          <div className="min-w-0 flex-1 pl-2">
            <div className="text-[11px] text-label2">
              Итого · {estimates.length} {plural(estimates.length, 'смета', 'сметы', 'смет')}
            </div>
            <div className="truncate py-0.5 text-[18px] leading-6 font-bold tabular-nums">{formatTotals(estimates)}</div>
          </div>
        </BottomBar>
      )}

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={name}
        actions={[
          { label: 'Новая смета', onSelect: onCreateEstimate },
          { label: 'Изменить объект', onSelect: () => void navigate(paths.editProject(project.id)) },
          { label: 'Удалить объект', destructive: true, onSelect: () => setConfirmDelete(true) },
        ]}
      />

      <ProjectDeleteSheet
        project={confirmDelete ? project : null}
        estimateCount={estimates.length}
        onClose={() => setConfirmDelete(false)}
        onDelete={(id) => {
          onDelete(id)
          void navigate(paths.list())
        }}
      />
    </div>
  )
}
