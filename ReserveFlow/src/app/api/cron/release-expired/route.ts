import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Expose a POST/GET route for the CRON job (e.g. Vercel Cron)
export async function GET(req: Request) {
  try {
    // Optionally: authorize the request using an Authorization header configured in Vercel Cron
    // const authHeader = req.headers.get("authorization");
    // if (authHeader !== \`Bearer \${process.env.CRON_SECRET}\`) {
    //   return new Response("Unauthorized", { status: 401 });
    // }

    // Find all expired and PENDING reservations
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
    });

    let releasedCount = 0;

    // Process each expiration specifically inside its own transaction
    for (const reservation of expiredReservations) {
      try {
        await prisma.$transaction(async (tx) => {
          // Double check status hasn't changed concurrently
          const currentRes = await tx.reservation.findUnique({
            where: { id: reservation.id },
          });

          if (currentRes?.status === "PENDING") {
            // Free the reserved stock
            await tx.inventory.update({
              where: { id: reservation.inventoryId },
              data: { reserved: { decrement: reservation.quantity } },
            });

            // Mark expired
            await tx.reservation.update({
              where: { id: reservation.id },
              data: { status: "EXPIRED" },
            });
            releasedCount++;
          }
        });
      } catch (err) {
        console.error(`Failed to process expiration for reservation ${reservation.id}`, err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully expired ${releasedCount} inactive reservations.`,
      processedIds: expiredReservations.map(r => r.id)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}