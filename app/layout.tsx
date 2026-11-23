import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "名刺お礼メール生成 PWA",
  description: "名刺画像と備忘録メモから自動でビジネス挨拶メールを生成",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "名刺メール",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#00d1b2" },
    { media: "(prefers-color-scheme: dark)", color: "#00b89c" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        {/* Android Chrome / Samsung Internet Address Bar Theme Color */}
        <meta name="theme-color" content="#00d1b2" />
        <meta name="msapplication-navbutton-color" content="#00d1b2" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bulma@1.0.2/css/bulma.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
