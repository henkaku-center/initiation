import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { Providers } from "./providers";
import { themeInitializationScript } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: process.env.HENKAKU_DEMO_ONLY === "1" ? "HENKAKU — Experience Demo" : "HENKAKU Initiation",
  description: process.env.HENKAKU_DEMO_ONLY === "1" ? "好奇心からはじまる、HENKAKUの小さな旅。" : "ウォレットを準備して、HENKAKUコミュニティへの参加を始める",
  ...(process.env.HENKAKU_DEMO_ONLY === "1" ? { robots: { index: false, follow: false } } : {}),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  if (process.env.HENKAKU_DEMO_ONLY === "1") {
    return <html lang="ja" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}><head><script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} /></head><body>{children}</body></html>;
  }
  return (
    <html lang="ja" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} /></head>
      <body>
        {/* ヘッダーがセッションを参照するため、Providers の内側へ入れる。
            SiteHeader 自体はServer Componentのまま子として渡される(Issue #40)。 */}
        <Providers>
          <SiteHeader />
          <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
