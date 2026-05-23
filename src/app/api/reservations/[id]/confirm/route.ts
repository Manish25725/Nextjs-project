import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: reservationId } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { inventory: true },
      });

      if (!reservation) throw new Error("Reservation not found");
      if (reservation.status !== "PENDING") {
        throw new Error(`Cannot confirm reservation in ${reservation.status} state`);
      }

      if (reservation.expiresAt < new Date()) {
        throw new Error("Reservation has expired. It will be released by the cron job.");
      }

      await tx.inventory.update({
        where: { id: reservation.inventoryId },
        data: {
          total: { decrement: reservation.quantity },
          reserved: { decrement: reservation.quantity },
        },
      });

      return await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: "CONFIRMED" },
      });
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
