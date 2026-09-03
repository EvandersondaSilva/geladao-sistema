interface DebtPaymentAmount {
  amount: number;
}

interface DebtWithPayments {
  amount: number;
  payments: DebtPaymentAmount[];
}

// The outstanding balance is never persisted — it is always the agreed amount
// minus what has been paid against it, the same call made for Tab.total and the
// cash register totals. `Debt.amount` itself is frozen: it is what was agreed
// when the goods went out, not a running figure.
const calculateDebtBalance = (debt: DebtWithPayments) =>
  debt.amount - debt.payments.reduce((acc, payment) => acc + payment.amount, 0);

export { calculateDebtBalance };
