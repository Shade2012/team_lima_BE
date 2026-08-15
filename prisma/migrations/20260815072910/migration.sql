-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "provider_trx_id" DROP NOT NULL,
ALTER COLUMN "payment_method" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "gate_id" UUID;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_gate_id_fkey" FOREIGN KEY ("gate_id") REFERENCES "gates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
