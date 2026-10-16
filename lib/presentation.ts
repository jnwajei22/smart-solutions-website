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

export type ClientAccountType = "personal" | "business";
function normalizedName(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 2 && name.length <= max ? name : null;
}
/** Customer-supplied identity is display data, never a permission or role. */
export function signupMetadata(
  accountType: ClientAccountType,
  fullName: string,
  company: string,
) {
  if (accountType !== "personal" && accountType !== "business")
    throw Error("Choose Personal or Business.");
  const name = normalizedName(fullName, 100);
  if (!name) throw Error("Enter your full name (2–100 characters).");
  const business =
    accountType === "business" ? normalizedName(company, 160) : null;
  if (accountType === "business" && !business)
    throw Error("Enter your business name (2–160 characters).");
  return {
    account_type: accountType,
    full_name: name,
    business_name: business,
  };
}
export function businessName(
  metadata: Record<string, unknown> | undefined,
): string | null {
  return metadata?.account_type === "business"
    ? normalizedName(metadata.business_name, 160)
    : null;
}
export function accountName(
  metadata: Record<string, unknown> | undefined,
  requestName?: unknown,
): string {
  return (
    businessName(metadata) || customerName(metadata?.full_name, requestName)
  );
}
