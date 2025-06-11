/*
  Warnings:

  - A unique constraint covering the columns `[customerName,itemName]` on the table `SpecialPrice` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SpecialPrice_customerName_itemName_key" ON "SpecialPrice"("customerName", "itemName");
