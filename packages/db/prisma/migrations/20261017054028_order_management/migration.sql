-- CreateEnum
CREATE TYPE "OrderNoteKind" AS ENUM ('NOTE', 'NO_ANSWER');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "lastContactAt" TIMESTAMP(3),
ADD COLUMN     "noAnswerCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "OrderNote" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "adminUserId" TEXT,
    "kind" "OrderNoteKind" NOT NULL DEFAULT 'NOTE',
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderNote_storeId_orderId_createdAt_idx" ON "OrderNote"("storeId", "orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrderNote" ADD CONSTRAINT "OrderNote_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderNote" ADD CONSTRAINT "OrderNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderNote" ADD CONSTRAINT "OrderNote_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
