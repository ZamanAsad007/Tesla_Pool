import { z } from 'zod';

export const processPaymentSchema = z.object({
  method: z.enum(['CASH', 'TESLAPAY']),
});

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
