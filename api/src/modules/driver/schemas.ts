import { z } from 'zod';

export const driverRequestsQuerySchema = z.object({
  areaId: z.coerce.number().int().positive().optional(),
});
