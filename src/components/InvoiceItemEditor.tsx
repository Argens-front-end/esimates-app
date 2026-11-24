import { useState } from 'react'
import type { Invoice, InvoiceItemLine } from '../lib/types'
import { currencySymbol } from '../lib/money'
import { uid } from '../lib/storage'
import { paths, useGoBack } from '../lib/router'
import { NumberInput } from './NumberInput'
import { BarButton, NavBar } from './ui/NavBar'
import { Cell, Group } from './ui/Group'

interface Props {
  invoice: Invoice
  /** `null` adds a new item. */
  lineId: string | null
  onChange: (invoice: Invoice) => void
}

/** Full-screen page for adding or editing an invoice item: a name and an amount. */
export function InvoiceItemEditor({ invoice, lineId, onChange }: Props) {
  const isNew = lineId === null
  const existing = invoice.lines.find((l): l is InvoiceItemLine => l.type === 'item' && l.id === lineId)
  const [draft, setDraft] = useState<InvoiceItemLine>(() => existing ?? { id: uid(), type: 'item', name: '', amount: 0 })
  // Checked once so the form doesn't flash "not found" right after deleting the line.
  const [found] = useState(isNew || existing !== undefined)
  const canSave = draft.name.trim().length > 0

  const goBack = useGoBack()
  const close = () => goBack(paths.invoice(invoice.id))

  const save = () => {
    if (!canSave) return
    const line = { ...draft, name: draft.name.trim() }
    onChange({
      ...invoice,
      lines: invoice.lines.some((l) => l.id === line.id)
        ? invoice.lines.map((l) => (l.id === line.id ? line : l))
        : [...invoice.lines, line],
    })
    close()
  }

  const remove = () => {
    onChange({ ...invoice, lines: invoice.lines.filter((l) => l.id !== draft.id) })
    close()
  }

  if (!found) {
    return (
      <>
        <NavBar left={<BarButton onClick={close}>Назад</BarButton>} />
        <p className="pt-24 text-center text-label2">Позиция не найдена</p>
      </>
    )
  }

  return (
    <div className="min-h-dvh pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <NavBar
        title={isNew ? 'Новая позиция' : 'Позиция'}
        left={<BarButton onClick={close}>Отменить</BarButton>}
        right={
          <BarButton bold disabled={!canSave} onClick={save}>
            {isNew ? 'Добавить' : 'Готово'}
          </BarButton>
        }
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Group header="Наименование">
          <div className="px-3 py-2">
            <textarea
              autoFocus={isNew}
              rows={2}
              value={draft.name}
              placeholder="Например, доставка материалов"
              enterKeyHint="next"
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value.replace(/\n/g, ' ') }))}
              className="block w-full resize-none bg-transparent text-[15px] leading-snug outline-none"
            />
          </div>
        </Group>

        <Group>
          <label className="block">
            <Cell>
              <span className="shrink-0 font-semibold">Сумма</span>
              <NumberInput
                aria-label="Сумма"
                enterKeyHint="done"
                value={draft.amount}
                onChange={(amount) => setDraft((d) => ({ ...d, amount }))}
                className="w-full min-w-0 bg-transparent text-right text-[15px] font-semibold tabular-nums outline-none"
              />
              <span className="shrink-0 text-label2">{currencySymbol(invoice.currency)}</span>
            </Cell>
          </label>
        </Group>

        {!isNew && (
          <Group>
            <button type="button" onClick={remove} className="h-10 w-full text-center text-red active:bg-card-pressed">
              Удалить позицию
            </button>
          </Group>
        )}
        <button type="submit" hidden />
      </form>
    </div>
  )
}
