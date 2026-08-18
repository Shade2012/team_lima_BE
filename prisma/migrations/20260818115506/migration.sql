/*
  Warnings:

  - A unique constraint covering the columns `[provider_refund_id]` on the table `refunds` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "description" TEXT,
ADD COLUMN     "image_key" TEXT;

-- AlterTable
ALTER TABLE "refunds" ADD COLUMN     "admin_id" UUID,
ADD COLUMN     "processed_at" TIMESTAMP(3),
ADD COLUMN     "provider_refund_id" TEXT,
ADD COLUMN     "reject_reason" TEXT,
ADD COLUMN     "status" "RefundStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "ticket_categories" ADD COLUMN     "blocked_seats" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "columns" INTEGER,
ADD COLUMN     "pos_index" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rows" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "refunds_provider_refund_id_key" ON "refunds"("provider_refund_id");
