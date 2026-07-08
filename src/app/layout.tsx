import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import BottomTab from "@/components/BottomTab";

export const metadata: Metadata = {
  title: "SSULEX 썰거래소",
  description: "이야기를 주식처럼 거래하는 썰 거래소",
  icons: {
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "썰거래소",
  },
};

export const viewport: Viewport = {
  themeColor: "#6C3CE9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background shadow-[0_0_24px_rgba(30,21,51,0.06)]">
          <Header />
          <main className="flex-1 pb-24">{children}</main>
          <BottomTab />
        </div>
      </body>
    </html>
  );
}
