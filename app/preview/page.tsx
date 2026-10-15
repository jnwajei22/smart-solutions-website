import { Portal } from "../../components/portal";
import type { PortalData } from "../../lib/catalog";
export const metadata = {
  title: "Sample client portal",
  robots: { index: false, follow: false },
};
const data: PortalData = {
  name: "Alex",
  email: "Sample account",
  admin: false,
  messages: [],
  jobs: [
    {
      id: "sample-1",
      customer_id: "sample",
      name: "Alex",
      email: "sample@example.invalid",
      phone: "",
      service: "cabling",
      property_type: "Residential",
      address: "Sample home office",
      city: "Dallas",
      details:
        "Add two Ethernet connections to the home office and organize the existing network cabinet.",
      preferred_date: "2026-10-24T12:00:00Z",
      status: "scheduled",
      created_at: "2026-10-12T12:00:00Z",
    },
    {
      id: "sample-2",
      customer_id: "sample",
      name: "Alex",
      email: "sample@example.invalid",
      phone: "",
      service: "wifi",
      property_type: "Residential",
      address: "Sample residence",
      city: "Dallas",
      details:
        "Review wireless coverage upstairs and recommend access-point placement.",
      preferred_date: null,
      status: "reviewing",
      created_at: "2026-10-14T12:00:00Z",
    },
  ],
  invoices: [
    {
      id: "sample-invoice",
      request_id: "sample-1",
      customer_id: "sample",
      number: "SAMPLE-001",
      title: "Home office connectivity",
      items: [
        {
          description: "CAT6 connections · illustrative price",
          quantity: 2,
          unit_cents: 20000,
        },
        {
          description: "Network cabinet organization · illustrative price",
          quantity: 1,
          unit_cents: 15000,
        },
      ],
      total_cents: 55000,
      deposit_cents: 20000,
      paid_cents: 20000,
      status: "issued",
      due_date: "2026-10-24T12:00:00Z",
      created_at: "2026-10-12T12:00:00Z",
      accepted_at: "2026-10-13T12:00:00Z",
      terms:
        "Sample terms only. Final scheduling and cancellation terms would be confirmed for a real project.",
    },
  ],
  payments: [
    {
      id: "sample-payment",
      invoice_id: "sample-invoice",
      amount_cents: 20000,
      refunded_cents: 0,
      created_at: "2026-10-13T12:00:00Z",
      stripe_session_id: "sample",
    },
  ],
};
export default function Preview() {
  return <Portal data={data} demo />;
}
