import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { LayoutShell } from "@/components/layout/layout-shell";
import { getUser } from "@/lib/auth";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rootie",
  description: "Rastliny na dosah vo vašom kraji",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();
  const isAuthenticated = !!user;

  return (
    <html lang="sk">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LayoutShell isAuthenticated={isAuthenticated}>
          {children}
        </LayoutShell>
      </body>
    </html>
  );
}
