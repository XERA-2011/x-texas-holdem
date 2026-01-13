import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/components/i18n-provider";

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
  // Mono font is only used in game logs, not initially visible.
  // disable preload to avoid "preloaded but not used" warning.
  preload: false,
});

export const metadata: Metadata = {
  title: "Texas Hold'em | AI Challenge",
  description: "The ultimate Texas Hold'em experience for quick breaks! No download, no login, just play. Offline, free, and challenging AI opponents. Enjoy pure poker fun anytime, anywhere.",
  keywords: [
    'Texas Hold\'em',
    'Offline Poker',
    'Free Poker',
    'Poker AI',
    'Single Player Poker',
    'No Download Poker',
    'Browser Game',
    'Play Poker Against Computer',
    '德州扑克', // Keep a few major keywords in Chinese for bilingual reach
    '单机德州'
  ],
  authors: [{ name: 'XERA' }],
  creator: 'XERA',
  metadataBase: new URL('https://xera-2011.github.io/x-texas-holdem'),
  openGraph: {
    title: "Texas Hold'em - Play Offline Against AI",
    description: "No boss, no pressure. Ultra-lightweight, pause anytime. Challenge high-IQ AI in a tense Texas Hold'em battle.",
    type: 'website',
    locale: 'en_US', // Changed to en_US for global default
    siteName: "Texas Hold'em Offline",
  },
  twitter: {
    card: 'summary_large_image',
    title: "Texas Hold'em | Play Instantly",
    description: "No download required. Challenge smart AI opponents in this free offline poker game.",
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.className} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider>
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
