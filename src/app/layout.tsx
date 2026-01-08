import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// 禁用页面缩放，避免移动端用户误操作
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "单机德州扑克 | 摸鱼神器 | 挑战AI",
  description: "专门为上班族打造的摸鱼神器！无需下载、无需登录、即点即玩。免费单机德州扑克，随时暂停，挑战智能AI，体验纯粹的博弈乐趣。",
  keywords: [
    '单机德州扑克',
    '上班摸鱼',
    '摸鱼游戏',
    '德州扑克',
    'Texas Hold\'em',
    '免费扑克',
    '人机对战',
    '无需下载',
    '网页游戏',
    'Poker AI',
    '摸鱼神器'
  ],
  authors: [{ name: 'XERA' }],
  creator: 'XERA',
  metadataBase: new URL('https://xera-2011.github.io/x-texas-holdem'),
  openGraph: {
    title: "上班摸鱼神器 - 单机德州扑克",
    description: "老板来了也不怕！极致轻量，随时暂停。来一把紧张刺激的德州扑克，挑战高智商AI。",
    type: 'website',
    locale: 'zh_CN',
    siteName: '单机德州扑克',
  },
  twitter: {
    card: 'summary_large_image',
    title: "单机德州扑克 | 上班摸鱼首选",
    description: "无需下载，打开即玩。挑战智能AI，享受纯粹扑克乐趣。",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.className} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
