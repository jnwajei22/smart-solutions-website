/** Deliberately omit provider messages, request bodies, identifiers and secrets. */
export function logFailure(event: string, error: unknown) {
  const code =
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[A-Z0-9]{5}$/.test(error.code)
      ? error.code
      : undefined;
  console.error(JSON.stringify({ event, ...(code ? { code } : {}) }));
}
