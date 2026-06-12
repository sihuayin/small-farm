import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '农夫计划器 · 你的数字菜园',
  description: '给后院农夫的数字菜园规划与管理工具 — 种什么、种在哪、什么时候种，一目了然。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body bg-farm-50 text-farm-800 antialiased">{children}</body>
    </html>
  );
}
