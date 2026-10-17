"use client";
import { useEffect, useRef } from "react";
import type { Message } from "../lib/catalog";
export function Conversation({
  messages,
  customerId,
  business = false,
}: {
  messages: Message[];
  customerId: string;
  business?: boolean;
}) {
  const thread = useRef<HTMLDivElement>(null);
  const latest = messages.at(-1)?.id;
  useEffect(() => {
    if (thread.current) thread.current.scrollTop = thread.current.scrollHeight;
  }, [latest]);
  return (
    <div
      className="conversation-thread"
      ref={thread}
      role="region"
      aria-label="Project Messages"
      tabIndex={0}
    >
      {messages.length ? (
        messages.map((m) => {
          const client = m.author_id === customerId;
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
  );
}
