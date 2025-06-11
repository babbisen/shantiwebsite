-- CreateTable
CREATE TABLE "OrderFee" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,

    CONSTRAINT "OrderFee_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrderFee" ADD CONSTRAINT "OrderFee_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
