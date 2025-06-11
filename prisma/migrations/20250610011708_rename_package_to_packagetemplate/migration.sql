/*
  Warnings:

  - You are about to drop the `Package` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PackageItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PackageItem" DROP CONSTRAINT "PackageItem_inventoryItemId_fkey";

-- DropForeignKey
ALTER TABLE "PackageItem" DROP CONSTRAINT "PackageItem_packageId_fkey";

-- DropTable
DROP TABLE "Package";

-- DropTable
DROP TABLE "PackageItem";

-- CreateTable
CREATE TABLE "PackageTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageTemplateItem" (
    "id" SERIAL NOT NULL,
    "quantity" INTEGER NOT NULL,
    "packageTemplateId" INTEGER NOT NULL,
    "inventoryItemId" INTEGER NOT NULL,

    CONSTRAINT "PackageTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackageTemplate_name_key" ON "PackageTemplate"("name");

-- AddForeignKey
ALTER TABLE "PackageTemplateItem" ADD CONSTRAINT "PackageTemplateItem_packageTemplateId_fkey" FOREIGN KEY ("packageTemplateId") REFERENCES "PackageTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageTemplateItem" ADD CONSTRAINT "PackageTemplateItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
