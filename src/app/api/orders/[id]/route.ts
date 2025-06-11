// src/app/api/orders/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT: Edit an existing order with a hard, date-based stock check
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orderId = Number(params.id);
    const data = await request.json();
    const { customerName, deposit, pickUpDate, deliveryDate, items: newItems } = data;

    if (!customerName || !pickUpDate || !deliveryDate || !Array.isArray(newItems) || newItems.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const startDate = new Date(pickUpDate);
    const endDate = new Date(deliveryDate);

    // --- TRANSACTION WITH HARD STOCK CHECK ---
    await prisma.$transaction(async (tx) => {
      // 1. Validate availability for EACH item in the new order, excluding the current order being edited
      for (const item of newItems) {
        const inventoryItem = await tx.inventoryItem.findUnique({ where: { id: item.itemId } });
        if (!inventoryItem) throw new Error(`Item with ID ${item.itemId} not found.`);

        const overlappingOrderItems = await tx.orderItem.findMany({
          where: {
            inventoryItemId: item.itemId,
            order: {
              id: { not: orderId }, // Exclude the order we are currently editing
              completed: false,
              AND: [{ pickUpDate: { lt: endDate } }, { deliveryDate: { gt: startDate } }],
            },
          },
        });

        const rentedOutDuringPeriod = overlappingOrderItems.reduce((sum, i) => sum + i.quantity, 0);
        const available = inventoryItem.totalQuantity - rentedOutDuringPeriod;

        if (item.quantity > available) {
          throw new Error(`Not enough '${inventoryItem.name}' available. Only ${available} left for these dates.`);
        }
      }

      // 2. If all checks pass, delete the old items and update the order with the new ones
      await tx.orderItem.deleteMany({ where: { orderId } });

      await tx.order.update({
        where: { id: orderId },
        data: {
          customerName,
          deposit: deposit ? Number(deposit) : undefined,
          pickUpDate: startDate,
          deliveryDate: endDate,
          items: {
            create: newItems.map((item: any) => ({
              inventoryItemId: item.itemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              specialPrice: item.specialPrice ?? undefined,
            })),
          },
        },
      });
    });
    // --- TRANSACTION END ---

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update order due to an unknown error.' }, { status: 500 });
  }
}

// DELETE: Delete an active order and clean up special prices if it's the last one for a customer
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orderId = Number(params.id);

    await prisma.$transaction(async (tx) => {
      // Step 1: Find the order to get the customer's name before deleting it.
      const orderToDelete = await tx.order.findUnique({
        where: { id: orderId },
        select: { customerName: true },
      });

      if (!orderToDelete) {
        // This will cause the transaction to fail and roll back.
        throw new Error('Order not found.');
      }
      const { customerName } = orderToDelete;

      // Step 2: Delete the order. Prisma's cascade will handle its OrderItems.
      await tx.order.delete({
        where: { id: orderId },
      });

      // Step 3: Check if any other ACTIVE orders exist for this customer.
      const remainingActiveOrdersCount = await tx.order.count({
        where: {
          customerName: customerName,
          completed: false,
        },
      });

      // Step 4: If no active orders remain, delete their special prices.
      if (remainingActiveOrdersCount === 0) {
        await tx.specialPrice.deleteMany({
          where: {
            customerName: customerName,
          },
        });
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete order and cleanup special prices:", error);
    if (error instanceof Error && error.message === 'Order not found.') {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}