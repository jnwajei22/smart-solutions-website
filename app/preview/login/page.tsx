import { Suspense } from "react";
import { Header, Footer } from "../../../components/brand";
import { LoginForm } from "../../../components/login-form";
export const metadata = {
  title: "Email sign-in preview",
  robots: { index: false, follow: false },
};
export default function SignInPreview() {
  return (
    <>
      <Header />
      <main className="login-page container">
        <div>
          <div className="eyebrow">SIGN-IN DESIGN PREVIEW</div>
          <h1>
            Your projects.
            <br />
            <em>One code away.</em>
          </h1>
          <p>
            Review the email-code experience using fictional details. This
            sample never sends an email or creates an account.
          </p>
        </div>
        <Suspense>
          <LoginForm enabled emailCodeEnabled demo />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
