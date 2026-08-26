import { Router } from "express";
import { validateSchema } from "./middlewares/validateSchema";
import { checkOperatorPin } from "./middlewares/checkOperatorPin";
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
import { ListLowStockProductController } from "./controllers/product/listLowStockProductController";
import {
  closeCashRegisterSchema,
  listCashRegistersSchema,
  openCashRegisterSchema,
} from "./schemas/cashRegisterSchema";
import { OpenCashRegisterController } from "./controllers/cashRegister/openCashRegisterController";
import { CloseCashRegisterController } from "./controllers/cashRegister/closeCashRegisterController";
import { ListCashRegisterController } from "./controllers/cashRegister/listCashRegisterController";
import { GetCurrentCashRegisterController } from "./controllers/cashRegister/getCurrentCashRegisterController";
import { createSaleSchema, getSaleSchema, listSalesSchema } from "./schemas/saleSchema";
import { CreateSaleController } from "./controllers/sale/createSaleController";
import { ListSaleController } from "./controllers/sale/listSaleController";
import { GetSaleController } from "./controllers/sale/getSaleController";
import { listStockMovementsSchema } from "./schemas/stockMovementSchema";
import { ListStockMovementController } from "./controllers/stockMovement/listStockMovementController";

const routes = Router();

// create category
routes.post(
  "/categories",
  checkOperatorPin,
  validateSchema(createCategorySchema),
  new CreateCategoryController().handle
);

// list categories
routes.get("/categories", new ListCategoryController().handle);

// edit category
routes.patch(
  "/categories/:id",
  checkOperatorPin,
  validateSchema(updateCategorySchema),
  new UpdateCategoryController().handle
);

// list product catalog (public, optional category filter)
routes.get("/products", validateSchema(listProductsSchema), new ListProductController().handle);

// create product
routes.post(
  "/products",
  checkOperatorPin,
  validateSchema(createProductSchema),
  new CreateProductController().handle
);

// edit product (current stock is not editable here — use /products/:id/stock)
routes.patch(
  "/products/:id",
  checkOperatorPin,
  validateSchema(updateProductSchema),
  new UpdateProductController().handle
);

// delete product (blocked if it already has sale/stock history)
routes.delete(
  "/products/:id",
  checkOperatorPin,
  validateSchema(deleteProductSchema),
  new DeleteProductController().handle
);

// adjust product stock (creates a StockMovement)
routes.post(
  "/products/:id/stock",
  checkOperatorPin,
  validateSchema(adjustProductStockSchema),
  new AdjustProductStockController().handle
);

// products with currentStock below minimumStock (low-stock alert)
routes.get("/products/low-stock", new ListLowStockProductController().handle);

// currently open cash register, if any (null otherwise)
routes.get("/cash-registers/current", new GetCurrentCashRegisterController().handle);

// list cash registers (PDV history), optional status filter
routes.get("/cash-registers", validateSchema(listCashRegistersSchema), new ListCashRegisterController().handle);

// open cash register (PDV)
routes.post(
  "/cash-registers",
  checkOperatorPin,
  validateSchema(openCashRegisterSchema),
  new OpenCashRegisterController().handle
);

// close cash register — computes expectedAmount/totalRevenue/difference on the fly, does not persist them
routes.post(
  "/cash-registers/:id/close",
  checkOperatorPin,
  validateSchema(closeCashRegisterSchema),
  new CloseCashRegisterController().handle
);

// list sales (PDV history), optional cashRegisterId filter
routes.get("/sales", validateSchema(listSalesSchema), new ListSaleController().handle);

// sale detail with items
routes.get("/sales/:id", validateSchema(getSaleSchema), new GetSaleController().handle);

// register a sale (PDV) — deducts stock and creates a StockMovement per item
routes.post("/sales", checkOperatorPin, validateSchema(createSaleSchema), new CreateSaleController().handle);

// stock movement audit trail (filter by productId/reason/date range)
routes.get(
  "/stock-movements",
  validateSchema(listStockMovementsSchema),
  new ListStockMovementController().handle
);

export default routes;
