import type { Estimate } from '../lib/types'
import { type ExportFormat, EXPORT_FORMATS, exportEstimate } from '../lib/exportEstimate'
import { ActionSheet } from './ui/Sheet'

interface Props {
  estimate: Estimate | null
  onClose: () => void
  onExport?: (format: ExportFormat) => void
}

/** Format picker; uses `onExport` when given, otherwise exports directly. */
export function ExportSheet({ estimate, onClose, onExport }: Props) {
  return (
    <ActionSheet
      open={estimate !== null}
      onClose={onClose}
      title={`Экспорт «${estimate?.title || 'Без названия'}»`}
      actions={EXPORT_FORMATS.map(({ format, label }) => ({
        label,
        onSelect: () => {
          if (!estimate) return
          if (onExport) onExport(format)
          else void exportEstimate(estimate, format)
        },
      }))}
    />
  )
}
