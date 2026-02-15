import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, price, keyword, description, imageUrl, stock } = body;

    const product = await prisma.product.create({
      data: {
        name,
        price: Number(price),
        keyword: keyword.toUpperCase(),
        description,
        imageUrl,
        stock: Number(stock) || 0,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
