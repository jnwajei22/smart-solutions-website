"use client";
import { useEffect, useRef, useState } from "react";
import type { Message } from "../lib/catalog";
export function Conversation({
  messages,
  customerId,
  business = false,
  active = true,
  onRead,
}: {
  messages: Message[];
  customerId: string;
  business?: boolean;
  active?: boolean;
  onRead?: () => void;
}) {
  const thread = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  const latest = messages.at(-1)?.id;
  useEffect(() => {
    if (active && thread.current && nearBottom.current) {
      thread.current.scrollTop = thread.current.scrollHeight;
      onRead?.();
    }
  }, [latest, active, onRead]);
  return (
    <>
      <div
        className="conversation-thread"
        ref={thread}
        role="region"
        aria-label="Project Messages"
        tabIndex={0}
        onScroll={() => {
          const el = thread.current;
          if (!el) return;
          const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
          nearBottom.current = bottom;
          setAtBottom(bottom);
          if (bottom) onRead?.();
        }}
      >
        {messages.length ? (
          messages.map((m) => {
            const client = m.sender_type
              ? m.sender_type === "client"
              : m.author_id === customerId;
            const outgoing = business ? !client : client;
            return (
              <article
                className={`message-bubble ${outgoing ? "outgoing" : "incoming"}`}
                key={m.id}
              >
                <div className="message-meta">
                  <strong>{client ? "Client" : "DFW Smart Solutions"}</strong>
                  <time dateTime={m.created_at}>
                    {new Date(m.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "America/Chicago",
                      timeZoneName: "short",
                    })}
                  </time>
                </div>
                <p>{m.body}</p>
              </article>
            );
          })
        ) : (
          <p className="conversation-empty">
            No messages yet. Keep project questions and updates together here.
          </p>
        )}
      </div>
      {!atBottom && (
        <button
          type="button"
          className="jump-latest"
          onClick={() => {
            if (thread.current) {
              thread.current.scrollTop = thread.current.scrollHeight;
              nearBottom.current = true;
              setAtBottom(true);
              onRead?.();
            }
          }}
        >
          Jump to Latest Message ↓
        </button>
      )}
    </>
  );
}
