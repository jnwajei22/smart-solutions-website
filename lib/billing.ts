import type { LineItem } from "./catalog";
export function calculateTotal(items: LineItem[]) {
  if (!Array.isArray(items) || !items.length || items.length > 30)
    throw new Error("Add between 1 and 30 line items.");
  const total = items.reduce((sum, item) => {
    if (
      typeof item.description !== "string" ||
      !item.description.trim() ||
      item.description.length > 200 ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 10000 ||
      !Number.isInteger(item.unit_cents) ||
      (item.unit_cents < 0 &&
        (item.kind !== "discount" || item.quantity !== 1)) ||
      item.unit_cents < -10000000 ||
      (item.kind === "discount" && item.unit_cents >= 0) ||
      (item.kind !== undefined &&
        !["labor", "material", "travel", "discount", "tax"].includes(
          item.kind,
        )) ||
      item.unit_cents > 10000000
    )
      throw new Error(
        "Check the description, quantity, and price on each line.",
      );
    return sum + item.quantity * item.unit_cents;
  }, 0);
  if (!Number.isSafeInteger(total) || total < 100 || total > 5000000)
    throw new Error("Quotes must total $1 to $50,000.");
  return total;
}
export function amountToCharge(
  invoice: { total_cents: number; deposit_cents: number; paid_cents: number },
  kind: string,
) {
  if (!["deposit", "balance"].includes(kind))
    throw new Error("Choose a deposit or balance payment.");
  const outstanding = Math.max(0, invoice.total_cents - invoice.paid_cents);
  const amount =
    kind === "deposit"
      ? Math.min(
          outstanding,
          Math.max(0, invoice.deposit_cents - invoice.paid_cents),
        )
      : outstanding;
  if (amount < 50)
    throw new Error("There is no payable amount for this selection.");
  return amount;
}
