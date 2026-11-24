import type ExcelJS from 'exceljs'
import type { ExportDoc } from './exportDoc'
import { docTotals } from './exportDoc'
import { currencySymbol, formatTotalsMap, rowSum } from './money'
import { sanitizeFileName, saveFile } from './saveFile'

const FONT = 'Arial'

export async function exportDocToExcel(doc: ExportDoc) {
  const { default: ExcelJS } = await import('exceljs')

  const wb = new ExcelJS.Workbook()
  wb.created = new Date()
  const ws = wb.addWorksheet(doc.heading.slice(0, 31), {
    properties: { tabColor: { argb: 'FFFF0000' } },
    pageSetup: { paperSize: 9, orientation: 'portrait' },
  })

  const full = doc.layout === 'full'
  const totals = docTotals(doc)
  const single = totals.size === 1
  const suffix = single ? `, ${currencySymbol([...totals.keys()][0])}` : ''
  // With mixed currencies each amount carries its own symbol.
  const moneyFmt = (currency: string) => (single ? undefined : `#,##0.00 "${currencySymbol(currency).replace(/"/g, '')}"`)
  const thin = { style: 'thin' as const }
  const border = { top: thin, left: thin, bottom: thin, right: thin }

  ws.columns = full
    ? [{ width: 3.33 }, { width: 46 }, { width: 7.67 }, { width: 10 }, { width: 11 }, { width: 10.83 }]
    : [{ width: 3.33 }, { width: 60 }, { width: 14 }]
  const colCount = ws.columns.length
  const lastCol = full ? 'F' : 'C'
  const sumCol = lastCol

  const styleRow = (
    rowIdx: number,
    font: Partial<ExcelJS.Font>,
    alignments: Partial<ExcelJS.Alignment>[],
  ) => {
    const row = ws.getRow(rowIdx)
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c)
      cell.font = { name: FONT, ...font }
      cell.alignment = alignments[c - 1] ?? alignments[0]
      cell.border = border
    }
  }

  const center = { horizontal: 'center', vertical: 'middle' } as const
  const right = { horizontal: 'right', vertical: 'middle' } as const
  const nameAlign = { vertical: 'middle', wrapText: true } as const
  const dataAlign = full ? [center, nameAlign, center, right, right, right] : [center, nameAlign, right]

  ws.mergeCells(`A1:${lastCol}1`)
  styleRow(1, { bold: true, size: 14 }, [center])
  ws.getCell('A1').value = doc.heading

  ws.mergeCells(`A2:${lastCol}2`)
  styleRow(2, { bold: true, size: 11 }, [center])
  ws.getRow(2).height = 16
  ws.getCell('A2').value = doc.title

  ws.getRow(3).values = full
    ? ['№', 'Наименование услуги', 'Ед. изм.', `Цена${suffix}`, 'Количество', `Сумма${suffix}`]
    : ['№', 'Наименование', `Сумма${suffix}`]
  styleRow(3, { bold: true, size: 10 }, full ? [{}, nameAlign, center, right, right, right] : [{}, nameAlign, right])

  const firstDataRow = 4
  doc.rows.forEach((item, i) => {
    const rowIdx = firstDataRow + i
    const row = ws.getRow(rowIdx)
    if (full) {
      row.values = [i + 1, item.name, item.unit, item.price, item.quantity]
      row.getCell(6).value = { formula: `ROUND(D${rowIdx}*E${rowIdx},2)`, result: rowSum(item) }
    } else {
      row.values = [i + 1, item.name, rowSum(item)]
    }
    styleRow(rowIdx, { size: 10 }, dataAlign)
    const fmt = moneyFmt(item.currency)
    if (fmt) {
      row.getCell(colCount).numFmt = fmt
      if (full) row.getCell(4).numFmt = fmt
    }
  })

  const lastDataRow = firstDataRow + doc.rows.length - 1
  const totalRowIdx = lastDataRow + 1
  styleRow(totalRowIdx, { size: 10 }, [center])
  if (full) ws.mergeCells(`A${totalRowIdx}:D${totalRowIdx}`)
  const totalLabel = ws.getCell(`${full ? 'E' : 'B'}${totalRowIdx}`)
  totalLabel.value = 'Итого:'
  totalLabel.font = { name: FONT, size: 10, bold: true }
  totalLabel.alignment = { horizontal: 'right' }
  const totalCell = ws.getCell(`${sumCol}${totalRowIdx}`)
  totalCell.value = !single
    ? formatTotalsMap(totals)
    : doc.rows.length > 0
      ? { formula: `SUM(${sumCol}${firstDataRow}:${sumCol}${lastDataRow})`, result: [...totals.values()][0] }
      : 0
  totalCell.font = { name: FONT, size: 10, bold: true }
  totalCell.alignment = right

  const buffer = await wb.xlsx.writeBuffer()
  await saveFile(new Blob([buffer], { type: XLSX_MIME }), `${sanitizeFileName(doc.fileName)}.xlsx`)
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
