"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { roleLabel, type BusinessRole } from "../lib/access";
export type TeamMember = {
  email: string;
  role: "manager" | "viewer";
  updated_at: string;
};
export function TeamControls({ members }: { members: TeamMember[] }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const router = useRouter();
  async function update(
    action: "grant" | "revoke",
    address: string,
    nextRole?: string,
  ) {
    setBusy(true);
    setNotice("");
    try {
      const r = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email: address, role: nextRole }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setNotice(
        action === "revoke"
          ? "Access removed. New requests are checked immediately."
          : "Access saved. This person can sign in after verifying this email. No invitation email was sent.",
      );
      if (action === "grant") setEmail("");
      router.refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Unable to update access.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <form
        className="team-access-form"
        onSubmit={(e) => {
          e.preventDefault();
          update("grant", email, role);
        }}
      >
        <label>
          Email Address
          <input
            type="email"
            required
            maxLength={254}
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Dashboard Role
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="viewer">Viewer — Read Only</option>
            <option value="manager">
              Project Manager — Manage Projects & Quotes
            </option>
          </select>
        </label>
        <button className="button small" disabled={busy}>
          Save Access
        </button>
      </form>
      <p className="fine-print">
        To change a role, enter the same email and save the new role.
        Administrator access is managed separately.
      </p>
      {notice && (
        <p role="status" className="alert">
          {notice}
        </p>
      )}
      <ul className="team-list">
        {members.map((m) => (
          <li key={m.email}>
            <div>
              <strong>{m.email}</strong>
              <span>{roleLabel(m.role as BusinessRole)}</span>
            </div>
            <button
              className="text-link"
              disabled={busy}
              onClick={() => update("revoke", m.email)}
              aria-label={`Remove access for ${m.email}`}
            >
              Remove Access
            </button>
          </li>
        ))}
      </ul>
      {!members.length && (
        <p className="empty-inline">No partner access added yet.</p>
      )}
    </>
  );
}
