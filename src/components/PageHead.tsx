import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { ArrowLeftIcon } from './icons'

interface Props {
  title: string
  /** Names the screen at a glance — same mark used on the landing tiles. */
  icon: React.ReactNode
  sub?: string
  /** Buttons that belong to the whole screen, e.g. print or edit. */
  actions?: React.ReactNode
}

/**
 * Every screen opens the same way: a way back, the screen's mark, its name.
 * The app has no navigation bar, so the return sits with the title rather than
 * floating loose above the content.
 */
export function PageHead({ title, icon, sub, actions }: Props) {
  const { t } = useI18n()

  return (
    <header className="page-head no-print">
      <Link to="/" className="page-head-back" aria-label={t('nav.home')} title={t('nav.home')}>
        <ArrowLeftIcon />
      </Link>

      <span className="page-head-icon" aria-hidden="true">
        {icon}
      </span>

      <div className="page-head-text">
        <h1>{title}</h1>
        {sub && <p className="muted small">{sub}</p>}
      </div>

      {actions && <div className="page-head-actions">{actions}</div>}
    </header>
  )
}
