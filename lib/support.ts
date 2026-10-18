/** Only an explicitly configured public business address may appear on the site. */
export function supportEmail() {
  const value = process.env.SUPPORT_EMAIL?.trim();
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}
