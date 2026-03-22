import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kingshot · Bataille & admin",
  description:
    "Assistant d’événements : tableau de bord admin et vue joueur en direct.",
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
