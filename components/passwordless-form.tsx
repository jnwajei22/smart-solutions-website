"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import { browserClient } from "../lib/browser";
import { signupMetadata, type ClientAccountType } from "../lib/presentation";
import { loginDestination } from "../lib/auth-navigation";

export function PasswordlessForm({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(demo ? "alex@example.invalid" : "");
  const [code, setCode] = useState("");
  const [signup, setSignup] = useState(false);
  const [accountType, setAccountType] = useState<ClientAccountType>("personal");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  async function sendCode() {
    if (busy || cooldown) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (!demo) {
        const { error } = await browserClient().auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: {
            shouldCreateUser: signup,
            ...(signup && {
              data: signupMetadata(accountType, fullName, businessName),
            }),
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
          },
        });
        if (error) throw error;
      }
      setSent(true);
      setCode("");
      setCooldown(60);
      setNotice(
        demo
          ? "Sample screen only. No email was sent."
          : "If this email is eligible, a sign-in code is on its way. Use the newest email and check spam if needed.",
      );
    } catch {
      setError(
        "We couldn’t request a code. Please wait a moment and try again, or use your existing password.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sent) return sendCode();
    if (busy) return;
    setError("");
    setNotice("");
    if (demo) {
      setNotice(
        "This sample does not verify codes or sign you in. No account or session was created.",
      );
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await browserClient().auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: "email",
      });
      if (error || !data.session) throw error || new Error("No session");
      setCode("");
      router.replace(loginDestination(params.get("next")));
      router.refresh();
    } catch {
      setCode("");
      setError(
        "That code couldn’t be verified. Check the newest email, or request a fresh code after the wait.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-card" onSubmit={submit} aria-busy={busy}>
      <div className="eyebrow">CLIENT PORTAL · EMAIL SIGN-IN</div>
      <h2>
        {sent
          ? "Check your inbox."
          : signup
            ? "Your projects start here."
            : "Welcome back."}
      </h2>
      <p>
        {sent ? (
          <>
            Enter the one-time code sent to{" "}
            <strong className="otp-email">{email}</strong>.
          </>
        ) : (
          "A one-time email code gets you to your projects. No password to remember."
        )}
      </p>
      {demo && (
        <p className="auth-preview-note">
          Design preview only. No email, account, or authenticated session is
          created here.
        </p>
      )}
      {!sent ? (
        <>
          {signup && (
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
                      onChange={() => setAccountType(type)}
                    />
                    {type === "personal" ? "Personal" : "Business"}
                  </label>
                ))}
              </fieldset>
              <label>
                {accountType === "business" ? "Contact full name" : "Full name"}
                <input
                  required
                  name="full_name"
                  autoComplete="name"
                  minLength={2}
                  maxLength={100}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  disabled={busy}
                />
              </label>
              {accountType === "business" && (
                <label>
                  Business name
                  <input
                    required
                    name="business_name"
                    autoComplete="organization"
                    minLength={2}
                    maxLength={160}
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    disabled={busy}
                  />
                </label>
              )}
            </>
          )}
          <label>
            Email address
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              autoCapitalize="none"
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
            />
          </label>
        </>
      ) : (
        <label>
          Verification code
          <input
            required
            name="code"
            className="otp-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6,10}"
            minLength={6}
            maxLength={10}
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 10))
            }
            disabled={busy}
          />
          <small>Codes expire and can only be used once.</small>
        </label>
      )}
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="alert" role="status">
          {notice}
        </p>
      )}
      <button
        className="button full"
        disabled={busy || (!sent && cooldown > 0)}
      >
        {busy
          ? "Please wait…"
          : sent
            ? "Verify & continue"
            : signup
              ? "Create account with email"
              : "Email me a sign-in code"}
        {sent ? <ArrowRight size={18} /> : <Mail size={18} />}
      </button>
      <div className="login-options">
        {sent ? (
          <>
            <button
              type="button"
              disabled={busy || cooldown > 0}
              onClick={sendCode}
            >
              {cooldown
                ? `Resend available in ${cooldown}s`
                : "Send a new code"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setSent(false);
                setCode("");
                setError("");
                setNotice("");
              }}
            >
              Use a different email
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setSignup(!signup);
              setError("");
              setNotice("");
            }}
          >
            {signup
              ? "Already a client? Sign in"
              : "New here? Create an account"}
          </button>
        )}
      </div>
    </form>
  );
}
