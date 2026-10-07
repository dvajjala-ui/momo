import type { Metadata, Viewport } from "next";
import "./globals.css";
import {BrandProvider} from "./brand";

export const metadata: Metadata = {
  title: "Momo — kal milte hain?",
  description: "Make a wish. We’ll get your gang ready. Small weekend meetups in Ahmedabad: good food, a silly game, and people who become your people.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Momo — make a wish, we’ll get your gang ready",
    description: "Small weekend meetups in Ahmedabad. Good food, a silly game, and people who become your people. 18+.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Momo: make a wish, we'll get your gang ready" }],
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const viewport: Viewport = { themeColor: "#fffaf0", width: "device-width", initialScale: 1 };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Bangers&family=Caveat:wght@500;700&family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,800;1,9..144,500;1,9..144,800&family=Great+Vibes&family=Nunito:ital,wght@0,400;0,700;0,900;1,700&display=swap" />
      </head>
      <body className="antialiased"><BrandProvider>{children}</BrandProvider></body>
    </html>
  );
}
