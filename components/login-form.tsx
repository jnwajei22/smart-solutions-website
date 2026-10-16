"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { signupMetadata, type ClientAccountType } from "../lib/presentation";
import { browserClient } from "../lib/browser";
export function LoginForm({ enabled }: { enabled: boolean }) {
  const [mode, setMode] = useState("login"),
    [accountType, setAccountType] = useState<ClientAccountType>("personal"),
    [businessName, setBusinessName] = useState(""),
    [fullName, setFullName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const params = useSearchParams(),
    router = useRouter();
  const target = params.get("next") === "/request" ? "/request" : "/portal";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const db = browserClient();
      if (mode === "login") {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(target);
        router.refresh();
      } else if (mode === "signup") {
        const metadata = signupMetadata(accountType, fullName, businessName);
        const { error } = await db.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
          },
        });
        if (error) throw error;
        setMessage(
          "Check your email to confirm your account, then sign in to continue.",
        );
      } else {
        const { error } = await db.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
        });
        if (error) throw error;
        setMessage(
          "If an account exists, a password reset email is on its way.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-card" onSubmit={submit}>
      <div className="eyebrow">CLIENT PORTAL</div>
      <h2>
        {mode === "signup"
          ? "Make yourself at home."
          : mode === "reset"
            ? "Reset your password."
            : "Good to see you."}
      </h2>
      <p>
        {mode === "signup"
          ? "Create an account to request services and manage your projects."
          : mode === "reset"
            ? "We’ll email you a secure reset link."
            : "Sign in to pick up where you left off."}
      </p>
      {!enabled ? (
        <>
          <div className="alert">
            Account access is being prepared. No accounts or payments can be
            created in this preview.
          </div>
          <Link className="button full" href="/preview">
            Explore a sample portal <ArrowRight size={18} />
          </Link>
        </>
      ) : (
        <>
          {mode === "signup" && (
            <>
              <fieldset className="segmented" disabled={busy}>
                <legend>Account Type</legend>
                {(["personal", "business"] as const).map((type) => (
                  <label
                    key={type}
                    className={accountType === type ? "selected" : ""}
                  >
                    <input
                      type="radio"
                      name="account_type"
                      value={type}
                      checked={accountType === type}
                      onChange={() => {
                        setAccountType(type);
                        setError("");
                      }}
                    />
                    {type === "personal" ? "Personal" : "Business"}
                  </label>
                ))}
              </fieldset>
              {accountType === "business" && (
                <label>
                  Business Name
                  <input
                    required
                    name="business_name"
                    autoComplete="organization"
                    autoCapitalize="words"
                    minLength={2}
                    maxLength={160}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </label>
              )}
              <label>
                {accountType === "business" ? "Contact Full Name" : "Full Name"}
                <input
                  required
                  name="full_name"
                  autoComplete="name"
                  autoCapitalize="words"
                  minLength={2}
                  maxLength={100}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>
            </>
          )}
          <label>
            {mode === "signup" && accountType === "business"
              ? "Business Email Address"
              : "Email Address"}
            <input
              required
              type="email"
              name="email"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {mode !== "reset" && (
            <label>
              Password
              <input
                required
                type="password"
                name="password"
                minLength={mode === "signup" ? 12 : 1}
                maxLength={128}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === "signup" && <small>Use at least 12 characters.</small>}
            </label>
          )}
          {error && (
            <p className="alert error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="alert" role="status">
              {message}
            </p>
          )}
          <button className="button full" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : mode === "reset"
                  ? "Send reset link"
                  : "Sign in"}{" "}
            <ArrowRight size={18} />
          </button>
          <div className="login-options">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setError("");
                setMessage("");
              }}
            >
              {mode === "signup"
                ? "Already a client? Sign in"
                : "New here? Create an account"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode(mode === "reset" ? "login" : "reset");
                setError("");
                setMessage("");
              }}
            >
              {mode === "reset" ? "Back to sign in" : "Forgot password?"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
