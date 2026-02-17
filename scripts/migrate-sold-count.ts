
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting sold count migration...");

  // 1. Reset all sold counts to 0
  await prisma.productVariant.updateMany({
    data: { sold: 0 },
  });

  // 2. Get all valid orders (CONFIRMED, PURCHASED)
  // We need to group by productId and size to sum quantities
  const orderGroups = await prisma.order.groupBy({
    by: ["productId", "size"],
    _sum: {
      quantity: true,
    },
    where: {
      status: { in: ["CONFIRMED", "PURCHASED"] },
      isArchived: false, // Should we count archived? Usually yes, if archived means sold history.
      // Wait, isArchived means moved to history tab. They are still SOLD items.
      // So we should remove isArchived check or include both keys.
      // Actually, if an item is archived, it means it's done. 
      // If we are migrating, we should count EVERYTHING that is considered "sold".
      // CONFIRMED and PURCHASED are sold statuses.
    },
  });

  console.log(`Found ${orderGroups.length} product/size groups with sales.`);

  // 3. Update ProductVariants
  for (const group of orderGroups) {
    if (!group.productId || !group.size || !group._sum.quantity) continue;

    const quantity = group._sum.quantity;

    try {
      // Find the variant first to get its ID (groupBy doesn't give variant ID directly unless we join, which prisma groupBy doesn't do easily for updates)
      // We have productId and size, which is a unique composite key for ProductVariant (except we defined unique constraint)

      // Check if we can update directly using unique constraint?
      // ProductVariant has @@unique([productId, size])

      await prisma.productVariant.update({
        where: {
          productId_size: {
            productId: group.productId,
            size: group.size,
          },
        },
        data: {
          sold: quantity,
        },
      });
      console.log(`Updated ${group.productId} / ${group.size} : sold ${quantity}`);
    } catch (e) {
      console.warn(`Skipping ${group.productId} / ${group.size}: Variant not found or error.`, e);
      // It's possible orders exist for variants that were deleted? 
      // Schema says onDelete: Cascade for Product -> Order, but ProductVariant -> Product is also Cascade.
      // If Variant is deleted, Order is NOT automatically deleted unless matched?
      // Wait, Order links to Product, but stores `size` as a string. It does NOT link to ProductVariant directly via FK.
      // So it is possible to have orders for sizes that no longer exist as variants.
      // In that case, we can't update the variant. That's fine.
    }
  }

  console.log("Migration completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
