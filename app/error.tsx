"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="container section">
      <div className="eyebrow">PLEASE TRY AGAIN</div>
      <h1>We couldn’t load this page.</h1>
      <p>Your account data has not been changed.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
