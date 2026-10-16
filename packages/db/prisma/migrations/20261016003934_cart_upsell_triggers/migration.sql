-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "upsellRuleId" TEXT;

-- AlterTable
ALTER TABLE "UpsellRule" ADD COLUMN     "triggerCategoryId" TEXT;

-- CreateIndex
CREATE INDEX "UpsellRule_storeId_triggerCategoryId_idx" ON "UpsellRule"("storeId", "triggerCategoryId");

-- AddForeignKey
ALTER TABLE "UpsellRule" ADD CONSTRAINT "UpsellRule_triggerCategoryId_fkey" FOREIGN KEY ("triggerCategoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_upsellRuleId_fkey" FOREIGN KEY ("upsellRuleId") REFERENCES "UpsellRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
