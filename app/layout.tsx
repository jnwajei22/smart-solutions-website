import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "DFW Smart Solutions | Your space. Only smarter.",
    template: "%s | DFW Smart Solutions",
  },
  description:
    "Ethernet cabling, Wi-Fi, network organization, TV mounting, and smart-home project inquiries for homes and businesses across Dallas–Fort Worth.",
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
