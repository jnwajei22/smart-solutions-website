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
        </div>
        <Suspense>
          <LoginForm
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
