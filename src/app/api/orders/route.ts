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

  const where: any = {};
  if (status) {
    const statuses = status.split(",");
    if (statuses.length > 1) {
      where.status = { in: statuses };
    } else {
      where.status = status;
    }
  }

  if (keyword) {
    where.product = {
      keyword: keyword,
    };
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
    const { ids, status, deleteReason } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { message: "Invalid IDs" },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { message: "Missing status" },
        { status: 400 }
      );
    }

    const updateData: any = { status };
    if (status === "DELETED" && deleteReason) {
      updateData.deleteReason = deleteReason;
    }

    await prisma.order.updateMany({
      where: {
        id: { in: ids },
      },
      data: updateData,
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

    await prisma.order.deleteMany({
      where: {
        id: { in: ids },
      },
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
