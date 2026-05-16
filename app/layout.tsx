import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DFW Smart Solutions | Low-Voltage, Cabling & Smart Infrastructure",
  description: "Structured cabling, network setup, Wi-Fi optimization, racks, and smart infrastructure services across Dallas–Fort Worth.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
