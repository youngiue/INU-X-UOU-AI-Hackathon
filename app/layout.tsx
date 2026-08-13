import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { MatchProvider } from "@/lib/context/MatchContext";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "유스캐너",
  description: "직무명이 아닌 실제 업무로 발견하는 울산 취업기회",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={jetbrainsMono.variable}>
      <body>
        <MatchProvider>{children}</MatchProvider>
      </body>
    </html>
  );
}
