export const equipmentSupplies = {
  customer: "I Already Have the Equipment",
  business: "Please Supply the Equipment",
  mixed: "I Have Some Items",
  unsure: "I Need Advice",
} as const;
export const leadSources = [
  "Google",
  "Nextdoor",
  "Referral",
  "Social Media",
  "Returning Client",
  "Other",
] as const;
export const budgetRanges = [
  "Not Sure Yet",
  "Under $250",
  "$250–$499",
  "$500–$999",
  "$1,000–$2,499",
  "$2,500+",
] as const;
export type RequestQualification = {
  equipment_supply: keyof typeof equipmentSupplies;
  equipment_details: string;
  postal_code: string;
  access_notes: string;
  budget_range: string;
  schedule_flexible: boolean;
  lead_source: string;
  referral_details: string;
};
export function normalizeQualification(value: unknown): RequestQualification {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Please check the equipment and project questions.");
  const b = value as Record<string, unknown>;
  function text(key: string, max: number) {
    if (typeof b[key] !== "string" || (b[key] as string).length > max)
      throw Error(`Please check ${key.replaceAll("_", " ")}.`);
    return (b[key] as string).trim();
  }
  const supply = text("equipment_supply", 20);
  if (!Object.hasOwn(equipmentSupplies, supply))
    throw Error("Choose who will supply the equipment.");
  const equipment = text("equipment_details", 1200);
  if (["customer", "mixed"].includes(supply) && equipment.length < 3)
    throw Error(
      "Describe the equipment you already have, including model numbers if known.",
    );
  const postal = text("postal_code", 5);
  if (!/^\d{5}$/.test(postal)) throw Error("Enter a five-digit ZIP Code.");
  const budget = text("budget_range", 40);
  const source = text("lead_source", 40);
  if (
    !budgetRanges.some((x) => x === budget) ||
    !leadSources.some((x) => x === source)
  )
    throw Error("Choose a budget range and how you found us.");
  if (typeof b.schedule_flexible !== "boolean")
    throw Error("Please check scheduling flexibility.");
  return {
    equipment_supply: supply as RequestQualification["equipment_supply"],
    equipment_details: equipment,
    postal_code: postal,
    access_notes: text("access_notes", 1200),
    budget_range: budget,
    schedule_flexible: b.schedule_flexible,
    lead_source: source,
    referral_details: text("referral_details", 200),
  };
}
