interface Props {
  value: string
  onChange: (value: string) => void
  /** Unit shown inside the field — only once something is typed. */
  suffix: string
  placeholder?: string
  className?: string
  /** Adds an inline button that takes the whole field off the sheet. */
  onRemove?: () => void
  removeLabel?: string
}

/** Number field that grows its unit label ("sm", "so'm") as soon as it holds a value. */
export function SuffixInput({
  value,
  onChange,
  suffix,
  placeholder,
  className,
  onRemove,
  removeLabel,
}: Props) {
  const filled = value.trim() !== ''

  return (
    <span
      className={`suffix-input${filled ? ' suffix-on' : ''}${onRemove ? ' suffix-clearable' : ''}${
        className ? ` ${className}` : ''
      }`}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        placeholder={placeholder}
      />
      {filled && <span className="suffix-unit">{suffix}</span>}
      {onRemove && (
        <button
          type="button"
          className="suffix-clear"
          aria-label={removeLabel}
          title={removeLabel}
          onClick={onRemove}
        >
          ✕
        </button>
      )}
    </span>
  )
}
