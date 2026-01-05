import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Texas Hold'em - 单机德州扑克",
  description: "免费在线玩单机德州扑克，挑战智能AI。Play Single Player Texas Hold'em against AI opponents.",
  keywords: ['Texas Hold\'em', 'Poker', 'Single Player', '单机德州扑克', '德州扑克', 'Web Game', '扑克游戏', '在线扑克'],
  authors: [{ name: 'x-texas-holdem' }],
  creator: 'x-texas-holdem',
  metadataBase: new URL('https://xera-2011.github.io/x-texas-holdem'),
  openGraph: {
    title: "Texas Hold'em - 单机德州扑克",
    description: "免费在线玩单机德州扑克，挑战智能AI。",
    type: 'website',
    locale: 'zh_CN',
    siteName: 'Texas Hold\'em',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Texas Hold'em - 单机德州扑克",
    description: "免费在线玩单机德州扑克，挑战智能AI。",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
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
