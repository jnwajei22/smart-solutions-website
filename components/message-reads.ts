"use client";
import { useCallback, useSyncExternalStore } from "react";
const changed = "dfw-message-reads";
const memory = new Map<string, string>();
function get(key: string) {
  try {
    return window.localStorage.getItem(key) || memory.get(key) || "{}";
  } catch {
    return memory.get(key) || "{}";
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(changed, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(changed, callback);
  };
}
export function useMessageReads(identity: string) {
  const key = `dfw-message-reads:v1:${identity}`;
  const snapshot = useSyncExternalStore(
    subscribe,
    () => get(key),
    () => "{}",
  );
  let reads: Record<string, string> = {};
  try {
    const value = JSON.parse(snapshot);
    if (value && typeof value === "object" && !Array.isArray(value))
      reads = value;
  } catch {}
  const markRead = useCallback(
    (requestId: string, at: string) => {
      let existing: Record<string, string> = {};
      try {
        existing = JSON.parse(get(key));
        if (
          !existing ||
          typeof existing !== "object" ||
          Array.isArray(existing)
        )
          existing = {};
      } catch {}
      if (Date.parse(existing[requestId] || "") >= Date.parse(at)) return;
      const next = JSON.stringify({ ...existing, [requestId]: at });
      memory.set(key, next);
      try {
        window.localStorage.setItem(key, next);
      } catch {}
      window.dispatchEvent(new Event(changed));
    },
    [key],
  );
  return { reads, markRead };
}
