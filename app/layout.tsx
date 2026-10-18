import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "DFW Smart Solutions | Your space. Only smarter.",
    template: "%s | DFW Smart Solutions",
  },
  description:
    "Weekend IT project inquiries for Cedar Hill and southern Dallas County. Explore small Wi-Fi, workstation, and onsite support tasks with DFW Smart Solutions.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
