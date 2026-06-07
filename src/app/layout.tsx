import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";

const geist = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-inter",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "Niyam AI | Regulatory Intelligence Cabin",
  description: "AI-powered legal query and document analysis system for Indian environmental compliance and regulatory intelligence.",
  keywords: "legal research, AI legal assistant, Indian law, legal database, compliance intelligence",
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
        className={`${geist.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
