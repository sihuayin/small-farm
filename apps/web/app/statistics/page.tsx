'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { GardenPlan, HarvestRecord, ActivityRecord } from '@/components/planner/types';
import { getPlantAgronomy } from '@/components/planner/plants';
import { estimateGardenTotalYield } from '@/components/planner/yield';
import { plants, plantMap } from '@/components/planner/plants';

const PLAN_STORAGE_KEY = 'small-farm:garden-plan:v1';

interface PlantYield {
  plantName: string;
  gridCount: number;
  totalEstimated: string;
  unit: string;
  confidence: string;
}

interface SeasonStats {
  seasonLabel: string;
  harvestCount: number;
  totalQuantity: number;
  plants: string[];
}

function loadPlan(): GardenPlan | null {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export default function StatisticsPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<GardenPlan | null>(null);

  useEffect(() => {
    setPlan(loadPlan());
  }, []);

  const harvestRecords = plan?.harvestRecords || [];
  const activityRecords = plan?.activityRecords || [];
  const entities = plan?.entities || {};
  const climateProfile = plan?.climateProfile;

  // === Stats ===
  const totalHarvests = harvestRecords.length;
  const totalActivities = activityRecords.length;

  const weightUnits = new Set(['kg', 'lb', 'g', '斤']);
  const totalWeight = useMemo(() => {
    let total = 0;
    for (const r of harvestRecords) {
      if (weightUnits.has(r.unit)) {
        let val = r.quantity;
        if ((r.unit as string) === 'g') val /= 1000;
        else if ((r.unit as string) === '斤') val /= 2;
        else if (r.unit === 'lb') val *= 0.4536;
        total += val;
      }
    }
    return Math.round(total * 100) / 100;
  }, [harvestRecords]);

  const totalCountItems = useMemo(() => {
    let count = 0;
    for (const r of harvestRecords) {
      if (r.unit === 'count' || r.unit === 'bunch' || (r.unit as string) === '棵') {
        count += r.quantity;
      }
    }
    return count;
  }, [harvestRecords]);

  const topCrops = useMemo(() => {
    const map: Record<string, { count: number; weight: number; unit: string }> = {};
    for (const r of harvestRecords) {
      if (!map[r.plantName]) map[r.plantName] = { count: 0, weight: 0, unit: r.unit };
      if (r.unit === 'count' || r.unit === 'bunch') map[r.plantName].count += r.quantity;
      else if (weightUnits.has(r.unit)) {
        let val = r.quantity;
        if ((r.unit as string) === 'g') val /= 1000;
        else if ((r.unit as string) === '斤') val /= 2;
        else if (r.unit === 'lb') val *= 0.4536;
        map[r.plantName].weight += val;
        map[r.plantName].unit = 'kg';
      }
    }
    return Object.entries(map)
      .map(([name, data]) => ({ name, count: data.count, weight: Math.round(data.weight * 100) / 100 }))
      .sort((a, b) => (b.weight || b.count) - (a.weight || a.count))
      .slice(0, 5);
  }, [harvestRecords]);

  const seasonStats = useMemo(() => {
    const map: Record<string, SeasonStats> = {};
    for (const r of harvestRecords) {
      const key = `${r.year} ${r.season}`;
      if (!map[key]) {
        map[key] = { seasonLabel: `${r.year} ${seasonLabel(r.season)}`, harvestCount: 0, totalQuantity: 0, plants: [] };
      }
      map[key].harvestCount++;
      let val = r.quantity;
      if (weightUnits.has(r.unit)) {
        if ((r.unit as string) === 'g') val /= 1000;
        else if ((r.unit as string) === '斤') val /= 2;
        else if (r.unit === 'lb') val *= 0.4536;
      }
      map[key].totalQuantity += val;
      if (!map[key].plants.includes(r.plantName)) map[key].plants.push(r.plantName);
    }
    return Object.values(map).sort((a, b) => b.harvestCount - a.harvestCount);
  }, [harvestRecords]);

  // Yield estimates
  const yieldEstimates = useMemo(() => {
    if (!climateProfile) return [];
    const result = estimateGardenTotalYield(entities, climateProfile);
    return result.results
      .filter(r => r.estimate.total)
      .map(r => ({
        plantName: r.plantName,
        gridCount: r.gridCount,
        totalEstimated: r.estimate.total!.amount,
        unit: r.estimate.total!.unit,
        confidence: r.estimate.confidence
      }));
  }, [entities, climateProfile]);

  // Yield vs actual comparison
  const yieldComparison = useMemo(() => {
    const actualMap: Record<string, { kg: number; count: number }> = {};
    for (const r of harvestRecords) {
      if (!actualMap[r.plantName]) actualMap[r.plantName] = { kg: 0, count: 0 };
      const unit = (r.unit as string);
      if (['kg', 'lb', 'g', '斤'].includes(unit)) {
        let val = r.quantity;
        if (unit === 'lb') val *= 0.4536;
        else if (unit === 'g') val /= 1000;
        else if (unit === '斤') val /= 2;
        actualMap[r.plantName].kg += val;
      } else {
        actualMap[r.plantName].count += r.quantity;
      }
    }
    return yieldEstimates
      .map(ye => {
        const actual = actualMap[ye.plantName];
        if (!actual) return null;
        const isWeightUnit = ['kg', 'lb', 'g', '斤'].includes(ye.unit as string);
        const estimatedNum = parseFloat(ye.totalEstimated);
        if (isNaN(estimatedNum)) return null;
        const actualNum = isWeightUnit ? actual.kg : actual.count;
        if (actualNum === 0) return null;
        const maxVal = Math.max(estimatedNum, actualNum);
        return {
          name: ye.plantName,
          estimated: estimatedNum.toFixed(1),
          actual: actualNum.toFixed(1),
          unit: isWeightUnit ? 'kg' : '个',
          ratio: actualNum / estimatedNum,
          estimatedPct: (estimatedNum / maxVal) * 100,
          actualPct: (actualNum / maxVal) * 100
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 10);
  }, [yieldEstimates, harvestRecords]);

  // Recent harvests
  const recentHarvests = useMemo(() => {
    return [...harvestRecords].slice(0, 20);
  }, [harvestRecords]);

  const [filterPlant, setFilterPlant] = useState('all');
  const plantOptions = useMemo(() => {
    const set = new Set(harvestRecords.map(r => r.plantName));
    return Array.from(set).sort();
  }, [harvestRecords]);

  const filteredHarvests = useMemo(() => {
    if (filterPlant === 'all') return recentHarvests;
    return recentHarvests.filter(r => r.plantName === filterPlant);
  }, [recentHarvests, filterPlant]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-green-50 via-green-50/80 to-amber-50/60">
      {/* Header */}
      <header className="flex items-center justify-between border-b-2 border-green-700/20 bg-white/80 px-4 py-3 backdrop-blur md:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/planner')}
            className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-amber-900/20 bg-white text-xs font-black text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.12)] hover:bg-amber-50"
            aria-label="返回规划器"
          >
            ←
          </button>
          <span className="text-xl">📊</span>
          <h1 className="text-lg font-black text-amber-950">收获统计</h1>
        </div>
        <div className="flex items-center gap-2">
          {plan && (
            <>
              <button
                type="button"
                onClick={() => exportHarvestCsv(plan)}
                className="rounded-md border-2 border-green-900/20 bg-green-50 px-2.5 py-1 text-xs font-black text-green-900 shadow-[0_2px_0_rgba(22,101,52,0.12)] hover:bg-green-100"
              >
                导出 Excel
              </button>
              <button
                type="button"
                onClick={() => exportPdf(plan)}
                className="rounded-md border-2 border-amber-900/20 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.12)] hover:bg-amber-100"
              >
                导出 PDF
              </button>
            </>
          )}
          <span className="text-[10px] font-bold text-amber-700">
            {plan?.name} · {plan?.year} {plan ? seasonLabel(plan.season) : ''}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-8">
        {!plan ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl">🧑‍🌾</div>
            <div className="mt-4 text-lg font-black text-amber-950">还没有开始规划</div>
            <div className="mt-1 text-sm font-bold text-amber-700">先去菜园里种点什么吧</div>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="mt-6 rounded-md border-2 border-green-900/15 bg-green-100 px-6 py-2 text-sm font-black text-green-900 shadow-[0_3px_0_rgba(22,101,52,0.14)] hover:bg-green-200"
            >
              去选作物开始种植
            </button>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border-2 border-amber-900/15 bg-white p-4 shadow-[0_3px_0_rgba(120,72,24,0.08)]">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">采收记录</div>
                <div className="mt-1 text-2xl font-black text-amber-950">{totalHarvests}</div>
                <div className="mt-0.5 text-[10px] font-bold text-amber-600">条记录</div>
              </div>
              <div className="rounded-xl border-2 border-amber-900/15 bg-white p-4 shadow-[0_3px_0_rgba(120,72,24,0.08)]">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">预估产量</div>
                <div className="mt-1 text-2xl font-black text-amber-950">{totalWeight > 0 ? `${totalWeight}` : '--'}</div>
                <div className="mt-0.5 text-[10px] font-bold text-amber-600">{totalWeight > 0 ? '千克' : '暂无称重记录'}</div>
              </div>
              <div className="rounded-xl border-2 border-amber-900/15 bg-white p-4 shadow-[0_3px_0_rgba(120,72,24,0.08)]">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">养护操作</div>
                <div className="mt-1 text-2xl font-black text-amber-950">{totalActivities}</div>
                <div className="mt-0.5 text-[10px] font-bold text-amber-600">条记录</div>
              </div>
              <div className="rounded-xl border-2 border-amber-900/15 bg-white p-4 shadow-[0_3px_0_rgba(120,72,24,0.08)]">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">种植作物</div>
                <div className="mt-1 text-2xl font-black text-amber-950">{Object.keys(entities).filter(k => entities[k].type === 'plant').length}</div>
                <div className="mt-0.5 text-[10px] font-bold text-amber-600">种</div>
              </div>
            </div>

            {/* Top Crops + Season Stats */}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {/* Top Crops */}
              <div className="rounded-xl border-2 border-amber-900/15 bg-white p-4 shadow-[0_3px_0_rgba(120,72,24,0.08)]">
                <div className="mb-3 text-[10px] font-black uppercase tracking-wider text-amber-700">高产作物 TOP5</div>
                {topCrops.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {topCrops.map((crop, i) => (
                      <div key={crop.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[9px] font-black text-amber-800">
                            {i + 1}
                          </span>
                          <span className="text-xs font-black text-amber-950">{crop.name}</span>
                        </div>
                        <div className="text-xs font-bold text-amber-700">
                          {crop.weight > 0 ? `${crop.weight} kg` : `${crop.count} 个/把`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4 text-center">
                    <div className="text-xs font-bold text-amber-600">还没有采收记录</div>
                    <div className="mt-1 text-[9px] font-bold text-amber-500">种下作物后，在这里查看收成排行</div>
                  </div>
                )}
              </div>

              {/* Season Stats */}
              <div className="rounded-xl border-2 border-amber-900/15 bg-white p-4 shadow-[0_3px_0_rgba(120,72,24,0.08)]">
                <div className="mb-3 text-[10px] font-black uppercase tracking-wider text-amber-700">季节分布</div>
                {seasonStats.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {seasonStats.map(s => (
                      <div key={s.seasonLabel} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-amber-950">{s.seasonLabel}</span>
                          <span className="text-[9px] font-bold text-amber-600">{s.plants.length} 种</span>
                        </div>
                        <div className="text-xs font-bold text-amber-700">
                          {s.harvestCount} 次
                          {s.totalQuantity > 0 ? ` · ${Math.round(s.totalQuantity * 10) / 10} kg` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                      <div className="flex flex-col items-center py-4 text-center">
                    <div className="text-xs font-bold text-amber-600">暂无季节数据</div>
                    <div className="mt-1 text-[9px] font-bold text-amber-500">记录采收和养护后，这里会按季节汇总</div>
                  </div>
                )}
              </div>
            </div>

            {/* Latest Activities */}
            {activityRecords.length > 0 && (
              <div className="mt-4 rounded-xl border-2 border-amber-900/15 bg-white p-4 shadow-[0_3px_0_rgba(120,72,24,0.08)]">
                <div className="mb-3 text-[10px] font-black uppercase tracking-wider text-amber-700">最近养护操作</div>
                <div className="flex flex-col gap-1">
                  {activityRecords.slice(0, 8).map(a => (
                    <div key={a.id} className="flex items-center justify-between rounded-md border border-amber-900/10 bg-amber-50/50 px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-amber-950">{a.taskLabel}</span>
                        <span className="text-[10px] font-bold text-amber-700">{a.plantName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-amber-600">{formatDate(a.completedAt)}</span>
                        {a.note && <span className="max-w-24 truncate text-[9px] text-amber-500">{a.note}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Yield Estimates */}
            {yieldEstimates.length > 0 && (
              <div className="mt-4 rounded-xl border-2 border-amber-900/15 bg-white p-4 shadow-[0_3px_0_rgba(120,72,24,0.08)]">
                <div className="mb-3 text-[10px] font-black uppercase tracking-wider text-amber-700">产量预估（当前种植）</div>
                <div className="flex flex-col gap-1">
                  {yieldEstimates.map((ye, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border border-amber-900/10 bg-amber-50/50 px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-amber-950">{ye.plantName}</span>
                        <span className="rounded-full border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-800">{ye.gridCount}\u683c</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-amber-950">{ye.totalEstimated} {ye.unit}</span>
                        <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-black ${
                          ye.confidence === 'reliable' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' :
                          ye.confidence === 'reference' ? 'border-amber-300 bg-amber-50 text-amber-800' :
                          'border-slate-300 bg-slate-50 text-slate-700'
                        }`}>
                          {ye.confidence === 'reliable' ? '可靠' : ye.confidence === 'reference' ? '参考' : '估算'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Harvest History */}
            <div className="mt-4 rounded-xl border-2 border-amber-900/15 bg-white shadow-[0_3px_0_rgba(120,72,24,0.08)]">
              <div className="flex items-center justify-between border-b-2 border-amber-900/10 px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">采收记录</div>
                <select
                  value={filterPlant}
                  onChange={(e) => setFilterPlant(e.target.value)}
                  className="no-print rounded-md border-2 border-amber-900/15 bg-white px-2 py-1 text-[10px] font-black text-amber-900 outline-none"
                >
                  <option value="all">全部作物</option>
                  {plantOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              {filteredHarvests.length > 0 ? (
                <div className="flex flex-col gap-px bg-amber-900/5">
                  {filteredHarvests.map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-white px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-amber-950">{r.plantName}</span>
                        <span className="rounded-full border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-800">
                          {r.quantity} {unitLabel(r.unit)}
                        </span>
                        {r.note && <span className="max-w-32 truncate text-[9px] text-amber-500">{r.note}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-amber-700">
                        <span>{r.season ? seasonLabel(r.season) : ''} {r.year}</span>
                        <span>{formatDate(r.harvestedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="text-3xl">🥕</div>
                  <div className="mt-1 text-xs font-bold text-amber-700">
                    {filterPlant === 'all' ? '作物成熟后，在规划页右侧面板点击「记录采收」即可记录' : `「${filterPlant}」暂无采收记录`}
                  </div>
                  {filterPlant === 'all' && (
                    <button
                      type="button"
                      onClick={() => router.push('/')}
                      className="mt-3 rounded-md border-2 border-green-900/15 bg-green-100 px-4 py-1.5 text-[10px] font-black text-green-900 shadow-[0_2px_0_rgba(22,101,52,0.12)] hover:bg-green-200"
                    >
                      去选作物开始种植
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="border-t-2 border-green-700/10 bg-white/50 px-4 py-3 text-center text-[10px] font-bold text-green-700">
        农夫计划器 · 收获统计
      </footer>
    </div>
  );
}

function seasonLabel(season: string) {
  const labels: Record<string, string> = {
    spring: '春季',
    summer: '夏季',
    fall: '秋季',
    winter: '冬季'
  };
  return labels[season] || season;
}

function unitLabel(unit: string) {
  const labels: Record<string, string> = {
    count: '个',
    bunch: '把',
    lb: '磅',
    kg: '千克',
    g: '克',
    '斤': '斤',
    '棵': '棵'
  };
  return labels[unit] || unit;
}

function formatDate(timestamp: number) {
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ==================== Export helpers ====================

function exportHarvestCsv(plan: GardenPlan) {
  const records = plan.harvestRecords || [];
  const headers = ['日期', '作物', '数量', '单位', '年份', '季节', '位置', '备注'];
  const rows = records.map(r => [
    new Date(r.harvestedAt).toLocaleDateString('zh-CN'),
    r.plantName,
    String(r.quantity),
    unitLabel(r.unit),
    String(r.year),
    seasonLabel(r.season),
    `${r.originX},${r.originY}`,
    r.note
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `harvest-${plan.name || 'garden'}-${plan.year}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportActivityCsv(plan: GardenPlan) {
  const records = plan.activityRecords || [];
  const headers = ['日期', '作物', '操作', '年份', '季节', '位置', '备注'];
  const rows = records.map(r => [
    new Date(r.completedAt).toLocaleDateString('zh-CN'),
    r.plantName,
    r.taskLabel,
    String(r.year),
    seasonLabel(r.season),
    `${r.originX},${r.originY}`,
    r.note
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `activity-${plan.name || 'garden'}-${plan.year}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportPdf(plan: GardenPlan | null) {
  window.print();
}
