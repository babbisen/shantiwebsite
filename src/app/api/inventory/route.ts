// src/app/api/inventory/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Get all inventory items and dynamically calculate current stock
export async function GET() {
  try {
    // 1. Fetch all inventory items
    const inventoryItems = await prisma.inventoryItem.findMany({
      orderBy: { name: 'asc' }, // Order alphabetically by name
    });

    // 2. Fetch all order items from ACTIVE (not completed) orders
    const activeOrderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          completed: false,
        },
      },
    });

    // 3. Calculate the total rented out quantity for each item
    const rentedOutMap = new Map<number, number>();
    for (const orderItem of activeOrderItems) {
      // --- THIS IS THE FIX ---
      // Only process items that are still linked to an inventory item
      if (orderItem.inventoryItemId !== null) {
        const currentRented = rentedOutMap.get(orderItem.inventoryItemId) || 0;
        rentedOutMap.set(orderItem.inventoryItemId, currentRented + orderItem.quantity);
      }
    }

    // 4. Combine the data, calculating inStock and rentedOut for the frontend
    const responseData = inventoryItems.map(item => {
      const rentedOut = rentedOutMap.get(item.id) || 0;
      const inStock = item.totalQuantity - rentedOut;
      return {
        ...item,
        rentedOut,
        inStock,
      };
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

// POST: Create a new inventory item
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      name,
      totalQuantity,
      pricePerItem,
      pricePaid,
    } = data;

    if (!name || totalQuantity === undefined || pricePerItem === undefined || pricePaid === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newItem = await prisma.inventoryItem.create({
      data: {
        name,
        totalQuantity: Number(totalQuantity),
        pricePerItem: Number(pricePerItem),
        pricePaid: Number(pricePaid),
      },
    });

    const responseItem = {
      ...newItem,
      rentedOut: 0,
      inStock: newItem.totalQuantity,
    };

    return NextResponse.json(responseItem, { status: 201 });
  } catch (error) {
    console.error("Failed to add item:", error);
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  }
}