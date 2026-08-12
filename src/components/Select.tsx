import { useEffect, useId, useRef, useState } from 'react'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  /** Accessible name when the field has no visible <span> label. */
  label?: string
  className?: string
}

/**
 * Glass dropdown. Replaces <select> because the native option list cannot be
 * styled and renders tiny on the shop tablet — these rows are 48 px targets.
 */
export function Select<T extends string>({ value, options, onChange, label, className }: Props<T>) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  // Near the bottom of a long form the menu would open off-screen.
  const [dropUp, setDropUp] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const listId = useId()

  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  const current = options[index]

  useEffect(() => {
    if (!open) return
    setActive(index)
    function onPointerDown(e: PointerEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
    // Re-syncing the highlight on every value change would fight arrow keys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function toggle() {
    if (!open) {
      const box = trigger.current?.getBoundingClientRect()
      setDropUp(Boolean(box && box.bottom + 280 > window.innerHeight && box.top > 280))
    }
    setOpen((v) => !v)
  }

  function pick(option: SelectOption<T>) {
    onChange(option.value)
    setOpen(false)
    trigger.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      toggle()
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % options.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + options.length) % options.length)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pick(options[active])
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(options.length - 1)
    }
  }

  return (
    <div ref={wrap} className={`select${open ? ' select-open' : ''}${className ? ` ${className}` : ''}`}>
      <button
        ref={trigger}
        type="button"
        className="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        onClick={toggle}
        onKeyDown={onKeyDown}
      >
        <span>{current?.label ?? ''}</span>
        <span className="select-caret" aria-hidden="true" />
      </button>

      {open && (
        <ul
          id={listId}
          className={`select-menu${dropUp ? ' select-menu-up' : ''}`}
          role="listbox"
          aria-label={label}
        >
          {options.map((option, i) => (
            <li key={option.value} role="none">
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`select-option${option.value === value ? ' select-option-on' : ''}${
                  i === active ? ' select-option-active' : ''
                }`}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(option)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
