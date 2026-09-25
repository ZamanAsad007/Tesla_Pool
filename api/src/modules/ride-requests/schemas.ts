import { z } from 'zod';

export const createRideRequestSchema = z.object({
  pickupAreaId: z.number().int().positive({ message: 'Pickup area ID is required' }),
  dropoffAreaId: z.number().int().positive({ message: 'Dropoff area ID is required' }),
  seats: z.number().int().min(1, 'At least 1 seat required').max(3, 'Cannot request more than 3 seats').default(1),
});

export const listRideRequestsQuerySchema = z.object({
  status: z.enum(['REQUESTED', 'MATCHED', 'ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED']).optional(),
});

export type CreateRideRequestInput = z.infer<typeof createRideRequestSchema>;
export type ListRideRequestsQuery = z.infer<typeof listRideRequestsQuerySchema>;
