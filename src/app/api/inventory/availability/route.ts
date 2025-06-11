// src/app/api/inventory/availability/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


// POST: Check availability for a specific item within a date range
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inventoryItemId, pickUpDate, deliveryDate, editingOrderId } = body;

    if (!inventoryItemId || !pickUpDate || !deliveryDate) {
      return NextResponse.json({ error: 'Missing required fields: itemId, pickUpDate, or deliveryDate' }, { status: 400 });
    }

    const startDate = new Date(pickUpDate);
    const endDate = new Date(deliveryDate);

    // Find all active orders that have this item and whose dates overlap with the requested range.
    // We must exclude the order we are currently editing, if any.
    const overlappingOrderItems = await prisma.orderItem.findMany({
      where: {
        inventoryItemId: Number(inventoryItemId),
        order: {
          completed: false,
          // Exclude the current order if we are in edit mode
          id: editingOrderId ? { not: Number(editingOrderId) } : undefined,
          // The core logic: an order overlaps if its start is before our end,
          // AND its end is after our start.
          AND: [
            { pickUpDate: { lt: endDate } },
            { deliveryDate: { gt: startDate } },
          ],
        },
      },
    });

    // Sum the quantities of all overlapping items
    const rentedOutDuringPeriod = overlappingOrderItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    return NextResponse.json({ rentedOut: rentedOutDuringPeriod });

  } catch (error) {
    console.error("Failed to check availability:", error);
    return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
  }
}