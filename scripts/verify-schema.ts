
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Verifying Prisma Client changes...');

  // 1. Verify Product creation with sizes
  const keyword = 'TEST001';
  console.log(`Creating/Updating product with keyword: ${keyword}`);

  const product = await prisma.product.upsert({
    where: { keyword },
    update: {
      name: 'Test Product',
      sizes: ['S', 'M', 'L'],
      price: 100
    },
    create: {
      keyword,
      name: 'Test Product',
      sizes: ['S', 'M', 'L'],
      price: 100
    }
  });
  console.log('Product created:', product);

  if (!Array.isArray(product.sizes) || product.sizes[0] !== 'S') {
    console.error('ERROR: sizes field not saved correctly.');
  } else {
    console.log('SUCCESS: sizes field saved correctly.');
  }

  // 2. Verify Order creation with size
  console.log('Creating order with size...');
  // Ensure a user exists
  const lineId = 'test_user_123';
  let user = await prisma.user.findUnique({ where: { lineId } });
  if (!user) {
    user = await prisma.user.create({ data: { lineId } });
  }

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      productId: product.id,
      quantity: 1,
      size: 'M',
      totalAmount: 100
    }
  });
  console.log('Order created:', order);

  if (order.size !== 'M') {
    console.error('ERROR: size field not saved correctly.');
  } else {
    console.log('SUCCESS: size field saved correctly.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
