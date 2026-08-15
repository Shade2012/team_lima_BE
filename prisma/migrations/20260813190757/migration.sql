/*
  Warnings:

  - Added the required column `event_id` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "event_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "orders_event_id_idx" ON "orders"("event_id");

-- CreateIndex
CREATE INDEX "seats_id_category_id_idx" ON "seats"("id", "category_id");

-- CreateIndex
CREATE INDEX "ticket_categories_id_event_id_idx" ON "ticket_categories"("id", "event_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
