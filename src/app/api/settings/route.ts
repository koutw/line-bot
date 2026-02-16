import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "ordering_enabled" },
    });
    return NextResponse.json({ value: setting?.value === "true" });
  } catch (error) {
    console.error("Settings API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { enabled } = await req.json();
    const setting = await prisma.systemSetting.upsert({
      where: { key: "ordering_enabled" },
      update: { value: String(enabled) },
      create: { key: "ordering_enabled", value: String(enabled) },
    });
    return NextResponse.json({ value: setting.value === "true" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
  }
}
