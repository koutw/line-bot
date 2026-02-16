import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const users = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      lineId: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
    },
  });
  return NextResponse.json(users);
}
