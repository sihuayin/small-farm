import { getPlantAgronomy } from './plants';
import { getMockWeatherSignals } from './climate';
import { getPlantGrowthStatus } from './growth';
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
  const locationLabel = climateProfile.city
    ? `${climateProfile.province || ''}${climateProfile.city}${climateProfile.district ? ` · ${climateProfile.district}` : ''}`
    : climateProfile.zipCode || '本地';
  const climateLabel = climateProfile.climateLabel || climateProfile.hardinessZone || '未设定';

  if (climateProfile.city || climateProfile.province || climateProfile.zipCode || climateProfile.hardinessZone) {
    reminders.push({
      id: 'climate',
      label: climateProfile.city ? `${climateLabel}种植节奏` : `本地气候 ${climateLabel}`,
      detail: `${locationLabel} · 平均末霜 ${formatMonthDay(climateProfile.lastFrostDate)} · 平均初霜 ${formatMonthDay(climateProfile.firstFrostDate)} · ${regionalClimateRhythm(climateProfile, planSeason)}`,
      tone: 'green'
    });
  }

  const frostReminder = getSeasonFrostReminder(climateProfile, planYear, planSeason);
  if (frostReminder) reminders.push(frostReminder);

  reminders.push(...getMockWeatherSignals(climateProfile, planSeason).map(weatherSignalToReminder));
  reminders.push(...getSeasonPrepReminders(plantEntities, climateProfile, planSeason));

  const seasonalMismatch = plantEntities.find(entity => {
    const agronomy = getPlantAgronomy(entity.plantId);
    return !agronomy.seasons.includes(planSeason);
  });

  if (seasonalMismatch) {
    reminders.push({
      id: `season-${seasonalMismatch.id}`,
      label: '季节检查',
      detail: `${seasonalMismatch.plant.naming.zh} 当前不在主推荐季，${regionalSeasonCheck(climateProfile, planSeason)}`,
      tone: 'amber'
    });
  }

  const highWaterPlant = plantEntities.find(entity => getPlantAgronomy(entity.plantId).waterNeed === 'high');
  if (highWaterPlant) {
    reminders.push({
      id: `water-${highWaterPlant.id}`,
      label: '水分提醒',
      detail: `${highWaterPlant.plant.naming.zh} 需水偏高，${regionalWaterReminder(climateProfile, planSeason)}`,
      tone: 'blue'
    });
  }

  return reminders.slice(0, 5);
}

function getSeasonPrepReminders(
  plantEntities: Array<Extract<GardenEntity, { type: 'plant' }>>,
  climateProfile: ClimateProfile,
  planSeason: PlanSeason
): GardenCalendarReminder[] {
  const reminders: GardenCalendarReminder[] = [];
  const seenPlantIds = new Set(plantEntities.map(entity => entity.plantId));
  const existingAgronomies = plantEntities.map(entity => getPlantAgronomy(entity.plantId));
  const activeGrowthStages = plantEntities.map(entity => getPlantGrowthStatus(entity).stage);
  const hasMaturePlants = activeGrowthStages.some(stage => stage === 'mature' || stage === 'harvest');
  const hasEarlyPlants = activeGrowthStages.some(stage => stage === 'seed' || stage === 'seedling' || stage === 'growing');

  const nurseryCandidate = existingAgronomies.find(agronomy =>
    agronomy.startMethod === 'transplant' && agronomy.nurseryLeadDays
  );
  if (nurseryCandidate?.nurseryLeadDays && !hasMaturePlants) {
    reminders.push({
      id: `prep-nursery-${planSeason}`,
      label: '育苗准备',
      detail: `这类移栽作物通常要提前 ${nurseryCandidate.nurseryLeadDays[0]}-${nurseryCandidate.nurseryLeadDays[1]} 天起苗，现在可以开始准备育苗盘和基质。`,
      tone: 'green'
    });
  }

  const directSowCandidate = existingAgronomies.find(agronomy =>
    agronomy.startMethod === 'direct_sow' || agronomy.directSowWindow
  );
  if (directSowCandidate?.directSowWindow && !hasMaturePlants) {
    reminders.push({
      id: `prep-direct-${planSeason}`,
      label: '直播窗口',
      detail: `这类作物常按末霜前后 ${formatOffsetWindow(directSowCandidate.directSowWindow)} 下种。现在先把地块和水分节奏整理好会更顺。`,
      tone: 'blue'
    });
  }

  const successionCandidate = existingAgronomies.find(agronomy =>
    agronomy.successionIntervalDays && agronomy.harvestHabit !== 'single'
  );
  if (successionCandidate?.successionIntervalDays && seenPlantIds.size > 0 && (hasMaturePlants || hasEarlyPlants)) {
    reminders.push({
      id: `prep-succession-${planSeason}`,
      label: '补种节奏',
      detail: `连续采收或快收型作物，通常每 ${successionCandidate.successionIntervalDays[0]}-${successionCandidate.successionIntervalDays[1]} 天接一批，更容易一直有菜可收。`,
      tone: 'green'
    });
  }

  return reminders;
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
      label: '春季移栽窗口',
      detail: `${planYear}-${climateProfile.lastFrostDate} 前后留意倒春寒，${regionalFrostStrategy(climateProfile, 'spring')}`,
      tone: 'blue'
    };
  }

  if (planSeason === 'fall') {
    return {
      id: 'first-frost',
      label: '秋季收尾窗口',
      detail: `${planYear}-${climateProfile.firstFrostDate} 前尽量完成怕冷作物采收，${regionalFrostStrategy(climateProfile, 'fall')}`,
      tone: 'amber'
    };
  }

  return null;
}

function formatMonthDay(value: string) {
  const [month, day] = value.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function formatOffsetWindow(window: { startOffsetDays: number; endOffsetDays: number }) {
  const start = window.startOffsetDays >= 0 ? `后 ${window.startOffsetDays} 天` : `前 ${Math.abs(window.startOffsetDays)} 天`;
  const end = window.endOffsetDays >= 0 ? `后 ${window.endOffsetDays} 天` : `前 ${Math.abs(window.endOffsetDays)} 天`;
  return `${start} ~ ${end}`;
}

function regionalClimateRhythm(climateProfile: ClimateProfile, planSeason: PlanSeason) {
  const band = climateProfile.climateBand;
  if (band === 'south_humid') {
    return planSeason === 'summer'
      ? '当前更像长季连续种植，既要看高温，也要防闷湿和连雨。'
      : '当前更适合按长季衔接来安排，边采边补会更顺。';
  }
  if (band === 'east_monsoon' || band === 'central') {
    return '当前更适合按分批种、分批收的节奏推进，同时留意晴雨切换。';
  }
  if (band === 'north_temperate' || band === 'north_cold') {
    return '当前更适合抓住季节窗口集中推进，播种、定植和防寒节奏都要更紧。';
  }
  if (band === 'southwest_plateau') {
    return '当前要同时留意日照和昼夜温差，覆盖与通风往往要配合着做。';
  }
  return '当前建议按本地季节窗口推进，优先保证稳定节奏。';
}

function regionalSeasonCheck(climateProfile: ClimateProfile, planSeason: PlanSeason) {
  const band = climateProfile.climateBand;
  if (band === 'south_humid') {
    return planSeason === 'summer'
      ? '南方暖季里先看闷热和病害压力，再决定是否继续留茬。'
      : '南方更适合顺着长季节奏衔接，必要时可提前换成下一轮更稳的作物。';
  }
  if (band === 'east_monsoon' || band === 'central') {
    return '先看最近温度和雨水变化，再决定继续养护还是换成更顺季的快菜。';
  }
  if (band === 'north_temperate' || band === 'north_cold') {
    return '北方窗口更短，优先判断它是否还赶得上本季成熟。';
  }
  return '先看温度走势，再决定继续养护还是顺延到下一季。';
}

function regionalWaterReminder(climateProfile: ClimateProfile, planSeason: PlanSeason) {
  const band = climateProfile.climateBand;
  if (band === 'south_humid') {
    return '湿热地区先摸土再补水，注意别把“闷根”误判成“缺水”。';
  }
  if (band === 'east_monsoon' || band === 'central') {
    return planSeason === 'summer'
      ? '梅雨和暑热切换时更要稳住水分节奏，避免忽干忽湿。'
      : '晴雨切换时优先看土壤含水，再决定补水频次。';
  }
  if (band === 'north_temperate' || band === 'north_cold') {
    return '北方更适合一次浇透再保墒，减少频繁浅浇。';
  }
  return '优先摸土看墒情，再决定补水频次。';
}

function regionalFrostStrategy(climateProfile: ClimateProfile, season: 'spring' | 'fall') {
  const band = climateProfile.climateBand;
  if (season === 'spring') {
    if (band === 'north_temperate' || band === 'north_cold') {
      return '北方先稳温再定植，暖季果菜别急着全部下地。';
    }
    if (band === 'southwest_plateau') {
      return '高原或盆地要防夜温回落，白天回暖后再逐步放开通风。';
    }
    return '怕冷作物先育苗，稳温后再定植。';
  }

  if (band === 'north_temperate' || band === 'north_cold') {
    return '北方优先抢收暖季作物，能成熟的尽量本轮完成，别拖到寒潮后。';
  }
  if (band === 'south_humid') {
    return '南方可以边收边接秋冬菜，但晚熟果菜仍要提早评估是否留茬。';
  }
  return '晚熟地块提前准备覆盖，并给下一轮顺季作物腾位置。';
}
