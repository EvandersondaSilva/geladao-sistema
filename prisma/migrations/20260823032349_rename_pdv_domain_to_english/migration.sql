/*
  Warnings:

  - You are about to drop the column `formaPagamento` on the `orders` table. All the data in the column will be lost.
  - The `status` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `estoqueAtual` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `estoqueMinimo` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `operadorPin` on the `settings` table. All the data in the column will be lost.
  - You are about to drop the `caixas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `itens_venda` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `movimentos_estoque` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `vendas` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `paymentMethod` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CashRegisterStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'PIX');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "StockMovementReason" AS ENUM ('SALE', 'CANCELLATION_REVERSAL', 'RESTOCK', 'MANUAL_ADJUSTMENT');

-- DropForeignKey
ALTER TABLE "itens_venda" DROP CONSTRAINT "itens_venda_productId_fkey";

-- DropForeignKey
ALTER TABLE "itens_venda" DROP CONSTRAINT "itens_venda_vendaId_fkey";

-- DropForeignKey
ALTER TABLE "movimentos_estoque" DROP CONSTRAINT "movimentos_estoque_orderId_fkey";

-- DropForeignKey
ALTER TABLE "movimentos_estoque" DROP CONSTRAINT "movimentos_estoque_productId_fkey";

-- DropForeignKey
ALTER TABLE "movimentos_estoque" DROP CONSTRAINT "movimentos_estoque_vendaId_fkey";

-- DropForeignKey
ALTER TABLE "vendas" DROP CONSTRAINT "vendas_caixaId_fkey";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "formaPagamento",
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "products" DROP COLUMN "estoqueAtual",
DROP COLUMN "estoqueMinimo",
ADD COLUMN     "currentStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "minimumStock" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "settings" DROP COLUMN "operadorPin",
ADD COLUMN     "operatorPin" TEXT;

-- DropTable
DROP TABLE "caixas";

-- DropTable
DROP TABLE "itens_venda";

-- DropTable
DROP TABLE "movimentos_estoque";

-- DropTable
DROP TABLE "vendas";

-- DropEnum
DROP TYPE "FormaPagamento";

-- DropEnum
DROP TYPE "MotivoMovimento";

-- DropEnum
DROP TYPE "StatusCaixa";

-- DropEnum
DROP TYPE "StatusPedido";

-- DropEnum
DROP TYPE "TipoMovimento";

-- CreateTable
CREATE TABLE "cash_registers" (
    "id" TEXT NOT NULL,
    "status" "CashRegisterStatus" NOT NULL DEFAULT 'OPEN',
    "openingAmount" INTEGER NOT NULL,
    "reportedClosingAmount" INTEGER,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "cashRegisterId" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "reason" "StockMovementReason" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "saleId" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "cash_registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
