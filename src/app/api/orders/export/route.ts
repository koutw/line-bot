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
    orderBy: [
      { user: { name: "asc" } },
      { createdAt: "desc" }
    ],
  });

  // Generate CSV Header
  const csvHeader = [
    "訂單日期",
    "訂購平台",
    "訂購人",
    "品牌",
    "編號",
    "訂購品項",
    "尺寸",
    "件數",
    "售價",
    "抽獎編號",
    "總金額",
    "庫存",
    "寄貨方式",
    "付款方式",
    "已到貨",
    "已出貨",
    "已叫貨",
    "已入帳",
    "備註"
  ].join(",");

  // Generate CSV Rows
  const csvRows = orders.map(order => {
    const date = new Date(order.createdAt).toISOString().split('T')[0].replace(/-/g, '/');
    const unitPrice = order.quantity > 0 ? Math.round(order.totalAmount / order.quantity) : 0;

    // Status mapping for note or bool columns if needed
    // Currently defaulting bools to FALSE

    return [
      date,
      "官方賴", // Platform
      `"${order.user.name || ''}"`,
      "", // Brand
      order.product.keyword,
      `"${order.product.name}"`,
      order.size || "F",
      order.quantity,
      unitPrice,
      "", // Lottery
      order.totalAmount, // Total
      "", // Stock
      "", // Shipping Method
      "", // Payment Method
      "FALSE", // Arrived
      "FALSE", // Shipped
      "FALSE", // Ordered
      "FALSE", // Paid
      `"${order.status === 'CANCELLED' ? (order.deleteReason || '取消') : order.status}"` // Note
    ].join(",");
  });

  // Add BOM for Excel compatibility
  const csvContent = "\uFEFF" + [csvHeader, ...csvRows].join("\n");

  // Return as downloadable file
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
