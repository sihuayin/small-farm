'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
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
    const saved = loadPlan();
    if (!saved) {
      router.push('/');
      return;
    }
    setPlan(saved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 兜底：没有计划时转到首页
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = loadPlan();
    if (!saved) router.push('/');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 如果计划被其他页面删除了，也需要跳转
  useEffect(() => {
    if (plan === null) return;
    const raw = localStorage.getItem('small-farm:garden-plan:v1');
    if (!raw) { router.push('/'); }
  }, [plan, router]);

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
  // === 种植植物列表（带收获状态） ===
  const plantHarvestStatus = useMemo(() => {
    const plantEntities = Object.values(entities).filter((entity): entity is any => entity.type === 'plant');
    const harvestByEntityId: Record<string, { totalQuantity: number; unit: string; firstHarvestedAt?: number }> = {};
    for (const r of harvestRecords) {
      if (!harvestByEntityId[r.entityId]) {
        harvestByEntityId[r.entityId] = { totalQuantity: 0, unit: r.unit, firstHarvestedAt: r.harvestedAt };
      }
      harvestByEntityId[r.entityId].totalQuantity += r.quantity;
      if (!harvestByEntityId[r.entityId].firstHarvestedAt || r.harvestedAt < harvestByEntityId[r.entityId].firstHarvestedAt!) {
        harvestByEntityId[r.entityId].firstHarvestedAt = r.harvestedAt;
      }
    }

    return plantEntities.map(entity => {
      const agronomy = getPlantAgronomy(entity.plantId);
      const yieldEst = agronomy.yieldEstimate;
      const harvest = harvestByEntityId[entity.id];

      // 单株预测产量
      let predictedAmount = '';
      let predictedUnit = '';
      if (yieldEst) {
        const match = yieldEst.amount.match(/[\d.]+/);
        const baseVal = match ? parseFloat(match[0]) : 0;
        predictedAmount = yieldEst.amount;
        predictedUnit = yieldEst.unit;
      }

      const isHarvested = !!harvest;

      // 预计成熟时间
      const daysToMaturity = agronomy.daysToMaturity || 0;
      const createdAt = entity.createdAt || 0;
      const maturityMs = daysToMaturity * 24 * 60 * 60 * 1000;
      const estimatedHarvestAt = createdAt > 0 ? createdAt + maturityMs : 0;
      const firstHarvestedAt = harvest?.firstHarvestedAt || 0;

      return {
        entityId: entity.id,
        emoji: entity.plant?.naming?.emoji || '🌱',
        plantName: entity.plant?.naming?.zh || entity.plantId,
        plantId: entity.plantId,
        gridCount: entity.spanX * entity.spanY,
        isHarvested,
        createdAt,
        daysToMaturity,
        estimatedHarvestAt,
        firstHarvestedAt,
        actualQuantity: harvest ? harvest.totalQuantity : 0,
        actualUnit: harvest ? harvest.unit : (yieldEst?.unit || ''),
        predictedAmount,
        predictedUnit,
        hasPrediction: !!yieldEst,
      };
    }).sort((a, b) => {
      if (a.isHarvested !== b.isHarvested) return a.isHarvested ? 1 : -1;
      return a.plantName.localeCompare(b.plantName);
    });
  }, [entities, harvestRecords]);


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
  const [showExport, setShowExport] = useState(false);
  const [exportTab, setExportTab] = useState<'harvest' | 'planting' | 'layout'>('harvest');
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
                onClick={() => setShowExport(true)}
                className="rounded-md border-2 border-green-900/20 bg-green-50 px-2.5 py-1 text-xs font-black text-green-900 shadow-[0_2px_0_rgba(22,101,52,0.12)] hover:bg-green-100"
              >
                📥 导出
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

            {/* Plant List with Harvest Status */}
            {plantHarvestStatus.length > 0 && (
              <div className="mt-4 rounded-xl border-2 border-amber-900/15 bg-white p-4 shadow-[0_3px_0_rgba(120,72,24,0.08)]">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">种植植物</div>
                  <div className="text-[9px] font-bold text-amber-500">
                    {plantHarvestStatus.filter(p => p.isHarvested).length}/{plantHarvestStatus.length} 已收获
                  </div>
                </div>
                <div className="flex flex-col gap-px bg-amber-900/5">
                  {plantHarvestStatus.map(p => (
                    <div key={p.entityId} className="flex items-center justify-between bg-white px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base flex-shrink-0">{p.emoji}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-amber-950 truncate">{p.plantName}</div>
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-500">
                            <span>{p.gridCount} 格</span>
                            {p.daysToMaturity > 0 && (
                              <span>· {p.daysToMaturity} 天成熟</span>
                            )}
                          </div>
                          {/* 预计 / 实际收获时间 */}
                          {p.isHarvested && p.firstHarvestedAt > 0 ? (
                            <div className="text-[8px] font-bold text-green-700">
                              收获于 {formatDateFull(p.firstHarvestedAt)}
                            </div>
                          ) : !p.isHarvested && p.estimatedHarvestAt > 0 ? (
                            <div className="text-[8px] font-bold text-amber-600">
                              预计 {formatDateFull(p.estimatedHarvestAt)} 成熟
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {p.isHarvested ? (
                          <div className="rounded-md bg-green-100 px-2 py-1 text-right">
                            <div className="text-xs font-black text-green-800">
                              {p.actualQuantity} {p.actualUnit}
                            </div>
                            <div className="text-[8px] font-bold text-green-600">已收获</div>
                          </div>
                        ) : (
                          <div className="rounded-md bg-amber-100 px-2 py-1 text-right">
                            {p.hasPrediction ? (
                              <>
                                <div className="text-xs font-black text-amber-800">~{p.predictedAmount} {p.predictedUnit}</div>
                                <div className="text-[8px] font-bold text-amber-600">待收获</div>
                              </>
                            ) : (
                              <>
                                <div className="text-xs font-black text-amber-800">—</div>
                                <div className="text-[8px] font-bold text-amber-600">待收获</div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
      {/* 导出面板 */}
      {showExport && plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={() => setShowExport(false)}>
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border-2 border-amber-900/20 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* 面板头部 */}
            <div className="flex items-center justify-between border-b-2 border-amber-900/10 px-5 py-3">
              <div className="text-sm font-black text-amber-950">📥 导出数据</div>
              <button type="button" onClick={() => setShowExport(false)}
                className="rounded-md border border-amber-900/20 bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-700">
                ✕
              </button>
            </div>
            {/* 选项卡 */}
            <div className="flex gap-1 border-b-2 border-amber-900/10 px-5 py-2">
              <button type="button" onClick={() => setExportTab('harvest')}
                className={`rounded-md px-3 py-1.5 text-xs font-black transition-colors ${exportTab === 'harvest' ? 'bg-green-100 text-green-900' : 'text-amber-700 hover:bg-amber-50'}`}>
                📊 采收记录
              </button>
              <button type="button" onClick={() => setExportTab('planting')}
                className={`rounded-md px-3 py-1.5 text-xs font-black transition-colors ${exportTab === 'planting' ? 'bg-green-100 text-green-900' : 'text-amber-700 hover:bg-amber-50'}`}>
                🌱 种植清单
              </button>
              <button type="button" onClick={() => setExportTab('layout')}
                className={`rounded-md px-3 py-1.5 text-xs font-black transition-colors ${exportTab === 'layout' ? 'bg-green-100 text-green-900' : 'text-amber-700 hover:bg-amber-50'}`}>
                🗺 布局概览
              </button>
            </div>
            {/* 预览内容 */}
            <div className="flex-1 overflow-auto px-5 py-4">
              {exportTab === 'harvest' && (
                <div>
                  <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-amber-700">采收记录 · 共 {plan.harvestRecords?.length || 0} 条</div>
                  <div className="flex flex-col gap-px bg-amber-900/5 text-[10px]">
                    <div className="flex items-center bg-amber-100 px-3 py-1.5 font-black text-amber-900">
                      <span className="w-24">日期</span>
                      <span className="w-20">作物</span>
                      <span className="w-16">数量</span>
                      <span className="w-12">季节</span>
                      <span className="flex-1">备注</span>
                    </div>
                    {(plan.harvestRecords || []).slice(0, 50).map(r => (
                      <div key={r.id} className="flex items-center bg-white px-3 py-1.5 font-bold text-amber-800">
                        <span className="w-24">{new Date(r.harvestedAt).toLocaleDateString('zh-CN')}</span>
                        <span className="w-20">{r.plantName}</span>
                        <span className="w-16">{r.quantity} {unitLabel(r.unit)}</span>
                        <span className="w-12">{seasonLabel(r.season)}</span>
                        <span className="flex-1 truncate">{r.note || ''}</span>
                      </div>
                    ))}
                    {(plan.harvestRecords || []).length > 50 && (
                      <div className="px-3 py-1.5 text-[9px] font-bold text-amber-500">
                        ... 还有 {(plan.harvestRecords || []).length - 50} 条
                      </div>
                    )}
                  </div>
                </div>
              )}
              {exportTab === 'planting' && (
                <div>
                  <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-amber-700">当前种植 · {Object.values(plan.entities).filter((e: any) => e.type === 'plant').length} 株</div>
                  <div className="flex flex-col gap-px bg-amber-900/5 text-[10px]">
                    <div className="flex items-center bg-amber-100 px-3 py-1.5 font-black text-amber-900">
                      <span className="w-6">#</span>
                      <span className="w-16">植物</span>
                      <span className="w-8">格</span>
                      <span className="w-16">位置</span>
                      <span className="w-20">种植时间</span>
                      <span className="w-20">预计收获</span>
                      <span className="w-16">预测产量</span>
                      <span className="flex-1">状态</span>
                    </div>
                    {Object.values(plan.entities).filter((e: any) => e.type === 'plant').map((entity: any, i: number) => {
                      const ag = getPlantAgronomy(entity.plantId);
                      const daysToMat = ag.daysToMaturity || 0;
                      const harvestDate = entity.createdAt ? new Date(entity.createdAt + daysToMat * 86400000).toLocaleDateString('zh-CN') : '-';
                      const plantDate = entity.createdAt ? new Date(entity.createdAt).toLocaleDateString('zh-CN') : '-';
                      const est = ag.yieldEstimate;
                      const hasHarvest = (plan.harvestRecords || []).some((r: any) => r.entityId === entity.id);
                      const status = entity.harvestedAt ? '已采收' : hasHarvest ? '部分采收' : '生长中';
                      return (
                        <div key={entity.id} className="flex items-center bg-white px-3 py-1.5 font-bold text-amber-800">
                          <span className="w-6">{i + 1}</span>
                          <span className="w-16">{entity.plant?.naming?.zh || entity.plantId}</span>
                          <span className="w-8">{entity.spanX * entity.spanY}</span>
                          <span className="w-16">({entity.originX},{entity.originY})</span>
                          <span className="w-20">{plantDate}</span>
                          <span className="w-20">{harvestDate}</span>
                          <span className="w-16">{est ? est.amount + ' ' + est.unit : '-'}</span>
                          <span className="flex-1">{status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {exportTab === 'layout' && (
                <div className="text-center">
                  <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-amber-700">菜园布局 · {plan.width}x{plan.height} 格</div>
                  {/* 简化版网格布局 */}
                  <div className="inline-block rounded-lg border-2 border-amber-900/10 bg-amber-50/50 p-1">
                    {Array.from({ length: Math.min(plan.height, 16) }).map((_, row) => (
                      <div key={row} className="flex">
                        {Array.from({ length: Math.min(plan.width, 20) }).map((_, col) => {
                          const entity = Object.values(plan.entities).find((e: any) =>
                            e.originX === col && e.originY === row && e.type === 'plant'
                          );
                          const surface = Object.values(plan.entities).find((e: any) =>
                            e.originX === col && e.originY === row && e.type !== 'plant'
                          );
                          const bgColor = entity ? '#16a34a' : surface ? '#a16207' : '#fef3c7';
                          const char = (entity as any)?.plant?.naming?.emoji || (surface ? '▦' : '·');
                          return (
                            <div key={col}
                              className="flex h-6 w-6 items-center justify-center border border-amber-900/10 text-[10px]"
                              style={{ backgroundColor: bgColor }}>
                              {char}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    {(plan.height > 16 || plan.width > 20) && (
                      <div className="py-1 text-[9px] font-bold text-amber-500">
                        ... 菜园较大，仅显示前 {(plan.height > 16 ? 16 : plan.height)}x{(plan.width > 20 ? 20 : plan.width)} 格
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex justify-center gap-4 text-[9px] font-bold">
                    <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-600"></span> 植物</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-800"></span> 其他</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-100 border border-amber-900/20"></span> 空地</span>
                  </div>
                </div>
              )}
            </div>
            {/* 底部操作 */}
            <div className="flex items-center justify-end gap-2 border-t-2 border-amber-900/10 px-5 py-3">
              <button type="button" onClick={() => setShowExport(false)}
                className="rounded-md border-2 border-amber-900/20 bg-white px-3 py-1.5 text-xs font-black text-amber-900 hover:bg-amber-50">
                取消
              </button>
              <button type="button" onClick={() => {
                if (exportTab === 'harvest') exportHarvestCsv(plan);
                else if (exportTab === 'planting') exportPlantingCsv(plan);
                else exportPdf(plan);
                setShowExport(false);
              }}
                className="rounded-md border-2 border-green-700/30 bg-green-100 px-4 py-1.5 text-xs font-black text-green-900 shadow-[0_2px_0_rgba(22,101,52,0.12)] hover:bg-green-200">
                {exportTab === 'layout' ? '🖨 打印' : '📥 下载 CSV'}
              </button>
            </div>
          </div>
        </div>
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

function formatDateFull(timestamp: number) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
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

function exportPlantingCsv(plan: GardenPlan) {
  const entities = Object.values(plan.entities).filter((e: any) => e.type === 'plant');
  const headers = ['植物', '位置', '格数', '种植时间', '预计收获', '预测产量', '状态'];
  const rows = entities.map((entity: any) => {
    const ag = getPlantAgronomy(entity.plantId);
    const daysToMat = ag.daysToMaturity || 0;
    const harvestDate = entity.createdAt ? new Date(entity.createdAt + daysToMat * 86400000).toLocaleDateString('zh-CN') : '-';
    const plantDate = entity.createdAt ? new Date(entity.createdAt).toLocaleDateString('zh-CN') : '-';
    const est = ag.yieldEstimate;
    const hasHarvest = (plan.harvestRecords || []).some((r: any) => r.entityId === entity.id);
    const status = entity.harvestedAt ? '已采收' : hasHarvest ? '部分采收' : '生长中';
    return [
      entity.plant?.naming?.zh || entity.plantId,
      '(' + entity.originX + ',' + entity.originY + ')',
      String(entity.spanX * entity.spanY),
      plantDate,
      harvestDate,
      est ? est.amount + ' ' + est.unit : '-',
      status
    ];
  });
  const csv = [headers, ...rows]
    .map(row => row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'planting-' + (plan.name || 'garden') + '-' + plan.year + '.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportPdf(plan: GardenPlan | null) {
  window.print();
}
