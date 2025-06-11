// src/app/api/orders/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Get all active orders
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: { completed: false },
      include: {
        items: {
          include: {
            inventoryItem: {
              select: {
                name: true,
              },
            },
          },
        },
        fees: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// POST: Create a new order with a hard, date-based stock check
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { customerName, deposit, pickUpDate, deliveryDate, items, finalPrice, fees } = data;

    if (!customerName || !pickUpDate || !deliveryDate || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const startDate = new Date(pickUpDate);
    const endDate = new Date(deliveryDate);

    const createdOrder = await prisma.$transaction(async (tx) => {
      // Step 1: Prepare OrderItem data and check stock simultaneously.
      const orderItemsData = [];
      for (const item of items) {
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: { id: item.itemId },
        });

        if (!inventoryItem) {
          throw new Error(`Item with ID ${item.itemId} not found.`);
        }

        // Stock check logic (unchanged)
        const overlappingOrderItems = await tx.orderItem.findMany({
          where: {
            inventoryItemId: item.itemId,
            order: {
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
        
        // Add prepared item data to our array, including the new itemName
        orderItemsData.push({
          itemName: inventoryItem.name, // <-- THIS IS THE NEW SNAPSHOT
          inventoryItemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          specialPrice: item.specialPrice ?? undefined,
        });
      }

      // Step 2: Create the order using the prepared data.
      const order = await tx.order.create({
        data: {
          customerName,
          deposit: deposit ? Number(deposit) : undefined,
          pickUpDate: startDate,
          deliveryDate: endDate,
          finalPrice: finalPrice ?? undefined,
          items: {
            create: orderItemsData, // <-- Use the prepared array
          },
          fees: {
            create: Array.isArray(fees) ? fees.map((fee: any) => ({
              description: fee.description,
              amount: fee.amount,
            })) : undefined,
          },
        },
        include: { 
          items: true,
          fees: true,
        },
      });
      return order;
    });

    return NextResponse.json(createdOrder, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Order creation failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("An unknown error occurred during order creation:", error);
    return NextResponse.json({ error: 'Failed to create order due to an unknown error.' }, { status: 500 });
  }
}