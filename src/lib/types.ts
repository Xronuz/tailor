export type GarmentType = 'shirt' | 'trouser' | 'dress' | 'suit' | 'other'

export type MeasurementSource = 'body' | 'garment'

/** The shop measures in centimetres only — kept on the order so old records
 *  stay readable if another unit is ever added. */
export type Unit = 'cm'

export type OrderStatus = 'accepted' | 'in_progress' | 'done'

/** Statuses used before the workflow was cut to three stages. */
const LEGACY_STATUS: Record<string, OrderStatus> = {
  new: 'accepted',
  ready: 'done',
  delivered: 'done',
}

/** Maps an order saved under the old four-stage workflow onto the current one. */
export function normalizeStatus(status: string): OrderStatus {
  if ((ORDER_STATUSES as string[]).includes(status)) return status as OrderStatus
  return LEGACY_STATUS[status] ?? 'accepted'
}

export type PayType = 'cash' | 'card'

/** Where the customer heard about the shop. '' until they are asked. */
export type ReferralSource = 'friend' | 'social' | 'passing' | 'ads' | 'repeat' | 'other'

export const REFERRAL_SOURCES: ReferralSource[] = [
  'friend',
  'social',
  'passing',
  'ads',
  'repeat',
  'other',
]

export interface CustomMeasurement {
  label: string
  value: string
}

export interface OrderPhoto {
  id: string
  blob: Blob
}

export interface Order {
  id: string
  createdAt: number
  updatedAt: number
  customerName: string
  phone: string
  address: string
  garmentType: GarmentType
  garmentOther: string
  measurementSource: MeasurementSource
  unit: Unit
  /** measurement field key -> value as typed (string, may be empty) */
  measurements: Record<string, string>
  /** Default fields the tailor removed from this order's sheet. */
  removedFields: string[]
  customMeasurements: CustomMeasurement[]
  photos: OrderPhoto[]
  /** Shots of the cloth itself, printed above the reference photos. */
  materialPhotos: OrderPhoto[]
  fabric: string
  notes: string
  deliveryDate: string
  status: OrderStatus
  price: string
  prepaid: string
  payType: PayType
  referral: ReferralSource | ''
}

export const ORDER_STATUSES: OrderStatus[] = ['accepted', 'in_progress', 'done']

export const PAY_TYPES: PayType[] = ['cash', 'card']

export function emptyOrder(): Omit<Order, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    customerName: '',
    phone: '',
    address: '',
    garmentType: 'shirt',
    garmentOther: '',
    measurementSource: 'body',
    unit: 'cm',
    measurements: {},
    removedFields: [],
    customMeasurements: [],
    photos: [],
    materialPhotos: [],
    fabric: '',
    notes: '',
    deliveryDate: '',
    status: 'accepted',
    price: '',
    prepaid: '',
    payType: 'cash',
    referral: '',
  }
}
