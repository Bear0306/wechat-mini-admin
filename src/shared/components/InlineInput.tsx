interface InlineInputProps {
  type?: 'text' | 'number'
  value: string | number
  onChange: (value: string | number) => void
  disabled?: boolean
  placeholder?: string
  min?: number
  max?: number
  className?: string
}

export function InlineInput({
  type = 'text',
  value,
  onChange,
  disabled = false,
  placeholder,
  min,
  max,
  className = '',
}: InlineInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) =>
        onChange(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)
      }
      disabled={disabled}
      placeholder={placeholder}
      min={min}
      max={max}
      className={`min-w-[80px] rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50 ${className}`}
    />
  )
}
