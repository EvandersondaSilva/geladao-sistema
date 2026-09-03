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
  getCashRegisterSchema,
  listCashRegistersSchema,
  openCashRegisterSchema,
} from "./schemas/cashRegisterSchema";
import { GetCashRegisterController } from "./controllers/cashRegister/getCashRegisterController";
import { OpenCashRegisterController } from "./controllers/cashRegister/openCashRegisterController";
import { CloseCashRegisterController } from "./controllers/cashRegister/closeCashRegisterController";
import { ListCashRegisterController } from "./controllers/cashRegister/listCashRegisterController";
import { GetCurrentCashRegisterController } from "./controllers/cashRegister/getCurrentCashRegisterController";
import { createSaleSchema, getSaleSchema, listSalesSchema } from "./schemas/saleSchema";
import { CreateSaleController } from "./controllers/sale/createSaleController";
import { ListSaleController } from "./controllers/sale/listSaleController";
import { GetSaleController } from "./controllers/sale/getSaleController";
import {
  addTabItemSchema,
  cancelTabSchema,
  closeTabSchema,
  getTabSchema,
  listTabsSchema,
  markTabAsFiadoSchema,
  openTabSchema,
  removeTabItemSchema,
} from "./schemas/tabSchema";
import { MarkTabAsFiadoController } from "./controllers/tab/markTabAsFiadoController";
import {
  createCustomerSchema,
  getCustomerSchema,
  listCustomersSchema,
  updateCustomerSchema,
} from "./schemas/customerSchema";
import { CreateCustomerController } from "./controllers/customer/createCustomerController";
import { ListCustomerController } from "./controllers/customer/listCustomerController";
import { GetCustomerController } from "./controllers/customer/getCustomerController";
import { UpdateCustomerController } from "./controllers/customer/updateCustomerController";
import { getDebtSchema, listDebtsSchema, payDebtSchema } from "./schemas/debtSchema";
import { ListDebtController } from "./controllers/debt/listDebtController";
import { GetDebtController } from "./controllers/debt/getDebtController";
import { PayDebtController } from "./controllers/debt/payDebtController";
import { CancelTabController } from "./controllers/tab/cancelTabController";
import { OpenTabController } from "./controllers/tab/openTabController";
import { ListTabController } from "./controllers/tab/listTabController";
import { GetTabController } from "./controllers/tab/getTabController";
import { AddTabItemController } from "./controllers/tab/addTabItemController";
import { RemoveTabItemController } from "./controllers/tab/removeTabItemController";
import { CloseTabController } from "./controllers/tab/closeTabController";
import { listStockMovementsSchema } from "./schemas/stockMovementSchema";
import { ListStockMovementController } from "./controllers/stockMovement/listStockMovementController";
import { updateOperatorPinSchema } from "./schemas/settingsSchema";
import { GetOperatorPinStatusController } from "./controllers/settings/getOperatorPinStatusController";
import { UpdateOperatorPinController } from "./controllers/settings/updateOperatorPinController";

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

// shift summary — the register plus its sales and tabs, with the money already
// added up. MUST stay after /cash-registers/current, or ":id" would swallow it
routes.get(
  "/cash-registers/:id",
  validateSchema(getCashRegisterSchema),
  new GetCashRegisterController().handle
);

// open cash register (PDV)
routes.post(
  "/cash-registers",
  checkOperatorPin,
  validateSchema(openCashRegisterSchema),
  new OpenCashRegisterController().handle
);

// close cash register — computes every total on the fly, does not persist them
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

// list tabs (comandas), optional status filter — ?status=OPEN is the "who is drinking now" view
routes.get("/tabs", validateSchema(listTabsSchema), new ListTabController().handle);

// tab detail with its items and the total computed on the fly
routes.get("/tabs/:id", validateSchema(getTabSchema), new GetTabController().handle);

// open a tab for a customer (by name only) — requires an OPEN cash register
routes.post("/tabs", checkOperatorPin, validateSchema(openTabSchema), new OpenTabController().handle);

// add an item to an open tab — deducts stock and creates a StockMovement right away
routes.post(
  "/tabs/:id/items",
  checkOperatorPin,
  validateSchema(addTabItemSchema),
  new AddTabItemController().handle
);

// remove an item added by mistake — reverses the stock (INBOUND/CANCELLATION_REVERSAL)
routes.delete(
  "/tabs/:id/items/:itemId",
  checkOperatorPin,
  validateSchema(removeTabItemSchema),
  new RemoveTabItemController().handle
);

// close the tab — picks the payment method, does NOT touch stock (already deducted per item)
routes.post(
  "/tabs/:id/close",
  checkOperatorPin,
  validateSchema(closeTabSchema),
  new CloseTabController().handle
);

// close the tab on credit instead of taking payment — creates the customer's debt.
// Kept separate from /close on purpose: PaymentMethod stays "real money only", so
// every sum over it is money that actually came in
routes.post(
  "/tabs/:id/fiado",
  checkOperatorPin,
  validateSchema(markTabAsFiadoSchema),
  new MarkTabAsFiadoController().handle
);

// discard an empty tab (wrong name, customer left, or every item was removed) —
// an empty tab can't be closed, so without this it would stay OPEN forever
routes.post(
  "/tabs/:id/cancel",
  checkOperatorPin,
  validateSchema(cancelTabSchema),
  new CancelTabController().handle
);

// customers — a real record, unlike the free text in Tab.customerName. Listing
// carries each one's outstanding balance, since "who owes me" is the point
routes.get("/customers", validateSchema(listCustomersSchema), new ListCustomerController().handle);

// customer detail with the full statement: every debt, its payments and balance
routes.get("/customers/:id", validateSchema(getCustomerSchema), new GetCustomerController().handle);

routes.post(
  "/customers",
  checkOperatorPin,
  validateSchema(createCustomerSchema),
  new CreateCustomerController().handle
);

routes.patch(
  "/customers/:id",
  checkOperatorPin,
  validateSchema(updateCustomerSchema),
  new UpdateCustomerController().handle
);

// fiado — ?status=OPEN is the debtor list, oldest first
routes.get("/debts", validateSchema(listDebtsSchema), new ListDebtController().handle);

routes.get("/debts/:id", validateSchema(getDebtSchema), new GetDebtController().handle);

// receive against a debt (partial allowed) — needs an OPEN register, since this
// is money physically entering the drawer
routes.post(
  "/debts/:id/payments",
  checkOperatorPin,
  validateSchema(payDebtSchema),
  new PayDebtController().handle
);

// stock movement audit trail (filter by productId/reason/date range)
routes.get(
  "/stock-movements",
  validateSchema(listStockMovementsSchema),
  new ListStockMovementController().handle
);

// whether an operator PIN is already configured (never exposes the PIN itself)
routes.get("/operator-pin/status", new GetOperatorPinStatusController().handle);

// set the operator PIN for the first time, or change it (requires currentPin once one exists)
// intentionally NOT behind checkOperatorPin — bootstrapping the very first PIN would be a chicken-and-egg
// problem, and changing an existing one is already gated by requiring currentPin
routes.patch(
  "/operator-pin",
  validateSchema(updateOperatorPinSchema),
  new UpdateOperatorPinController().handle
);

export default routes;
