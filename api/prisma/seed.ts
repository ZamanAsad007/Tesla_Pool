import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

export async function main() {
  console.log('Seeding Dhaka Tesla Pool core users...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Jashim - Driver
  const jashim = await prisma.user.upsert({
    where: { email: 'jashim@driver.test' },
    update: {
      name: 'Jashim',
      role: 'DRIVER',
      passwordHash,
    },
    create: {
      email: 'jashim@driver.test',
      name: 'Jashim',
      role: 'DRIVER',
      passwordHash,
    },
  });

  // 2. Nusrat - Passenger
  const nusrat = await prisma.user.upsert({
    where: { email: 'nusrat@passenger.test' },
    update: {
      name: 'Nusrat',
      role: 'PASSENGER',
      passwordHash,
      walletBalancePaisa: 50000, // ৳500 initial wallet balance for testing
    },
    create: {
      email: 'nusrat@passenger.test',
      name: 'Nusrat',
      role: 'PASSENGER',
      passwordHash,
      walletBalancePaisa: 50000,
    },
  });

  // 3. Rafiq - Passenger
  const rafaq = await prisma.user.upsert({
    where: { email: 'rafiq@passenger.test' },
    update: {
      name: 'Rafiq',
      role: 'PASSENGER',
      passwordHash,
      walletBalancePaisa: 50000,
    },
    create: {
      email: 'rafiq@passenger.test',
      name: 'Rafiq',
      role: 'PASSENGER',
      passwordHash,
      walletBalancePaisa: 50000,
    },
  });

  // 4. Shirin - Passenger (Candidate for last seat race)
  const shirin = await prisma.user.upsert({
    where: { email: 'shirin@passenger.test' },
    update: {
      name: 'Shirin',
      role: 'PASSENGER',
      passwordHash,
      walletBalancePaisa: 50000,
    },
    create: {
      email: 'shirin@passenger.test',
      name: 'Shirin',
      role: 'PASSENGER',
      passwordHash,
      walletBalancePaisa: 50000,
    },
  });

  console.log('Seeded users:', {
    jashim: jashim.email,
    nusrat: nusrat.email,
    rafiq: rafaq.email,
    shirin: shirin.email,
  });
}

if (process.env.NODE_ENV !== 'test') {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
