import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baseball AI Board",
  description: "AI baseball briefing board powered by RAG, MCP, and agents.",
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
