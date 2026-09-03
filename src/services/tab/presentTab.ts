import { calculateTabTotal } from "./calculateTabTotal";

interface PresentableTab {
  openedAt: Date;
  closedAt: Date | null;
  items: { quantity: number; unitPrice: number }[];
}

// Every route that returns a tab returns it through here, so the total and the
// age are computed the same way everywhere.
//
// `openMinutes` comes from the server clock on purpose: the operator's machine
// may be wrong, and this number is what tells a tab apart from a debt. A tab
// reading nine days is nobody still drinking — it is an unpaid bill someone left
// open because they had nowhere else to put it. Here that belongs in fiado.
const presentTab = <T extends PresentableTab>(tab: T) => ({
  ...tab,
  total: calculateTabTotal(tab.items),
  openMinutes: Math.floor(
    ((tab.closedAt ?? new Date()).getTime() - tab.openedAt.getTime()) / 60_000
  ),
});

export { presentTab };
