import { getPlantAgronomy } from './plants';
import { getMockWeatherSignals } from './climate';
import type { ClimateProfile, GardenEntity, PlanSeason, WeatherSignal } from './types';

export interface GardenCalendarReminder {
  id: string;
  label: string;
  detail: string;
  tone: 'blue' | 'green' | 'amber';
}

export function getGardenCalendarReminders(
  entities: Record<string, GardenEntity>,
  climateProfile: ClimateProfile,
  planYear: number,
  planSeason: PlanSeason
): GardenCalendarReminder[] {
  const reminders: GardenCalendarReminder[] = [];
  const plantEntities = Object.values(entities).filter(entity => entity.type === 'plant');

  if (climateProfile.zipCode || climateProfile.hardinessZone) {
    reminders.push({
      id: 'zone',
      label: `Zone ${climateProfile.hardinessZone || '未设定'}`,
      detail: `${climateProfile.zipCode || '本地'} · 末霜 ${formatMonthDay(climateProfile.lastFrostDate)} · 初霜 ${formatMonthDay(climateProfile.firstFrostDate)}`,
      tone: 'green'
    });
  }

  const frostReminder = getSeasonFrostReminder(climateProfile, planYear, planSeason);
  if (frostReminder) reminders.push(frostReminder);

  reminders.push(...getMockWeatherSignals(climateProfile, planSeason).map(weatherSignalToReminder));

  const seasonalMismatch = plantEntities.find(entity => {
    const agronomy = getPlantAgronomy(entity.plantId);
    return !agronomy.seasons.includes(planSeason);
  });

  if (seasonalMismatch) {
    reminders.push({
      id: `season-${seasonalMismatch.id}`,
      label: '季节检查',
      detail: `${seasonalMismatch.plant.naming.zh} 不在推荐季节内，留意温度或考虑移到下一季。`,
      tone: 'amber'
    });
  }

  const highWaterPlant = plantEntities.find(entity => getPlantAgronomy(entity.plantId).waterNeed === 'high');
  if (highWaterPlant) {
    reminders.push({
      id: `water-${highWaterPlant.id}`,
      label: '水分提醒',
      detail: `${highWaterPlant.plant.naming.zh} 水分需求高，热天优先检查覆盖物和土壤湿度。`,
      tone: 'blue'
    });
  }

  return reminders.slice(0, 5);
}

function weatherSignalToReminder(signal: WeatherSignal): GardenCalendarReminder {
  return {
    id: signal.id,
    label: signal.label,
    detail: `${signal.startsInDays} 天后 · ${signal.detail}`,
    tone: signal.severity === 'warning' ? 'amber' : signal.type === 'rain' ? 'blue' : 'green'
  };
}

function getSeasonFrostReminder(
  climateProfile: ClimateProfile,
  planYear: number,
  planSeason: PlanSeason
): GardenCalendarReminder | null {
  if (planSeason === 'spring') {
    return {
      id: 'last-frost',
      label: '末霜窗口',
      detail: `${planYear}-${climateProfile.lastFrostDate} 前后安排移栽，霜前优先室内育苗。`,
      tone: 'blue'
    };
  }

  if (planSeason === 'fall') {
    return {
      id: 'first-frost',
      label: '初霜窗口',
      detail: `${planYear}-${climateProfile.firstFrostDate} 前完成敏感作物采收或覆盖保护。`,
      tone: 'amber'
    };
  }

  return null;
}

function formatMonthDay(value: string) {
  const [month, day] = value.split('-');
  return `${Number(month)}/${Number(day)}`;
}
