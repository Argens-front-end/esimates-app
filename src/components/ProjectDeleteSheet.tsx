import type { Project } from '../lib/types'
import { plural } from '../lib/money'
import { ActionSheet } from './ui/Sheet'

interface Props {
  project: Project | null
  estimateCount: number
  onClose: () => void
  onDelete: (id: string) => void
}

export function ProjectDeleteSheet({ project, estimateCount: n, onClose, onDelete }: Props) {
  const name = project?.title || 'Без названия'
  return (
    <ActionSheet
      open={project !== null}
      onClose={onClose}
      message={
        n > 0
          ? `Объект «${name}» и ${n} ${plural(n, 'смета', 'сметы', 'смет')} в нём будут удалены без возможности восстановления.`
          : `Объект «${name}» будет удалён.`
      }
      actions={[
        {
          label: n > 0 ? `Удалить объект и ${n} ${plural(n, 'смету', 'сметы', 'смет')}` : 'Удалить объект',
          destructive: true,
          onSelect: () => project && onDelete(project.id),
        },
      ]}
    />
  )
}
