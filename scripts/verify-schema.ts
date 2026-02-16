
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Verifying Prisma Client changes...');

  // 1. Verify Product creation with variants
  const keyword = 'TEST001';
  console.log(`Creating/Updating product with keyword: ${keyword}`);

  /* 
   * Since 'keyword' is not unique, we cannot use upsert with where: { keyword }.
   * We must find the first product with this keyword and update it, or create a new one.
   */
  const existingProduct = await prisma.product.findFirst({
    where: { keyword }
  });

  let product;

  if (existingProduct) {
    product = await prisma.product.update({
      where: { id: existingProduct.id },
      data: {
        name: 'Test Product',
        variants: {
          deleteMany: {},
          create: [
            { size: 'S', price: 100, stock: 10 },
            { size: 'M', price: 120, stock: 10 },
            { size: 'L', price: 150, stock: 10 },
          ]
        }
      },
      include: { variants: true }
    });
  } else {
    product = await prisma.product.create({
      data: {
        keyword,
        name: 'Test Product',
        variants: {
          create: [
            { size: 'S', price: 100, stock: 10 },
            { size: 'M', price: 120, stock: 10 },
            { size: 'L', price: 150, stock: 10 },
          ]
        }
      },
      include: { variants: true }
    });
  }
  console.log('Product created:', product);

  if (product.variants.length !== 3) {
    console.error('ERROR: variants not saved correctly.');
  } else {
    console.log('SUCCESS: variants saved correctly.');
  }

  // 2. Verify Order creation with size
  console.log('Creating order with size...');
  // Ensure a user exists
  const lineId = 'test_user_123';
  let user = await prisma.user.findUnique({ where: { lineId } });
  if (!user) {
    user = await prisma.user.create({ data: { lineId } });
  }

  const variant = product.variants.find(v => v.size === 'M');

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      productId: product.id,
      quantity: 1,
      size: 'M',
      totalAmount: variant?.price || 0
    }
  });
  console.log('Order created:', order);

  if (order.size !== 'M') {
    console.error('ERROR: order size field not saved correctly.');
  } else {
    console.log('SUCCESS: order size field saved correctly.');
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
