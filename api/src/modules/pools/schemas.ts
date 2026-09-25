import { z } from 'zod';

export const createPoolSchema = z.object({
  rideRequestId: z.string().uuid({ message: 'Valid rideRequestId is required' }),
});

export const leavePoolSchema = z.object({
  rideRequestId: z.string().uuid({ message: 'Valid rideRequestId is required' }),
});

export const joinPoolSchema = z.object({
  rideRequestId: z.string().uuid({ message: 'Valid rideRequestId is required' }),
});

export const poolActionSchema = z.object({});

export type CreatePoolInput = z.infer<typeof createPoolSchema>;
export type JoinPoolInput = z.infer<typeof joinPoolSchema>;
export type LeavePoolInput = z.infer<typeof leavePoolSchema>;
