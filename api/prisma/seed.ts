import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

export async function main() {
  console.log('Seeding Dhaka Tesla Pool core data...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Seed Users (The Cast)
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

  const nusrat = await prisma.user.upsert({
    where: { email: 'nusrat@passenger.test' },
    update: {
      name: 'Nusrat',
      role: 'PASSENGER',
      passwordHash,
      walletBalancePaisa: 50000,
    },
    create: {
      email: 'nusrat@passenger.test',
      name: 'Nusrat',
      role: 'PASSENGER',
      passwordHash,
      walletBalancePaisa: 50000,
    },
  });

  const rafiq = await prisma.user.upsert({
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

  // 2. Seed Tesla: Bullet for Jashim (capacity 3, online)
  let bullet = await prisma.tesla.findFirst({
    where: { ownerId: jashim.id, name: 'Bullet' },
  });

  if (!bullet) {
    bullet = await prisma.tesla.create({
      data: {
        name: 'Bullet',
        capacity: 3,
        ownerId: jashim.id,
        online: true,
      },
    });
  } else {
    bullet = await prisma.tesla.update({
      where: { id: bullet.id },
      data: { capacity: 3, online: true },
    });
  }

  // 3. Seed Areas with Corridors (DESIGN.md §3)
  const areasData = [
    // NORTH corridor
    { name: 'Banani', corridor: 'NORTH' as const, lat: 23.7937, lng: 90.4066 },
    { name: 'Gulshan 1', corridor: 'NORTH' as const, lat: 23.7785, lng: 90.4172 },
    { name: 'Gulshan 2', corridor: 'NORTH' as const, lat: 23.7925, lng: 90.4162 },
    { name: 'Mohakhali', corridor: 'NORTH' as const, lat: 23.7776, lng: 90.4054 },
    { name: 'Bashundhara', corridor: 'NORTH' as const, lat: 23.8151, lng: 90.4255 },
    { name: 'Baridhara', corridor: 'NORTH' as const, lat: 23.7998, lng: 90.4206 },

    // CENTER corridor
    { name: 'Farmgate', corridor: 'CENTER' as const, lat: 23.7561, lng: 90.3872 },
    { name: 'Karwan Bazar', corridor: 'CENTER' as const, lat: 23.7516, lng: 90.3934 },
    { name: 'Motijheel', corridor: 'CENTER' as const, lat: 23.7330, lng: 90.4172 },

    // SOUTH corridor
    { name: 'Dhanmondi', corridor: 'SOUTH' as const, lat: 23.7461, lng: 90.3742 },
    { name: 'Mohammadpur', corridor: 'SOUTH' as const, lat: 23.7658, lng: 90.3584 },
    { name: 'Jatrabari', corridor: 'SOUTH' as const, lat: 23.7104, lng: 90.4349 },

    // OUTER corridor
    { name: 'Mirpur', corridor: 'OUTER' as const, lat: 23.8067, lng: 90.3683 },
    { name: 'Uttara', corridor: 'OUTER' as const, lat: 23.8759, lng: 90.3795 },
  ];

  for (const a of areasData) {
    await prisma.area.upsert({
      where: { name: a.name },
      update: {
        corridor: a.corridor,
        lat: a.lat,
        lng: a.lng,
      },
      create: {
        name: a.name,
        corridor: a.corridor,
        lat: a.lat,
        lng: a.lng,
      },
    });
  }

  console.log('Seeded users:', {
    jashim: jashim.email,
    nusrat: nusrat.email,
    rafiq: rafiq.email,
    shirin: shirin.email,
  });
  console.log('Seeded vehicle Bullet for Jashim:', bullet.id);
  console.log(`Seeded ${areasData.length} areas across Dhaka corridors.`);
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
