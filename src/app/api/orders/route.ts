import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const sort = searchParams.get("sort") || "createdAt";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const keyword = searchParams.get("keyword");

  const archived = searchParams.get("archived");

  const where: any = {};

  if (archived !== null) {
    where.isArchived = archived === "true";
  }

  if (status) {
    const statuses = status.split(",");
    if (statuses.length > 1) {
      where.status = { in: statuses };
    } else {
      where.status = status;
    }
  }

  if (keyword) {
    const keywords = keyword.split(",");
    if (keywords.length > 1) {
      where.product = {
        keyword: { in: keywords },
      };
    } else {
      where.product = {
        keyword: keyword,
      };
    }
  }

  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate + "T23:59:59"),
    };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      user: {
        select: { name: true, lineId: true },
      },
      product: {
        select: { name: true, keyword: true },
      },
    },
    orderBy: { [sort]: order },
  });
  return NextResponse.json(orders);
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids, status, deleteReason, isArchived } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { message: "Invalid IDs" },
        { status: 400 }
      );
    }

    if (!status && isArchived === undefined) {
      return NextResponse.json(
        { message: "Missing update fields (status or isArchived)" },
        { status: 400 }
      );
    }

    // Transaction to ensure stock consistency
    await prisma.$transaction(async (tx) => {
      // 1. If status is changing, we need to adjust stock
      if (status) {
        const orders = await tx.order.findMany({
          where: { id: { in: ids } },
        });

        const adjustments = new Map<string, number>(); // key: "productId|size", val: delta

        for (const order of orders) {
          if (!order.size) continue;
          const key = `${order.productId}|${order.size}`;

          // CASE A: Cancelling an order (Release Stock)
          if (status === "CANCELLED" && order.status !== "CANCELLED") {
            adjustments.set(key, (adjustments.get(key) || 0) - order.quantity);
          }
          // CASE B: Restoring a cancelled order (Consume Stock)
          else if (order.status === "CANCELLED" && status !== "CANCELLED") {
            adjustments.set(key, (adjustments.get(key) || 0) + order.quantity);
          }
        }

        // Apply variant updates
        for (const [key, delta] of adjustments.entries()) {
          const [productId, size] = key.split("|");
          if (delta !== 0) {
            await tx.productVariant.updateMany({
              where: { productId, size },
              data: { sold: { increment: delta } },
            });
          }
        }
      }

      // 2. Perform Order Updates
      const updateData: any = {};
      if (status) updateData.status = status;
      if (isArchived !== undefined) updateData.isArchived = isArchived;

      if ((status === "CANCELLED" || status === "DELETED") && deleteReason) {
        updateData.deleteReason = deleteReason;
      }

      await tx.order.updateMany({
        where: {
          id: { in: ids },
        },
        data: updateData,
      });
    });

    return NextResponse.json({ message: "Orders updated successfully" });
  } catch (error) {
    console.error("Batch update failed", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { message: "Invalid IDs" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Fetch Orders to release stock for non-cancelled orders
      const orders = await tx.order.findMany({
        where: { id: { in: ids } },
      });

      const adjustments = new Map<string, number>();

      for (const order of orders) {
        if (!order.size || order.status === "CANCELLED") continue; // Cancelled orders already released stock

        const key = `${order.productId}|${order.size}`;
        // Decrement (Release)
        adjustments.set(key, (adjustments.get(key) || 0) - order.quantity);
      }

      // 2. Adjust Stock
      for (const [key, delta] of adjustments.entries()) {
        const [productId, size] = key.split("|");
        if (delta !== 0) {
          await tx.productVariant.updateMany({
            where: { productId, size },
            data: { sold: { increment: delta } },
          });
        }
      }

      // 3. Delete Orders
      await tx.order.deleteMany({
        where: {
          id: { in: ids },
        },
      });
    });

    return NextResponse.json({ message: "Orders deleted successfully" });
  } catch (error) {
    console.error("Batch delete failed", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
