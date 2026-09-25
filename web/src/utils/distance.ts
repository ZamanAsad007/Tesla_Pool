const EXPLICIT_DISTANCES: Record<string, Record<string, number>> = {
  Banani: {
    'Gulshan 1': 3,
    'Gulshan 2': 2,
    Mohakhali: 4,
    Bashundhara: 6,
    Baridhara: 4,
    Farmgate: 7,
    'Karwan Bazar': 8,
    Motijheel: 11,
    Dhanmondi: 9,
    Mohammadpur: 10,
    Jatrabari: 14,
    Mirpur: 8,
    Uttara: 9,
  },
  'Gulshan 1': {
    'Gulshan 2': 2,
    Mohakhali: 2,
    Bashundhara: 7,
    Baridhara: 3,
    Farmgate: 6,
    'Karwan Bazar': 7,
    Motijheel: 10,
    Dhanmondi: 8,
    Mohammadpur: 9,
    Jatrabari: 13,
    Mirpur: 9,
    Uttara: 10,
  },
  'Gulshan 2': {
    Mohakhali: 3,
    Bashundhara: 5,
    Baridhara: 2,
    Farmgate: 8,
    'Karwan Bazar': 9,
    Motijheel: 12,
    Dhanmondi: 10,
    Mohammadpur: 11,
    Jatrabari: 15,
    Mirpur: 10,
    Uttara: 8,
  },
  Mohakhali: {
    Bashundhara: 8,
    Baridhara: 5,
    Farmgate: 4,
    'Karwan Bazar': 5,
    Motijheel: 8,
    Dhanmondi: 6,
    Mohammadpur: 7,
    Jatrabari: 11,
    Mirpur: 7,
    Uttara: 11,
  },
};

export function calculateDistanceKm(pickupName: string, dropoffName: string): number {
  if (!pickupName || !dropoffName || pickupName === dropoffName) return 0;
  if (EXPLICIT_DISTANCES[pickupName]?.[dropoffName] !== undefined) {
    return EXPLICIT_DISTANCES[pickupName][dropoffName];
  }
  if (EXPLICIT_DISTANCES[dropoffName]?.[pickupName] !== undefined) {
    return EXPLICIT_DISTANCES[dropoffName][pickupName];
  }
  return 5;
}

export function estimateFarePaisa(distanceKm: number, seats: number = 1): { soloPaisa: number; pooledPaisa: number } {
  const basePaisa = 1000;
  const distancePaisa = distanceKm * 1000;
  const soloPaisa = (basePaisa + distancePaisa) * seats;
  // 20% discount on pool
  const discountPaisa = Math.round(soloPaisa * 0.20);
  const pooledPaisa = soloPaisa - discountPaisa;
  return { soloPaisa, pooledPaisa };
}
