import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to database...");
  try {
    const product = await prisma.product.create({
      data: {
        name: "Test Product",
        price: 500,
        keyword: "TEST01",
        stock: 10,
        description: "Test description",
      },
    });
    console.log("Product created successfully:", product);

    // Cleanup
    await prisma.product.delete({
      where: { id: product.id }
    });
    console.log("Test product deleted.");

  } catch (error) {
    console.error("Error creating product:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
