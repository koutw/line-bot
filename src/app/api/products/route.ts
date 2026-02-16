import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    include: { variants: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, keyword, description, imageUrl, variants } = body;

    // variants should be an array of { size, price, stock }
    // If legacy format is sent, default to "F" size? 
    // For now assuming the admin UI (or webhook) sends correct structure.

    const productData: any = {
      name,
      keyword: keyword.toUpperCase(),
      description,
      imageUrl,
    };

    if (variants && Array.isArray(variants)) {
      productData.variants = {
        create: variants.map((v: any) => ({
          size: v.size,
          price: Number(v.price),
          stock: Number(v.stock) || 0,
        })),
      };
    }

    const product = await prisma.product.create({
      data: productData,
      include: { variants: true },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
