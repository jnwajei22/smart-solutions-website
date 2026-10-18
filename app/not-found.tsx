import Link from "next/link";
import { Header, Footer } from "../components/brand";
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="container section">
        <div className="eyebrow">404</div>
        <h1>
          This connection
          <br />
          goes nowhere.
        </h1>
        <p>The page is missing or isn’t available to your account.</p>
        <Link className="button" href="/">
          Back to home
        </Link>
      </main>
      <Footer />
    </>
  );
}
