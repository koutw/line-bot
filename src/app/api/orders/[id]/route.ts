import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split("/").pop() || "";
    if (!id || id === "orders" || id === "route.ts") {
      return NextResponse.json({ message: "Missing order ID" }, { status: 400 });
    }

    const body = await req.json();
    let { size, quantity, productId } = body;
    quantity = parseInt(quantity as string, 10);

    if (!size || isNaN(quantity) || quantity <= 0) {
      return NextResponse.json(
        { message: "Invalid size or quantity." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Fetch current order
      const order = await tx.order.findUnique({
        where: { id },
        include: { product: true },
      });
      if (!order) throw new Error("Order not found");
      if (order.status === "CANCELLED" || order.status === "DELETED") {
        throw new Error("Cannot edit a cancelled order.");
      }

      const targetProductId = productId || order.productId;

      // 2. Fetch new variant
      const newVariant = await tx.productVariant.findUnique({
        where: {
          productId_size: {
            productId: targetProductId,
            size: size,
          },
        },
      });
      if (!newVariant) throw new Error("Selected size not found");

      // Adjust stock if product, size, or quantity changed
      const oldSize = order.size || "F";
      const isProductChanged = targetProductId !== order.productId;
      const isSizeChanged = oldSize !== size;
      const isQuantityChanged = order.quantity !== quantity;

      if (isProductChanged || isSizeChanged || isQuantityChanged) {
        // Step A: Release old variant stock (decrement sold)
        await tx.productVariant.updateMany({
          where: { productId: order.productId, size: oldSize },
          data: { sold: { decrement: order.quantity } },
        });

        // Step B: Consume new variant stock using atomic raw query to strictly respect limits
        const result = await tx.$executeRaw`
          UPDATE "ProductVariant"
          SET "sold" = "sold" + ${quantity}
          WHERE "id" = ${newVariant.id}
            AND ("stock" IS NULL OR "sold" + ${quantity} <= "stock")
        `;

        if (result === 0) {
          throw new Error("Insufficient stock for the selected variant.");
        }
      }

      // 3. Update the Order
      const newTotalAmount = newVariant.price * quantity;
      const updateData: any = { size, quantity, totalAmount: newTotalAmount };
      if (isProductChanged) {
        updateData.productId = targetProductId;
      }

      await tx.order.update({
        where: { id },
        data: updateData,
      });
    });

    return NextResponse.json({ message: "Order updated successfully." });
  } catch (error: any) {
    console.error("Order edit failed", error);
    return NextResponse.json(
      { message: error.message || "Failed to edit order." },
      { status: 400 }
    );
  }
}
