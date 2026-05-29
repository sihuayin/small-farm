import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '游戏化花园规划器',
  description: '基于 2.5D 轴测视图的游戏化花园与自给自足规划器',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}