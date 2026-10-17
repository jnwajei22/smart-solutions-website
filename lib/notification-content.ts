export const notificationSubjects: Record<string, string> = {
  request_received: "Project request received",
  client_message: "New client message",
  business_message: "New project message",
  quote_ready: "Your quote is ready",
  invoice_void: "Invoice cancelled",
  project_status: "Project status updated",
  payment_received: "Payment recorded",
  refund_recorded: "Refund recorded",
};
export function notificationContent(
  kind: string,
  audience: string,
  origin: string,
) {
  const subject = notificationSubjects[kind];
  if (!subject) throw Error("Unknown notification kind");
  const url = new URL(audience === "business" ? "/admin" : "/portal", origin)
    .href;
  return {
    subject: `DFW Smart Solutions · ${subject}`,
    text: `${subject}.\n\nSign in to your ${audience === "business" ? "business workspace" : "client portal"} to review the current details:\n${url}\n\nThis is a project service notification. Please use the project conversation for replies. Never send passwords or payment-card details by email.`,
  };
}
export function emailAddress(value: string | undefined) {
  return value &&
    value.length <= 254 &&
    /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value)
    ? value
    : null;
}
