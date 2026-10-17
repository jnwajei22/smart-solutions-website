"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function NotificationControls({ ready }: { ready: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <>
      <button
        className="button"
        disabled={!ready || busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await fetch("/api/notifications", { method: "POST" });
            const d = await r.json();
            if (!r.ok)
              throw Error(d.error || "Email delivery is not configured.");
            setMessage(
              `${d.sent} accepted by the mail server; ${d.failed} failed. Refresh to review the queue.`,
            );
            router.refresh();
          } catch (e) {
            setMessage(
              e instanceof Error
                ? e.message
                : "Unable to process notifications.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Processing…" : "Process Due Emails"}
      </button>
      {message && <p role="status">{message}</p>}
    </>
  );
}
