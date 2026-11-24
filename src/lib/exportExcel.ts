import type ExcelJS from 'exceljs'
import type { Estimate } from './types'
import { currencySymbol, estimateTotal, rowSum } from './money'
import { sanitizeFileName, saveFile } from './saveFile'

const FONT = 'Arial'

export async function exportEstimateToExcel(estimate: Estimate) {
  const { default: ExcelJS } = await import('exceljs')

  const wb = new ExcelJS.Workbook()
  wb.created = new Date()
  const ws = wb.addWorksheet('Смета', {
    properties: { tabColor: { argb: 'FFFF0000' } },
    pageSetup: { paperSize: 9, orientation: 'portrait' },
  })

  const symbol = currencySymbol(estimate.currency)
  const thin = { style: 'thin' as const }
  const border = { top: thin, left: thin, bottom: thin, right: thin }

  ws.columns = [{ width: 3.33 }, { width: 46 }, { width: 7.67 }, { width: 10 }, { width: 11 }, { width: 10.83 }]

  const styleRow = (
    rowIdx: number,
    font: Partial<ExcelJS.Font>,
    alignments: Partial<ExcelJS.Alignment>[],
  ) => {
    const row = ws.getRow(rowIdx)
    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c)
      cell.font = { name: FONT, ...font }
      cell.alignment = alignments[c - 1] ?? alignments[0]
      cell.border = border
    }
  }

  const center = { horizontal: 'center', vertical: 'middle' } as const
  const right = { horizontal: 'right', vertical: 'middle' } as const
  const nameAlign = { vertical: 'middle', wrapText: true } as const

  ws.mergeCells('A1:F1')
  styleRow(1, { bold: true, size: 14 }, [center])
  ws.getCell('A1').value = 'Смета'

  ws.mergeCells('A2:F2')
  styleRow(2, { bold: true, size: 11 }, [center])
  ws.getRow(2).height = 16
  ws.getCell('A2').value = estimate.title

  ws.getRow(3).values = ['№', 'Наименование услуги', 'Ед. изм.', `Цена, ${symbol}`, 'Количество', `Сумма, ${symbol}`]
  styleRow(3, { bold: true, size: 10 }, [{}, nameAlign, center, right, right, right])

  const firstDataRow = 4
  estimate.rows.forEach((item, i) => {
    const rowIdx = firstDataRow + i
    const row = ws.getRow(rowIdx)
    row.values = [i + 1, item.name, item.unit, item.price, item.quantity]
    row.getCell(6).value = { formula: `ROUND(D${rowIdx}*E${rowIdx},2)`, result: rowSum(item) }
    styleRow(rowIdx, { size: 10 }, [center, nameAlign, center, right, right, right])
  })

  const lastDataRow = firstDataRow + estimate.rows.length - 1
  const totalRowIdx = lastDataRow + 1
  styleRow(totalRowIdx, { size: 10 }, [center])
  ws.mergeCells(`A${totalRowIdx}:D${totalRowIdx}`)
  const totalLabel = ws.getCell(`E${totalRowIdx}`)
  totalLabel.value = 'Итого:'
  totalLabel.font = { name: FONT, size: 10, bold: true }
  totalLabel.alignment = { horizontal: 'right' }
  const totalCell = ws.getCell(`F${totalRowIdx}`)
  totalCell.value =
    estimate.rows.length > 0
      ? { formula: `SUM(F${firstDataRow}:F${lastDataRow})`, result: estimateTotal(estimate) }
      : 0
  totalCell.font = { name: FONT, size: 10, bold: true }
  totalCell.alignment = right

  const buffer = await wb.xlsx.writeBuffer()
  await saveFile(new Blob([buffer], { type: XLSX_MIME }), `${sanitizeFileName(estimate.title || 'Смета')}.xlsx`)
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
