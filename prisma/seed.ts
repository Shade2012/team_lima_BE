import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CUSTOMER_ID = '019146a0-0000-7abc-0000-c00000000001';
const ORGANIZER_ID = '019146a0-0000-7abc-0000-000000000002';
const EVENT_ID = '019146a0-0000-7abc-0000-e00000000001';
const CAT_SEATED_ID = '019146a0-0000-7abc-0000-ca0000000001';
const CAT_FESTIVAL_ID = '019146a0-0000-7abc-0000-cb0000000001';

async function main() {
  console.log('Clearing old data...');
  await prisma.refund.deleteMany();
  await prisma.ticketLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.order.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.ticketCategory.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  console.log('Seeding Users...');
  await prisma.user.create({
    data: {
      id: CUSTOMER_ID,
      email: 'customer@example.com',
      username: 'customer1',
      password: hashedPassword, 
      role: Role.CUSTOMER,
    },
  });

  await prisma.user.create({
    data: {
      id: ORGANIZER_ID,
      email: 'organizer@example.com',
      username: 'organizer1',
      password: hashedPassword,
      role: Role.ORGANIZER,
    },
  });

  const ADMIN_ID = '019146a0-0000-7abc-0000-a00000000001';
  await prisma.user.create({
    data: {
      id: ADMIN_ID,
      email: 'admin@example.com',
      username: 'admin1',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  console.log('Seeding Event...');
  const now = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(now.getMonth() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);

  await prisma.event.create({
    data: {
      id: EVENT_ID,
      organizerId: ORGANIZER_ID,
      name: 'Konser Musik Raya 2026',
      description: 'Music of the Spheres World Tour',
      salesStartTime: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
      salesEndTime: nextWeek,
      eventDate: nextMonth,
      refundEndDate: nextWeek,
      refundPolicy: 'Refund allowed up to 7 days before event.',
      refundPercentage: 80,
    },
  });

  console.log('Seeding Ticket Categories...');
  const blockedSeats = ['A-2', 'B-1'];
  const columns = 5;
  const rows = 3;
  const blockedCount = blockedSeats.length;
  const seatedQuota = (rows * columns) - blockedCount;

  await prisma.ticketCategory.create({
    data: {
      id: CAT_SEATED_ID,
      eventId: EVENT_ID,
      name: 'VIP Seated',
      price: 1500000,
      totalQuota: seatedQuota,
      posIndex: 0,
      isSeated: true,
      rows: rows,
      columns: columns,
      blockedSeats: blockedSeats,
    },
  });

  await prisma.ticketCategory.create({
    data: {
      id: CAT_FESTIVAL_ID,
      eventId: EVENT_ID,
      name: 'Festival Standing',
      price: 500000,
      totalQuota: 50,
      posIndex: 1,
      isSeated: false,
      rows: null,
      columns: null,
      blockedSeats: [],
    },
  });

  console.log('Seeding Seats for VIP Category...');
  const seatData: { categoryId: string; seatCode: string }[] = [];
  let gridIndex = 0;
  let createdCount = 0;

  while (createdCount < seatedQuota) {
    const rowIndex = Math.floor(gridIndex / columns);
    const colIndex = (gridIndex % columns) + 1;

    let rowStr = '';
    let temp = rowIndex;
    while (temp >= 0) {
      rowStr = String.fromCharCode(65 + (temp % 26)) + rowStr;
      temp = Math.floor(temp / 26) - 1;
    }

    const coreCode = `${rowStr}-${colIndex}`;
    
    if (!blockedSeats.includes(coreCode)) {
      seatData.push({
        categoryId: CAT_SEATED_ID,
        seatCode: `VIP-${coreCode}`,
      });
      createdCount++;
    }
    
    gridIndex++;
  }

  await prisma.seat.createMany({
    data: seatData,
  });

  console.log('Seeding completed successfully! 🎉');
  console.log('--------------------------------------------------');
  console.log('TESTING CREDENTIALS (Hardcoded UUIDs for Postman)');
  console.log(`Customer ID : ${CUSTOMER_ID}`);
  console.log(`Organizer ID: ${ORGANIZER_ID}`);
  console.log(`Admin ID    : ${ADMIN_ID}`);
  console.log(`Event ID    : ${EVENT_ID}`);
  console.log(`Cat VIP ID  : ${CAT_SEATED_ID} (Quota: ${seatedQuota}, Blocked: ${blockedSeats.join(', ')})`);
  console.log(`Cat Fest ID : ${CAT_FESTIVAL_ID} (Quota: 50)`);
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
