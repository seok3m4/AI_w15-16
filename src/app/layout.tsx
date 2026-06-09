import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "야구 AI 게시판",
  description: "RAG, MCP, Agent를 활용한 야구 AI 브리핑 게시판입니다.",
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
