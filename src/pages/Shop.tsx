import { useMemo, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { addTailor, removeTailor, saveTailor, useTailors, type Tailor } from '../lib/tailors'
import { normalizePhone } from '../lib/db'
import { PageHead } from '../components/PageHead'
import { PhoneInput } from '../components/PhoneInput'
import { UsersIcon } from '../components/icons'
import { CheckIcon, CloseIcon, PencilIcon, TrashIcon } from '../components/icons'

export function Shop() {
  const { t } = useI18n()
  const tailors = useTailors()

  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [newTailor, setNewTailor] = useState({ name: '', phone: '' })
  const [editing, setEditing] = useState<Tailor | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tailors
    const digits = normalizePhone(query)
    return tailors.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        (digits.length >= 3 && normalizePhone(row.phone).includes(digits)),
    )
  }, [tailors, query])

  function submitNew() {
    if (!newTailor.name.trim() && !newTailor.phone.trim()) return
    addTailor({ name: newTailor.name.trim(), phone: newTailor.phone.trim() })
    setNewTailor({ name: '', phone: '' })
    setAdding(false)
  }

  function commitEdit() {
    if (!editing) return
    saveTailor({ ...editing, name: editing.name.trim(), phone: editing.phone.trim() })
    setEditing(null)
  }

  return (
    <div className="page">
      <PageHead title={t('shop.title')} icon={<UsersIcon />} sub={t('shop.hint')} />

      <section className="card">
        {/* search and the add button share one row */}
        <div className="roster-bar">
          <input
            className="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('shop.searchTailors')}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setAdding((v) => !v)}
            aria-expanded={adding}
          >
            + {t('shop.addTailor')}
          </button>
        </div>

        {adding && (
          <div className="banner tailor-new">
            <div className="field-grid field-grid-2">
              <label className="field">
                <span>{t('shop.tailorName')}</span>
                <input
                  autoFocus
                  value={newTailor.name}
                  onChange={(e) => setNewTailor({ ...newTailor, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && submitNew()}
                />
              </label>
              <label className="field">
                <span>{t('print.phone')}</span>
                <PhoneInput
                  value={newTailor.phone}
                  onChange={(phone) => setNewTailor({ ...newTailor, phone })}
                />
              </label>
            </div>
            <div className="banner-actions">
              <button type="button" className="btn btn-primary" onClick={submitNew}>
                {t('form.save')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>
                {t('form.cancel')}
              </button>
            </div>
          </div>
        )}

        {results.length === 0 ? (
          <div className="state">
            <p className="state-title">
              {tailors.length === 0 ? t('shop.noTailors') : t('history.noMatch')}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table roster-table">
              <thead>
                <tr>
                  <th>{t('shop.tailorName')}</th>
                  <th>{t('print.phone')}</th>
                  <th>{t('shop.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) =>
                  editing?.id === row.id ? (
                    <tr key={row.id}>
                      <td>
                        <input
                          autoFocus
                          value={editing.name}
                          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                        />
                      </td>
                      <td>
                        <input
                          value={editing.phone}
                          onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                          inputMode="tel"
                          onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                        />
                      </td>
                      <td>
                        <div className="roster-actions">
                          <button
                            type="button"
                            className="icon-btn icon-save"
                            aria-label={t('form.save')}
                            title={t('form.save')}
                            onClick={commitEdit}
                          >
                            <CheckIcon />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label={t('form.cancel')}
                            title={t('form.cancel')}
                            onClick={() => setEditing(null)}
                          >
                            <CloseIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={row.id}>
                      <td>{row.name || t('common.none')}</td>
                      <td>{row.phone || t('common.none')}</td>
                      <td>
                        <div className="roster-actions">
                          {confirmId === row.id ? (
                            <>
                              <button
                                type="button"
                                className="icon-btn icon-confirm"
                                aria-label={t('order.deleteConfirm')}
                                title={t('order.deleteConfirm')}
                                onClick={() => {
                                  removeTailor(row.id)
                                  setConfirmId(null)
                                }}
                              >
                                <CheckIcon />
                              </button>
                              <button
                                type="button"
                                className="icon-btn"
                                aria-label={t('form.cancel')}
                                title={t('form.cancel')}
                                onClick={() => setConfirmId(null)}
                              >
                                <CloseIcon />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="icon-btn icon-edit"
                                aria-label={t('order.edit')}
                                title={t('order.edit')}
                                onClick={() => {
                                  setEditing(row)
                                  setConfirmId(null)
                                }}
                              >
                                <PencilIcon />
                              </button>
                              <button
                                type="button"
                                className="icon-btn icon-delete"
                                aria-label={t('order.delete')}
                                title={t('order.delete')}
                                onClick={() => setConfirmId(row.id)}
                              >
                                <TrashIcon />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
