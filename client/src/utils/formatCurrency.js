export function formatCurrency(amount, currency = "INR") {
  const numericAmount = Number(amount);
  const hasFraction = Number.isFinite(numericAmount) && !Number.isInteger(numericAmount);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2
  }).format(numericAmount);
}
