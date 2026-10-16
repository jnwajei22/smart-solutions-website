"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="container section">
      <div className="eyebrow">PLEASE TRY AGAIN</div>
      <h1>We couldn’t load this page.</h1>
      <p>
        Please try again. If you just submitted a request or payment, check your
        portal before submitting it again.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
