"use client";
import { useState } from "react";
import { browserClient } from "../../lib/browser";
import { Header, Footer } from "../../components/brand";
export default function Reset() {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <Header />
      <main className="container narrow section">
        <h1>New Password.</h1>
        <form
          className="form-card"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const password = new FormData(e.currentTarget).get(
                "password",
              ) as string;
              const { error } = await browserClient().auth.updateUser({
                password,
              });
              if (error) throw error;
              // Clear the pre-recovery router cache after the session changes.
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.assign("/portal");
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : "Unable to update password.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            New Password
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </label>
          {message && <p role="alert">{message}</p>}
          <button className="button" disabled={busy}>
            Update password
          </button>
        </form>
      </main>
      <Footer />
    </>
  );
}
