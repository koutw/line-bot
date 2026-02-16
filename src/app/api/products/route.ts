import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: { variants: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
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
    return NextResponse.json({ error: "Failed to create product", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
    }
    await prisma.product.deleteMany({
      where: { id: { in: ids } },
    });
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting products:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, keyword, description, imageUrl, variants } = body;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Transaction to update product and replace variants
    await prisma.$transaction(async (tx) => {
      // 1. Update Product
      await tx.product.update({
        where: { id },
        data: {
          name,
          keyword: keyword.toUpperCase(),
          description,
          imageUrl,
        },
      });

      // 2. Manage Variants (Full Replacement)
      await tx.productVariant.deleteMany({ where: { productId: id } });

      if (variants && Array.isArray(variants)) {
        await tx.productVariant.createMany({
          data: variants.map((v: any) => ({
            productId: id,
            size: v.size,
            price: Number(v.price),
            stock: 0, // Default to 0 as stock management is removed from UI
          })),
        });
      }
    });

    return NextResponse.json({ message: "Updated successfully" });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}
