// Never includes `password` — every route that returns a User goes through
// this, so a hash can't leak by a future select accidentally spreading `...`.
export const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

// The `{ id, name }` shape joined onto CashRegister/Tab/DebtPayment to show who
// performed the action — same idea as tabItemSelect.product below.
export const authorSelect = {
  id: true,
  name: true,
} as const;

export const cashRegisterSelect = {
  id: true,
  status: true,
  openingAmount: true,
  reportedClosingAmount: true,
  openedAt: true,
  closedAt: true,
  openedBy: { select: authorSelect },
  closedBy: { select: authorSelect },
} as const;

export const customerSelect = {
  id: true,
  name: true,
  phone: true,
  notes: true,
  createdAt: true,
} as const;

export const debtPaymentSelect = {
  id: true,
  amount: true,
  paymentMethod: true,
  cashRegisterId: true,
  receivedBy: { select: authorSelect },
  createdAt: true,
} as const;

// The customer's name rides along for the same reason product names do on tab
// items: the debtor list is unreadable as a column of uuids, and resolving them
// client-side is one more thing to get wrong.
export const debtSelect = {
  id: true,
  customerId: true,
  customer: { select: { id: true, name: true, phone: true } },
  amount: true,
  status: true,
  tabId: true,
  cashRegisterId: true,
  createdAt: true,
  paidAt: true,
  payments: { select: debtPaymentSelect, orderBy: { createdAt: "asc" } },
} as const;

export const tabItemSelect = {
  id: true,
  productId: true,
  // Joined server-side on purpose: GET /products only returns available items,
  // so a client-side join would blank out the name of a product deactivated
  // while the tab is still open — exactly when the operator needs to read it.
  product: { select: { name: true } },
  quantity: true,
  unitPrice: true,
  createdAt: true,
} as const;

// Cancelled items are filtered out everywhere a tab is read: the row only stays
// in the table to keep the stock audit trail pointing at something.
export const tabSelect = {
  id: true,
  customerName: true,
  status: true,
  cashRegisterId: true,
  paymentMethod: true,
  openedAt: true,
  closedAt: true,
  closedBy: { select: authorSelect },
  items: {
    where: { cancelledAt: null },
    select: tabItemSelect,
    orderBy: { createdAt: "asc" },
  },
} as const;

export const productSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  imageUrl: true,
  available: true,
  currentStock: true,
  minimumStock: true,
  categoryId: true,
  createdAt: true,
} as const;
