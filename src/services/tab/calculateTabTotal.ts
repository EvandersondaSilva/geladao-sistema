interface TabItemAmount {
  quantity: number;
  unitPrice: number;
}

// Tab.total is never persisted — it is always recomputed from the price snapshot
// each item was added with, the same call the cash register close makes for
// expectedAmount/soldTotal.
const calculateTabTotal = (items: TabItemAmount[]) =>
  items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

export { calculateTabTotal };
