/**
 * One icon set for the whole app: thin strokes, 24-unit box, `currentColor`
 * so each caller decides the tone.
 */

export function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6.5 3.5h3l1.6 4-2 1.4a12 12 0 0 0 6 6l1.4-2 4 1.6v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z" />
    </svg>
  )
}

export function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  )
}

export function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3.5v4M16 3.5v4" />
    </svg>
  )
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 7h16" />
      <path d="M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" />
      <path d="M6.5 7l.9 12a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9l.9-12" />
      <path d="M10.5 11v6M13.5 11v6" />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
      <path d="M14.5 6.5 17.5 9.5" />
    </svg>
  )
}

export function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 12H4M10 6l-6 6 6 6" />
    </svg>
  )
}

export function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1.2" />
      <circle cx="4" cy="12" r="1.2" />
      <circle cx="4" cy="18" r="1.2" />
    </svg>
  )
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 19h16" />
      <path d="M7 15V9M12 15V5M17 15v-4" />
    </svg>
  )
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="6.4" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

export function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3 20c0-3.3 2.7-5.6 6-5.6s6 2.3 6 5.6" />
      <path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M17.5 14.8c2.2.6 3.5 2.5 3.5 5.2" />
    </svg>
  )
}

export function PrinterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 9V4h10v5" />
      <path d="M7 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M7 14h10v6H7z" />
    </svg>
  )
}

export function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 8.5h3l1.5-2.5h7L17 8.5h3a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 20 18.5H4A1.5 1.5 0 0 1 2.5 17v-7A1.5 1.5 0 0 1 4 8.5z" />
      <circle cx="12" cy="13.5" r="3.4" />
    </svg>
  )
}

/** New order: a sheet with a plus — what the screen actually creates. */
export function NewOrderIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9" />
      <path d="M14 3v5a1 1 0 0 0 1 1h4" />
      <path d="M12 12v6M9 15h6" />
    </svg>
  )
}

/** A garment, for anything that names what was ordered. */
export function ShirtIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 3 6 4.2 3 6l1.8 3.4L7 8.4V20a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8.4l2.2 1L21 6l-3-1.8L15 3" />
      <path d="M9 3c.6 2 4.4 2 6 0" />
    </svg>
  )
}

/** Arrows pushing apart — swap this panel into the large slot. */
export function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" />
    </svg>
  )
}

export function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19h14" />
    </svg>
  )
}
