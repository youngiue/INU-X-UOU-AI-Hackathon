import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "울산 커리어 레이더",
  description: "직무명이 아닌 실제 업무로 발견하는 울산 취업기회",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
