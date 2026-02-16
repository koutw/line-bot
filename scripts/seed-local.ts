
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a dummy user
  const user = await prisma.user.create({
    data: {
      lineId: 'test-user-' + Date.now(),
      name: 'Test User',
    },
  });

  // Create a dummy product
  const product = await prisma.product.create({
    data: {
      keyword: 'TEST01',
      name: 'Test Product',
    },
  });

  // Create an order with status 'ARCHIVE'
  await prisma.order.create({
    data: {
      userId: user.id,
      productId: product.id,
      totalAmount: 100,
      status: 'ARCHIVE', // This is the bad state we want to fix
      isArchived: false,
    },
  });

  console.log('Seeded one order with status ARCHIVE.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
