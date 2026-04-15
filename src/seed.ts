import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { User } from './entities/user.entity';
import { Dokan } from './entities/dokan.entity';
import { DokanEvent } from './entities/dokan-event.entity';
import { CustomerKhata } from './entities/customer-khata.entity';
import { Booking } from './entities/booking.entity';
import { Invitation } from './entities/invitation.entity';
import { Review } from './entities/review.entity';
import {
  EventType,
  LoyaltyTier,
  UserRole,
  Visibility,
} from './common/enums';

loadEnv();

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const ds = new DataSource({
    type: 'postgres',
    url,
    entities: [User, Dokan, DokanEvent, CustomerKhata, Booking, Invitation, Review],
    synchronize: true,
    ssl: { rejectUnauthorized: false },
  });

  await ds.initialize();
  console.log('> connected to db');

  const usersRepo = ds.getRepository(User);
  const dokansRepo = ds.getRepository(Dokan);
  const eventsRepo = ds.getRepository(DokanEvent);

  // Clear demo data in dependency order (children first).
  // Keep existing prod data untouched by scoping to the demo emails only.
  const demoEmails = [
    'admin@khata.bd',
    'shop-one@khata.bd',
    'shop-two@khata.bd',
    'grahok-one@khata.bd',
    'grahok-two@khata.bd',
    'grahok-three@khata.bd',
  ];
  const existingUsers = await usersRepo.find({
    where: demoEmails.map((email) => ({ email })),
  });
  if (existingUsers.length > 0) {
    console.log(`> removing ${existingUsers.length} existing demo users (cascades)`);
    await usersRepo.remove(existingUsers);
  }

  // 1 super admin
  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = await usersRepo.save(
    usersRepo.create({
      email: 'admin@khata.bd',
      passwordHash: adminHash,
      name: 'Platform Admin',
      role: UserRole.SUPER_ADMIN,
    }),
  );

  // 2 dokandars + their dokans
  const mkDokandar = async (
    email: string,
    name: string,
    dokanName: string,
    category: string,
    address: string,
    description: string,
  ) => {
    const hash = await bcrypt.hash('dokan123', 10);
    const user = await usersRepo.save(
      usersRepo.create({
        email,
        passwordHash: hash,
        name,
        role: UserRole.DOKANDAR,
      }),
    );
    const dokan = await dokansRepo.save(
      dokansRepo.create({
        name: dokanName,
        category,
        address,
        description,
        owner: user,
      }),
    );
    return { user, dokan };
  };

  const shop1 = await mkDokandar(
    'shop-one@khata.bd',
    'Aisha Rahman',
    'Aisha\u2019s Boutique',
    'Fashion',
    'Dhanmondi 27, Dhaka',
    'Curated Bangladeshi fashion boutique featuring sample sales and workshops.',
  );
  const shop2 = await mkDokandar(
    'shop-two@khata.bd',
    'Karim Uddin',
    'Karim\u2019s Iftar House',
    'Food',
    'Bailey Road, Dhaka',
    'Traditional iftar spreads and seasonal food events.',
  );

  // 3 grahoks
  const mkGrahok = async (email: string, name: string) => {
    const hash = await bcrypt.hash('grahok123', 10);
    return usersRepo.save(
      usersRepo.create({
        email,
        passwordHash: hash,
        name,
        role: UserRole.GRAHOK,
      }),
    );
  };
  const grahok1 = await mkGrahok('grahok-one@khata.bd', 'Nadia Chowdhury');
  const grahok2 = await mkGrahok('grahok-two@khata.bd', 'Farhan Islam');
  const grahok3 = await mkGrahok('grahok-three@khata.bd', 'Sumaiya Akhter');

  // Helpers for event creation
  const day = 24 * 60 * 60 * 1000;
  const futureDate = (daysAhead: number) => new Date(Date.now() + daysAhead * day);

  // 5 events spanning type/visibility/fee combos
  await eventsRepo.save([
    eventsRepo.create({
      title: 'Eid Sample Sale Night',
      type: EventType.SAMPLE_SALE,
      venue: 'Aisha\u2019s Boutique, Dhanmondi 27',
      scheduledAt: futureDate(7),
      description:
        'Exclusive 50% off on selected pieces. Open to all grahoks, instant booking.',
      visibility: Visibility.PUBLIC,
      feeInPaisa: 0,
      capacity: 80,
      isFeatured: true,
      dokan: shop1.dokan,
    }),
    eventsRepo.create({
      title: 'Master Stitching Workshop',
      type: EventType.WORKSHOP,
      venue: 'Aisha\u2019s Studio, Dhanmondi',
      scheduledAt: futureDate(14),
      description:
        'Hands-on workshop with master tailor. Paid event, seats limited.',
      visibility: Visibility.PUBLIC,
      feeInPaisa: 150_000,
      capacity: 20,
      isFeatured: false,
      dokan: shop1.dokan,
    }),
    eventsRepo.create({
      title: 'VIP Loyalty Preview',
      type: EventType.EXHIBITION,
      venue: 'Aisha\u2019s Boutique',
      scheduledAt: futureDate(21),
      description:
        'Private preview of the winter line for VIP tier customers only.',
      visibility: Visibility.LOYALTY,
      minTier: LoyaltyTier.VIP,
      feeInPaisa: 0,
      capacity: 25,
      isFeatured: true,
      dokan: shop1.dokan,
    }),
    eventsRepo.create({
      title: 'Iftar Community Night',
      type: EventType.IFTAR_NIGHT,
      venue: 'Karim\u2019s Iftar House, Bailey Road',
      scheduledAt: futureDate(10),
      description:
        'Free community iftar for regular customers. Loyalty REGULAR tier required.',
      visibility: Visibility.LOYALTY,
      minTier: LoyaltyTier.REGULAR,
      feeInPaisa: 0,
      capacity: 60,
      isFeatured: false,
      dokan: shop2.dokan,
    }),
    eventsRepo.create({
      title: 'Premium Iftar Tasting',
      type: EventType.PRODUCT_LAUNCH,
      venue: 'Karim\u2019s Iftar House',
      scheduledAt: futureDate(30),
      description:
        'Premium 12-course tasting menu with the chef. Loyalty VIP only, ticketed.',
      visibility: Visibility.LOYALTY,
      minTier: LoyaltyTier.VIP,
      feeInPaisa: 500_000,
      capacity: 15,
      isFeatured: true,
      dokan: shop2.dokan,
    }),
  ]);

  console.log('> seeded: 1 admin, 2 dokandars, 3 grahoks, 5 events');
  console.log('');
  console.log('Demo credentials (all passwords follow role-based pattern):');
  console.log('  SUPER_ADMIN:  admin@khata.bd        / admin123');
  console.log('  DOKANDAR #1:  shop-one@khata.bd     / dokan123');
  console.log('  DOKANDAR #2:  shop-two@khata.bd     / dokan123');
  console.log('  GRAHOK #1:    grahok-one@khata.bd   / grahok123');
  console.log('  GRAHOK #2:    grahok-two@khata.bd   / grahok123');
  console.log('  GRAHOK #3:    grahok-three@khata.bd / grahok123');

  await ds.destroy();
}

seed().catch((err) => {
  console.error('seed failed:', err);
  process.exit(1);
});
