'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { plants, getPlantAgronomy, getPlantRegionalNotes } from '@/components/planner/plants';
import { inferChinaClimateProfile } from '@/components/planner/climate';
import type { ClimateProfile } from '@/components/planner/types';
import type { Plant } from '@/components/planner/plants.d';

// 月份中文名
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

// 定义区域预设城市（供下拉框使用）
const CITY_PRESETS = {
  '华东': ['上海', '南京', '杭州', '宁波', '苏州', '合肥', '南昌'],
  '华南': ['广州', '深圳', '东莞', '佛山', '南宁', '海口', '福州', '厦门'],
  '华北': ['北京', '天津', '石家庄', '太原', '济南', '青岛', '郑州'],
  '华中': ['武汉', '长沙', '郑州'],
  '西南': ['成都', '重庆', '贵阳', '昆明', '拉萨'],
  '西北': ['西安', '兰州', '乌鲁木齐', '银川', '西宁'],
  '东北': ['沈阳', '大连', '哈尔滨', '长春'],
};
const ALL_CITIES = Array.from(new Set(Object.values(CITY_PRESETS).flat()));
const ALL_PROVINCES = ['北京','天津','上海','重庆','河北','山西','辽宁','吉林','黑龙江','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆','内蒙古'];

// 获取与 plantId 的伴生/相克植物中文名
function getCompanionNames(plant: Plant): string[] {
  return plant.relationships.companions
    .map(id => plants.find(p => p.id === id))
    .filter((p): p is Plant => !!p)
    .map(p => p.naming.zh);
}
function getEnemyNames(plant: Plant): string[] {
  return plant.relationships.enemies
    .map(id => plants.find(p => p.id === id))
    .filter((p): p is Plant => !!p)
    .map(p => p.naming.zh);
}

// 根据月份映射季节
function monthToSeason(m: number): string {
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'fall';
  return 'winter';
}

// 根据季节 + 城市获取推荐作物（按相关性排序）
function getRecommendedPlants(city: string, month: number): Plant[] {
  const season = monthToSeason(month) as any;
  
  // 先按季节过滤
  const seasonPlants = plants.filter(p => {
    const a = getPlantAgronomy(p.id);
    return a.seasons.includes(season);
  });
  
  // 按地区优先级排序
  const scored = seasonPlants.map(p => {
    const a = getPlantAgronomy(p.id);
    const notes = getPlantRegionalNotes(p.id, { city, climateBand: '', climateLabel: '' } as any, season as any);
    const regionBonus = notes.length > 0 ? 10 : 0;
    const hasYield = a.yieldEstimate ? 5 : 0;
    return { plant: p, score: regionBonus + hasYield };
  });
  
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.plant);
}

// 在已选列表中计算关联关系
function computeRelation(selected: Plant[]) {
  const greenIds = new Set<string>();
  const redIds = new Set<string>();
  
  for (const plant of selected) {
    for (const companionId of plant.relationships.companions) {
      if (selected.some(p => p.id === companionId)) {
        greenIds.add(plant.id);
        greenIds.add(companionId);
      }
    }
    for (const enemyId of plant.relationships.enemies) {
      if (selected.some(p => p.id === enemyId)) {
        redIds.add(plant.id);
        redIds.add(enemyId);
      }
    }
  }
  
  return { greenIds, redIds };
}

export default function WelcomePage() {
  const router = useRouter();
  const now = new Date();
  const [step, setStep] = useState<'setup' | 'select'>('setup');
  const [province, setProvince] = useState('浙江');
  const [city, setCity] = useState('杭州');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [gridWidth, setGridWidth] = useState(12);
  const [gridHeight, setGridHeight] = useState(12);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isNavigating, setIsNavigating] = useState(false);
  const [climateWarning, setClimateWarning] = useState<{ plantId: string; reasons: string[] } | null>(null);
  const [searchText, setSearchText] = useState('');

  const recommended = useMemo(() => getRecommendedPlants(city, month), [city, month]);
  const { greenIds, redIds } = useMemo(() => {
    const selectedPlants = plants.filter(p => selectedIds.has(p.id));
    return computeRelation(selectedPlants);
  }, [selectedIds]);

  // 从省份+城市推断气候画像
  const climateProfile = useMemo(() => {
    const result = inferChinaClimateProfile(province, city);
    return result?.profile || null;
  }, [province, city]);

  const filteredRecommended = useMemo(() => {
    if (!searchText.trim()) return recommended;
    const q = searchText.trim().toLowerCase();
    return recommended.filter(p => 
      p.naming.zh.includes(q) || p.naming.en.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    );
  }, [recommended, searchText]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
      setSelectedIds(next);
      return;
    }
    // 检查气候适合性（只在添加时检查）
    if (climateProfile) {
      const agronomy = getPlantAgronomy(id);
      const reasons: string[] = [];
      const zoneNumber = Number.parseInt(climateProfile.hardinessZone, 10);
      if (Number.isFinite(zoneNumber)) {
        const [minZone, maxZone] = agronomy.hardinessZones;
        if (zoneNumber < minZone) {
          reasons.push(`\u5f53\u524d\u5730\u533a\u8010\u5bd2\u533a ${climateProfile.hardinessZone}\uff0c${plants.find(p => p.id === id)?.naming.zh || id}\u66f4\u9002\u5408 ${minZone}-${maxZone} \u533a`);
        }
      }
      // 如果季节不匹配（非主季）
      if (!agronomy.seasons.includes(monthToSeason(month) as any)) {
        const seasonName = monthToSeason(month) as any;
        const seasonLabels: Record<string, string> = { spring: '\u6625\u5b63', summer: '\u590f\u5b63', fall: '\u79cb\u5b63', winter: '\u51ac\u5b63' };
        reasons.push(`\u5f53\u524d\u662f${seasonLabels[seasonName]}\uff0c\u4f46${plants.find(p => p.id === id)?.naming.zh || id}\u66f4\u9002\u5408${agronomy.seasons.map((s: string) => seasonLabels[s] || s).join('\u3001')}`);
      }
      if (reasons.length > 0) {
        setClimateWarning({ plantId: id, reasons });
        return; // 等待用户确认
      }
    }
    next.add(id);
    setSelectedIds(next);
  };

  const confirmClimateAdd = useCallback(() => {
    if (!climateWarning) return;
    const next = new Set(selectedIds);
    next.add(climateWarning.plantId);
    setSelectedIds(next);
    setClimateWarning(null);
  }, [climateWarning, selectedIds]);

  const cancelClimateAdd = useCallback(() => {
    setClimateWarning(null);
  }, []);

  const handleStartPlanner = useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    const params = new URLSearchParams();
    params.set('province', province);
    params.set('city', city);
    params.set('month', String(month));
    params.set('width', String(gridWidth));
    params.set('height', String(gridHeight));
    params.set('plants', Array.from(selectedIds).join(','));
    window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/planner?${params.toString()}`;
  }, [isNavigating, province, city, month, gridWidth, gridHeight, selectedIds]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-green-50 via-green-50/80 to-amber-50/60">
      {/* 顶部 */}
      <header className="flex items-center justify-between border-b-2 border-green-700/20 bg-white/80 px-4 py-3 backdrop-blur md:px-8">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌱</span>
          <h1 className="text-lg font-black text-green-900">农夫计划器</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/statistics')}
            className="rounded-md border-2 border-amber-900/20 bg-white px-2.5 py-1 text-xs font-black text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.12)] hover:bg-amber-50"
          >
            📊 统计
          </button>
          <span className="rounded-full border border-green-300 bg-green-50 px-3 py-1 text-xs font-black text-green-800">
            Alpha
          </span>
        </div>
      </header>

      {/* 主体 */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 md:px-8 md:py-10">
        {step === 'setup' && (
          <div className="flex flex-col gap-6">
            {/* 标题区 */}
            <div className="text-center">
              <h2 className="text-2xl font-black text-green-900 md:text-3xl">规划你的菜园</h2>
              <p className="mt-1 text-sm font-bold text-green-700">先告诉我你种在哪、什么时候种，我会帮你推荐适合的作物。</p>
            </div>

            {/* 参数卡片 */}
            <div className="rounded-xl border-2 border-amber-900/15 bg-white shadow-[0_4px_0_rgba(120,72,24,0.12)]">
              <div className="border-b-2 border-amber-900/10 bg-[#fff8df] px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">菜园设置</div>
              </div>
              <div className="grid gap-4 p-4 md:grid-cols-2">
                {/* 省份 */}
                <label className="text-xs font-bold text-amber-800">
                  省份
                  <select
                    value={province}
                    onChange={e => setProvince(e.target.value)}
                    className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-3 py-2 text-sm font-bold text-amber-950 shadow-inner"
                  >
                    {ALL_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>

                {/* 城市 */}
                <label className="text-xs font-bold text-amber-800">
                  城市
                  <select
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-3 py-2 text-sm font-bold text-amber-950 shadow-inner"
                  >
                    {ALL_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>

                {/* 月份 */}
                <label className="text-xs font-bold text-amber-800">
                  预计种植月份
                  <select
                    value={month}
                    onChange={e => setMonth(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-3 py-2 text-sm font-bold text-amber-950 shadow-inner"
                  >
                    {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                </label>

                {/* 地块尺寸 */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-bold text-amber-800">
                    宽（格）
                    <input type="number" min={4} max={64} value={gridWidth}
                      onChange={e => setGridWidth(Math.max(4, Math.min(64, Number(e.target.value))))}
                      className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-3 py-2 text-sm font-bold text-amber-950 shadow-inner" />
                  </label>
                  <label className="text-xs font-bold text-amber-800">
                    长（格）
                    <input type="number" min={4} max={64} value={gridHeight}
                      onChange={e => setGridHeight(Math.max(4, Math.min(64, Number(e.target.value))))}
                      className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-3 py-2 text-sm font-bold text-amber-950 shadow-inner" />
                  </label>
                </div>
                <div className="rounded-md bg-green-50 px-3 py-2 text-[10px] font-bold leading-4 text-green-800">
                  每格约 0.3x0.3 米 · 菜园约 {(gridWidth * 0.3).toFixed(1)}x{(gridHeight * 0.3).toFixed(1)} 米（{(gridWidth * gridHeight * 0.09).toFixed(1)} m²）
                </div>
              </div>

              <div className="border-t-2 border-amber-900/10 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="w-full rounded-md border-2 border-green-700 bg-green-600 px-4 py-2.5 text-sm font-black text-white shadow-[0_3px_0_rgba(22,101,52,0.4)] hover:bg-green-700 active:translate-y-0.5"
                >
                  选择作物
                </button>
              </div>
            </div>

            {/* 快速入口 */}
            <div className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-green-300 bg-green-50/50 p-4">
              <div className="text-xs font-black uppercase tracking-wider text-green-800">不想选？可以直接开始</div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/planner?demo=true')}
                  className="rounded-md border-2 border-amber-900/20 bg-white px-4 py-2 text-xs font-black text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.12)] hover:bg-amber-50"
                >
                  3 分钟体验 Demo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p = new URLSearchParams();
                    p.set('province', province);
                    p.set('city', city);
                    p.set('month', String(month));
                    p.set('width', String(gridWidth));
                    p.set('height', String(gridHeight));
                    router.push(`/planner?${p.toString()}`);
                  }}
                  className="rounded-md border-2 border-green-700/30 bg-green-100 px-4 py-2 text-xs font-black text-green-900 shadow-[0_2px_0_rgba(22,101,52,0.12)] hover:bg-green-200"
                >
                  跳过选择，直接进规划
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'select' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <button type="button" onClick={() => setStep('setup')}
                  className="rounded-md border-2 border-amber-900/20 bg-white px-3 py-1.5 text-xs font-black text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.12)] hover:bg-amber-50">
                  ← 返回设置
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-green-300 bg-green-50 px-2 py-1 text-[10px] font-black text-green-800">
                  {selectedIds.size} 种已选
                </span>
                <button
                  type="button"
                  onClick={handleStartPlanner}
                  disabled={selectedIds.size === 0 || isNavigating}
                  className="inline-flex items-center gap-1.5 rounded-md border-2 border-green-700 bg-green-600 px-4 py-1.5 text-xs font-black text-white shadow-[0_3px_0_rgba(22,101,52,0.4)] hover:bg-green-700 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                >
                  {isNavigating ? (
                    <>
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      进入规划中...
                    </>
                  ) : (
                    '开始规划'
                  )}
                </button>
              </div>
            </div>

            {/* 地区+月份提示 */}
            <div className="rounded-md border-2 border-amber-900/10 bg-[#fff8df] px-3 py-2 text-xs font-bold text-amber-800">
              {city} · {MONTHS[month - 1]} · 地块 {gridWidth}x{gridHeight} 格
            </div>

            {/* 搜索 */}
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="搜索作物..."
              className="w-full rounded-md border-2 border-amber-900/20 bg-white px-3 py-2 text-sm font-bold text-amber-950 shadow-inner placeholder:text-amber-400"
            />

            <div className="grid gap-3 md:grid-cols-2">
              {/* 已选作物 */}
              {selectedIds.size > 0 && (
                <div className="rounded-xl border-2 border-emerald-900/15 bg-white p-3 shadow-[0_3px_0_rgba(6,95,70,0.1)]">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">已选作物</div>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="rounded-md border border-red-300 bg-red-50 px-2 py-0.5 text-[9px] font-black text-red-800 hover:bg-red-100"
                    >
                      清空
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(selectedIds).map(id => {
                      const plant = plants.find(p => p.id === id);
                      if (!plant) return null;
                      const isGreen = greenIds.has(id);
                      const isRed = redIds.has(id);
                      const companions = getCompanionNames(plant).filter(n => Array.from(selectedIds).some(sid => {
                        const sp = plants.find(p => p.id === sid);
                        return sp && sp.naming.zh === n;
                      }));
                      const enemies = getEnemyNames(plant).filter(n => Array.from(selectedIds).some(sid => {
                        const sp = plants.find(p => p.id === sid);
                        return sp && sp.naming.zh === n;
                      }));
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleSelect(id)}
                          className={`rounded-md border-2 px-2.5 py-1.5 text-xs font-black shadow-[0_2px_0_rgba(0,0,0,0.08)] transition ${
                            isRed
                              ? 'border-red-400 bg-red-50 text-red-800 shadow-red-200'
                              : isGreen
                                ? 'border-emerald-400 bg-emerald-50 text-emerald-800 shadow-emerald-200'
                                : 'border-amber-900/15 bg-amber-50/60 text-amber-900'
                          }`}
                          title={[companions.length > 0 ? `增益: ${companions.join('、')}` : '', enemies.length > 0 ? `冲突: ${enemies.join('、')}` : ''].filter(Boolean).join(' / ')}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{plant.naming.emoji}</span>
                            <span>{plant.naming.zh}</span>
                            {isGreen && <span className="text-[9px]">✓</span>}
                            {isRed && <span className="text-[9px]">✗</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {/* 关联提示汇总 */}
                  {Array.from(selectedIds).some(id => greenIds.has(id)) && (
                    <div className="mt-2 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[9px] font-bold leading-4 text-emerald-800">
                      ✓ 绿色标记：这些作物种在一起有增益
                    </div>
                  )}
                  {Array.from(selectedIds).some(id => redIds.has(id)) && (
                    <div className="mt-1 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-[9px] font-bold leading-4 text-red-800">
                      ✗ 红色标记：这些作物存在冲突，不建议挨着种
                    </div>
                  )}
                </div>
              )}

              {/* 可选作物列表 */}
              <div className={`rounded-xl border-2 border-amber-900/15 bg-white shadow-[0_3px_0_rgba(120,72,24,0.08)] ${selectedIds.size > 0 ? '' : 'md:col-span-2'}`}>
                <div className="border-b-2 border-amber-900/10 bg-[#fff8df] px-3 py-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                    推荐作物 · {MONTHS[month-1]} · {city}
                  </div>
                  <div className="text-[9px] font-bold text-amber-700">{filteredRecommended.length} 种适合本季</div>
                </div>
                <div className="flex max-h-80 flex-col gap-0.5 overflow-y-auto p-2 md:max-h-96">
                  {filteredRecommended.map(plant => {
                    const isSelected = selectedIds.has(plant.id);
                    const agronomy = getPlantAgronomy(plant.id);
                    return (
                      <button
                        key={plant.id}
                        type="button"
                        onClick={() => toggleSelect(plant.id)}
                        className={`flex items-center justify-between rounded-md border-2 px-3 py-2 text-left transition ${
                          isSelected
                            ? 'border-green-400 bg-green-50'
                            : 'border-transparent bg-white/50 hover:border-amber-300 hover:bg-amber-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{plant.naming.emoji}</span>
                          <div>
                            <div className="text-xs font-black text-amber-950">{plant.naming.zh}</div>
                            <div className="text-[9px] font-bold text-amber-600">
                              {agronomy.daysToMaturity} 天 · {agronomy.waterNeed === 'low' ? '低需水' : agronomy.waterNeed === 'high' ? '高需水' : '中等需水'} · {agronomy.startMethod === 'direct_sow' ? '直播' : agronomy.startMethod === 'transplant' ? '移栽' : '直播/移栽'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isSelected && <span className="text-xs font-black text-green-700">已选</span>}
                          {!isSelected && (
                            <span className="rounded-md border border-green-300 bg-green-50 px-2 py-0.5 text-[9px] font-black text-green-700">
                              加入
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {filteredRecommended.length === 0 && (
                    <div className="py-6 text-center text-xs font-bold text-amber-600">
                      没有匹配的作物，试试其他搜索词
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 底部提示 */}
            <div className="rounded-md border border-dashed border-amber-300 bg-amber-50/50 px-3 py-2 text-[10px] font-bold leading-4 text-amber-700">
              进入规划后仍可调整作物和地块尺寸。已选作物会自动导入到你的菜园方案中。
            </div>

            {/* 气候不适合弹层 */}
            {climateWarning && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/28 px-4 backdrop-blur-[2px]">
                <div className="w-full max-w-sm rounded-lg border-2 border-amber-950/20 bg-[#fff8df] p-4 text-sm shadow-[0_8px_0_rgba(120,72,24,0.16),0_24px_44px_rgba(61,40,20,0.28)]">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">气候适应性提示</div>
                  <div className="mt-2 text-lg font-black text-amber-950">
                    {plants.find(p => p.id === climateWarning.plantId)?.naming.emoji}{' '}
                    {plants.find(p => p.id === climateWarning.plantId)?.naming.zh}
                  </div>
                  <div className="mt-2 space-y-1">
                    {climateWarning.reasons.map((reason, i) => (
                      <div key={i} className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] font-bold leading-4 text-amber-900">
                        {reason}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-[10px] font-bold leading-4 text-amber-700">
                    以上因素可能影响种植效果。你可以忽略提示继续添加，系统在规划页中会给出更详细的适应性评分。
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelClimateAdd}
                      className="rounded-md border-2 border-amber-900/15 bg-white px-3 py-1.5 text-xs font-black text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.12)] hover:bg-amber-50"
                    >
                      不加了
                    </button>
                    <button
                      type="button"
                      onClick={confirmClimateAdd}
                      className="rounded-md border-2 border-green-900/15 bg-green-100 px-3 py-1.5 text-xs font-black text-green-900 shadow-[0_2px_0_rgba(22,101,52,0.12)] hover:bg-green-200"
                    >
                      仍然添加
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 页脚 */}
      <footer className="border-t-2 border-green-700/10 bg-white/50 px-4 py-3 text-center text-[10px] font-bold text-green-700">
        农夫计划器 · 给后院农夫的数字菜园规划工具
      </footer>
    </div>
  );
}
