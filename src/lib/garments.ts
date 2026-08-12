import type { GarmentType } from './types'

/**
 * Measurement fields per garment type. Keys are stable ids used as storage keys
 * and as i18n keys (`m.<key>`). Confirm/adjust the lists with the tailor —
 * editing these arrays is the only change needed to add or drop a field.
 */
export const GARMENT_TYPES: GarmentType[] = ['shirt', 'trouser', 'dress', 'suit', 'other']

export const MEASUREMENT_FIELDS: Record<GarmentType, string[]> = {
  shirt: [
    'neck',
    'chest',
    'waist',
    'hip',
    'shoulder',
    'sleeveLength',
    'armhole',
    'bicep',
    'cuff',
    'length',
  ],
  trouser: [
    'waist',
    'hip',
    'crotch',
    'thigh',
    'knee',
    'bottom',
    'inseam',
    'outseam',
  ],
  dress: [
    'neck',
    'bust',
    'underBust',
    'waist',
    'hip',
    'shoulder',
    'sleeveLength',
    'armhole',
    'backLength',
    'frontLength',
    'length',
  ],
  suit: [
    'neck',
    'chest',
    'waist',
    'hip',
    'shoulder',
    'backWidth',
    'sleeveLength',
    'armhole',
    'bicep',
    'jacketLength',
    'trouserWaist',
    'thigh',
    'inseam',
    'bottom',
  ],
  other: ['chest', 'waist', 'hip', 'shoulder', 'sleeveLength', 'length'],
}

export function fieldsFor(type: GarmentType): string[] {
  return MEASUREMENT_FIELDS[type] ?? MEASUREMENT_FIELDS.other
}

/**
 * What to call an order's garment: the shop's own name when the type is
 * `other`, otherwise the translated built-in label.
 */
export function garmentName(
  order: { garmentType: GarmentType; garmentOther: string },
  t: (key: string) => string,
): string {
  return order.garmentType === 'other' && order.garmentOther.trim()
    ? order.garmentOther.trim()
    : t(`g.${order.garmentType}`)
}
