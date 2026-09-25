import { PoolStatus } from '@prisma/client';

export interface PoolMatchingState {
  status: PoolStatus;
  occupiedSeats: number;
  capacitySnapshot: number;
}

export interface ActivePoolMember {
  rideRequest: {
    pickupAreaId: number;
    dropoffArea: {
      corridor: string;
    };
  };
}

export interface CandidateRideRequest {
  seats: number;
  pickupAreaId: number;
  dropoffArea: {
    corridor: string;
  };
}

/**
 * Matching rule single source of truth (§7)
 */
export function canJoin(
  pool: PoolMatchingState,
  activeMembers: ActivePoolMember[],
  candidate: CandidateRideRequest
): { allowed: boolean; reason?: string } {
  // 1. Status rule: MATCHED or ARRIVED only
  if (pool.status !== 'MATCHED' && pool.status !== 'ARRIVED') {
    return {
      allowed: false,
      reason: `Cannot join pool in status ${pool.status}. Must be MATCHED or ARRIVED.`,
    };
  }

  // 2. Capacity rule: occupied + requested <= capacity
  if (pool.occupiedSeats + candidate.seats > pool.capacitySnapshot) {
    return {
      allowed: false,
      reason: 'POOL_FULL',
    };
  }

  if (activeMembers.length > 0) {
    // 3. Same pickup area (riders meet at common pickup point)
    const basePickupId = activeMembers[0].rideRequest.pickupAreaId;
    if (candidate.pickupAreaId !== basePickupId) {
      return {
        allowed: false,
        reason: 'PICKUP_AREA_MISMATCH',
      };
    }

    // 4. Same destination corridor as all active members
    const requiredCorridor = activeMembers[0].rideRequest.dropoffArea.corridor;
    if (candidate.dropoffArea.corridor !== requiredCorridor) {
      return {
        allowed: false,
        reason: 'CORRIDOR_MISMATCH',
      };
    }
  }

  return { allowed: true };
}
