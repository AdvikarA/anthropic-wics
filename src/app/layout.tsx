import React from "react";
import { Playfair_Display, Inter } from 'next/font/google';
import "./globals.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { SessionProvider } from "@/components/SessionProvider";

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair'
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}
