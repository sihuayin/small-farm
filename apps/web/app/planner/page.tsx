'use client';

import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// 条件式客户端解析：禁用 SSR，防止 Konva 在服务端报错
const GardenPlanner = dynamic(
  () => import('@/components/planner/GardenCanvas'),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-screen">加载中...</div> }
);

function PlannerPageInner() {
  const searchParams = useSearchParams();
  const province = searchParams?.get('province') || '';
  const city = searchParams?.get('city') || '';
  const month = searchParams?.get('month') || '';
  const width = searchParams?.get('width') || '';
  const height = searchParams?.get('height') || '';
  const plantsParam = searchParams?.get('plants') || '';
  const isDemo = searchParams?.get('demo') === 'true';

  return (
    <GardenPlanner
      initialProvince={province}
      initialCity={city}
      initialMonth={month ? Number(month) : undefined}
      initialWidth={width ? Number(width) : undefined}
      initialHeight={height ? Number(height) : undefined}
      initialPlants={plantsParam ? plantsParam.split(',').filter(Boolean) : undefined}
      isDemo={isDemo}
    />
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">加载中...</div>}>
      <PlannerPageInner />
    </Suspense>
  );
}
