import type { Estimate } from './types'
import { currencySymbol, estimateTotal, formatMoney, formatNumber, rowSum } from './money'
import { sanitizeFileName, saveFile } from './saveFile'

const baseName = (estimate: Estimate) => sanitizeFileName(estimate.title || 'Смета')

const mdCell = (s: string) => s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')

export function estimateToMarkdown(estimate: Estimate) {
  const symbol = currencySymbol(estimate.currency)
  const money = (v: number) => formatMoney(v, estimate.currency)
  const lines = [
    `# Смета${estimate.title ? `: ${mdCell(estimate.title)}` : ''}`,
    '',
    `| № | Наименование услуги | Ед. изм. | Цена, ${mdCell(symbol)} | Количество | Сумма, ${mdCell(symbol)} |`,
    '|---:|---|:---:|---:|---:|---:|',
    ...estimate.rows.map(
      (r, i) =>
        `| ${i + 1} | ${mdCell(r.name)} | ${mdCell(r.unit)} | ${money(r.price)} | ${formatNumber(r.quantity)} | ${money(rowSum(r))} |`,
    ),
    '',
    `**Итого: ${money(estimateTotal(estimate))}**`,
    '',
  ]
  return lines.join('\n')
}

export function estimateToText(estimate: Estimate) {
  const money = (v: number) => formatMoney(v, estimate.currency)
  const lines = ['Смета', ...(estimate.title ? [estimate.title] : []), '']
  estimate.rows.forEach((r, i) => {
    lines.push(`${i + 1}. ${r.name || 'Без названия'}`)
    lines.push(`   ${formatNumber(r.quantity)} ${r.unit} × ${money(r.price)} = ${money(rowSum(r))}`)
  })
  if (estimate.rows.length > 0) lines.push('')
  lines.push(`Итого: ${money(estimateTotal(estimate))}`, '')
  return lines.join('\n')
}

export async function exportEstimateToMarkdown(estimate: Estimate) {
  const blob = new Blob([estimateToMarkdown(estimate)], { type: 'text/markdown;charset=utf-8' })
  await saveFile(blob, `${baseName(estimate)}.md`)
}

export async function exportEstimateToText(estimate: Estimate) {
  const blob = new Blob([estimateToText(estimate)], { type: 'text/plain;charset=utf-8' })
  await saveFile(blob, `${baseName(estimate)}.txt`)
}
