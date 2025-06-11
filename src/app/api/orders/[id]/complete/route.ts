// src/app/api/orders/[id]/complete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


// PATCH: Mark an order as completed and clean up special prices if it's the last one for a customer
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Await the params Promise
    const orderId = Number(id);

    await prisma.$transaction(async (tx) => {
      // Step 1: Find the order to get the customer's name.
      const orderToComplete = await tx.order.findUnique({
        where: { id: orderId },
        select: { customerName: true },
      });

      if (!orderToComplete) {
        // This will cause the transaction to fail and roll back.
        throw new Error('Order not found.');
      }
      const { customerName } = orderToComplete;

      // Step 2: Mark the order as completed.
      await tx.order.update({
        where: {
          id: orderId,
          completed: false, // Ensure we only complete an order once
        },
        data: {
          completed: true,
        },
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
    console.error("Failed to complete order and cleanup special prices:", error);
    if (error instanceof Error && error.message === 'Order not found.') {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    // This handles the case where the order might already be completed.
    // Prisma throws a specific error when `update` finds no record matching the `where` clause.
    if (error instanceof Error && error.name === 'PrismaClientKnownRequestError') {
        return NextResponse.json({ error: 'Order not found or already completed.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to complete order' }, { status: 500 });
  }
}