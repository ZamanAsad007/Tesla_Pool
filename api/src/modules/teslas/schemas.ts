import { z } from 'zod';

export const createTeslaSchema = z.object({
  name: z.string().min(1, 'Vehicle name is required').max(50),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(10, 'Capacity cannot exceed 10'),
});

export const updateTeslaSchema = z.object({
  online: z.boolean({ required_error: 'Online status is required' }),
});

export type CreateTeslaInput = z.infer<typeof createTeslaSchema>;
export type UpdateTeslaInput = z.infer<typeof updateTeslaSchema>;
