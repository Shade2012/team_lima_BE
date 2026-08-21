import 'dotenv/config';
import { PrismaClient, Role, OrderStatus, TicketStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// ==========================================
// CLOUDFLARE R2 S3 CLIENT
// ==========================================
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_DEV_URL,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});
const bucketName = process.env.R2_BUCKET_NAME || 'compfest-18-capstone';

async function uploadImageToR2(sourceUrl: string, key: string): Promise<string> {
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      console.warn(`  ⚠️ Failed to fetch image from ${sourceUrl}: ${res.statusText}. Using fallback key.`);
      return key;
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    console.log(`  ✓ Uploaded to R2: ${key}`);
    return key;
  } catch (err) {
    console.warn(`  ⚠️ Could not upload to R2 (${err}). Keeping key: ${key}`);
    return key;
  }
}

// ==========================================
// DETERMINISTIC TESTING UUIDs
// ==========================================
const ADMIN_ID = '019146a0-0000-7abc-0000-a00000000001';

const CUSTOMER_1_ID = '019146a0-0000-7abc-0000-c00000000001';
const CUSTOMER_2_ID = '019146a0-0000-7abc-0000-c00000000002';

const ORGANIZER_1_ID = '019146a0-0000-7abc-0000-000000000002'; // PK Entertainment
const ORGANIZER_2_ID = '019146a0-0000-7abc-0000-000000000003'; // Ismaya Live
const ORGANIZER_3_ID = '019146a0-0000-7abc-0000-000000000004'; // Java Festival Production

const OPERATOR_1_ID = '019146a0-0000-7abc-0000-600000000001'; // Operator Soundfest (Hari Ini)
const OPERATOR_2_ID = '019146a0-0000-7abc-0000-600000000002'; // Operator Joyland (Hari Ini)
const OPERATOR_3_ID = '019146a0-0000-7abc-0000-600000000003'; // Operator Java Jazz
const OPERATOR_4_ID = '019146a0-0000-7abc-0000-600000000004'; // Operator Coldplay (Besok)

// Event UUIDs
const EVENT_1_ID = '019146a0-0000-7abc-0000-e00000000001'; // Soundfest (HARI INI)
const EVENT_2_ID = '019146a0-0000-7abc-0000-e00000000002'; // Coldplay (BESOK)
const EVENT_3_ID = '019146a0-0000-7abc-0000-e00000000003'; // BLACKPINK
const EVENT_4_ID = '019146a0-0000-7abc-0000-e00000000004'; // Joyland Festival (HARI INI)
const EVENT_5_ID = '019146a0-0000-7abc-0000-e00000000005'; // Synchronize Fest
const EVENT_6_ID = '019146a0-0000-7abc-0000-e00000000006'; // DWP 2026
const EVENT_7_ID = '019146a0-0000-7abc-0000-e00000000007'; // Java Jazz
const EVENT_8_ID = '019146a0-0000-7abc-0000-e00000000008'; // Sheila On 7 & Dewa 19
const EVENT_9_ID = '019146a0-0000-7abc-0000-e00000000009'; // Erwin Gutawa Orchestra

// Category UUIDs for Event 1 (Soundfest - Hari Ini)
const CAT_E1_VIP_ID = '019146a0-0000-7abc-0000-ca0000000001';
const CAT_E1_CAT1_ID = '019146a0-0000-7abc-0000-ca0000000002';
const CAT_E1_FEST_ID = '019146a0-0000-7abc-0000-cb0000000001';

// Category UUIDs for Event 2 (Coldplay - Besok)
const CAT_E2_VIP_ID = '019146a0-0000-7abc-0000-ca0000000007';
const CAT_E2_CAT1_ID = '019146a0-0000-7abc-0000-ca0000000008';
const CAT_E2_FEST_ID = '019146a0-0000-7abc-0000-cb0000000007';

// Category UUIDs for Event 4 (Joyland Festival - Hari Ini)
const CAT_E4_VIP_ID = '019146a0-0000-7abc-0000-ca0000000004';
const CAT_E4_CAT1_ID = '019146a0-0000-7abc-0000-ca0000000005';
const CAT_E4_FEST_ID = '019146a0-0000-7abc-0000-cb0000000004';

// Gate UUIDs
const GATE_E1_VIP_ID = '019146a0-0000-7abc-0000-9a0000000001';
const GATE_E1_FEST_ID = '019146a0-0000-7abc-0000-9a0000000002';
const GATE_E2_WEST_ID = '019146a0-0000-7abc-0000-9a0000000003'; // Gate Coldplay (Besok)
const GATE_E4_VIP_ID = '019146a0-0000-7abc-0000-9a0000000004';
const GATE_E7_MAIN_ID = '019146a0-0000-7abc-0000-9a0000000007';

// Sample Ticket UUIDs
const TICKET_1_TODAY_ID = '019146a0-0000-7abc-0000-d00000000001'; // Soundfest Hari Ini (Ready to scan!)
const TICKET_2_SEATED_ID = '019146a0-0000-7abc-0000-d00000000002'; // Joyland Hari Ini (Already seated/scanned)
const TICKET_3_TOMORROW_ID = '019146a0-0000-7abc-0000-d00000000003'; // Coldplay Besok (Ready to scan tomorrow!)

// Seat Generator Helper
function generateSeatData(
  categoryId: string,
  prefix: string,
  rows: number,
  columns: number,
  blockedSeats: string[],
): { categoryId: string; seatCode: string }[] {
  const seatData: { categoryId: string; seatCode: string }[] = [];
  const totalSlots = rows * columns;

  for (let gridIndex = 0; gridIndex < totalSlots; gridIndex++) {
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
        categoryId,
        seatCode: `${prefix}-${coreCode}`,
      });
    }
  }

  return seatData;
}

async function main() {
  console.log('🧹 Clearing old data...');

  await prisma.walletTransaction.deleteMany();
  await prisma.admissionScan.deleteMany();
  await prisma.ticketLog.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.order.deleteMany();

  await prisma.user.updateMany({ data: { gateId: null } });

  await prisma.gate.deleteMany();
  await prisma.ticketCategory.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  console.log('👤 Seeding Users (Admin, 3 Promoters, Customers, Operators)...');

  // Admin
  await prisma.user.create({
    data: {
      id: ADMIN_ID,
      email: 'admin@example.com',
      username: 'admin1',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  // Customers
  await prisma.user.create({
    data: {
      id: CUSTOMER_1_ID,
      email: 'customer@example.com',
      username: 'customer1',
      password: hashedPassword,
      role: Role.CUSTOMER,
      wallet: {
        create: {
          balance: 5000000,
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      id: CUSTOMER_2_ID,
      email: 'budi@example.com',
      username: 'budi',
      password: hashedPassword,
      role: Role.CUSTOMER,
      wallet: {
        create: {
          balance: 2000000,
        },
      },
    },
  });

  // EO 1: PK Entertainment
  await prisma.user.create({
    data: {
      id: ORGANIZER_1_ID,
      email: 'organizer@example.com',
      username: 'organizer1',
      password: hashedPassword,
      role: Role.ORGANIZER,
      wallet: {
        create: {
          balance: 0,
        },
      },
    },
  });

  // EO 2: Ismaya Live
  await prisma.user.create({
    data: {
      id: ORGANIZER_2_ID,
      email: 'ismaya@example.com',
      username: 'organizer2',
      password: hashedPassword,
      role: Role.ORGANIZER,
      wallet: {
        create: {
          balance: 0,
        },
      },
    },
  });

  // EO 3: Java Festival Production
  await prisma.user.create({
    data: {
      id: ORGANIZER_3_ID,
      email: 'jfp@example.com',
      username: 'organizer3',
      password: hashedPassword,
      role: Role.ORGANIZER,
      wallet: {
        create: {
          balance: 0,
        },
      },
    },
  });

  // Gate Operators
  await prisma.user.create({
    data: {
      id: OPERATOR_1_ID,
      email: 'operator1@example.com',
      username: 'operator1',
      password: hashedPassword,
      role: Role.GATE_OPERATOR,
    },
  });

  await prisma.user.create({
    data: {
      id: OPERATOR_2_ID,
      email: 'operator2@example.com',
      username: 'operator2',
      password: hashedPassword,
      role: Role.GATE_OPERATOR,
    },
  });

  await prisma.user.create({
    data: {
      id: OPERATOR_3_ID,
      email: 'operator3@example.com',
      username: 'operator3',
      password: hashedPassword,
      role: Role.GATE_OPERATOR,
    },
  });

  await prisma.user.create({
    data: {
      id: OPERATOR_4_ID,
      email: 'operator_besok@example.com',
      username: 'operator_besok',
      password: hashedPassword,
      role: Role.GATE_OPERATOR,
    },
  });

  console.log('🖼️ Uploading concert images to Cloudflare R2 Storage...');

  const [
    imgSoundfest,
    imgColdplay,
    imgBlackpink,
    imgJoyland,
    imgSynchronize,
    imgDwp,
    imgJavaJazz,
    imgSheilaDewa,
    imgErwinGutawa,
  ] = await Promise.all([
    uploadImageToR2('https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80', 'events/seed-soundfest-2026.jpg'),
    uploadImageToR2('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80', 'events/seed-coldplay-2026.jpg'),
    uploadImageToR2('https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80', 'events/seed-blackpink-2026.jpg'),
    uploadImageToR2('https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80', 'events/seed-joyland-2026.jpg'),
    uploadImageToR2('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80', 'events/seed-synchronize-2026.jpg'),
    uploadImageToR2('https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80', 'events/seed-dwp-2026.jpg'),
    uploadImageToR2('https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=80', 'events/seed-javajazz-2026.jpg'),
    uploadImageToR2('https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=80', 'events/seed-sheila-dewa-2026.jpg'),
    uploadImageToR2('https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=80', 'events/seed-erwingutawa-2026.jpg'),
  ]);

  console.log('🎸 Seeding 9 Concert Events into database...');

  // Dynamic Dates
  const now = new Date();

  // 1. EVENT HARI INI: Jam 19:00 WIB
  const todayNight = new Date(now);
  todayNight.setHours(19, 0, 0, 0);

  // 2. EVENT HARI INI: Jam 16:00 WIB
  const todayAfternoon = new Date(now);
  todayAfternoon.setHours(16, 0, 0, 0);

  // 3. EVENT BESOK: Jam 20:00 WIB, Sales s.d. Jam 18:00 WIB
  const tomorrowNight = new Date(now);
  tomorrowNight.setDate(now.getDate() + 1);
  tomorrowNight.setHours(20, 0, 0, 0);

  const tomorrowSalesEnd = new Date(now);
  tomorrowSalesEnd.setDate(now.getDate() + 1);
  tomorrowSalesEnd.setHours(18, 0, 0, 0);

  const tomorrowRefundEnd = new Date(now);
  tomorrowRefundEnd.setDate(now.getDate() + 1);
  tomorrowRefundEnd.setHours(12, 0, 0, 0);

  const getFutureDate = (days: number, hours = 19) => {
    const d = new Date(now);
    d.setDate(now.getDate() + days);
    d.setHours(hours, 0, 0, 0);
    return d;
  };

  const getPastDate = (days: number) => {
    const d = new Date(now);
    d.setDate(now.getDate() - days);
    return d;
  };

  // ----------------------------------------------------
  // EO 1 Events (PK Entertainment)
  // ----------------------------------------------------
  // 1.1 Soundfest Jakarta 2026 (HARI INI)
  await prisma.event.create({
    data: {
      id: EVENT_1_ID,
      organizerId: ORGANIZER_1_ID,
      name: 'Soundfest Jakarta 2026 - Live Today',
      description: 'Festival musik live spektakuler hari ini dengan penampilan band indie rock, pop papan atas, dan tata panggung megah berkelas internasional.',
      imageKey: imgSoundfest,
      salesStartTime: getPastDate(14),
      salesEndTime: new Date(todayNight.getTime() - 2 * 60 * 60 * 1000), // Today 17:00
      eventDate: todayNight, // Today 19:00
      refundEndDate: getPastDate(2),
      refundPolicy: 'Refund diperbolehkan hingga 2 hari sebelum acara dimulai.',
      refundPercentage: 80,
    },
  });

  // 1.2 Coldplay World Tour (BESOK - Mulai 20:00, Sales s.d. 18:00)
  await prisma.event.create({
    data: {
      id: EVENT_2_ID,
      organizerId: ORGANIZER_1_ID,
      name: 'Coldplay: Music of the Spheres World Tour - Live Tomorrow Night',
      description: 'Konser tur dunia legendaris Coldplay besok malam di Gelora Bung Karno dengan keajaiban pertunjukan visual, kembang api, dan gelang LED warna-warni.',
      imageKey: imgColdplay,
      salesStartTime: getPastDate(7),
      salesEndTime: tomorrowSalesEnd, // BESOK 18:00 WIB
      eventDate: tomorrowNight,       // BESOK 20:00 WIB
      refundEndDate: tomorrowRefundEnd, // BESOK 12:00 WIB
      refundPolicy: 'Refund dapat diajukan maksimal hingga 8 jam sebelum konser dimulai.',
      refundPercentage: 85,
    },
  });

  // 1.3 BLACKPINK Born Pink (+30 days)
  await prisma.event.create({
    data: {
      id: EVENT_3_ID,
      organizerId: ORGANIZER_1_ID,
      name: 'BLACKPINK: Born Pink Encore in Jakarta 2026',
      description: 'Sensasi K-Pop dunia BLACKPINK kembali menghadirkan panggung spektakuler dengan visual serba pink, laser dinamis, dan koreografi berenergi tinggi.',
      imageKey: imgBlackpink,
      salesStartTime: getPastDate(10),
      salesEndTime: getFutureDate(28),
      eventDate: getFutureDate(30),
      refundEndDate: getFutureDate(20),
      refundPolicy: 'Pengajuan refund ditutup 10 hari sebelum tanggal konser.',
      refundPercentage: 75,
    },
  });

  // ----------------------------------------------------
  // EO 2 Events (Ismaya Live)
  // ----------------------------------------------------
  // 2.1 Joyland Festival Jakarta 2026 (HARI INI)
  await prisma.event.create({
    data: {
      id: EVENT_4_ID,
      organizerId: ORGANIZER_2_ID,
      name: 'Joyland Festival Jakarta 2026 - Day 1 Live Today',
      description: 'Festival musik multi-genre bernuansa asri dengan penampilan artis indie-folk lokal & internasional, instalasi seni interaktif, dan kuliner pilihan.',
      imageKey: imgJoyland,
      salesStartTime: getPastDate(14),
      salesEndTime: new Date(todayAfternoon.getTime() - 1 * 60 * 60 * 1000), // Today 15:00
      eventDate: todayAfternoon, // Today 16:00
      refundEndDate: getPastDate(2),
      refundPolicy: 'Kebijakan refund berlaku hingga 48 jam sebelum pintu festival dibuka.',
      refundPercentage: 80,
    },
  });

  // 2.2 Synchronize Fest (+14 days)
  await prisma.event.create({
    data: {
      id: EVENT_5_ID,
      organizerId: ORGANIZER_2_ID,
      name: 'Synchronize Fest 2026: Bhinneka Tunggal Musik',
      description: 'Pesta akbar musik Indonesia lintas generasi dan genre: pop, rock, dangdut kontemporer, hip-hop, hingga musik tradisi modern.',
      imageKey: imgSynchronize,
      salesStartTime: getPastDate(5),
      salesEndTime: getFutureDate(13),
      eventDate: getFutureDate(14),
      refundEndDate: getFutureDate(10),
      refundPolicy: 'Refund tersedia hingga H-4 sebelum festival berlangsung.',
      refundPercentage: 80,
    },
  });

  // 2.3 Djakarta Warehouse Project DWP (+45 days)
  await prisma.event.create({
    data: {
      id: EVENT_6_ID,
      organizerId: ORGANIZER_2_ID,
      name: 'Djakarta Warehouse Project (DWP) 2026',
      description: 'Festival musik elektronik terbesar di Asia dengan Garuda Land stage legendaris, jajaran top DJ dunia, tata cahaya laser, dan pyro spektakuler.',
      imageKey: imgDwp,
      salesStartTime: getPastDate(10),
      salesEndTime: getFutureDate(43),
      eventDate: getFutureDate(45),
      refundEndDate: getFutureDate(35),
      refundPolicy: 'Kebijakan pengembalian dana berlaku hingga 10 hari sebelum hari pertama.',
      refundPercentage: 70,
    },
  });

  // ----------------------------------------------------
  // EO 3 Events (Java Festival Production)
  // ----------------------------------------------------
  // 3.1 Java Jazz Festival (+3 days)
  await prisma.event.create({
    data: {
      id: EVENT_7_ID,
      organizerId: ORGANIZER_3_ID,
      name: 'Jakarta International Java Jazz Festival 2026',
      description: 'Perhelatan musik jazz termegah di kawasan Asia Tenggara yang menampilkan maestro jazz dunia, soul kontemporer, dan kolaborasi musisi legendaris.',
      imageKey: imgJavaJazz,
      salesStartTime: getPastDate(15),
      salesEndTime: getFutureDate(2),
      eventDate: getFutureDate(3),
      refundEndDate: getFutureDate(1),
      refundPolicy: 'Refund dapat diproses hingga H-2 sebelum festival dibuka.',
      refundPercentage: 85,
    },
  });

  // 3.2 Sheila On 7 & Dewa 19 (+21 days)
  await prisma.event.create({
    data: {
      id: EVENT_8_ID,
      organizerId: ORGANIZER_3_ID,
      name: 'Konser 30 Tahun Sheila On 7 & Dewa 19 - Satu Panggung',
      description: 'Momen bersejarah menyatukan dua legenda musik pop & rock terbesar Indonesia dalam satu panggung megah bernuansa nostalgia di Stadion Madya.',
      imageKey: imgSheilaDewa,
      salesStartTime: getPastDate(5),
      salesEndTime: getFutureDate(20),
      eventDate: getFutureDate(21),
      refundEndDate: getFutureDate(14),
      refundPolicy: 'Refund tiket berlaku maksimal 7 hari sebelum konser.',
      refundPercentage: 80,
    },
  });

  // 3.3 Erwin Gutawa Orchestra (+60 days)
  await prisma.event.create({
    data: {
      id: EVENT_9_ID,
      organizerId: ORGANIZER_3_ID,
      name: 'Erwin Gutawa Symphonic Pop Orchestra Live in Jakarta',
      description: 'Pergelaran musik simfoni megah 60 musisi orkestra yang membawakan mahakarya musik pop Indonesia dengan akustik kelas dunia di Aula Simfonia Jakarta.',
      imageKey: imgErwinGutawa,
      salesStartTime: getPastDate(2),
      salesEndTime: getFutureDate(58),
      eventDate: getFutureDate(60),
      refundEndDate: getFutureDate(45),
      refundPolicy: 'Refund dapat diajukan hingga 15 hari sebelum jadwal pertunjukan.',
      refundPercentage: 80,
    },
  });

  console.log('🎟️ Seeding Ticket Categories & Generating Seats (2 Seated + 1 Festival per event)...');

  const allSeats: { categoryId: string; seatCode: string }[] = [];

  // Configuration for 9 events
  const eventCategoryConfigs = [
    {
      eventId: EVENT_1_ID,
      categories: [
        { id: CAT_E1_VIP_ID, name: 'VIP Seated', price: 1750000, isSeated: true, posIndex: 0, rows: 3, cols: 5, blocked: ['A-2', 'B-1'], prefix: 'VIP' },
        { id: CAT_E1_CAT1_ID, name: 'CAT 1 Seated', price: 1000000, isSeated: true, posIndex: 1, rows: 4, cols: 5, blocked: ['A-1', 'C-3'], prefix: 'CAT1' },
        { id: CAT_E1_FEST_ID, name: 'Festival Standing', price: 550000, isSeated: false, posIndex: 2, quota: 250 },
      ],
    },
    {
      eventId: EVENT_2_ID,
      categories: [
        { id: CAT_E2_VIP_ID, name: 'Ultimate VIP Seated', price: 3500000, isSeated: true, posIndex: 0, rows: 3, cols: 5, blocked: ['A-3'], prefix: 'UVIP' },
        { id: CAT_E2_CAT1_ID, name: 'CAT 1 Seated', price: 1800000, isSeated: true, posIndex: 1, rows: 4, cols: 5, blocked: ['B-2'], prefix: 'CAT1' },
        { id: CAT_E2_FEST_ID, name: 'Festival Standing', price: 950000, isSeated: false, posIndex: 2, quota: 500 },
      ],
    },
    {
      eventId: EVENT_3_ID,
      categories: [
        { id: '019146a0-0000-7abc-0000-ca0000000009', name: 'BLINK VIP Seated', price: 3200000, isSeated: true, posIndex: 0, rows: 3, cols: 5, blocked: ['A-1', 'C-5'], prefix: 'BVIP' },
        { id: '019146a0-0000-7abc-0000-ca0000000010', name: 'Platinum Seated', price: 1600000, isSeated: true, posIndex: 1, rows: 4, cols: 5, blocked: ['B-3'], prefix: 'PLAT' },
        { id: '019146a0-0000-7abc-0000-cb0000000009', name: 'General Standing', price: 850000, isSeated: false, posIndex: 2, quota: 300 },
      ],
    },
    {
      eventId: EVENT_4_ID,
      categories: [
        { id: CAT_E4_VIP_ID, name: 'VIP Garden Seated', price: 1400000, isSeated: true, posIndex: 0, rows: 3, cols: 4, blocked: ['A-2'], prefix: 'VGARD' },
        { id: CAT_E4_CAT1_ID, name: 'Plaza Seated', price: 850000, isSeated: true, posIndex: 1, rows: 3, cols: 5, blocked: ['B-2'], prefix: 'PLAZA' },
        { id: CAT_E4_FEST_ID, name: 'Daily Pass Festival', price: 450000, isSeated: false, posIndex: 2, quota: 200 },
      ],
    },
    {
      eventId: EVENT_5_ID,
      categories: [
        { id: '019146a0-0000-7abc-0000-ca0000000011', name: 'Dynamic Stage Seated', price: 1200000, isSeated: true, posIndex: 0, rows: 3, cols: 5, blocked: ['A-1'], prefix: 'DYN' },
        { id: '019146a0-0000-7abc-0000-ca0000000012', name: 'District Stage Seated', price: 750000, isSeated: true, posIndex: 1, rows: 3, cols: 5, blocked: ['C-2'], prefix: 'DIST' },
        { id: '019146a0-0000-7abc-0000-cb0000000011', name: 'Festival 3-Day Pass', price: 650000, isSeated: false, posIndex: 2, quota: 350 },
      ],
    },
    {
      eventId: EVENT_6_ID,
      categories: [
        { id: '019146a0-0000-7abc-0000-ca0000000013', name: 'VVIP Lounge Seated', price: 4500000, isSeated: true, posIndex: 0, rows: 2, cols: 5, blocked: ['A-1'], prefix: 'VVIP' },
        { id: '019146a0-0000-7abc-0000-ca0000000014', name: 'VIP Gold Seated', price: 2200000, isSeated: true, posIndex: 1, rows: 3, cols: 5, blocked: ['B-1'], prefix: 'GOLD' },
        { id: '019146a0-0000-7abc-0000-cb0000000013', name: 'General Admission 3-Day Pass', price: 1250000, isSeated: false, posIndex: 2, quota: 400 },
      ],
    },
    {
      eventId: EVENT_7_ID,
      categories: [
        { id: '019146a0-0000-7abc-0000-ca0000000015', name: 'Special Show VIP Seated', price: 1850000, isSeated: true, posIndex: 0, rows: 3, cols: 5, blocked: ['A-2', 'B-3'], prefix: 'SPEC' },
        { id: '019146a0-0000-7abc-0000-ca0000000016', name: 'Hall A Seated', price: 950000, isSeated: true, posIndex: 1, rows: 4, cols: 5, blocked: ['A-1'], prefix: 'HALLA' },
        { id: '019146a0-0000-7abc-0000-cb0000000015', name: 'Daily Pass Festival', price: 500000, isSeated: false, posIndex: 2, quota: 200 },
      ],
    },
    {
      eventId: EVENT_8_ID,
      categories: [
        { id: '019146a0-0000-7abc-0000-ca0000000017', name: 'Bintang Lima VIP Seated', price: 2000000, isSeated: true, posIndex: 0, rows: 3, cols: 5, blocked: ['A-3'], prefix: 'BLIMA' },
        { id: '019146a0-0000-7abc-0000-ca0000000018', name: 'Kisah Klasik Gold Seated', price: 1100000, isSeated: true, posIndex: 1, rows: 4, cols: 5, blocked: ['C-1'], prefix: 'KKGOLD' },
        { id: '019146a0-0000-7abc-0000-cb0000000017', name: 'Festival Sahabat & Baladewa', price: 550000, isSeated: false, posIndex: 2, quota: 300 },
      ],
    },
    {
      eventId: EVENT_9_ID,
      categories: [
        { id: '019146a0-0000-7abc-0000-ca0000000019', name: 'Platinum Balcony Seated', price: 1600000, isSeated: true, posIndex: 0, rows: 3, cols: 5, blocked: ['A-2'], prefix: 'BALC' },
        { id: '019146a0-0000-7abc-0000-ca0000000020', name: 'Grand Tier Seated', price: 900000, isSeated: true, posIndex: 1, rows: 4, cols: 5, blocked: ['B-2'], prefix: 'TIER' },
        { id: '019146a0-0000-7abc-0000-cb0000000019', name: 'Orchestra Floor Standing', price: 450000, isSeated: false, posIndex: 2, quota: 150 },
      ],
    },
  ];

  for (const cfg of eventCategoryConfigs) {
    for (const cat of cfg.categories) {
      if (cat.isSeated) {
        const totalSlots = (cat.rows || 0) * (cat.cols || 0);
        const quota = totalSlots - (cat.blocked || []).length;

        await prisma.ticketCategory.create({
          data: {
            id: cat.id,
            eventId: cfg.eventId,
            name: cat.name,
            price: cat.price,
            totalQuota: quota,
            posIndex: cat.posIndex,
            isSeated: true,
            rows: cat.rows,
            columns: cat.cols,
            blockedSeats: cat.blocked || [],
          },
        });

        const seats = generateSeatData(cat.id, cat.prefix || 'S', cat.rows || 3, cat.cols || 5, cat.blocked || []);
        allSeats.push(...seats);
      } else {
        await prisma.ticketCategory.create({
          data: {
            id: cat.id,
            eventId: cfg.eventId,
            name: cat.name,
            price: cat.price,
            totalQuota: cat.quota || 100,
            posIndex: cat.posIndex,
            isSeated: false,
            rows: null,
            columns: null,
            blockedSeats: [],
          },
        });
      }
    }
  }

  console.log(`💺 Generating ${allSeats.length} individual seats...`);
  await prisma.seat.createMany({
    data: allSeats,
  });

  console.log('🚪 Seeding Event Gates & Assigning Gate Operators...');

  // Gates for Event 1 (Soundfest - Hari Ini)
  await prisma.gate.create({
    data: {
      id: GATE_E1_VIP_ID,
      eventId: EVENT_1_ID,
      name: 'Gate A - VIP Entrance',
    },
  });
  await prisma.gate.create({
    data: {
      id: GATE_E1_FEST_ID,
      eventId: EVENT_1_ID,
      name: 'Gate B - Festival Entrance',
    },
  });

  // Gates for Event 2 (Coldplay - Besok)
  await prisma.gate.create({
    data: {
      id: GATE_E2_WEST_ID,
      eventId: EVENT_2_ID,
      name: 'Gate Barat - VIP Entrance (Coldplay Besok)',
    },
  });

  // Gates for Event 4 (Joyland - Hari Ini)
  await prisma.gate.create({
    data: {
      id: GATE_E4_VIP_ID,
      eventId: EVENT_4_ID,
      name: 'Gate VIP Garden (Joyland Hari Ini)',
    },
  });

  // Gates for Event 7 (Java Jazz)
  await prisma.gate.create({
    data: {
      id: GATE_E7_MAIN_ID,
      eventId: EVENT_7_ID,
      name: 'Gate Hall B2 - Main Entrance',
    },
  });

  // Assign Gate Operators to respective Gates
  await prisma.user.update({
    where: { id: OPERATOR_1_ID },
    data: { gateId: GATE_E1_VIP_ID },
  });

  await prisma.user.update({
    where: { id: OPERATOR_2_ID },
    data: { gateId: GATE_E4_VIP_ID },
  });

  await prisma.user.update({
    where: { id: OPERATOR_3_ID },
    data: { gateId: GATE_E7_MAIN_ID },
  });

  await prisma.user.update({
    where: { id: OPERATOR_4_ID },
    data: { gateId: GATE_E2_WEST_ID },
  });

  console.log('🎫 Seeding Sample Orders, Tickets, and Gate Scans for Customer 1...');

  // Find a seat for Event 1 VIP (Soundfest Hari Ini)
  const sampleSeat1 = await prisma.seat.findFirst({
    where: { categoryId: CAT_E1_VIP_ID, seatCode: 'VIP-A-1' },
  });

  // Find a seat for Event 2 (Coldplay Besok)
  const sampleSeat2 = await prisma.seat.findFirst({
    where: { categoryId: CAT_E2_CAT1_ID, seatCode: 'CAT1-A-1' },
  });

  // Order 1: Customer 1 bought Soundfest (HARI INI) -> Status AVAILABLE (Ready to scan!)
  const order1Id = '019146a0-0000-7abc-0000-b00000000001';
  await prisma.order.create({
    data: {
      id: order1Id,
      customerId: CUSTOMER_1_ID,
      eventId: EVENT_1_ID,
      totalAmount: 1750000,
      status: OrderStatus.PAID,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      payments: {
        create: {
          amount: 1750000,
          status: PaymentStatus.SUCCESS,
          method: PaymentMethod.VELOCE_PAY,
          paidAt: now,
          providerTrxId: 'TRX-SOUNDFEST-001',
        },
      },
      tickets: {
        create: {
          id: TICKET_1_TODAY_ID,
          categoryId: CAT_E1_VIP_ID,
          seatId: sampleSeat1?.id,
          status: TicketStatus.AVAILABLE,
        },
      },
    },
  });

  // Order 2: Customer 1 bought Joyland Festival (HARI INI) -> Status SEATED (Scanned already!)
  const order2Id = '019146a0-0000-7abc-0000-b00000000002';
  await prisma.order.create({
    data: {
      id: order2Id,
      customerId: CUSTOMER_1_ID,
      eventId: EVENT_4_ID,
      totalAmount: 450000,
      status: OrderStatus.PAID,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      payments: {
        create: {
          amount: 450000,
          status: PaymentStatus.SUCCESS,
          method: PaymentMethod.GOPAY,
          paidAt: now,
          providerTrxId: 'TRX-JOYLAND-002',
        },
      },
      tickets: {
        create: {
          id: TICKET_2_SEATED_ID,
          categoryId: CAT_E4_FEST_ID,
          seatId: null,
          status: TicketStatus.SEATED,
          scan: {
            create: {
              gateId: GATE_E4_VIP_ID,
              gateOperatorId: OPERATOR_2_ID,
              scannedAt: now,
            },
          },
        },
      },
    },
  });

  // Order 3: Customer 1 bought Coldplay (BESOK) -> Status AVAILABLE (Ready to scan tomorrow!)
  const order3Id = '019146a0-0000-7abc-0000-b00000000003';
  await prisma.order.create({
    data: {
      id: order3Id,
      customerId: CUSTOMER_1_ID,
      eventId: EVENT_2_ID,
      totalAmount: 1800000,
      status: OrderStatus.PAID,
      expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      payments: {
        create: {
          amount: 1800000,
          status: PaymentStatus.SUCCESS,
          method: PaymentMethod.VIRTUAL_ACCOUNT,
          paidAt: now,
          providerTrxId: 'TRX-COLDPLAY-003',
        },
      },
      tickets: {
        create: {
          id: TICKET_3_TOMORROW_ID,
          categoryId: CAT_E2_CAT1_ID,
          seatId: sampleSeat2?.id,
          status: TicketStatus.AVAILABLE,
        },
      },
    },
  });

  console.log('🎉 Seeding completed successfully!');
  console.log('================================================================');
  console.log('🎵 CONCERT & MUSIC FESTIVAL SEED DATA OVERVIEW');
  console.log('================================================================');
  console.log('🔑 ACCOUNTS (Password for all: password123)');
  console.log(`- Admin           : admin@example.com`);
  console.log(`- Customer 1      : customer@example.com (Balance: Rp 5.000.000) [ID: ${CUSTOMER_1_ID}]`);
  console.log(`- Customer 2      : budi@example.com     (Balance: Rp 2.000.000) [ID: ${CUSTOMER_2_ID}]`);
  console.log(`- EO 1 (PK Ent)   : organizer@example.com [ID: ${ORGANIZER_1_ID}]`);
  console.log(`- EO 2 (Ismaya)   : ismaya@example.com    [ID: ${ORGANIZER_2_ID}]`);
  console.log(`- EO 3 (Java Fest): jfp@example.com       [ID: ${ORGANIZER_3_ID}]`);
  console.log(`- Gate Op 1 (Soundfest HARI INI) : operator1@example.com`);
  console.log(`- Gate Op 2 (Joyland HARI INI)   : operator2@example.com`);
  console.log(`- Gate Op 4 (Coldplay BESOK)     : operator_besok@example.com`);
  console.log(`- Gate Op 3 (Java Jazz)          : operator3@example.com`);
  console.log('----------------------------------------------------------------');
  console.log('🎸 9 CONCERTS LIST:');
  console.log(`1. [HARI INI] Soundfest Jakarta 2026           (Mulai 19:00 WIB) [ID: ${EVENT_1_ID}] (R2: ${imgSoundfest})`);
  console.log(`2. [BESOK]    Coldplay World Tour Jakarta      (Mulai 20:00, Sales s.d. 18:00 WIB) [ID: ${EVENT_2_ID}] (R2: ${imgColdplay})`);
  console.log(`3. [HARI INI] Joyland Festival Jakarta 2026    (Mulai 16:00 WIB) [ID: ${EVENT_4_ID}] (R2: ${imgJoyland})`);
  console.log(`4. [+3 d]     Java Jazz Festival 2026          (Java Fest Prod)  [ID: ${EVENT_7_ID}] (R2: ${imgJavaJazz})`);
  console.log(`5. [+14 d]    Synchronize Fest 2026            (Ismaya Live)     [ID: ${EVENT_5_ID}] (R2: ${imgSynchronize})`);
  console.log(`6. [+21 d]    Sheila On 7 & Dewa 19            (Java Fest Prod)  [ID: ${EVENT_8_ID}] (R2: ${imgSheilaDewa})`);
  console.log(`7. [+30 d]    BLACKPINK Born Pink Encore       (PK Entertainment)[ID: ${EVENT_3_ID}] (R2: ${imgBlackpink})`);
  console.log(`8. [+45 d]    Djakarta Warehouse Project (DWP) (Ismaya Live)     [ID: ${EVENT_6_ID}] (R2: ${imgDwp})`);
  console.log(`9. [+60 d]    Erwin Gutawa Symphonic Orchestra (Java Fest Prod)  [ID: ${EVENT_9_ID}] (R2: ${imgErwinGutawa})`);
  console.log('----------------------------------------------------------------');
  console.log('🎟️ SAMPLE TICKETS UNTUK PENGUJIAN SCANNER:');
  console.log(`- Tiket HARI INI (Soundfest, Seat VIP-A-1) : ${TICKET_1_TODAY_ID} -> Login sebagai operator1@example.com untuk scan!`);
  console.log(`- Tiket BESOK    (Coldplay, Seat CAT1-A-1) : ${TICKET_3_TOMORROW_ID} -> Login sebagai operator_besok@example.com untuk scan!`);
  console.log(`- Tiket SUDAH MASUK (Joyland Festival)     : ${TICKET_2_SEATED_ID} -> Status SEATED`);
  console.log('================================================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
