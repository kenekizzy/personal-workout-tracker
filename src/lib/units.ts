export type WeightUnit = 'kg' | 'lb';

export const KG_TO_LB_FACTOR = 2.20462262185;

/** Convert kg to lb with rounding to 1 decimal place or nearest 0.5 */
export function kgToLb(kg: number): number {
  if (kg === 0) return 0;
  return Math.round(kg * KG_TO_LB_FACTOR * 10) / 10;
}

/** Convert lb to kg with rounding to 1 decimal place */
export function lbToKg(lb: number): number {
  if (lb === 0) return 0;
  return Math.round((lb / KG_TO_LB_FACTOR) * 10) / 10;
}

/** Formats a weight in kg to the desired unit with appropriate suffix */
export function formatWeight(kg: number, unit: WeightUnit = 'kg'): string {
  if (kg === 0) return 'BW'; // Bodyweight indicator
  const displayVal = unit === 'lb' ? kgToLb(kg) : kg;
  return `${displayVal} ${unit}`;
}

/** Converts user input value based on current unit into stored kg */
export function toStoredKg(inputVal: number, unit: WeightUnit): number {
  if (!inputVal || isNaN(inputVal)) return 0;
  return unit === 'lb' ? lbToKg(inputVal) : inputVal;
}

/** Converts stored kg into the active display unit for input fields */
export function toDisplayWeight(storedKg: number, unit: WeightUnit): number {
  if (!storedKg || isNaN(storedKg)) return 0;
  return unit === 'lb' ? kgToLb(storedKg) : storedKg;
}
