import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const where: any = {};
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      user: true,
      product: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Generate CSV Header
  const csvHeader = [
    "Order ID",
    "Date",
    "User Name",
    "Line ID",
    "Product Keyword",
    "Product Name",
    "Quantity",
    "Price",
    "Total",
    "Status"
  ].join(",");

  // Generate CSV Rows
  const csvRows = orders.map(order => {
    return [
      order.id,
      order.createdAt.toISOString().split('T')[0],
      `"${order.user.name || 'Unknown'}"`,
      order.user.lineId,
      order.product.keyword,
      `"${order.product.name}"`,
      order.quantity,
      order.product.price,
      order.totalAmount,
      order.status
    ].join(",");
  });

  const csvContent = [csvHeader, ...csvRows].join("\n");

  // Return as downloadable file
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
