/*
  Warnings:

  - You are about to drop the column `inStock` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `rentedOut` on the `InventoryItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InventoryItem" DROP COLUMN "inStock",
DROP COLUMN "rentedOut";
