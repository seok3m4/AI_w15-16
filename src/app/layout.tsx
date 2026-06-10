import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "야구 게시판",
  description: "경기 리뷰, 선수 분석, KBO 소식을 나누는 야구 커뮤니티입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
