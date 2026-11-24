import type { Estimate } from './types'
import { exportEstimateToExcel } from './exportExcel'
import { exportEstimateToMarkdown, exportEstimateToText } from './exportText'

export type ExportFormat = 'excel' | 'markdown' | 'text'

export const EXPORT_FORMATS: { format: ExportFormat; label: string }[] = [
  { format: 'excel', label: 'Excel (.xlsx)' },
  { format: 'markdown', label: 'Markdown (.md)' },
  { format: 'text', label: 'Текст (.txt)' },
]

export function exportEstimate(estimate: Estimate, format: ExportFormat) {
  switch (format) {
    case 'excel':
      return exportEstimateToExcel(estimate)
    case 'markdown':
      return exportEstimateToMarkdown(estimate)
    case 'text':
      return exportEstimateToText(estimate)
  }
}
