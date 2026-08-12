import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LANGS, LANG_NAMES, LANG_SHORT, LOCALES, useI18n } from '../lib/i18n'
import { SyncBadge } from '../components/SyncBadge'
import orderImage from '../assets/order.jpg'
import analyticsImage from '../assets/analytics.jpg'
import historyImage from '../assets/history.jpg'
import statusImage from '../assets/status.jpg'

export function Home() {
  const { t, lang, setLang } = useI18n()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    // Kiosk screens stay open all day, so the clock has to keep up on its own.
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const day = new Intl.DateTimeFormat(LOCALES[lang], { weekday: 'long' }).format(now)
  const date = new Intl.DateTimeFormat(LOCALES[lang], {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(now)
  const time = new Intl.DateTimeFormat(LOCALES[lang], {
    hour: '2-digit',
    minute: '2-digit',
  }).format(now)

  return (
    <div className="page page-home">
      <div className="kiosk">
        <div className="kiosk-screen">
          <header className="kiosk-head">
            <div className="kiosk-brand">
              <h1 className="kiosk-title">{t('app.title')}</h1>
              <p className="kiosk-kicker">{t('home.kioskTitle')}</p>
            </div>

            <div className="kiosk-time">
              <span className="kiosk-clock">{time}</span>
              <span className="kiosk-date">
                {day} {date}
              </span>
            </div>

            <div className="kiosk-meta">
              <SyncBadge />
              <div className="lang-toggle" role="group" aria-label={t('common.language')}>
                {LANGS.map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`lang-toggle-btn${lang === code ? ' lang-toggle-on' : ''}`}
                    aria-pressed={lang === code}
                    title={LANG_NAMES[code]}
                    onClick={() => setLang(code)}
                  >
                    {LANG_SHORT[code]}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="kiosk-grid">
            <KioskTile
              to="/new"
              area="new"
              label={t('home.newOrder')}
              sub={t('home.newOrderSub')}
              image={orderImage}
              primary
            />
            <KioskTile
              to="/orders"
              area="history"
              label={t('home.history')}
              sub={t('home.historySub')}
              image={historyImage}
            />
            <KioskTile
              to="/status"
              area="status"
              label={t('nav.status')}
              sub={t('home.statusSub')}
              image={statusImage}
            />
            <KioskTile
              to="/analytics"
              area="analytics"
              label={t('nav.analytics')}
              sub={t('home.analyticsSub')}
              image={analyticsImage}
            />
          </div>

          <footer className="kiosk-foot">
            <Link to="/shop" className="kiosk-foot-link">
              {t('home.shopLink')} <span aria-hidden="true">›</span>
            </Link>
          </footer>
        </div>
      </div>
    </div>
  )
}

interface TileProps {
  to: string
  area: string
  label: string
  sub: string
  primary?: boolean
  /** Optional artwork; a scrim keeps the label readable on top of it. */
  image?: string
}

function KioskTile({ to, area, label, sub, primary, image }: TileProps) {
  return (
    <Link
      to={to}
      className={`kiosk-tile kiosk-${area}${primary ? ' kiosk-tile-primary' : ''}${
        image ? ' kiosk-tile-photo' : ''
      }`}
      style={{ gridArea: area }}
    >
      {image && (
        <span
          className="kiosk-tile-image"
          style={{ backgroundImage: `url(${image})` }}
          aria-hidden="true"
        />
      )}
      <span className="kiosk-tile-text">
        <span className="kiosk-tile-label">{label}</span>
        <span className="kiosk-tile-sub">{sub}</span>
      </span>
    </Link>
  )
}
