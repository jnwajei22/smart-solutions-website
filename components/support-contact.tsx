import { supportEmail } from "../lib/support";
export function SupportContact() {
  const email = supportEmail();
  return email ? (
    <p>
      Contact <a href={`mailto:${email}`}>{email}</a>. Include your invoice
      number or project name, but never send passwords or card details.
    </p>
  ) : (
    <p>
      For an existing project, use the contact details supplied with your quote
      or reply to your project correspondence. Include your invoice number or
      project name; never send passwords or card details.
    </p>
  );
}
