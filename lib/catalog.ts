export const services = [
  {
    id: "cabling",
    name: "Ethernet & structured cabling",
    short: "A better connection starts here.",
    description:
      "Thoughtful cable routes, clean terminations, wall plates, patch panels, labeling, and connection testing.",
    details: [
      "CAT6 cable runs & new data points",
      "Jack repairs & terminations",
      "Patch panels & clear labeling",
    ],
    icon: "cable",
  },
  {
    id: "wifi",
    name: "Networks & Wi-Fi",
    short: "Coverage where life happens.",
    description:
      "Get your home office, storefront, or whole space connected with a network designed around how you use it.",
    details: [
      "Router & access-point setup",
      "Coverage & connection troubleshooting",
      "Small-office network configuration",
    ],
    icon: "wifi",
  },
  {
    id: "racks",
    name: "Racks & cable management",
    short: "Order behind the scenes.",
    description:
      "Turn an overcrowded network corner into a practical, organized setup that is easier to maintain.",
    details: [
      "Rack mounting & organization",
      "Patch-cable cleanup",
      "Equipment & port documentation",
    ],
    icon: "server",
  },
  {
    id: "tv",
    name: "TV mounting & AV setup",
    short: "Your space. A cleaner finish.",
    description:
      "Considered placement, secure mounting, and tidy cable management for your TV and connected entertainment.",
    details: [
      "TV mounting on suitable surfaces",
      "Streaming & audio setup",
      "Surface cable management",
    ],
    icon: "tv",
  },
  {
    id: "smart",
    name: "Smart-home setup",
    short: "Make everyday things easier.",
    description:
      "Bring compatible connected devices together with useful routines and a handoff you can understand.",
    details: [
      "Connected lighting & plug setup",
      "Voice-assistant configuration",
      "Device pairing & everyday routines",
    ],
    icon: "home",
  },
];
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export const date = (value: string) =>
  new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value,
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  });
export type LineItem = {
  description: string;
  quantity: number;
  unit_cents: number;
};
export type Job = {
  id: string;
  customer_id: string;
  name: string;
  business_name?: string | null;
  email: string;
  phone: string;
  service: string;
  property_type: string;
  address: string;
  city: string;
  details: string;
  preferred_date: string | null;
  status: string;
  created_at: string;
};
export type Invoice = {
  id: string;
  request_id: string;
  customer_id: string;
  number: string;
  title: string;
  items: LineItem[];
  total_cents: number;
  deposit_cents: number;
  paid_cents: number;
  status: string;
  due_date: string;
  created_at: string;
  accepted_at: string | null;
  terms: string;
};
export type Payment = {
  id: string;
  invoice_id: string;
  amount_cents: number;
  refunded_cents: number;
  created_at: string;
  stripe_session_id: string;
};
export type Message = {
  id: string;
  request_id: string;
  author_id: string;
  body: string;
  created_at: string;
};
export type PortalData = {
  loadedAt?: string;
  jobs: Job[];
  invoices: Invoice[];
  payments: Payment[];
  messages: Message[];
  name: string;
  email: string;
  admin: boolean;
};
