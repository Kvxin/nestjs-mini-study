import 'dotenv/config';
import { PrismaClient, ProductStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin123456';

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
    },
    create: {
      email: adminEmail,
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const count = await prisma.product.count();
  if (count === 0) {
    await prisma.product.createMany({
      data: [
        {
          title: 'Mechanical Keyboard',
          description: 'Hot-swappable mechanical keyboard.',
          price: 399,
          stock: 20,
          status: ProductStatus.ACTIVE,
          coverUrl: 'https://example.com/keyboard.jpg',
        },
        {
          title: 'Wireless Mouse',
          description: 'Ergonomic wireless mouse.',
          price: 199,
          stock: 50,
          status: ProductStatus.ACTIVE,
          coverUrl: 'https://example.com/mouse.jpg',
        },
      ],
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
