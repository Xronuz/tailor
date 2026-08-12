import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createOrder, getOrder, lastOrderByPhone, saveOrder } from '../lib/db'
import { GARMENT_TYPES, fieldsFor } from '../lib/garments'
import { addCustomGarment, useCustomGarments } from '../lib/customGarments'
import { useI18n } from '../lib/i18n'
import { photoId, preparePhoto } from '../lib/photo'
import { useObjectUrls } from '../lib/useObjectUrls'
import { SuffixInput } from '../components/SuffixInput'
import { Select } from '../components/Select'
import { DateInput } from '../components/DateInput'
import { PhoneInput } from '../components/PhoneInput'
import { PageHead } from '../components/PageHead'
import {
  CalendarIcon,
  CameraIcon,
  CloseIcon,
  NewOrderIcon,
  PhoneIcon,
  ShirtIcon,
} from '../components/icons'
import {
  ORDER_STATUSES,
  PAY_TYPES,
  REFERRAL_SOURCES,
  emptyOrder,
  type GarmentType,
  type Order,
  type PayType,
  type ReferralSource,
} from '../lib/types'

type Draft = Omit<Order, 'id' | 'createdAt' | 'updatedAt'>

export function OrderForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const { t } = useI18n()

  const [form, setForm] = useState<Draft>(emptyOrder)
  const [existing, setExisting] = useState<Order | null>(null)
  const [loading, setLoading] = useState(editing)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [suggestion, setSuggestion] = useState<Order | null>(null)
  const [autofilled, setAutofilled] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newField, setNewField] = useState('')
  const [addingGarment, setAddingGarment] = useState(false)
  const [newGarment, setNewGarment] = useState('')
  const customGarments = useCustomGarments()

  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const materialInput = useRef<HTMLInputElement>(null)
  const photoUrls = useObjectUrls(form.photos)
  const materialUrls = useObjectUrls(form.materialPhotos)

  useEffect(() => {
    if (!id) return
    let alive = true
    getOrder(id).then((order) => {
      if (!alive) return
      if (order) {
        setExisting(order)
        const { id: _id, createdAt: _c, updatedAt: _u, ...draft } = order
        // Orders saved before address/payType existed lack those keys — fill the
        // defaults so every input stays controlled.
        setForm({ ...emptyOrder(), ...draft })
      }
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [id])

  function patch(changes: Partial<Draft>) {
    setForm((prev) => ({ ...prev, ...changes }))
  }

  function setMeasurement(key: string, value: string) {
    setForm((prev) => ({ ...prev, measurements: { ...prev.measurements, [key]: value } }))
  }

  /** Takes a default field off this order's sheet, value and all. */
  function removeField(key: string) {
    setForm((prev) => {
      const { [key]: _dropped, ...rest } = prev.measurements
      return {
        ...prev,
        measurements: rest,
        removedFields: prev.removedFields.includes(key)
          ? prev.removedFields
          : [...prev.removedFields, key],
      }
    })
  }

  function addField() {
    const label = newField.trim()
    if (!label) return
    setForm((prev) => ({
      ...prev,
      customMeasurements: [...prev.customMeasurements, { label, value: '' }],
    }))
    setNewField('')
    setAdding(false)
  }

  function cancelAdd() {
    setNewField('')
    setAdding(false)
  }

  /** Saves the name to the catalogue and picks it for this order. */
  function addGarment() {
    const name = addCustomGarment(newGarment)
    if (!name) return
    patch({ garmentType: 'other', garmentOther: name })
    setNewGarment('')
    setAddingGarment(false)
  }

  function cancelGarment() {
    setNewGarment('')
    setAddingGarment(false)
  }

  async function onPhoneBlur() {
    if (editing || !form.phone.trim()) return
    const previous = await lastOrderByPhone(form.phone)
    if (previous) setSuggestion(previous)
  }

  function acceptSuggestion() {
    if (!suggestion) return
    patch({
      customerName: form.customerName || suggestion.customerName,
      address: form.address || suggestion.address || '',
      unit: suggestion.unit,
      garmentType: suggestion.garmentType,
      garmentOther: suggestion.garmentOther,
      measurementSource: suggestion.measurementSource,
      measurements: { ...suggestion.measurements },
      removedFields: [...(suggestion.removedFields ?? [])],
      customMeasurements: suggestion.customMeasurements.map((m) => ({ ...m })),
    })
    setSuggestion(null)
    setAutofilled(true)
  }

  /** One photo per section — a second pick replaces the first. */
  async function addPhotos(files: FileList | null, field: 'photos' | 'materialPhotos' = 'photos') {
    const file = files?.[0]
    if (!file) return
    const prepared = { id: photoId(), blob: await preparePhoto(file) }
    setForm((prev) => ({ ...prev, [field]: [prepared] }))
  }

  function removePhoto(pid: string, field: 'photos' | 'materialPhotos' = 'photos') {
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((p) => p.id !== pid) }))
  }

  async function submit(print: boolean) {
    if (!form.customerName.trim() && !form.phone.trim()) {
      setError(t('form.nameRequired'))
      return
    }
    setError('')
    setBusy(true)
    try {
      const saved = existing
        ? await saveOrder({ ...existing, ...form })
        : await createOrder(form)
      navigate(`/orders/${saved.id}${print ? '?print=1' : ''}`, { replace: true })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="page"><div className="state"><span className="spinner" /></div></div>

  const fields = fieldsFor(form.garmentType).filter((key) => !form.removedFields.includes(key))
  const unitLabel = t(`common.${form.unit}`)

  return (
    <div className="page">
      <PageHead
        title={editing ? t('form.editOrder') : t('form.newOrder')}
        icon={<NewOrderIcon />}
        sub={existing?.id}
      />

      <section className="card">
        <h2>
          <ShirtIcon /> {t('form.garmentType')}
        </h2>
        <div className="chips">
          {GARMENT_TYPES.filter((type) => type !== 'other').map((type) => (
            <button
              key={type}
              type="button"
              className={`chip${form.garmentType === type ? ' chip-on' : ''}`}
              onClick={() => patch({ garmentType: type as GarmentType, garmentOther: '' })}
            >
              {t(`g.${type}`)}
            </button>
          ))}

          {/* Names the shop added itself, kept for every later order. */}
          {customGarments.map((name) => (
            <button
              key={name}
              type="button"
              className={`chip${
                form.garmentType === 'other' && form.garmentOther === name ? ' chip-on' : ''
              }`}
              onClick={() => patch({ garmentType: 'other', garmentOther: name })}
            >
              {name}
            </button>
          ))}

          {addingGarment ? (
            <span className="chip-input">
              <input
                autoFocus
                value={newGarment}
                placeholder={t('form.garmentOther')}
                onChange={(e) => setNewGarment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addGarment()
                  }
                  if (e.key === 'Escape') cancelGarment()
                }}
              />
              <button
                type="button"
                className="btn btn-ghost btn-small"
                aria-label={t('form.cancel')}
                onClick={cancelGarment}
              >
                ✕
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="chip chip-add"
              aria-label={t('form.addGarment')}
              title={t('form.addGarment')}
              onClick={() => setAddingGarment(true)}
            >
              +
            </button>
          )}
        </div>

      </section>

      <section className="card">
        <h2>
          <PhoneIcon /> {t('form.customer')}
        </h2>
        <div className="field-grid field-grid-2">
          <label className="field">
            <span>{t('form.name')}</span>
            <input
              value={form.customerName}
              onChange={(e) => patch({ customerName: e.target.value })}
              autoComplete="name"
            />
          </label>
          <label className="field">
            <span>{t('form.phone')}</span>
            <PhoneInput
              value={form.phone}
              onChange={(phone) => patch({ phone })}
              onBlur={onPhoneBlur}
            />
          </label>
          <label className="field">
            <span>{t('form.address')}</span>
            <input
              value={form.address}
              onChange={(e) => patch({ address: e.target.value })}
              autoComplete="street-address"
            />
          </label>
          <label className="field">
            <span>{t('form.deliveryDate')}</span>
            <DateInput
              value={form.deliveryDate}
              onChange={(deliveryDate) => patch({ deliveryDate })}
            />
          </label>
        </div>

        {suggestion && (
          <div className="banner">
            <span>
              {t('form.reuse')} <strong>{suggestion.customerName || suggestion.phone}</strong>
            </span>
            <div className="banner-actions">
              <button type="button" className="btn btn-primary" onClick={acceptSuggestion}>
                {t('form.reuseYes')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setSuggestion(null)}>
                {t('form.reuseNo')}
              </button>
            </div>
          </div>
        )}
        {autofilled && <p className="muted small">{t('form.autofilled')}</p>}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>
            {t('form.measurements')} <span className="muted">({unitLabel})</span>
          </h2>
          <div className="toggles">
            <div className="chips">
              {(['body', 'garment'] as const).map((source) => (
                <button
                  key={source}
                  type="button"
                  className={`chip${form.measurementSource === source ? ' chip-on' : ''}`}
                  onClick={() => patch({ measurementSource: source })}
                >
                  {t(`form.source.${source}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="measure-grid">
          {fields.map((key) => (
            <label key={key} className="field field-measure">
              <span>{t(`m.${key}`)}</span>
              <SuffixInput
                value={form.measurements[key] ?? ''}
                onChange={(value) => setMeasurement(key, value)}
                suffix={unitLabel}
                onRemove={() => removeField(key)}
                removeLabel={t('form.removeField')}
              />
            </label>
          ))}

          {form.customMeasurements.map((row, i) => (
            <label key={`${row.label}-${i}`} className="field field-measure">
              <span>{row.label || t('form.customLabel')}</span>
              <SuffixInput
                value={row.value}
                suffix={unitLabel}
                onChange={(value) =>
                  setForm((prev) => {
                    const next = [...prev.customMeasurements]
                    next[i] = { ...next[i], value }
                    return { ...prev, customMeasurements: next }
                  })
                }
                onRemove={() =>
                  setForm((prev) => ({
                    ...prev,
                    customMeasurements: prev.customMeasurements.filter((_, j) => j !== i),
                  }))
                }
                removeLabel={t('form.removeField')}
              />
            </label>
          ))}

          {/* Sits in the measurement grid so it lands at the end of the last row
              of fields instead of below the whole block. Asks for the name
              first — an unnamed measurement is useless in the workshop. */}
          {adding ? (
            <div className="field field-measure">
              <span>{t('form.customLabel')}</span>
              <div className="custom-row">
                <input
                  autoFocus
                  value={newField}
                  placeholder={t('form.customLabel')}
                  onChange={(e) => setNewField(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addField()
                    }
                    if (e.key === 'Escape') cancelAdd()
                  }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  aria-label={t('form.cancel')}
                  onClick={cancelAdd}
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="field field-measure field-add">
              <button
                type="button"
                className="btn btn-secondary btn-add-field"
                aria-label={t('form.addField')}
                title={t('form.addField')}
                onClick={() => setAdding(true)}
              >
                +
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <h2>
          <CalendarIcon /> {t('form.details')}
        </h2>
        {/* fabric over notes on the left, the cloth shot spanning both on the right */}
        <div className="details-grid">
          <label className="field details-fabric">
            <span>{t('form.fabric')}</span>
            <input value={form.fabric} onChange={(e) => patch({ fabric: e.target.value })} />
          </label>

          <label className="field details-notes">
            <span>{t('form.notes')}</span>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </label>

          <div className="field details-material">
            <span>{t('form.materialPhoto')}</span>

            <div className="material-box">
              {form.materialPhotos.length === 0 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => materialInput.current?.click()}
                >
                  <CameraIcon /> {t('form.materialPhoto')}
                </button>
              )}
              <input
                ref={materialInput}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => {
                  addPhotos(e.target.files, 'materialPhotos')
                  e.target.value = ''
                }}
              />

              {form.materialPhotos.length > 0 && (
                <div className="photo-grid material-grid">
                  {form.materialPhotos.map((photo) => (
                    <figure key={photo.id} className="photo-thumb">
                      <img src={materialUrls[photo.id]} alt="" />
                      <button
                        type="button"
                        className="photo-remove"
                        aria-label={t('form.removePhoto')}
                        title={t('form.removePhoto')}
                        onClick={() => removePhoto(photo.id, 'materialPhotos')}
                      >
                        <CloseIcon />
                      </button>
                    </figure>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="field-grid field-grid-4">
          <label className="field">
            <span>{t('form.price')}</span>
            <SuffixInput
              value={form.price}
              suffix={t('common.money')}
              onChange={(price) => patch({ price })}
            />
          </label>
          <label className="field">
            <span>{t('form.prepaid')}</span>
            <SuffixInput
              value={form.prepaid}
              suffix={t('common.money')}
              onChange={(prepaid) => patch({ prepaid })}
            />
          </label>
          <div className="field">
            <span>{t('form.payType')}</span>
            <Select<PayType>
              label={t('form.payType')}
              value={form.payType}
              options={PAY_TYPES.map((type) => ({ value: type, label: t(`pay.${type}`) }))}
              onChange={(payType) => patch({ payType })}
            />
          </div>
          <div className="field">
            <span>{t('form.status')}</span>
            <Select<Order['status']>
              label={t('form.status')}
              value={form.status}
              options={ORDER_STATUSES.map((status) => ({
                value: status,
                label: t(`status.${status}`),
              }))}
              onChange={(status) => patch({ status })}
            />
          </div>
        </div>
      </section>

      {/* reference shots beside the referral question */}
      <div className="card-row card-row-top">
        <section className="card">
          <h2>{t('form.photos')}</h2>
          <div className="photo-actions">
            <button type="button" className="btn btn-secondary" onClick={() => cameraInput.current?.click()}>
              {t('form.takePhoto')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => galleryInput.current?.click()}>
              {t('form.gallery')}
            </button>
            <input
              ref={cameraInput}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                addPhotos(e.target.files)
                e.target.value = ''
              }}
            />
            <input
              ref={galleryInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                addPhotos(e.target.files)
                e.target.value = ''
              }}
            />
          </div>
          {form.photos.length > 0 && (
            <div className="photo-grid">
              {form.photos.map((photo) => (
                <figure key={photo.id} className="photo-thumb">
                  <img src={photoUrls[photo.id]} alt="" />
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => removePhoto(photo.id)}
                  >
                    {t('form.removePhoto')}
                  </button>
                </figure>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2>{t('form.referralAsk')}</h2>
          <Select<ReferralSource | ''>
            label={t('form.referralAsk')}
            value={form.referral}
            options={[
              { value: '', label: t('common.none') },
              ...REFERRAL_SOURCES.map((source) => ({
                value: source,
                label: t(`ref.${source}`),
              })),
            ]}
            onChange={(referral) => patch({ referral })}
          />
        </section>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary btn-big"
          disabled={busy}
          onClick={() => submit(false)}
        >
          {t('form.save')}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-big"
          disabled={busy}
          onClick={() => submit(true)}
        >
          {t('form.saveAndPrint')}
        </button>
        <button type="button" className="btn btn-ghost btn-big" onClick={() => navigate(-1)}>
          {t('form.cancel')}
        </button>
      </div>
    </div>
  )
}
