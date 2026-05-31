import { getPlantAgronomy } from './plants';
import type { Plant } from './plants.d';
import type { ClimateProfile, PlanSeason } from './types';

export type PlantingWindowStatus = 'in_window' | 'too_early' | 'late' | 'off_season' | 'harvest_risk';

export interface PlantingWindowResult {
  status: PlantingWindowStatus;
  label: string;
  detail: string;
  shortLabel: string;
  scoreDelta: number;
  windowStart: Date;
  windowEnd: Date;
  planDate: Date;
}

export function getPlantingWindowStatus(
  plant: Plant,
  climateProfile: ClimateProfile,
  planYear: number,
  planSeason: PlanSeason
): PlantingWindowResult {
  const agronomy = getPlantAgronomy(plant.id);
  const planDate = getPlanSeasonDate(planYear, planSeason);
  const lastFrostDate = parseMonthDayDate(planYear, climateProfile.lastFrostDate || '04-15');
  const firstFrostDate = parseMonthDayDate(planYear, climateProfile.firstFrostDate || '10-15');
  const windowStart = addDays(lastFrostDate, agronomy.sowingWindow.startOffsetDays);
  const windowEnd = addDays(lastFrostDate, agronomy.sowingWindow.endOffsetDays);
  const harvestDate = addDays(planDate, agronomy.daysToMaturity);
  const seasonNames = agronomy.seasons.map(seasonLabel).join('、');
  const windowText = `${formatMonthDay(windowStart)}-${formatMonthDay(windowEnd)}`;

  if (!agronomy.seasons.includes(planSeason)) {
    return {
      status: 'off_season',
      label: '非主季',
      shortLabel: '季节不优',
      detail: `更适合${seasonNames}，本地建议窗口约 ${windowText}。`,
      scoreDelta: -16,
      windowStart,
      windowEnd,
      planDate
    };
  }

  if (planDate < windowStart) {
    return {
      status: 'too_early',
      label: '等待窗口',
      shortLabel: '还偏早',
      detail: `建议约 ${formatMonthDay(windowStart)} 后开始，基于末霜 ${formatMonthDay(lastFrostDate)} 推算。`,
      scoreDelta: -8,
      windowStart,
      windowEnd,
      planDate
    };
  }

  if (planDate > windowEnd) {
    const frostRisk = harvestDate > firstFrostDate;
    return {
      status: frostRisk ? 'harvest_risk' : 'late',
      label: frostRisk ? '采收有霜冻风险' : '窗口偏晚',
      shortLabel: frostRisk ? '霜冻风险' : '偏晚',
      detail: frostRisk
        ? `按 ${agronomy.daysToMaturity} 天成熟估算，采收可能晚于初霜 ${formatMonthDay(firstFrostDate)}。`
        : `已过建议窗口 ${windowText}，仍可试种但确定性下降。`,
      scoreDelta: frostRisk ? -18 : -10,
      windowStart,
      windowEnd,
      planDate
    };
  }

  return {
    status: 'in_window',
    label: '当前适合',
    shortLabel: '适合种',
    detail: `当前在建议窗口 ${windowText} 内，基于 Zone ${climateProfile.hardinessZone || '未设定'} 与末霜日推算。`,
    scoreDelta: 10,
    windowStart,
    windowEnd,
    planDate
  };
}

export function plantingWindowBadgeClassName(status: PlantingWindowStatus) {
  if (status === 'in_window') return 'border-green-300 bg-green-100 text-green-800';
  if (status === 'too_early') return 'border-sky-300 bg-sky-100 text-sky-800';
  if (status === 'late' || status === 'harvest_risk') return 'border-amber-300 bg-amber-100 text-amber-800';
  return 'border-slate-300 bg-slate-100 text-slate-700';
}

function getPlanSeasonDate(year: number, season: PlanSeason) {
  const seasonMonthDay: Record<PlanSeason, string> = {
    spring: '04-15',
    summer: '07-01',
    fall: '09-15',
    winter: '01-15'
  };
  return parseMonthDayDate(year, seasonMonthDay[season]);
}

function parseMonthDayDate(year: number, monthDay: string) {
  const [month = '1', day = '1'] = monthDay.split('-');
  return new Date(year, Number(month) - 1, Number(day));
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatMonthDay(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function seasonLabel(season: PlanSeason) {
  const labels: Record<PlanSeason, string> = {
    spring: '春季',
    summer: '夏季',
    fall: '秋季',
    winter: '冬季'
  };
  return labels[season];
}
