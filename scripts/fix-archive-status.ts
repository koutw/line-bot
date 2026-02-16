
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {

  console.log('Starting migration check...');

  // Debug: List all statuses
  const statusCounts = await prisma.order.groupBy({
    by: ['status'],
    _count: {
      id: true,
    },
  });

  console.log('Current order status distribution:', statusCounts);

  // Find all orders with status 'ARCHIVE'
  const archiveStatusOrders = await prisma.order.findMany({
    where: {
      status: 'ARCHIVE',
    },
  });

  console.log(`Found ${archiveStatusOrders.length} orders with status 'ARCHIVE'.`);

  if (archiveStatusOrders.length === 0) {
    console.log('No orders to migrate.');
    return;
  }

  // Update them: set isArchived = true, and strictly separate status from archiving state
  // Since 'ARCHIVE' is not a valid status in our new logic (it's a state), we should map it to a valid status.
  // 'CONFIRMED' seems like a safe default as it implies the order was valid but processed/done.
  // Or if we want to preserve the fact it was "done", maybe 'PURCHASED'? 
  // Let's stick to the plan: set isArchived=true.
  // I will also set status to 'CONFIRMED' to bring them back to a "valid" status flow, 
  // but since they are archived, they won't show up in the active list anyway.

  const result = await prisma.order.updateMany({
    where: {
      status: 'ARCHIVE',
    },
    data: {
      isArchived: true,
      status: 'CONFIRMED', // Defaulting to CONFIRMED
    },
  });

  console.log(`Successfully migrated ${result.count} orders.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
