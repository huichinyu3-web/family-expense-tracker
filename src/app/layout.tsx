import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Family Expense Tracker | 家庭記帳系統",
  description: "免費、無廣告、具備生物辨識的精品家庭共用記帳系統",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full bg-[#0a0a0f] text-white antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
