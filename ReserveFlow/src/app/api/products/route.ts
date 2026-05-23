import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        inventories: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute the aggregated available count for the UI
    const formattedProducts = products.map((p) => {
      const totalAvailable = p.inventories.reduce(
        (acc, inv) => acc + (inv.total - inv.reserved),
        0
      );
      return {
        ...p,
        totalAvailable,
      };
    });

    return NextResponse.json(formattedProducts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}