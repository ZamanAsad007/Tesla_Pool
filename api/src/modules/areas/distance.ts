// Fixed inter-area distance matrix in kilometers
// Designed for deterministic testing (Nusrat = 4 km, Rafiq = 3 km, Shirin = 2 km)
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

/**
 * Calculates deterministic distance in km between two area names
 */
export function calculateDistanceKm(pickupAreaName: string, dropoffAreaName: string): number {
  if (pickupAreaName === dropoffAreaName) {
    return 0;
  }

  // Check direct lookup
  if (EXPLICIT_DISTANCES[pickupAreaName]?.[dropoffAreaName] !== undefined) {
    return EXPLICIT_DISTANCES[pickupAreaName][dropoffAreaName];
  }

  // Check symmetric lookup
  if (EXPLICIT_DISTANCES[dropoffAreaName]?.[pickupAreaName] !== undefined) {
    return EXPLICIT_DISTANCES[dropoffAreaName][pickupAreaName];
  }

  // Sensible default for other inter-area connections
  return 5;
}
