import { useState, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: number
  onChange: (value: number) => void
}

const parse = (text: string) => {
  const n = Number(text.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

const display = (value: number) => (value === 0 ? '' : String(value).replace('.', ','))

/** Numeric input that accepts both "," and "." as decimal separator and keeps partial input like "1,". */
export function NumberInput({ value, onChange, ...rest }: Props) {
  const [text, setText] = useState(display(value))

  if (parse(text) !== value) setText(display(value))

  return (
    <input
      placeholder="0"
      {...rest}
      inputMode="decimal"
      enterKeyHint="next"
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const next = e.target.value
        if (!/^-?[\d\s]*[.,]?\d*$/.test(next)) return
        setText(next)
        onChange(parse(next))
      }}
      onBlur={() => setText(display(value))}
    />
  )
}
