-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'OPERATOR';

-- AlterTable
ALTER TABLE "cash_registers" ADD COLUMN     "closedById" TEXT,
ADD COLUMN     "openedById" TEXT;

-- AlterTable
ALTER TABLE "debt_payments" ADD COLUMN     "receivedById" TEXT;

-- AlterTable
ALTER TABLE "settings" DROP COLUMN "operatorPin";

-- AlterTable
ALTER TABLE "tabs" ADD COLUMN     "closedById" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "role" SET DEFAULT 'OPERATOR';

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabs" ADD CONSTRAINT "tabs_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

