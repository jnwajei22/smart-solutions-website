"use client";
import Link from "next/link";
import { useState } from "react";
import { browserClient } from "../lib/browser";
export function AccountPanel({
  name,
  email,
  role,
  emailCodeEnabled = false,
  demo = false,
}: {
  name: string;
  email: string;
  role: string;
  emailCodeEnabled?: boolean;
  demo?: boolean;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="settings-card">
      <h2>Your Account</h2>
      <dl className="account-details">
        <div>
          <dt>Name</dt>
          <dd>{name}</dd>
        </div>
        <div>
          <dt>Email Address</dt>
          <dd>{email}</dd>
        </div>
        <div>
          <dt>Access</dt>
          <dd>{role}</dd>
        </div>
      </dl>
      <div className="account-security-note">
        <strong>Your sign-in, your access.</strong>
        <p>
          {emailCodeEnabled
            ? "Sign in with a one-time email code, or use your existing password. Keep your email account secure."
            : "Your sign-in belongs to your individual account. Keep your password private and use a unique password."}{" "}
          Team permissions are managed separately by an administrator.
        </p>
      </div>
      {demo && (
        <p className="auth-preview-note">
          Fictional account preview. Account changes and sign-out are disabled.
        </p>
      )}
      <div className="form-actions">
        {!demo && (
          <Link href="/reset-password" className="button small outline">
            Manage existing password
          </Link>
        )}
        <button
          className="button small outline"
          disabled={busy || demo}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const { error } = await browserClient().auth.signOut();
              if (error) throw error;
              // Discard authenticated router state after sign-out.
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.assign("/login");
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Unable to sign out. Try again.",
              );
              setBusy(false);
            }
          }}
        >
          {busy ? "Signing Out…" : "Sign Out"}
        </button>
      </div>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
