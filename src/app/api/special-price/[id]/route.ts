// src/app/api/special-price/[id]/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DELETE: Delete a special price and revert prices on active orders
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const specialPriceId = Number(params.id);

    // --- TRANSACTION START ---
    await prisma.$transaction(async (tx) => {
      // 1. Find the special price to get customer and item names
      const specialPriceToDelete = await tx.specialPrice.findUnique({
        where: { id: specialPriceId },
      });

      if (!specialPriceToDelete) {
        // If it's already gone, we're done.
        return;
      }

      const { customerName, itemName } = specialPriceToDelete;

      // 2. Find the inventory item to get its standard price and ID
      const inventoryItem = await tx.inventoryItem.findUnique({
        where: { name: itemName },
      });

      if (!inventoryItem) {
        // Item might have been deleted, which is okay. We just can't revert prices.
        // We can still delete the special price record.
      } else {
        // 3. Find all active order items for this customer and item
        const affectedOrderItems = await tx.orderItem.findMany({
          where: {
            inventoryItemId: inventoryItem.id,
            order: { customerName: customerName, completed: false },
          },
        });

        // 4. Revert their prices back to the standard price
        for (const orderItem of affectedOrderItems) {
          await tx.orderItem.update({
            where: { id: orderItem.id },
            data: {
              unitPrice: inventoryItem.pricePerItem, // Revert to standard price
              total: inventoryItem.pricePerItem * orderItem.quantity, // Recalculate total
              specialPrice: null, // Remove the special price indicator
            },
          });
        }
      }

      // 5. Finally, delete the special price record itself
      await tx.specialPrice.delete({
        where: { id: specialPriceId },
      });
    });
    // --- TRANSACTION END ---

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete special price:", error);
    return NextResponse.json({ error: 'Failed to delete special price' }, { status: 500 });
  }
}