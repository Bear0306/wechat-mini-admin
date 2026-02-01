interface InlineSelectProps {
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function InlineSelect({
  value,
  options,
  onChange,
  disabled = false,
  className = '',
}: InlineSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`min-w-[120px] rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50 ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
