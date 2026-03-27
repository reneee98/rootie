import type { Metadata } from "next";
import { Rubik } from "next/font/google";

import { LayoutShell } from "@/components/layout/layout-shell";
import { getUser } from "@/lib/auth";

import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
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
      <body className={`${rubik.variable} antialiased`}>
        <LayoutShell isAuthenticated={isAuthenticated}>
          {children}
        </LayoutShell>
      </body>
    </html>
  );
}
