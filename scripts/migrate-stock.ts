
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting stock migration...");

  // Update all ProductVariants to have stock = null (Infinite)
  // This prevents existing products from being treated as "Sold Out" (Stock 0) if they were 0 before.
  // Actually, previously stock was default 0. If we change to Int?, existing 0s stay 0.
  // We want to treat them as infinite now, so we set them to null.

  const result = await prisma.productVariant.updateMany({
    data: {
      stock: null,
    },
  });

  console.log(`Updated ${result.count} variants to have infinite stock.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
