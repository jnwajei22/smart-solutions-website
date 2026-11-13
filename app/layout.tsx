import type { Metadata } from "next";
import "./globals.css";
import "./marketing.css";
import "./workspace.css";
export const metadata: Metadata = {
  title: {
    default: "DFW Smart Solutions | Your space. Only smarter.",
    template: "%s | DFW Smart Solutions",
  },
  description:
    "Low-voltage cabling, commercial prewire, Wi-Fi, network racks, TV mounting, paging, audio, and smart-home services across Dallas–Fort Worth.",
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
