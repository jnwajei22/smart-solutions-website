import { Check } from "lucide-react";
import { Suspense } from "react";
import { Header, Footer } from "../../components/brand";
import { LoginForm } from "../../components/login-form";
export const metadata = { title: "Client sign in" };
export default function Login() {
  return (
    <>
      <Header />
      <main className="login-page container">
        <div>
          <div className="eyebrow">A SPACE FOR YOUR PROJECTS</div>
          <h1>
            Welcome
            <br />
            <em>back.</em>
          </h1>
          <p>
            Your projects, quotes, and payments.
            <br />
            All connected, all in one place.
          </p>
          <ul className="login-feature-list">
            <li>
              <Check size={16} />
              Your project scope and progress
            </li>
            <li>
              <Check size={16} />
              Clear quotes and payment history
            </li>
            <li>
              <Check size={16} />
              One conversation with our team
            </li>
          </ul>
        </div>
        <Suspense>
          <LoginForm
            emailCodeEnabled={process.env.EMAIL_CODE_LOGIN_ENABLED === "true"}
            emailCodeDemo={
              process.env.VERCEL_ENV === "preview" &&
              process.env.EMAIL_CODE_DEMO_MODE === "true"
            }
            enabled={
              !!(
                process.env.NEXT_PUBLIC_SUPABASE_URL &&
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
              )
            }
          />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
