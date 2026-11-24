import type { Project } from '../lib/types'
import { plural } from '../lib/money'
import { ActionSheet } from './ui/Sheet'

interface Props {
  project: Project | null
  estimateCount: number
  invoiceCount: number
  onClose: () => void
  onDelete: (id: string) => void
}

export function ProjectDeleteSheet({ project, estimateCount, invoiceCount, onClose, onDelete }: Props) {
  const name = project?.title || 'Без названия'
  const contents = [
    estimateCount > 0 && `${estimateCount} ${plural(estimateCount, 'смета', 'сметы', 'смет')}`,
    invoiceCount > 0 && `${invoiceCount} ${plural(invoiceCount, 'инвойс', 'инвойса', 'инвойсов')}`,
  ].filter(Boolean)
  return (
    <ActionSheet
      open={project !== null}
      onClose={onClose}
      message={
        contents.length > 0
          ? `Объект «${name}» и всё, что в нём (${contents.join(', ')}), будут удалены без возможности восстановления.`
          : `Объект «${name}» будет удалён.`
      }
      actions={[
        {
          label: contents.length > 0 ? 'Удалить объект со всем содержимым' : 'Удалить объект',
          destructive: true,
          onSelect: () => project && onDelete(project.id),
        },
      ]}
    />
  )
}
