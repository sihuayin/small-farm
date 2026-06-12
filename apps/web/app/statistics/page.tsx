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
    // 验证有实际内容
    const hasPlants = Object.values(saved.entities || {}).some((e: any) => e.type === 'plant');
    if (!hasPlants) {
      router.push('/');
      return;
    }
    setPlan(saved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 兜底检查：localStorage 是否被外部删除
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = loadPlan();
    if (!saved) router.push('/');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 监听 localStorage 变化
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
      <header className="flex items-center justify-between border-b border-farm-100 bg-white/90 px-5 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/planner')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-farm-200 bg-white text-sm text-farm-600 hover:bg-farm-50"
            aria-label="返回规划器"
          >
            ←
          </button>
          <span className="text-xl">📊</span>
          <h1 className="text-lg font-bold text-farm-800 font-display">收获统计</h1>
        </div>
        <div className="flex items-center gap-2">
          {plan && (
            <>
              <button
                type="button"
                onClick={() => setShowExport(true)}
                className="btn-farm-primary text-xs"
              >
                📥 导出
              </button>
            </>
          )}
          <span className="text-xs text-farm-400">
            {plan?.name} · {plan?.year} {plan ? seasonLabel(plan.season) : ''}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-6 md:px-8 md:py-8">
        {!plan ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl">🧑‍🌾</div>
            <div className="mt-4 text-lg font-bold text-farm-800 font-display">还没有开始规划</div>
            <div className="mt-1 text-sm text-farm-500">先去菜园里种点什么吧</div>
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
              <div className="card-farm p-5">
                <div className="text-xs font-semibold text-farm-500">采收记录</div>
                <div className="mt-1 text-2xl font-bold text-farm-800 font-display">{totalHarvests}</div>
                <div className="mt-0.5 text-xs text-farm-400">条记录</div>
              </div>
              <div className="card-farm p-5">
                <div className="text-xs font-semibold text-farm-500">预估产量</div>
                <div className="mt-1 text-2xl font-bold text-farm-800 font-display">{totalWeight > 0 ? `${totalWeight}` : '--'}</div>
                <div className="mt-0.5 text-xs text-farm-400">{totalWeight > 0 ? '千克' : '暂无称重记录'}</div>
              </div>
              <div className="card-farm p-5">
                <div className="text-xs font-semibold text-farm-500">养护操作</div>
                <div className="mt-1 text-2xl font-bold text-farm-800 font-display">{totalActivities}</div>
                <div className="mt-0.5 text-xs text-farm-400">条记录</div>
              </div>
              <div className="card-farm p-5">
                <div className="text-xs font-semibold text-farm-500">种植作物</div>
                <div className="mt-1 text-2xl font-bold text-farm-800 font-display">{Object.keys(entities).filter(k => entities[k].type === 'plant').length}</div>
                <div className="mt-0.5 text-xs text-farm-400">种</div>
              </div>
            </div>

            {/* Top Crops + Season Stats */}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {/* Top Crops */}
              <div className="card-farm p-5">
                <div className="mb-3 text-xs font-semibold text-farm-500">高产作物 TOP5</div>
                {topCrops.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {topCrops.map((crop, i) => (
                      <div key={crop.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[9px] font-black text-amber-800">
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium text-farm-800">{crop.name}</span>
                        </div>
                        <div className="text-xs text-farm-500">
                          {crop.weight > 0 ? `${crop.weight} kg` : `${crop.count} 个/把`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4 text-center">
                    <div className="text-xs font-bold text-amber-600">还没有采收记录</div>
                    <div className="mt-1 text-xs text-farm-400">种下作物后，在这里查看收成排行</div>
                  </div>
                )}
              </div>

              {/* Season Stats */}
              <div className="card-farm p-5">
                <div className="mb-3 text-xs font-semibold text-farm-500">季节分布</div>
                {seasonStats.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {seasonStats.map(s => (
                      <div key={s.seasonLabel} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-farm-800">{s.seasonLabel}</span>
                          <span className="text-xs text-farm-400">{s.plants.length} 种</span>
                        </div>
                        <div className="text-xs text-farm-500">
                          {s.harvestCount} 次
                          {s.totalQuantity > 0 ? ` · ${Math.round(s.totalQuantity * 10) / 10} kg` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                      <div className="flex flex-col items-center py-4 text-center">
                    <div className="text-xs font-bold text-amber-600">暂无季节数据</div>
                    <div className="mt-1 text-xs text-farm-400">记录采收和养护后，这里会按季节汇总</div>
                  </div>
                )}
              </div>
            </div>

            {/* Plant List with Harvest Status */}
            {plantHarvestStatus.length > 0 && (
              <div className="mt-4 card-farm p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-semibold text-farm-500">种植植物</div>
                  <div className="text-xs text-farm-400">
                    {plantHarvestStatus.filter(p => p.isHarvested).length}/{plantHarvestStatus.length} 已收获
                  </div>
                </div>
                <div className="flex flex-col gap-px bg-farm-100/30">
                  {plantHarvestStatus.map(p => (
                    <div key={p.entityId} className="flex items-center justify-between bg-white px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base flex-shrink-0">{p.emoji}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-farm-800 truncate">{p.plantName}</div>
                          <div className="flex items-center gap-1.5 text-xs text-farm-400">
                            <span>{p.gridCount} 格</span>
                            {p.daysToMaturity > 0 && (
                              <span>· {p.daysToMaturity} 天成熟</span>
                            )}
                          </div>
                          {/* 预计 / 实际收获时间 */}
                          {p.isHarvested && p.firstHarvestedAt > 0 ? (
                            <div className="text-xs text-farm-green/70">
                              收获于 {formatDateFull(p.firstHarvestedAt)}
                            </div>
                          ) : !p.isHarvested && p.estimatedHarvestAt > 0 ? (
                            <div className="text-xs text-farm-400">
                              预计 {formatDateFull(p.estimatedHarvestAt)} 成熟
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {p.isHarvested ? (
                          <div className="rounded-lg bg-farm-green-light px-2.5 py-1.5 text-right">
                            <div className="text-sm font-semibold text-farm-green">
                              {p.actualQuantity} {p.actualUnit}
                            </div>
                            <div className="text-xs text-farm-green/70">已收获</div>
                          </div>
                        ) : (
                          <div className="rounded-lg bg-farm-100 px-2.5 py-1.5 text-right">
                            {p.hasPrediction ? (
                              <>
                                <div className="text-sm font-semibold text-farm-600">~{p.predictedAmount} {p.predictedUnit}</div>
                                <div className="text-xs text-farm-400">待收获</div>
                              </>
                            ) : (
                              <>
                                <div className="text-sm font-semibold text-farm-600">—</div>
                                <div className="text-xs text-farm-400">待收获</div>
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
              <div className="mt-4 card-farm p-5">
                <div className="mb-3 text-xs font-semibold text-farm-500">最近养护操作</div>
                <div className="flex flex-col gap-1">
                  {activityRecords.slice(0, 8).map(a => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg bg-farm-50 px-3.5 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-farm-800">{a.taskLabel}</span>
                        <span className="text-xs text-farm-400">{a.plantName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-farm-400">{formatDate(a.completedAt)}</span>
                        {a.note && <span className="max-w-24 truncate text-xs text-farm-400">{a.note}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Yield Estimates */}
            {yieldEstimates.length > 0 && (
              <div className="mt-4 card-farm p-5">
                <div className="mb-3 text-xs font-semibold text-farm-500">产量预估（当前种植）</div>
                <div className="flex flex-col gap-1">
                  {yieldEstimates.map((ye, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-farm-50 px-3.5 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-farm-800">{ye.plantName}</span>
                        <span className="tag-farm bg-farm-100 text-farm-600 text-amber-800">{ye.gridCount}\u683c</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-farm-800">{ye.totalEstimated} {ye.unit}</span>
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
            <div className="mt-4 card-farm">
              <div className="flex items-center justify-between border-b border-farm-100 px-5 py-3">
                <div className="text-xs font-semibold text-farm-500">采收记录</div>
                <select
                  value={filterPlant}
                  onChange={(e) => setFilterPlant(e.target.value)}
                  className="no-print select-farm text-xs"
                >
                  <option value="all">全部作物</option>
                  {plantOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              {filteredHarvests.length > 0 ? (
                <div className="flex flex-col gap-px bg-farm-100/30">
                  {filteredHarvests.map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-white px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-farm-800">{r.plantName}</span>
                        <span className="tag-farm bg-farm-100 text-farm-600 text-amber-800">
                          {r.quantity} {unitLabel(r.unit)}
                        </span>
                        {r.note && <span className="max-w-32 truncate text-xs text-farm-400">{r.note}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-farm-400">
                        <span>{r.season ? seasonLabel(r.season) : ''} {r.year}</span>
                        <span>{formatDate(r.harvestedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="text-3xl">🥕</div>
                  <div className="mt-1 text-xs text-farm-500">
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
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col card-farm shadow-soft-xl" onClick={e => e.stopPropagation()}>
            {/* 面板头部 */}
            <div className="flex items-center justify-between border-b border-farm-100 px-5 py-3">
              <div className="text-base font-semibold text-farm-800 font-display">📥 导出数据</div>
              <button type="button" onClick={() => setShowExport(false)}
                className="btn-farm-ghost text-xs">
                ✕
              </button>
            </div>
            {/* 选项卡 */}
            <div className="flex gap-1 border-b-2 border-amber-900/10 px-5 py-2">
              <button type="button" onClick={() => setExportTab('harvest')}
                className={`btn-farm text-sm transition-colors ${exportTab === 'harvest' ? 'bg-farm-green-light text-farm-green' : 'text-farm-600 hover:bg-farm-50'}`}>
                📊 采收记录
              </button>
              <button type="button" onClick={() => setExportTab('planting')}
                className={`btn-farm text-sm transition-colors ${exportTab === 'planting' ? 'bg-farm-green-light text-farm-green' : 'text-farm-600 hover:bg-farm-50'}`}>
                🌱 种植清单
              </button>
              <button type="button" onClick={() => setExportTab('layout')}
                className={`btn-farm text-sm transition-colors ${exportTab === 'layout' ? 'bg-farm-green-light text-farm-green' : 'text-farm-600 hover:bg-farm-50'}`}>
                🗺 布局概览
              </button>
            </div>
            {/* 预览内容 */}
            <div className="flex-1 overflow-auto px-5 py-4">
              {exportTab === 'harvest' && (
                <div>
                  <div className="mb-2 text-xs font-semibold text-farm-500">采收记录 · 共 {plan.harvestRecords?.length || 0} 条</div>
                  <div className="flex flex-col gap-px bg-farm-100/30 text-[10px]">
                    <div className="flex items-center bg-farm-50 px-3 py-1.5 font-semibold text-farm-600 text-xs">
                      <span className="w-24">日期</span>
                      <span className="w-20">作物</span>
                      <span className="w-16">数量</span>
                      <span className="w-12">季节</span>
                      <span className="flex-1">备注</span>
                    </div>
                    {(plan.harvestRecords || []).slice(0, 50).map(r => (
                      <div key={r.id} className="flex items-center bg-white px-3 py-1.5 text-sm text-farm-700">
                        <span className="w-24">{new Date(r.harvestedAt).toLocaleDateString('zh-CN')}</span>
                        <span className="w-20">{r.plantName}</span>
                        <span className="w-16">{r.quantity} {unitLabel(r.unit)}</span>
                        <span className="w-12">{seasonLabel(r.season)}</span>
                        <span className="flex-1 truncate">{r.note || ''}</span>
                      </div>
                    ))}
                    {(plan.harvestRecords || []).length > 50 && (
                      <div className="px-3 py-1.5 text-xs text-farm-400">
                        ... 还有 {(plan.harvestRecords || []).length - 50} 条
                      </div>
                    )}
                  </div>
                </div>
              )}
              {exportTab === 'planting' && (
                <div>
                  <div className="mb-2 text-xs font-semibold text-farm-500">当前种植 · {Object.values(plan.entities).filter((e: any) => e.type === 'plant').length} 株</div>
                  <div className="flex flex-col gap-px bg-farm-100/30 text-[10px]">
                    <div className="flex items-center bg-farm-50 px-3 py-1.5 font-semibold text-farm-600 text-xs">
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
                        <div key={entity.id} className="flex items-center bg-white px-3 py-1.5 text-sm text-farm-700">
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
                  <div className="mb-2 text-xs font-semibold text-farm-500">菜园布局 · {plan.width}x{plan.height} 格</div>
                  {/* 简化版网格布局 */}
                  <div className="inline-block rounded-lg border border-farm-200 bg-farm-50 p-1">
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
                      <div className="py-1 text-xs text-farm-400">
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
            <div className="flex items-center justify-end gap-2 border-t border-farm-100 px-5 py-3">
              <button type="button" onClick={() => setShowExport(false)}
                className="btn-farm-ghost">
                取消
              </button>
              <button type="button" onClick={() => {
                if (exportTab === 'harvest') exportHarvestCsv(plan);
                else if (exportTab === 'planting') exportPlantingCsv(plan);
                else exportPdf(plan);
                setShowExport(false);
              }}
                className="btn-farm-primary">
                {exportTab === 'layout' ? '🖨 打印' : '📥 下载 CSV'}
              </button>
            </div>
          </div>
        </div>
      )}

      </main>

      <footer className="border-t border-farm-100 bg-white/70 px-5 py-4 text-center text-xs text-farm-400">
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
