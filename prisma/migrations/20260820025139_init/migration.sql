-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('PENDENTE', 'CONFIRMADO', 'EM_ENTREGA', 'ENTREGUE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('DINHEIRO', 'CARTAO', 'PIX');

-- CreateEnum
CREATE TYPE "TipoMovimento" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "MotivoMovimento" AS ENUM ('VENDA', 'ESTORNO_CANCELAMENTO', 'REPOSICAO', 'AJUSTE_MANUAL');

-- CreateEnum
CREATE TYPE "ComboGroupType" AS ENUM ('CATEGORY_CHOICE', 'FIXED_PRODUCT', 'PRODUCT_CHOICE');

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "isStoreOpen" BOOLEAN NOT NULL DEFAULT true,
    "minOrderValue" INTEGER NOT NULL DEFAULT 1000,
    "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    "pixKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "estoqueAtual" INTEGER NOT NULL DEFAULT 0,
    "estoqueMinimo" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusPedido" NOT NULL DEFAULT 'PENDENTE',
    "formaPagamento" "FormaPagamento" NOT NULL,
    "changeFor" INTEGER,
    "noChangeNeeded" BOOLEAN NOT NULL DEFAULT false,
    "stockDeducted" BOOLEAN NOT NULL DEFAULT false,
    "autoPrinted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_groups" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "type" "ComboGroupType" NOT NULL,
    "label" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxQuantity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combo_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_group_categories" (
    "id" TEXT NOT NULL,
    "comboGroupId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "combo_group_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_group_fixed_items" (
    "id" TEXT NOT NULL,
    "comboGroupId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "combo_group_fixed_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_group_choice_products" (
    "id" TEXT NOT NULL,
    "comboGroupId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "combo_group_choice_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_combos" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_combo_items" (
    "id" TEXT NOT NULL,
    "orderComboId" TEXT NOT NULL,
    "comboGroupId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_combo_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentos_estoque" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "tipo" "TipoMovimento" NOT NULL,
    "motivo" "MotivoMovimento" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentos_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "combo_group_categories_comboGroupId_categoryId_key" ON "combo_group_categories"("comboGroupId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "combo_group_fixed_items_comboGroupId_productId_key" ON "combo_group_fixed_items"("comboGroupId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "combo_group_choice_products_comboGroupId_productId_key" ON "combo_group_choice_products"("comboGroupId", "productId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_groups" ADD CONSTRAINT "combo_groups_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_group_categories" ADD CONSTRAINT "combo_group_categories_comboGroupId_fkey" FOREIGN KEY ("comboGroupId") REFERENCES "combo_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_group_categories" ADD CONSTRAINT "combo_group_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_group_fixed_items" ADD CONSTRAINT "combo_group_fixed_items_comboGroupId_fkey" FOREIGN KEY ("comboGroupId") REFERENCES "combo_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_group_fixed_items" ADD CONSTRAINT "combo_group_fixed_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_group_choice_products" ADD CONSTRAINT "combo_group_choice_products_comboGroupId_fkey" FOREIGN KEY ("comboGroupId") REFERENCES "combo_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_group_choice_products" ADD CONSTRAINT "combo_group_choice_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_combos" ADD CONSTRAINT "order_combos_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_combos" ADD CONSTRAINT "order_combos_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "combos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_combo_items" ADD CONSTRAINT "order_combo_items_orderComboId_fkey" FOREIGN KEY ("orderComboId") REFERENCES "order_combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_combo_items" ADD CONSTRAINT "order_combo_items_comboGroupId_fkey" FOREIGN KEY ("comboGroupId") REFERENCES "combo_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_combo_items" ADD CONSTRAINT "order_combo_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
