import { useState } from 'react'
import type { EstimateRow } from '../lib/types'
import { UNITS } from '../lib/types'
import { currencySymbol, formatMoney, rowSum } from '../lib/money'
import { newRow } from '../lib/storage'
import { useGoBack } from '../lib/router'
import { NumberInput } from './NumberInput'
import { BarButton, NavBar } from './ui/NavBar'
import { Cell, Group } from './ui/Group'
import { ArrowDown, ArrowUp } from './ui/icons'

interface Props {
  rows: EstimateRow[]
  currency: string
  /** `null` adds a new row. */
  rowId: string | null
  /** Where to go when closing if there is no in-app history. */
  backPath: string
  onChange: (rows: EstimateRow[]) => void
}

const fieldClass = 'w-full min-w-0 bg-transparent text-right text-[15px] tabular-nums outline-none'

/** Full-screen page for adding or editing a single priced row (estimate row or invoice item). */
export function RowEditor({ rows, currency, rowId, backPath, onChange }: Props) {
  const isNew = rowId === null
  const existing = isNew ? undefined : rows.find((r) => r.id === rowId)
  const [draft, setDraft] = useState<EstimateRow>(() => existing ?? newRow())
  // Checked once so the form doesn't flash "not found" right after deleting the row.
  const [found] = useState(isNew || existing !== undefined)
  const set = (patch: Partial<EstimateRow>) => setDraft((d) => ({ ...d, ...patch }))
  const canSave = draft.name.trim().length > 0
  const isPresetUnit = (UNITS as readonly string[]).includes(draft.unit)
  const index = rows.findIndex((r) => r.id === draft.id)
  const canMoveUp = index > 0
  const canMoveDown = index >= 0 && index < rows.length - 1

  const goBack = useGoBack()
  const close = () => goBack(backPath)

  const save = () => {
    if (!canSave) return
    const row = { ...draft, name: draft.name.trim(), unit: draft.unit.trim() }
    onChange(rows.some((r) => r.id === row.id) ? rows.map((r) => (r.id === row.id ? row : r)) : [...rows, row])
    close()
  }

  const move = (delta: -1 | 1) => {
    const next = rows.map((r) => (r.id === draft.id ? draft : r))
    const j = index + delta
    if (index < 0 || j < 0 || j >= next.length) return
    ;[next[index], next[j]] = [next[j], next[index]]
    onChange(next)
  }

  const remove = () => {
    onChange(rows.filter((r) => r.id !== draft.id))
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
              placeholder="Работы или материалы"
              enterKeyHint="next"
              onChange={(e) => set({ name: e.target.value.replace(/\n/g, ' ') })}
              className="block w-full resize-none bg-transparent text-[15px] leading-snug outline-none"
            />
          </div>
        </Group>

        <Group>
          <label className="block">
            <Cell>
              <span className="shrink-0">Количество</span>
              <NumberInput
                aria-label="Количество"
                value={draft.quantity}
                onChange={(quantity) => set({ quantity })}
                className={fieldClass}
              />
              <span className="shrink-0 text-label2">{draft.unit}</span>
            </Cell>
          </label>
          <label className="block">
            <Cell>
              <span className="shrink-0">Цена за ед.</span>
              <NumberInput
                aria-label="Цена за единицу"
                enterKeyHint="done"
                value={draft.price}
                onChange={(price) => set({ price })}
                className={fieldClass}
              />
              <span className="shrink-0 text-label2">{currencySymbol(currency)}</span>
            </Cell>
          </label>
          <Cell>
            <span className="flex-1 font-semibold">Сумма</span>
            <span className="font-semibold tabular-nums">{formatMoney(rowSum(draft), currency)}</span>
          </Cell>
        </Group>

        <Group header="Единица измерения">
          <div className="flex flex-wrap gap-1.5 p-2.5">
            {UNITS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => set({ unit: u })}
                className={`h-7 min-w-10 rounded-full px-3 text-[13px] transition-colors active:scale-95 ${
                  draft.unit === u ? 'bg-tint font-medium text-white' : 'bg-fill text-label'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
          <label className="block border-t-[0.5px] border-sep">
            <Cell>
              <span className="shrink-0">Своя</span>
              <input
                aria-label="Своя единица измерения"
                value={isPresetUnit ? '' : draft.unit}
                placeholder="напр. рулон"
                onChange={(e) => set({ unit: e.target.value })}
                className="w-full min-w-0 bg-transparent text-right outline-none"
              />
            </Cell>
          </label>
        </Group>

        {!isNew && (
          <>
            <Group>
              <button type="button" disabled={!canMoveUp} onClick={() => move(-1)} className="block w-full text-left text-tint active:bg-card-pressed disabled:text-label3">
                <Cell>
                  <ArrowUp className="size-4" />
                  Переместить выше
                </Cell>
              </button>
              <button type="button" disabled={!canMoveDown} onClick={() => move(1)} className="block w-full text-left text-tint active:bg-card-pressed disabled:text-label3">
                <Cell>
                  <ArrowDown className="size-4" />
                  Переместить ниже
                </Cell>
              </button>
            </Group>
            <Group>
              <button
                type="button"
                onClick={remove}
                className="h-10 w-full text-center text-red active:bg-card-pressed"
              >
                Удалить позицию
              </button>
            </Group>
          </>
        )}
        <button type="submit" hidden />
      </form>
    </div>
  )
}
