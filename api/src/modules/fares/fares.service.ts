// Dhaka Tesla Pool Fare Calculation Model (§6)
// Easy-bike economics: base ৳10 (1000 paisa), per-km ৳10 (1000 paisa), pool discount 20%
export const BASE_FARE_PAISA = 1000;
export const PER_KM_PAISA = 1000;
export const POOL_DISCOUNT_RATE = 0.20;

export function calculateSoloFare(distanceKm: number): number {
  return BASE_FARE_PAISA + distanceKm * PER_KM_PAISA;
}

export function calculatePooledFare(distanceKm: number): {
  soloFarePaisa: number;
  discountPaisa: number;
  pooledFarePaisa: number;
} {
  const soloFarePaisa = calculateSoloFare(distanceKm);
  const discountPaisa = Math.round(soloFarePaisa * POOL_DISCOUNT_RATE);
  const pooledFarePaisa = soloFarePaisa - discountPaisa;

  return {
    soloFarePaisa,
    discountPaisa,
    pooledFarePaisa,
  };
}
