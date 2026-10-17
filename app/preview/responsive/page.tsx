import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Responsive QA",
  robots: { index: false, follow: false },
};
const pages = {
  home: "/",
  request: "/request",
  login: "/login",
  portal: "/preview",
  admin: "/preview/admin",
  invoice: "/preview/invoice",
  help: "/help",
  terms: "/terms",
  privacy: "/privacy",
};
export default async function Responsive({
  searchParams,
}: {
  searchParams: Promise<{ width?: string; page?: string }>;
}) {
  if (
    process.env.VERCEL_ENV !== "preview" &&
    process.env.NODE_ENV !== "development"
  )
    notFound();
  const query = await searchParams;
  const width = [320, 375, 390, 768].includes(Number(query.width))
    ? Number(query.width)
    : 375;
  const page =
    query.page && Object.hasOwn(pages, query.page)
      ? (query.page as keyof typeof pages)
      : "request";
  return (
    <main style={{ padding: 20 }}>
      <h1 style={{ fontSize: 24 }}>Responsive layout check</h1>
      <p>
        Preview-only. Frames use real CSS viewport widths; browser device
        behavior is not emulated.
      </p>
      <form className="ops-toolbar" method="get">
        <label>
          Frame Width
          <select name="width" defaultValue={width}>
            {[320, 375, 390, 768].map((w) => (
              <option key={w} value={w}>
                {w}px
              </option>
            ))}
          </select>
        </label>
        <label>
          Page
          <select name="page" defaultValue={page}>
            {Object.keys(pages).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <button className="button">Load Layout</button>
      </form>
      <iframe
        title="Mobile layout preview"
        src={pages[page]}
        style={{
          width,
          height: 900,
          border: "1px solid #ccc",
          background: "white",
          maxWidth: "none",
        }}
      />
    </main>
  );
}
