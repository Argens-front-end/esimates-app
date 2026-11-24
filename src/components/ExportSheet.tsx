import { type ExportDoc, type ExportFormat, EXPORT_FORMATS, exportDoc } from '../lib/exportDoc'
import { ActionSheet } from './ui/Sheet'

interface Props {
  doc: ExportDoc | null
  onClose: () => void
  onExport?: (format: ExportFormat) => void
}

/** Format picker; uses `onExport` when given, otherwise exports directly. */
export function ExportSheet({ doc, onClose, onExport }: Props) {
  return (
    <ActionSheet
      open={doc !== null}
      onClose={onClose}
      title={`Экспорт «${doc?.fileName ?? ''}»`}
      actions={EXPORT_FORMATS.map(({ format, label }) => ({
        label,
        onSelect: () => {
          if (!doc) return
          if (onExport) onExport(format)
          else void exportDoc(doc, format)
        },
      }))}
    />
  )
}
