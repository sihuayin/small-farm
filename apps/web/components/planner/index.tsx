/**
 * Planner 入口组件
 * 禁用 SSR 的包装器
 */
'use client';

import dynamic from 'next/dynamic';

// 条件式客户端解析：禁用 SSR，防止 Konva 在服务端报错
const GardenCanvas = dynamic(
  () => import('./GardenCanvas'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-green-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🌱</div>
          <div className="text-lg text-gray-600">加载花园规划器中...</div>
        </div>
      </div>
    )
  }
);

export default function Planner() {
  return <GardenCanvas />;
}