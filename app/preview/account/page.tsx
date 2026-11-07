import Link from "next/link";
import { Header, Footer } from "../../../components/brand";
import { AccountPanel } from "../../../components/account-panel";
export const metadata = {
  title: "Sample account settings",
  robots: { index: false, follow: false },
};
export default function AccountPreview() {
  return (
    <>
      <Header />
      <main className="container workspace-settings">
        <Link href="/preview" className="text-link">
          ← Sample client portal
        </Link>
        <header className="settings-heading">
          <div className="eyebrow">ACCOUNT PREVIEW</div>
          <h1>Your account.</h1>
          <p>Your details and sign-in options, in one place.</p>
        </header>
        <AccountPanel
          name="Alex"
          email="alex@example.invalid"
          role="Client Portal"
          emailCodeEnabled
          demo
        />
      </main>
      <Footer />
    </>
  );
}
