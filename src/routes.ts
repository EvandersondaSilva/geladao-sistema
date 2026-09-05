import { Router } from "express";
import { validateSchema } from "./middlewares/validateSchema";
import { requireAuth } from "./middlewares/requireAuth";
import { requireAdmin } from "./middlewares/requireAdmin";
import { optionalAuth } from "./middlewares/optionalAuth";
import { loginSchema } from "./schemas/authSchema";
import { LoginController } from "./controllers/auth/loginController";
import { GetMeController } from "./controllers/auth/getMeController";
import { createUserSchema, listUsersSchema, updateUserSchema } from "./schemas/userSchema";
import { CreateUserController } from "./controllers/user/createUserController";
import { ListUserController } from "./controllers/user/listUserController";
import { UpdateUserController } from "./controllers/user/updateUserController";
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
import { getProductSalesReportSchema, getRevenueReportSchema } from "./schemas/reportSchema";
import { GetRevenueReportController } from "./controllers/report/getRevenueReportController";
import { GetProductSalesReportController } from "./controllers/report/getProductSalesReportController";
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

const routes = Router();

// log in with e-mail/password, get a JWT back (12h)
routes.post("/auth/login", validateSchema(loginSchema), new LoginController().handle);

// who am I — the front uses this to restore name/role after a refresh
routes.get("/auth/me", requireAuth, new GetMeController().handle);

// create an employee account. Works two ways: with zero users in the table it
// bootstraps the very first ADMIN with no login required (mirrors how the old
// shared-PIN bootstrap worked); once any user exists, it requires an ADMIN
// session — enforced inside CreateUserService, not by a static middleware,
// since which rule applies depends on runtime DB state
routes.post("/users", optionalAuth, validateSchema(createUserSchema), new CreateUserController().handle);

// list/manage employee accounts (ADMIN only)
routes.get("/users", requireAuth, requireAdmin, validateSchema(listUsersSchema), new ListUserController().handle);
routes.patch(
  "/users/:id",
  requireAuth,
  requireAdmin,
  validateSchema(updateUserSchema),
  new UpdateUserController().handle
);

// create category
routes.post(
  "/categories",
  requireAuth,
  requireAdmin,
  validateSchema(createCategorySchema),
  new CreateCategoryController().handle
);

// list categories (public — feeds the future delivery catalog too)
routes.get("/categories", new ListCategoryController().handle);

// edit category
routes.patch(
  "/categories/:id",
  requireAuth,
  requireAdmin,
  validateSchema(updateCategorySchema),
  new UpdateCategoryController().handle
);

// list product catalog (public, optional category filter — feeds the future delivery catalog)
routes.get("/products", validateSchema(listProductsSchema), new ListProductController().handle);

// create product
routes.post(
  "/products",
  requireAuth,
  requireAdmin,
  validateSchema(createProductSchema),
  new CreateProductController().handle
);

// edit product (current stock is not editable here — use /products/:id/stock)
routes.patch(
  "/products/:id",
  requireAuth,
  requireAdmin,
  validateSchema(updateProductSchema),
  new UpdateProductController().handle
);

// delete product (blocked if it already has sale/stock history)
routes.delete(
  "/products/:id",
  requireAuth,
  requireAdmin,
  validateSchema(deleteProductSchema),
  new DeleteProductController().handle
);

// adjust product stock (creates a StockMovement) — day-to-day operation, any logged-in role
routes.post(
  "/products/:id/stock",
  requireAuth,
  validateSchema(adjustProductStockSchema),
  new AdjustProductStockController().handle
);

// products with currentStock below minimumStock (low-stock alert) — internal PDV view
routes.get("/products/low-stock", requireAuth, new ListLowStockProductController().handle);

// currently open cash register, if any (null otherwise)
routes.get("/cash-registers/current", requireAuth, new GetCurrentCashRegisterController().handle);

// list cash registers (PDV history), optional status filter
routes.get(
  "/cash-registers",
  requireAuth,
  validateSchema(listCashRegistersSchema),
  new ListCashRegisterController().handle
);

// shift summary — the register plus its sales and tabs, with the money already
// added up. MUST stay after /cash-registers/current, or ":id" would swallow it
routes.get(
  "/cash-registers/:id",
  requireAuth,
  validateSchema(getCashRegisterSchema),
  new GetCashRegisterController().handle
);

// open cash register (PDV) — records who opened it
routes.post(
  "/cash-registers",
  requireAuth,
  validateSchema(openCashRegisterSchema),
  new OpenCashRegisterController().handle
);

// close cash register — computes every total on the fly, does not persist them;
// records who closed it
routes.post(
  "/cash-registers/:id/close",
  requireAuth,
  validateSchema(closeCashRegisterSchema),
  new CloseCashRegisterController().handle
);

// list sales (PDV history), optional cashRegisterId filter
routes.get("/sales", requireAuth, validateSchema(listSalesSchema), new ListSaleController().handle);

// sale detail with items
routes.get("/sales/:id", requireAuth, validateSchema(getSaleSchema), new GetSaleController().handle);

// register a sale (PDV) — deducts stock and creates a StockMovement per item
routes.post("/sales", requireAuth, validateSchema(createSaleSchema), new CreateSaleController().handle);

// list tabs (comandas), optional status filter — ?status=OPEN is the "who is drinking now" view
routes.get("/tabs", requireAuth, validateSchema(listTabsSchema), new ListTabController().handle);

// tab detail with its items and the total computed on the fly
routes.get("/tabs/:id", requireAuth, validateSchema(getTabSchema), new GetTabController().handle);

// open a tab for a customer (by name only) — requires an OPEN cash register
routes.post("/tabs", requireAuth, validateSchema(openTabSchema), new OpenTabController().handle);

// add an item to an open tab — deducts stock and creates a StockMovement right away
routes.post(
  "/tabs/:id/items",
  requireAuth,
  validateSchema(addTabItemSchema),
  new AddTabItemController().handle
);

// remove an item added by mistake — reverses the stock (INBOUND/CANCELLATION_REVERSAL)
routes.delete(
  "/tabs/:id/items/:itemId",
  requireAuth,
  validateSchema(removeTabItemSchema),
  new RemoveTabItemController().handle
);

// close the tab — picks the payment method, does NOT touch stock (already deducted
// per item); records who closed it
routes.post(
  "/tabs/:id/close",
  requireAuth,
  validateSchema(closeTabSchema),
  new CloseTabController().handle
);

// close the tab on credit instead of taking payment — creates the customer's debt.
// Kept separate from /close on purpose: PaymentMethod stays "real money only", so
// every sum over it is money that actually came in. Records who gave the credit
routes.post(
  "/tabs/:id/fiado",
  requireAuth,
  validateSchema(markTabAsFiadoSchema),
  new MarkTabAsFiadoController().handle
);

// discard an empty tab (wrong name, customer left, or every item was removed) —
// an empty tab can't be closed, so without this it would stay OPEN forever
routes.post(
  "/tabs/:id/cancel",
  requireAuth,
  validateSchema(cancelTabSchema),
  new CancelTabController().handle
);

// customers — a real record, unlike the free text in Tab.customerName. Listing
// carries each one's outstanding balance, since "who owes me" is the point
routes.get(
  "/customers",
  requireAuth,
  validateSchema(listCustomersSchema),
  new ListCustomerController().handle
);

// customer detail with the full statement: every debt, its payments and balance
routes.get(
  "/customers/:id",
  requireAuth,
  validateSchema(getCustomerSchema),
  new GetCustomerController().handle
);

// registering a walk-in customer for fiado is a day-to-day counter action, not
// "cadastro" management — any logged-in role can do it
routes.post(
  "/customers",
  requireAuth,
  validateSchema(createCustomerSchema),
  new CreateCustomerController().handle
);

routes.patch(
  "/customers/:id",
  requireAuth,
  validateSchema(updateCustomerSchema),
  new UpdateCustomerController().handle
);

// fiado — ?status=OPEN is the debtor list, oldest first
routes.get("/debts", requireAuth, validateSchema(listDebtsSchema), new ListDebtController().handle);

routes.get("/debts/:id", requireAuth, validateSchema(getDebtSchema), new GetDebtController().handle);

// receive against a debt (partial allowed) — needs an OPEN register, since this
// is money physically entering the drawer. Records who received it
routes.post(
  "/debts/:id/payments",
  requireAuth,
  validateSchema(payDebtSchema),
  new PayDebtController().handle
);

// revenue over a period — same calculation the shift summary uses, so a monthly
// report can never disagree with the shifts it is made of. ADMIN only
routes.get(
  "/reports/revenue",
  requireAuth,
  requireAdmin,
  validateSchema(getRevenueReportSchema),
  new GetRevenueReportController().handle
);

// best sellers — counter sales and tab items folded together, ranked by quantity. ADMIN only
routes.get(
  "/reports/products",
  requireAuth,
  requireAdmin,
  validateSchema(getProductSalesReportSchema),
  new GetProductSalesReportController().handle
);

// stock movement audit trail (filter by productId/reason/date range) — internal PDV view
routes.get(
  "/stock-movements",
  requireAuth,
  validateSchema(listStockMovementsSchema),
  new ListStockMovementController().handle
);

export default routes;
