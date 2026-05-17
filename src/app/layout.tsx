import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";
import InAppBrowserDetector from "@/components/features/InAppBrowserDetector";
import PwaInstallPrompt from "@/components/features/PwaInstallPrompt";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "共享記帳本 | Shared Expense Tracker",
  description: "免費、無廣告、具備生物辨識的精品共享協作記帳系統",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "共享記帳本",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full bg-[#0a0a0f] text-white antialiased font-sans">
        <NextTopLoader
          color="#6366f1"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #6366f1,0 0 5px #6366f1"
        />
        <InAppBrowserDetector>
          <Providers>{children}</Providers>
        </InAppBrowserDetector>
        <PwaInstallPrompt />
        <Toaster position="top-center" theme="dark" />
      </body>
    </html>
  );
}
