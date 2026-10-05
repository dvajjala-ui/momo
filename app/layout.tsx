import type { Metadata } from "next";
import "./globals.css";
import {BrandProvider} from "./brand";

export const metadata: Metadata = {
  title: "Momo — kal milte hain?",
  description: "Small weekend meetups, good food, a little play, and real conversations. Come as you are.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><BrandProvider>{children}</BrandProvider></body>
    </html>
  );
}
