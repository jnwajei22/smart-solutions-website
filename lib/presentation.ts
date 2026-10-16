/** Display labels only; storage/API status values stay unchanged. */
export function statusLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}
export function customerName(fullName: unknown, requestName?: unknown): string {
  for (const value of [fullName, requestName]) {
    if (
      typeof value === "string" &&
      value.trim().length >= 2 &&
      value.trim().length <= 100
    )
      return value.trim().replace(/\s+/g, " ");
  }
  return "Client";
}
export function validPreferredDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function paymentActivity(amount: number, refunded: number) {
  if (refunded >= amount)
    return { label: "Payment Refunded", cents: -refunded };
  if (refunded > 0)
    return { label: "Payment Partially Refunded", cents: amount - refunded };
  return { label: "Payment Received", cents: amount };
}
