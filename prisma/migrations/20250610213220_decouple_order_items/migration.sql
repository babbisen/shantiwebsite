-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_inventoryItemId_fkey";

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "itemName" TEXT,
ALTER COLUMN "inventoryItemId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
