// src/app/api/completed-orders/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Get all COMPLETED orders (with items and fees)
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: { completed: true },
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
        // --- NEW: Also include fees when fetching completed orders ---
        fees: true, 
      },
      orderBy: { pickUpDate: 'desc' }, 
    });
    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch completed orders:", error);
    return NextResponse.json({ error: 'Failed to fetch completed orders' }, { status: 500 });
  }
}