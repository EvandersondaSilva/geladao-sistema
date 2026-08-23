-- CreateEnum
CREATE TYPE "StatusCaixa" AS ENUM ('ABERTO', 'FECHADO');

-- AlterTable
ALTER TABLE "movimentos_estoque" ADD COLUMN     "vendaId" TEXT;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "operadorPin" TEXT;

-- CreateTable
CREATE TABLE "caixas" (
    "id" TEXT NOT NULL,
    "status" "StatusCaixa" NOT NULL DEFAULT 'ABERTO',
    "valorAbertura" INTEGER NOT NULL,
    "valorFechamentoInformado" INTEGER,
    "abertoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechadoEm" TIMESTAMP(3),

    CONSTRAINT "caixas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendas" (
    "id" TEXT NOT NULL,
    "caixaId" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "formaPagamento" "FormaPagamento" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_venda" (
    "id" TEXT NOT NULL,
    "vendaId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "precoUnitario" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itens_venda_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "caixas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_venda" ADD CONSTRAINT "itens_venda_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "vendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_venda" ADD CONSTRAINT "itens_venda_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "vendas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
