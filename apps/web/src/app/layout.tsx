import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kingshot · Battle admin",
  description: "Event manager for Kingshot battle assistant",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
