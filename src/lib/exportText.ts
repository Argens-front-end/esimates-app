import type { ExportDoc } from './exportDoc'
import { docTotals } from './exportDoc'
import { currencySymbol, formatMoney, formatNumber, formatTotalsMap, rowSum } from './money'
import { sanitizeFileName, saveFile } from './saveFile'

const baseName = (doc: ExportDoc) => sanitizeFileName(doc.fileName)

const mdCell = (s: string) => s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')

export function docToMarkdown(doc: ExportDoc) {
  const totals = docTotals(doc)
  const single = totals.size === 1
  const suffix = single ? `, ${mdCell(currencySymbol([...totals.keys()][0]))}` : ''
  const table =
    doc.layout === 'full'
      ? [
          `| № | Наименование услуги | Ед. изм. | Цена${suffix} | Количество | Сумма${suffix} |`,
          '|---:|---|:---:|---:|---:|---:|',
          ...doc.rows.map(
            (r, i) =>
              `| ${i + 1} | ${mdCell(r.name)} | ${mdCell(r.unit)} | ${formatMoney(r.price, r.currency)} | ${formatNumber(r.quantity)} | ${formatMoney(rowSum(r), r.currency)} |`,
          ),
        ]
      : [
          `| № | Наименование | Сумма${suffix} |`,
          '|---:|---|---:|',
          ...doc.rows.map((r, i) => `| ${i + 1} | ${mdCell(r.name)} | ${formatMoney(rowSum(r), r.currency)} |`),
        ]
  const lines = [
    `# ${doc.heading}${doc.title ? `: ${mdCell(doc.title)}` : ''}`,
    '',
    ...table,
    '',
    `**Итого: ${formatTotalsMap(totals)}**`,
    '',
  ]
  return lines.join('\n')
}

export function docToText(doc: ExportDoc) {
  const lines = [doc.heading, ...(doc.title ? [doc.title] : []), '']
  doc.rows.forEach((r, i) => {
    if (doc.layout === 'amounts') {
      lines.push(`${i + 1}. ${r.name || 'Без названия'} — ${formatMoney(rowSum(r), r.currency)}`)
      return
    }
    lines.push(`${i + 1}. ${r.name || 'Без названия'}`)
    lines.push(
      `   ${formatNumber(r.quantity)} ${r.unit} × ${formatMoney(r.price, r.currency)} = ${formatMoney(rowSum(r), r.currency)}`,
    )
  })
  if (doc.rows.length > 0) lines.push('')
  lines.push(`Итого: ${formatTotalsMap(docTotals(doc))}`, '')
  return lines.join('\n')
}

export async function exportDocToMarkdown(doc: ExportDoc) {
  const blob = new Blob([docToMarkdown(doc)], { type: 'text/markdown;charset=utf-8' })
  await saveFile(blob, `${baseName(doc)}.md`)
}

export async function exportDocToText(doc: ExportDoc) {
  const blob = new Blob([docToText(doc)], { type: 'text/plain;charset=utf-8' })
  await saveFile(blob, `${baseName(doc)}.txt`)
}
