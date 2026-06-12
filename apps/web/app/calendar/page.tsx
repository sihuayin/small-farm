'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { GardenPlan, PlantEntity as PlantEntityType } from '@/components/planner/types';
import { plants, plantMap } from '@/components/planner/plants';
import { getPlantGrowthStatus, getGardenTaskBoard } from '@/components/planner/growth';
import { generateWeatherSignals } from '@/components/planner/climate';
import { getPlantAgronomy } from '@/components/planner/plants';

const PLAN_STORAGE_KEY = 'small-farm:garden-plan:v1';
const DAY_MS = 24 * 60 * 60 * 1000;

function loadPlan(): GardenPlan | null {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function seasonLabel(season: string) {
  const labels: Record<string, string> = {
    spring: '春季', summer: '夏季', fall: '秋季', winter: '冬季'
  };
  return labels[season] || season;
}

function formatDate(timestamp: number) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 事件类型 */
type CalendarEventType =
  | 'sow' | 'transplant' | 'water' | 'fertilize' | 'inspect'
  | 'harvest' | 'cover' | 'drainage' | 'frost' | 'heat' | 'rain';

interface CalendarEvent {
  id: string;
  date: number; // timestamp 0:00
  type: CalendarEventType;
  label: string;
  detail: string;
  plantName: string;
  emoji: string;
  plantId: string;
  /** 关联的地块坐标 */
  gridX: number;
  gridY: number;
  /** 天气触发的事件 */
  isWeatherEvent: boolean;
}

export default function CalendarPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<GardenPlan | null>(null);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

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

  const entities = plan?.entities || {};
  const climateProfile = plan?.climateProfile;
  const planSeason = plan?.season || 'spring';
  const harvestRecords = plan?.harvestRecords || [];

  /** 生成所有日历事件 */
  const allEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = [];
    const nowMs = Date.now();

    // 1. 从种植实体生成计划事件
    Object.values(entities).forEach((entity: any) => {
      if (entity.type !== 'plant' || !entity.plantId) return;
      const agronomy = getPlantAgronomy(entity.plantId);
      const plant = entity.plant;
      const emoji = plant?.naming?.emoji || '🌱';
      const plantName = plant?.naming?.zh || entity.plantId;
      const plantId = entity.plantId;
      const createdAt = entity.createdAt || 0;
      const daysToMaturity = agronomy.daysToMaturity || 70;

      // 种植事件
      if (createdAt > 0) {
        events.push({
          id: `sow-${entity.id}`,
          date: floorDate(createdAt),
          type: 'sow',
          label: '种植',
          detail: `${plantName} 已种下`,
          plantName, emoji, plantId, gridX: entity.originX, gridY: entity.originY, isWeatherEvent: false,
        });
      }

      // 育苗事件（如果适合育苗）
      if (createdAt > 0 && agronomy.startMethod !== 'direct_sow' && agronomy.nurseryLeadDays) {
        const nurseryStart = createdAt - agronomy.nurseryLeadDays[1] * DAY_MS;
        events.push({
          id: `nursery-${entity.id}`,
          date: floorDate(nurseryStart),
          type: 'transplant',
          label: '育苗',
          detail: `${plantName} 建议提前 ${agronomy.nurseryLeadDays[0]}-${agronomy.nurseryLeadDays[1]} 天育苗，注意保温和保湿`,
          plantName, emoji, plantId, gridX: entity.originX, gridY: entity.originY, isWeatherEvent: false,
        });
      }

      // 预计收获事件
      if (createdAt > 0) {
        const harvestDate = createdAt + daysToMaturity * DAY_MS;
        events.push({
          id: `harvest-${entity.id}`,
          date: floorDate(harvestDate),
          type: 'harvest',
          label: '预计收获',
          detail: `${plantName} 预计在种植后 ${daysToMaturity} 天可收获`,
          plantName, emoji, plantId, gridX: entity.originX, gridY: entity.originY, isWeatherEvent: false,
        });
      }

      // 定期养护事件：浇水（中/高需水植物每 3-4 天）
      const waterInterval = agronomy.waterNeed === 'high' ? 3 : agronomy.waterNeed === 'medium' ? 4 : 6;
      for (let day = 1; day <= daysToMaturity; day += waterInterval) {
        const waterDate = createdAt + day * DAY_MS;
        if (waterDate > nowMs + 90 * DAY_MS) break;
        events.push({
          id: `water-${entity.id}-${day}`,
          date: floorDate(waterDate),
          type: 'water',
          label: '浇水',
          detail: `${plantName} 需水${agronomy.waterNeed === 'high' ? '较多' : agronomy.waterNeed === 'medium' ? '适中' : '较少'}，建议每 ${waterInterval} 天浇一次`,
          plantName, emoji, plantId, gridX: entity.originX, gridY: entity.originY, isWeatherEvent: false,
        });
      }

      // 巡检事件（每 7 天一次）
      for (let day = 7; day <= daysToMaturity; day += 14) {
        const inspectDate = createdAt + day * DAY_MS;
        if (inspectDate > nowMs + 90 * DAY_MS) break;
        events.push({
          id: `inspect-${entity.id}-${day}`,
          date: floorDate(inspectDate),
          type: 'inspect',
          label: '例行巡检',
          detail: `检查 ${plantName} 叶面状态、有无虫害或病害迹象`,
          plantName, emoji, plantId, gridX: entity.originX, gridY: entity.originY, isWeatherEvent: false,
        });
      }
    });

    // 2. 天气触发事件
    if (climateProfile) {
      const weatherSignals = generateWeatherSignals(climateProfile, planSeason);
      weatherSignals.forEach((signal, si) => {
        const signalDate = Date.now() + signal.startsInDays * DAY_MS;
        const type: CalendarEventType =
          signal.type === 'frost' ? 'frost' :
          signal.type === 'heat' ? 'heat' :
          signal.type === 'rain' ? 'rain' : 'cover';
        events.push({
          id: `weather-${signal.id}-${si}`,
          date: floorDate(signalDate),
          type,
          label: signal.label,
          detail: signal.detail,
          plantName: '全场', emoji: '🌤', plantId: '', gridX: -1, gridY: -1,
          isWeatherEvent: true,
        });
      });
    }

    // 3. 已完成的收获记录事件
    (harvestRecords || []).forEach(r => {
      events.push({
        id: `harvest-record-${r.id}`,
        date: floorDate(r.harvestedAt),
        type: 'harvest',
        label: '已收获',
        detail: `${r.plantName} · 收获 ${r.quantity} ${(r.unit as string) === 'count' ? '个' : (r.unit as string) === 'kg' ? '千克' : (r.unit as string) === 'g' ? '克' : (r.unit as string) === '斤' ? '斤' : (r.unit as string) === 'bunch' ? '把' : (r.unit as string) === '棵' ? '棵' : r.unit}${r.note ? ' · ' + r.note : ''}`,
        plantName: r.plantName, emoji: plants.find(p => p.id === r.plantId)?.naming?.emoji || '🥕',
        plantId: r.plantId, gridX: r.originX, gridY: r.originY, isWeatherEvent: false,
      });
    });

    return events;
  }, [entities, climateProfile, planSeason, harvestRecords]);

  // 过滤当前月份的 events
  const monthEvents = useMemo(() => {
    const monthStart = new Date(viewYear, viewMonth, 1).getTime();
    const monthEnd = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59).getTime();
    return allEvents.filter(e => e.date >= monthStart && e.date <= monthEnd);
  }, [allEvents, viewYear, viewMonth]);

  // 日历网格：按天分组
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    monthEvents.forEach(e => {
      const key = new Date(e.date).getDate().toString();
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [monthEvents]);

  // 计算当月日历第一天和总天数
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  // 月份切换
  const goPrev = useCallback(() => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }, [viewMonth]);
  const goNext = useCallback(() => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }, [viewMonth]);
  const goToday = useCallback(() => {
    const n = new Date();
    setViewYear(n.getFullYear());
    setViewMonth(n.getMonth());
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-green-50 via-green-50/80 to-amber-50/60">
      {/* 顶部导航 */}
      <header className="flex items-center justify-between border-b border-farm-100 bg-white/90 px-5 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌱</span>
          <h1 className="text-lg font-bold text-farm-green font-display">农夫计划器</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.push('/')}
            className="btn-farm-ghost text-sm">
            首页
          </button>
          <button type="button" onClick={() => router.push('/planner')}
            className="btn-farm-ghost text-sm">
            规划
          </button>
          <button type="button" onClick={() => router.push('/statistics')}
            className="btn-farm-ghost text-sm">
            统计
          </button>
        </div>
      </header>

      <main className="flex-1 px-5 py-5 md:px-8 md:py-8">
        {/* 日历头部 */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={goPrev}
              className="btn-farm-ghost">
              ←
            </button>
            <h2 className="text-xl font-bold text-farm-800 font-display">{viewYear} 年 {MONTH_NAMES[viewMonth]}</h2>
            <button type="button" onClick={goNext}
              className="btn-farm-ghost">
              →
            </button>
            <button type="button" onClick={goToday}
              className="btn-farm-secondary">
              今天
            </button>
          </div>
          <div className="text-xs text-farm-400">{allEvents.length} 个事件</div>
        </div>

        {/* 事件类型颜色图例 */}
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-500"></span> 浇水</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-600"></span> 种植/育苗</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500"></span> 收获</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-purple-500"></span> 巡检</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500"></span> 天气提醒</span>
        </div>

        {/* 月视图日历网格 */}
        <div className="card-farm">
          {/* 星期行 */}
          <div className="grid grid-cols-7 border-b border-farm-100">
            {WEEKDAYS.map(w => (
              <div key={w} className="px-2 py-2 text-center text-xs font-semibold text-farm-400">
                {w}
              </div>
            ))}
          </div>
          {/* 日期网格 */}
          <div className="grid grid-cols-7">
            {/* 空白占位 */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[90px] border-b border-r border-farm-100 bg-farm-50/40 px-2 py-1.5 md:min-h-[110px]" />
            ))}
            {/* 日期单元格 */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(viewYear, viewMonth, day);
              const isToday = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
              const dayEvents = eventsByDay[day] || [];

              return (
                <div key={day}
                  className={`min-h-[90px] border-b border-r border-farm-100 px-2 py-1.5 transition-colors md:min-h-[110px] ${isToday ? 'bg-farm-green-light' : 'hover:bg-farm-50'}`}>
                  {/* 日期号 */}
                  <div className={`mb-1 text-center text-[10px] font-black ${isToday ? 'rounded-full bg-farm-green text-white w-6 h-6 flex items-center justify-center mx-auto text-xs' : 'text-amber-800'}`}>
                    {day}
                  </div>
                  {/* 事件列表 */}
                  <div className="flex flex-col gap-0.5">
                    {dayEvents.slice(0, 3).map(e => (
                      <button key={e.id}
                        onClick={() => setSelectedEvent(e)}
                        className={`w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium leading-tight transition-colors hover:opacity-80
                          ${e.type === 'water' ? 'bg-blue-50 text-blue-700' :
                            e.type === 'sow' || e.type === 'transplant' ? 'bg-farm-green-light text-farm-green' :
                            e.type === 'harvest' ? 'bg-farm-100 text-farm-600' :
                            e.type === 'inspect' ? 'bg-purple-50 text-purple-700' :
                            'bg-tomato-light text-tomato'}`}>
                        {e.emoji} {e.label}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-center text-[10px] text-farm-400">
                        +{dayEvents.length - 3} 更多
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 当日事件摘要 */}
        <div className="mt-4 card-farm p-5">
          <div className="mb-2 text-xs font-semibold text-farm-400">
            📋 当月事件摘要 · {monthEvents.length} 项
          </div>
          <div className="flex flex-col gap-1">
            {(() => {
              const types: CalendarEventType[] = ['water', 'sow', 'transplant', 'harvest', 'inspect', 'frost', 'heat', 'rain', 'cover', 'drainage', 'fertilize'];
              const countByType: Record<string, number> = {};
              monthEvents.forEach(e => { countByType[e.type] = (countByType[e.type] || 0) + 1; });
              const labels: Record<string, string> = {
                water: '浇水', sow: '种植', transplant: '育苗/移栽', harvest: '收获',
                inspect: '巡检', frost: '防霜冻', heat: '防高温', rain: '防雨', cover: '覆盖', drainage: '排水', fertilize: '施肥'
              };
              return types.filter(t => countByType[t]).map(t => (
                <div key={t} className="flex items-center justify-between rounded-lg bg-farm-50 px-3.5 py-2">
                  <span className="text-xs text-farm-500">{labels[t] || t}</span>
                  <span className="text-xs font-semibold text-farm-800">{countByType[t]} 项</span>
                </div>
              ));
            })()}
          </div>
        </div>
      </main>

      {/* 事件详情弹窗 */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-farm-800/20 px-4 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
          <div className="w-full max-w-sm card-farm p-5" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedEvent.emoji}</span>
                <div>
                  <div className="text-base font-bold text-farm-800">{selectedEvent.label}</div>
                  <div className="text-xs text-farm-400">{selectedEvent.plantName}</div>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedEvent(null)}
                className="btn-farm-ghost text-xs">
                ✕
              </button>
            </div>
            <div className="mb-1 text-xs text-farm-400">日期：{formatDate(selectedEvent.date)}</div>
            {selectedEvent.gridX >= 0 && (
              <div className="mb-1 text-xs text-farm-400">
                地块：({selectedEvent.gridX}, {selectedEvent.gridY})
              </div>
            )}
            <div className="mb-4 rounded-lg bg-farm-50 px-3.5 py-2.5 text-xs leading-relaxed text-farm-700">
              {selectedEvent.detail}
            </div>
            <div className="flex gap-2">
              {selectedEvent.plantId && (
                <button type="button" onClick={() => { setSelectedEvent(null); router.push('/planner'); }}
                  className="btn-farm-secondary">
                  到规划页查看
                </button>
              )}
              <button type="button" onClick={() => setSelectedEvent(null)}
                className="btn-farm-ghost text-xs">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {!plan && (
        <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl">📅</div>
          <div className="mt-4 text-base text-farm-500">还没有花园规划</div>
          <div className="mt-1 text-sm text-farm-400">先在首页设置你的菜园并开始规划吧</div>
          <button type="button" onClick={() => router.push('/')}
            className="mt-4 btn-farm-primary">
            去设置菜园
          </button>
        </div>
      )}

      <footer className="border-t border-farm-100 bg-white/70 px-5 py-4 text-center text-xs text-farm-400">
        农夫计划器 · 任务日历
      </footer>
    </div>
  );
}

function floorDate(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
