// src/app/api/special-price/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


// GET: Get all special prices
export async function GET() {
  try {
    const specials = await prisma.specialPrice.findMany({
        orderBy: { customerName: 'asc' }
    });
    return NextResponse.json(specials, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch special prices:", error);
    return NextResponse.json({ error: 'Failed to fetch special prices' }, { status: 500 });
  }
}

// POST: Add or update a special price and update active orders
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { customerName, itemName, price } = data;

    if (!customerName || !itemName || typeof price !== 'number') {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    // --- TRANSACTION START ---
    const special = await prisma.$transaction(async (tx) => {
        // 1. Upsert the special price
        const sp = await tx.specialPrice.upsert({
            where: { customerName_itemName: { customerName, itemName } },
            update: { price },
            create: { customerName, itemName, price },
        });

        // 2. Find the inventory item to get its ID
        const inventoryItem = await tx.inventoryItem.findUnique({ where: { name: itemName } });
        if (!inventoryItem) {
            // This should rarely happen if the UI is correct, but it's a good safeguard
            throw new Error(`Inventory item '${itemName}' not found.`);
        }

        // 3. Update all active order items for this customer and item with the new special price
        const affectedOrderItems = await tx.orderItem.findMany({
            where: {
                inventoryItemId: inventoryItem.id,
                order: { customerName: customerName, completed: false },
            },
        });

        for (const orderItem of affectedOrderItems) {
            await tx.orderItem.update({
                where: { id: orderItem.id },
                data: {
                    unitPrice: price,
                    total: price * orderItem.quantity,
                    specialPrice: price,
                },
            });
        }
        return sp;
    });
    // --- TRANSACTION END ---

    return NextResponse.json(special, { status: 201 });
  } catch (error) {
    console.error("Failed to save special price:", error);
    if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to save special price' }, { status: 500 });
  }
}