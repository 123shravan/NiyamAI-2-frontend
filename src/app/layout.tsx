import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import BackendWakeup from "@/components/BackendWakeup";

import { Spectral, Inter } from "next/font/google";

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
        className={`${spectral.variable} ${inter.variable} antialiased`}
      >
        <AuthProvider>
          <BackendWakeup />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
