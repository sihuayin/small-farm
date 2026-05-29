'use client';

import dynamic from 'next/dynamic';

// 条件式客户端解析：禁用 SSR，防止 Konva 在服务端报错
const GardenPlanner = dynamic(
  () => import('@/components/planner'),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-screen">加载中...</div> }
);

export default function PlannerPage() {
  return <GardenPlanner />;
}