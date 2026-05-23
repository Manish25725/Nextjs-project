import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      // Fetch a single reservation by ID
      const reservation = await prisma.reservation.findUnique({
        where: { id },
        include: {
          inventory: {
            include: {
              product: true,
              warehouse: true,
            },
          },
        },
      });
      if (!reservation) {
        return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
      }
      return NextResponse.json(reservation);
    }

    // Fetch all reservations
    const reservations = await prisma.reservation.findMany({
      include: {
        inventory: {
          include: {
            product: true,
            warehouse: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(reservations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { productId, warehouseId, quantity, idempotencyKey } = await req.json();

    if (!productId || !warehouseId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    if (idempotencyKey) {
      const existing = await prisma.reservation.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return NextResponse.json(existing, { status: 200 });
      }
    }

    // Interactive Transaction with Row-Level Lock for Concurrency
    const reservation = await prisma.$transaction(async (tx) => {
      // 1. Lock the inventory row strictly in Postgres to prevent concurrent race conditions
      const inventoryList = await tx.$queryRaw<any[]>`
        SELECT id, total, reserved 
        FROM "Inventory" 
        WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
        FOR UPDATE
      `;

      if (!inventoryList || inventoryList.length === 0) {
        throw new Error("Inventory not found for this product and warehouse.");
      }

      const inventory = inventoryList[0];
      const available = inventory.total - inventory.reserved;

      if (available < quantity) {
        throw new Error(`Insufficient stock. Requested: ${quantity}, Available: ${available}`);
      }

      // 2. Update the reserved amount
      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          reserved: {
            increment: quantity,
          },
        },
      });

      // 3. Create the Reservation
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15-minute hold

      const newReservation = await tx.reservation.create({
        data: {
          inventoryId: inventory.id,
          quantity,
          status: "PENDING",
          expiresAt,
          idempotencyKey,
        },
      });

      return newReservation;
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}