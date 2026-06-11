import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";

import { Spectral, Inter, Instrument_Serif, Syne, DM_Mono } from "next/font/google";

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-spectral",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-syne",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "Niyam AI - Legal Intelligence Platform",
  description: "AI-powered legal query and document analysis system. Search through comprehensive legal provisions, rules, and acts instantly.",
  keywords: "legal research, AI legal assistant, Indian law, legal database",
  authors: [{ name: "Niyam AI" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${spectral.variable} ${inter.variable} ${instrumentSerif.variable} ${syne.variable} ${dmMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
