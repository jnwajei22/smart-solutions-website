import type { LineItem } from "./catalog";

export type PackagePrice = {
  id: string;
  name: string;
  laborCents: number;
  onsiteMinutes: number;
  crew: number;
  scope: string;
};
export type PriceBook = {
  version: string;
  packages: PackagePrice[];
  loadedLaborCentsPerHour: number;
  additionalLaborCentsPerHour: number;
  vehicleCentsPerMile: number;
  overheadCents: number;
  adminMinutes: number;
  cardReserveBps: number;
  callbackReserveBps: number;
  targetMarginBps: number;
  regionalTravelCents: number;
  regionalMinimumCents: number;
  distantTravelCents: number;
  distantMinimumCents: number;
};
export const defaultPriceBook: PriceBook = {
  version: "launch-draft-1",
  loadedLaborCentsPerHour: 3500,
  additionalLaborCentsPerHour: 8500,
  vehicleCentsPerMile: 75,
  overheadCents: 2000,
  adminMinutes: 30,
  cardReserveBps: 300,
  callbackReserveBps: 500,
  targetMarginBps: 2000,
  regionalTravelCents: 4900,
  regionalMinimumCents: 29900,
  distantTravelCents: 9900,
  distantMinimumCents: 59900,
  packages: [
    {
      id: "wifi",
      name: "Wi-Fi Troubleshooting",
      laborCents: 21900,
      onsiteMinutes: 90,
      crew: 1,
      scope:
        "Up to 90 minutes diagnosing existing Wi-Fi equipment, adjusting configuration and testing connectivity. New equipment and cabling are separate.",
    },
    {
      id: "mesh",
      name: "Home Network Setup",
      laborCents: 34900,
      onsiteMinutes: 180,
      crew: 1,
      scope:
        "Configure one compatible router/mesh system with up to three nodes and five client devices, test coverage and provide a handoff. Hardware and new cabling are separate.",
    },
    {
      id: "smart",
      name: "Smart-Home Starter",
      laborCents: 21900,
      onsiteMinutes: 90,
      crew: 1,
      scope:
        "Configure up to three compatible plug-in devices and two routines. Excludes wired switches, security systems and new wiring. Hardware is separate.",
    },
    {
      id: "tv",
      name: "Standard TV Mounting",
      laborCents: 29900,
      onsiteMinutes: 60,
      crew: 2,
      scope:
        "Mount one TV up to 65 inches on suitable wood-stud/drywall with an approved mount, basic device connection and surface cable tidying. Photo and access review required; TV, mount and raceway are separate.",
    },
    {
      id: "cabling",
      name: "Ethernet Installation",
      laborCents: 44900,
      onsiteMinutes: 120,
      crew: 2,
      scope:
        "Labor for one reviewed, accessible Ethernet run up to 75 feet, terminations, labeling and wire-map testing. Cable and hardware are separately itemized. Excludes category certification, electrical and security work.",
    },
    {
      id: "business",
      name: "Small-Business Network Cleanup",
      laborCents: 44900,
      onsiteMinutes: 180,
      crew: 1,
      scope:
        "Up to three hours documenting and organizing an existing small network, labeling up to 12 connections and checking operation. Hardware, new cabling and major configuration changes are separate.",
    },
  ],
};
export type PricingPlan = {
  priceBookVersion: string;
  packageId: string;
  crew: number;
  onsiteMinutes: number;
  roundTripMinutes: number;
  miles: number;
  dispatchLabel: string;
  oneWayMinutes: number;
  customTravelCents: number;
  manualTravelReviewed: boolean;
  equipmentSupply: "customer" | "business" | "mixed";
  equipmentDetails: string;
  materials: {
    description: string;
    quantity: number;
    costCents: number;
    sellCents: number;
  }[];
  adders: { description: string; sellCents: number; costCents: number }[];
  discountCents: number;
  discountReason: string;
  taxCents: number;
  taxReviewed: boolean;
  overrideReason: string;
};
function integer(
  value: unknown,
  name: string,
  min = 0,
  max = 5000000,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    throw new Error(`Check ${name}.`);
}
function label(
  value: unknown,
  name: string,
  max = 200,
  optional = false,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!optional && !value.trim())
  )
    throw new Error(`Check ${name}.`);
}
export function validatePriceBook(value: unknown): PriceBook {
  if (!value || typeof value !== "object")
    throw new Error("Invalid price book.");
  const book = value as PriceBook;
  label(book.version, "price-book version", 80);
  if (
    !Array.isArray(book.packages) ||
    !book.packages.length ||
    book.packages.length > 20
  )
    throw new Error("Add 1–20 packages.");
  const ids = new Set<string>();
  for (const p of book.packages) {
    if (!p || typeof p !== "object") throw new Error("Invalid package.");
    label(p.id, "package ID", 50);
    label(p.name, "package name", 120);
    label(p.scope, "scope", 2000);
    if (ids.has(p.id)) throw new Error("Package IDs must be unique.");
    ids.add(p.id);
    integer(p.laborCents, "package price", 100);
    integer(p.crew, "crew", 1, 10);
    integer(p.onsiteMinutes, "included time", 15, 1440);
  }
  for (const key of [
    "loadedLaborCentsPerHour",
    "additionalLaborCentsPerHour",
    "vehicleCentsPerMile",
    "overheadCents",
    "regionalTravelCents",
    "regionalMinimumCents",
    "distantTravelCents",
    "distantMinimumCents",
  ] as const)
    integer(book[key], key);
  integer(book.adminMinutes, "admin minutes", 0, 1440);
  for (const key of [
    "cardReserveBps",
    "callbackReserveBps",
    "targetMarginBps",
  ] as const)
    integer(book[key], key, 0, 9000);
  if (book.cardReserveBps + book.callbackReserveBps >= 10000)
    throw new Error("Reserve rates must total less than 100%.");
  return book;
}
export const parsePriceBook = validatePriceBook;
export function createPricingPlan(
  book: PriceBook = defaultPriceBook,
  packageId = book.packages[0].id,
): PricingPlan {
  const p = book.packages.find((p) => p.id === packageId);
  if (!p) throw new Error("Choose a package.");
  return {
    priceBookVersion: book.version,
    packageId,
    crew: p.crew,
    onsiteMinutes: p.onsiteMinutes,
    roundTripMinutes: 0,
    miles: 0,
    dispatchLabel: "",
    oneWayMinutes: 0,
    customTravelCents: 0,
    manualTravelReviewed: false,
    equipmentSupply: "customer",
    equipmentDetails: "",
    materials: [],
    adders: [],
    discountCents: 0,
    discountReason: "",
    taxCents: 0,
    taxReviewed: false,
    overrideReason: "",
  };
}
export function calculateQuote(
  plan: PricingPlan,
  book: PriceBook = defaultPriceBook,
) {
  validatePriceBook(book);
  if (
    !plan ||
    typeof plan !== "object" ||
    plan.priceBookVersion !== book.version
  )
    throw new Error(
      "Pricing changed. Reload the current price book and review this quote.",
    );
  const p = book.packages.find((p) => p.id === plan.packageId);
  if (!p) throw new Error("Choose a valid package.");
  integer(plan.crew, "crew", 1, 10);
  integer(plan.onsiteMinutes, "onsite minutes", 15, 1440);
  integer(plan.roundTripMinutes, "round-trip minutes", 0, 1440);
  integer(plan.oneWayMinutes, "one-way minutes", 0, 720);
  integer(plan.miles, "round-trip miles", 0, 2000);
  integer(plan.customTravelCents, "custom travel");
  integer(plan.discountCents, "discount");
  integer(plan.taxCents, "tax");
  label(plan.dispatchLabel, "dispatch location", 200);
  label(plan.equipmentDetails, "equipment details", 2000, true);
  label(plan.discountReason, "discount reason", 200, true);
  label(plan.overrideReason, "override reason", 2000, true);
  if (!["customer", "business", "mixed"].includes(plan.equipmentSupply))
    throw new Error("Choose equipment ownership.");
  if (
    plan.equipmentSupply !== "business" &&
    plan.equipmentDetails.trim().length < 3
  )
    throw new Error(
      "Review customer-owned equipment and compatibility before quoting.",
    );
  if (plan.taxReviewed !== true)
    throw new Error(
      "Review applicable tax, including when the amount is zero.",
    );
  if (plan.roundTripMinutes < plan.oneWayMinutes * 2)
    throw new Error("Round-trip travel must include both directions.");
  if (
    !Array.isArray(plan.materials) ||
    plan.materials.length > 15 ||
    !Array.isArray(plan.adders) ||
    plan.adders.length > 5
  )
    throw new Error("Use at most 15 materials and 5 scope additions.");
  if (plan.equipmentSupply === "customer" && plan.materials.length)
    throw new Error(
      "Choose mixed or business supply before billing materials.",
    );
  if (plan.discountCents && !plan.discountReason.trim())
    throw new Error("Explain the discount.");
  const items: LineItem[] = [
    {
      description: `${p.name} — Labor`,
      quantity: 1,
      unit_cents: p.laborCents,
      kind: "labor",
    },
  ];
  const extraPersonMinutes = Math.max(
    0,
    plan.crew * plan.onsiteMinutes - p.crew * p.onsiteMinutes,
  );
  if (extraPersonMinutes)
    items.push({
      description: `Additional labor (${extraPersonMinutes} person-minutes)`,
      quantity: 1,
      unit_cents: Math.ceil(
        (extraPersonMinutes * book.additionalLaborCentsPerHour) / 60,
      ),
      kind: "labor",
    });
  let materialsCost = 0,
    addersCost = 0;
  for (const m of plan.materials) {
    if (!m || typeof m !== "object") throw new Error("Invalid material.");
    label(m.description, "material description", 200);
    integer(m.quantity, "material quantity", 1, 10000);
    integer(m.costCents, "material cost");
    integer(m.sellCents, "material selling price");
    materialsCost += m.quantity * m.costCents;
    items.push({
      description: m.description,
      quantity: m.quantity,
      unit_cents: m.sellCents,
      kind: "material",
    });
  }
  for (const a of plan.adders) {
    if (!a || typeof a !== "object") throw new Error("Invalid scope addition.");
    label(a.description, "scope addition", 200);
    integer(a.costCents, "scope cost");
    integer(a.sellCents, "scope price");
    addersCost += a.costCents;
    items.push({
      description: a.description,
      quantity: 1,
      unit_cents: a.sellCents,
      kind: "labor",
    });
  }
  const warnings: string[] = [];
  if (plan.roundTripMinutes > 0 && plan.miles === 0)
    warnings.push(
      "Travel time is nonzero but vehicle mileage is zero. Review all vehicle travel costs or document the zero-mile exception.",
    );
  if (plan.equipmentSupply !== "customer" && !plan.materials.length)
    warnings.push(
      "Business or mixed supply has no itemized materials. Review supplied equipment, incidental materials and their cost before issue.",
    );
  const serviceSubtotal = items.reduce(
    (sum, i) => sum + i.quantity * i.unit_cents,
    0,
  );
  let travelCents = 0,
    minimum = 0;
  if (plan.oneWayMinutes > 90) {
    if (plan.manualTravelReviewed !== true)
      throw new Error(
        "Review transport and enter a custom travel price for trips over 90 minutes.",
      );
    travelCents = plan.customTravelCents;
    warnings.push(
      "Trips over 90 minutes require a documented manual travel and minimum-charge review.",
    );
  } else if (plan.oneWayMinutes > 60) {
    travelCents = book.distantTravelCents;
    minimum = book.distantMinimumCents;
  } else if (plan.oneWayMinutes > 30) {
    travelCents = book.regionalTravelCents;
    minimum = book.regionalMinimumCents;
  }
  if (travelCents)
    items.push({
      description: "Extended-Area Travel",
      quantity: 1,
      unit_cents: travelCents,
      kind: "travel",
    });
  if (serviceSubtotal - plan.discountCents < minimum)
    warnings.push(
      `Service subtotal after discount is below the travel-zone minimum of $${(minimum / 100).toFixed(2)}.`,
    );
  if (plan.discountCents >= serviceSubtotal + travelCents)
    throw new Error("Discount must be less than the pretax quote.");
  if (plan.discountCents)
    items.push({
      description: `Discount — ${plan.discountReason}`.slice(0, 200),
      quantity: 1,
      unit_cents: -plan.discountCents,
      kind: "discount",
    });
  const pretaxCents = serviceSubtotal + travelCents - plan.discountCents;
  if (plan.taxCents)
    items.push({
      description: "Applicable Tax (Reviewed)",
      quantity: 1,
      unit_cents: plan.taxCents,
      kind: "tax",
    });
  const totalCents = pretaxCents + plan.taxCents;
  if (
    items.length > 30 ||
    !Number.isSafeInteger(totalCents) ||
    totalCents < 100 ||
    totalCents > 5000000
  )
    throw new Error("Quotes must total $1–$50,000 with at most 30 items.");
  const estimatedCostCents =
    Math.ceil(
      (plan.crew *
        (plan.onsiteMinutes + plan.roundTripMinutes) *
        book.loadedLaborCentsPerHour) /
        60,
    ) +
    plan.miles * book.vehicleCentsPerMile +
    book.overheadCents +
    Math.ceil((book.adminMinutes * book.loadedLaborCentsPerHour) / 60) +
    materialsCost +
    addersCost +
    Math.ceil((totalCents * book.cardReserveBps) / 10000) +
    Math.ceil((pretaxCents * book.callbackReserveBps) / 10000);
  const contributionCents = pretaxCents - estimatedCostCents;
  const marginBps = Math.floor((contributionCents * 10000) / pretaxCents);
  if (marginBps < book.targetMarginBps)
    warnings.push(
      "Estimated contribution is below the configured margin floor.",
    );
  if (plan.crew < p.crew || plan.onsiteMinutes < p.onsiteMinutes)
    warnings.push(
      "Crew or time is below the package allowance; review safe handling and scope.",
    );
  return {
    items,
    totalCents,
    estimatedCostCents,
    contributionCents,
    marginBps,
    warnings,
    requiresOverride: warnings.length > 0,
    title: p.name,
    scopeTerms: `${p.scope}\nEquipment: ${plan.equipmentSupply === "customer" ? "customer supplied" : plan.equipmentSupply === "mixed" ? "mixed customer/business supply" : "business supplied as itemized"}.${plan.equipmentDetails ? ` ${plan.equipmentDetails}` : ""}\nQuoted work is limited to the listed scope. Additional work requires approval before it begins. Customer-supplied equipment must be compatible and complete; equipment defects and manufacturer warranties are separate from installation workmanship. Estimated one-way travel: ${plan.oneWayMinutes} minutes.${plan.overrideReason.trim() ? " Scope and pricing exceptions reviewed by the business." : ""}`,
  };
}

export type QuoteCalculation = ReturnType<typeof calculateQuote>;
