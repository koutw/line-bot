import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ACTIVE";

    const products = await prisma.product.findMany({
      where: { status },
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

    const upperKeyword = keyword.toUpperCase();

    // Check if ACTIVE product with same keyword exists
    const existing = await prisma.product.findFirst({
      where: { keyword: upperKeyword, status: "ACTIVE" },
    });

    if (existing) {
      return NextResponse.json({ error: `Start keyword ${upperKeyword} is already in use.` }, { status: 409 });
    }

    const productData: any = {
      name,
      keyword: upperKeyword,
      description,
      imageUrl,
      status: "ACTIVE",
    };

    if (variants && Array.isArray(variants)) {
      productData.variants = {
        create: variants.map((v: any) => ({
          size: v.size,
          price: Number(v.price),
          stock: (v.stock === null || v.stock === undefined || v.stock === "") ? undefined : Number(v.stock),
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
    const { id, name, keyword, description, imageUrl, variants, status } = body;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Transaction to update product and replace variants
    await prisma.$transaction(async (tx) => {
      // 1. Check for Uniqueness if setting to ACTIVE or changing keyword of an ACTIVE product
      // We need to fetch current product first to know its current status if not provided
      const currentProduct = await tx.product.findUnique({ where: { id } });
      if (!currentProduct) throw new Error("Product not found");

      const targetStatus = status || currentProduct.status;
      const targetKeyword = keyword ? keyword.toUpperCase() : currentProduct.keyword;

      if (targetStatus === "ACTIVE") {
        const existing = await tx.product.findFirst({
          where: {
            keyword: targetKeyword,
            status: "ACTIVE",
            id: { not: id }, // Exclude self
          },
        });
        if (existing) {
          throw new Error(`Start keyword ${targetKeyword} is already in use by another ACTIVE product.`);
        }
      }

      // 2. Update Product
      const updateData: any = {};
      if (name) updateData.name = name;
      if (keyword) updateData.keyword = targetKeyword;
      if (description !== undefined) updateData.description = description;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (status) updateData.status = status;

      await tx.product.update({
        where: { id },
        data: updateData,
      });

      // 2. Manage Variants (Full Replacement) - Only if variants provided
      if (variants && Array.isArray(variants)) {
        await tx.productVariant.deleteMany({ where: { productId: id } });

        await tx.productVariant.createMany({
          data: variants.map((v: any) => ({
            productId: id,
            size: v.size,
            price: Number(v.price),
            stock: (v.stock === null || v.stock === undefined || v.stock === "") ? undefined : Number(v.stock),
            sold: v.sold ? Number(v.sold) : 0,
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


