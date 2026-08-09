/*
  Warnings:

  - The values [REFUND_REQUESTED,REFUNDED,REFUND_REJECTED] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `order_id` on the `refunds` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[ticket_id]` on the table `refunds` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `refund_end_date` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refund_percentage` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refund_policy` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ticket_id` to the `refunds` table without a default value. This is not possible if the table is not empty.
  - Made the column `order_id` on table `tickets` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('HELD', 'PAYMENT_PENDING', 'PAID', 'FULL_REFUND', 'PARTIAL_REFUND');
ALTER TABLE "public"."orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'HELD';
COMMIT;

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'REFUND';

-- DropForeignKey
ALTER TABLE "refunds" DROP CONSTRAINT "refunds_order_id_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_order_id_fkey";

-- DropIndex
DROP INDEX "admission_scans_ticket_id_idx";

-- DropIndex
DROP INDEX "refunds_order_id_key";

-- DropIndex
DROP INDEX "tickets_seat_id_key";

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "refund_end_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "refund_percentage" INTEGER NOT NULL,
ADD COLUMN     "refund_policy" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'HELD';

-- AlterTable
ALTER TABLE "refunds" DROP COLUMN "order_id",
ADD COLUMN     "ticket_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "tickets" ALTER COLUMN "order_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "admission_scans_gate_id_idx" ON "admission_scans"("gate_id");

-- CreateIndex
CREATE INDEX "events_organizer_id_idx" ON "events"("organizer_id");

-- CreateIndex
CREATE INDEX "events_sales_start_time_sales_end_time_idx" ON "events"("sales_start_time", "sales_end_time");

-- CreateIndex
CREATE INDEX "gates_event_id_idx" ON "gates"("event_id");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "orders_status_expires_at_idx" ON "orders"("status", "expires_at");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_ticket_id_key" ON "refunds"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_categories_event_id_idx" ON "ticket_categories"("event_id");

-- CreateIndex
CREATE INDEX "ticket_logs_ticket_id_idx" ON "ticket_logs"("ticket_id");

-- CreateIndex
CREATE INDEX "tickets_order_id_idx" ON "tickets"("order_id");

-- CreateIndex
CREATE INDEX "tickets_seat_id_status_idx" ON "tickets"("seat_id", "status");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
