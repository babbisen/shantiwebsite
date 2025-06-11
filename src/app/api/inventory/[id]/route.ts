// src/app/api/inventory/[id]/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// PATCH: Update a core inventory item's details with robust validation
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const itemId = Number(params.id);
    if (isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item ID.' }, { status: 400 });
    }

    const body = await request.json();

    // --- 1. Sanitize and Validate All Inputs First ---
    const name = body.name?.trim();
    const totalQuantity = parseInt(body.totalQuantity, 10);
    const pricePerItem = parseInt(body.pricePerItem, 10);
    const pricePaid = parseInt(body.pricePaid, 10);

    if (!name) {
      return NextResponse.json({ error: 'Item name is required.' }, { status: 400 });
    }
    if (isNaN(totalQuantity) || isNaN(pricePerItem) || isNaN(pricePaid)) {
      return NextResponse.json({ error: 'All numeric fields must contain valid numbers.' }, { status: 400 });
    }
    if (totalQuantity < 0 || pricePerItem < 0 || pricePaid < 0) {
      return NextResponse.json({ error: 'Numeric values cannot be negative.' }, { status: 400 });
    }

    // --- 2. Business Logic Validation: Prevent negative stock ---
    const rentedOutCount = await prisma.orderItem.aggregate({
      where: {
        inventoryItemId: itemId,
        order: {
          completed: false,
        },
      },
      _sum: {
        quantity: true,
      },
    });

    const currentlyRented = rentedOutCount._sum.quantity || 0;

    if (totalQuantity < currentlyRented) {
      return NextResponse.json(
        { error: `Cannot set total quantity to ${totalQuantity}. There are currently ${currentlyRented} items rented out.` },
        { status: 400 }
      );
    }
    
    // --- 3. Database Update with GUARANTEED CORRECT SYNTAX ---
    const updatedItem = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        name: name,
        totalQuantity: totalQuantity,
        pricePerItem: pricePerItem,
        pricePaid: pricePaid,
      },
    });

    return NextResponse.json(updatedItem, { status: 200 });

  } catch (error) {
    // --- 4. Enhanced Error Handling ---
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'An item with this name already exists. Please choose a different name.' },
          { status: 409 }
        );
      }
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Item not found.' },
          { status: 404 }
        );
      }
    }
    
    console.error("Failed to update item in database:", error);
    // Provide the actual error in the response for better debugging if it's not a known one
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to update item.', details: errorMessage }, { status: 500 });
  }
}

// DELETE: Delete an inventory item
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const itemId = Number(params.id);
    if (isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item ID.' }, { status: 400 });
    }
    
    await prisma.inventoryItem.delete({
      where: { id: itemId },
    });
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return NextResponse.json(
          { error: 'Cannot delete item: It is part of an existing order (active or completed). To preserve history, it cannot be removed.' },
          { status: 409 }
        );
      }
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Item not found.' },
          { status: 404 }
        );
      }
    }
    console.error("Failed to delete item:", error);
    return NextResponse.json({ error: 'Failed to delete item.' }, { status: 500 });
  }
}