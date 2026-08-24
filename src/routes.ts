import { Router } from "express";
import { validateSchema } from "./middlewares/validateSchema";
import { createCategorySchema, updateCategorySchema } from "./schemas/categorySchema";
import { CreateCategoryController } from "./controllers/category/createCategoryController";
import { ListCategoryController } from "./controllers/category/listCategoryController";
import { UpdateCategoryController } from "./controllers/category/updateCategoryController";
import {
  adjustProductStockSchema,
  createProductSchema,
  deleteProductSchema,
  listProductsSchema,
  updateProductSchema,
} from "./schemas/productSchema";
import { ListProductController } from "./controllers/product/listProductController";
import { CreateProductController } from "./controllers/product/createProductController";
import { UpdateProductController } from "./controllers/product/updateProductController";
import { DeleteProductController } from "./controllers/product/deleteProductController";
import { AdjustProductStockController } from "./controllers/product/adjustProductStockController";
import { closeCashRegisterSchema, openCashRegisterSchema } from "./schemas/cashRegisterSchema";
import { OpenCashRegisterController } from "./controllers/cashRegister/openCashRegisterController";
import { CloseCashRegisterController } from "./controllers/cashRegister/closeCashRegisterController";
import { createSaleSchema } from "./schemas/saleSchema";
import { CreateSaleController } from "./controllers/sale/createSaleController";

const routes = Router();

// create category
routes.post("/categories", validateSchema(createCategorySchema), new CreateCategoryController().handle);

// list categories
routes.get("/categories", new ListCategoryController().handle);

// edit category
routes.patch("/categories/:id", validateSchema(updateCategorySchema), new UpdateCategoryController().handle);

// list product catalog (public, optional category filter)
routes.get("/products", validateSchema(listProductsSchema), new ListProductController().handle);

// create product
routes.post("/products", validateSchema(createProductSchema), new CreateProductController().handle);

// edit product (current stock is not editable here — use /products/:id/stock)
routes.patch("/products/:id", validateSchema(updateProductSchema), new UpdateProductController().handle);

// delete product (blocked if it already has sale/stock history)
routes.delete("/products/:id", validateSchema(deleteProductSchema), new DeleteProductController().handle);

// adjust product stock (creates a StockMovement)
routes.post(
  "/products/:id/stock",
  validateSchema(adjustProductStockSchema),
  new AdjustProductStockController().handle
);

// open cash register (PDV)
routes.post("/cash-registers", validateSchema(openCashRegisterSchema), new OpenCashRegisterController().handle);

// close cash register — computes expectedAmount/totalRevenue/difference on the fly, does not persist them
routes.post(
  "/cash-registers/:id/close",
  validateSchema(closeCashRegisterSchema),
  new CloseCashRegisterController().handle
);

// register a sale (PDV) — deducts stock and creates a StockMovement per item
routes.post("/sales", validateSchema(createSaleSchema), new CreateSaleController().handle);

export default routes;
