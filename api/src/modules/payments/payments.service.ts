import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { AuthenticatedUser } from '../../middleware/auth';
import { ProcessPaymentInput } from './schemas';

export async function processPayment(
  paymentId: string,
  input: ProcessPaymentInput,
  actor: AuthenticatedUser
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      membership: {
        include: {
          passenger: true,
          pool: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError('PAYMENT_NOT_FOUND', 404, 'Payment record not found');
  }

  // Scoping: passenger paying their own ride, or operating driver settling cash
  if (actor.role === 'PASSENGER' && payment.membership.passengerId !== actor.id) {
    throw new AppError('NOT_FOUND', 404, 'Payment record not found');
  }

  if (payment.status === 'SETTLED') {
    throw new AppError('ALREADY_SETTLED', 409, 'Payment has already been settled');
  }

  return prisma.$transaction(async (tx) => {
    if (input.method === 'TESLAPAY') {
      const passenger = await tx.user.findUnique({
        where: { id: payment.membership.passengerId },
      });

      if (!passenger) {
        throw new AppError('USER_NOT_FOUND', 404, 'Passenger not found');
      }

      if (passenger.walletBalancePaisa < payment.amountPaisa) {
        throw new AppError(
          'INSUFFICIENT_FUNDS',
          409,
          `Insufficient TeslaPay wallet balance: required ${payment.amountPaisa} paisa, available ${passenger.walletBalancePaisa} paisa`
        );
      }

      // Debit passenger wallet
      await tx.user.update({
        where: { id: passenger.id },
        data: {
          walletBalancePaisa: {
            decrement: payment.amountPaisa,
          },
        },
      });
    }

    // Settle payment record
    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: {
        method: input.method,
        status: 'SETTLED',
        paidAt: new Date(),
      },
    });

    return updated;
  });
}

export async function getPaymentById(paymentId: string, actor: AuthenticatedUser) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      membership: true,
    },
  });

  if (!payment) {
    throw new AppError('PAYMENT_NOT_FOUND', 404, 'Payment record not found');
  }

  if (actor.role === 'PASSENGER' && payment.membership.passengerId !== actor.id) {
    throw new AppError('NOT_FOUND', 404, 'Payment record not found');
  }

  return payment;
}
