import { getPlantAgronomy } from './plants';
import { getMockWeatherSignals } from './climate';
import type { ClimateProfile, GardenEntity, PlantEntity, PlanSeason, WeatherSignal } from './types';
import type { WaterNeed } from './plants.d';

const DAY_MS = 24 * 60 * 60 * 1000;

export type GrowthStageId = 'seed' | 'seedling' | 'growing' | 'mature' | 'harvest';

export interface GrowthTask {
  id: 'protect' | 'water' | 'inspect' | 'maintain' | 'harvest' | 'cover' | 'drainage';
  label: string;
  detail: string;
  tone: 'blue' | 'green' | 'amber';
}

export interface PlantGrowthStatus {
  stage: GrowthStageId;
  stageLabel: string;
  ageDays: number;
  daysToMaturity: number;
  daysRemaining: number;
  progressPercent: number;
  visualScale: number;
  harvestReady: boolean;
  waterLabel: string;
  nextTask: GrowthTask;
}

export interface GardenTaskItem {
  id: string;
  plantName: string;
  position: string;
  stageLabel: string;
  progressPercent: number;
  daysRemaining: number;
  task: GrowthTask;
  priority: number;
}

const stageLabels: Record<GrowthStageId, string> = {
  seed: '萌芽',
  seedling: '幼苗',
  growing: '生长期',
  mature: '成熟中',
  harvest: '可采收'
};

const waterLabels: Record<WaterNeed, string> = {
  low: '低水分',
  medium: '中等水分',
  high: '高水分'
};

export function getPlantGrowthStatus(entity: PlantEntity, nowMs = Date.now()): PlantGrowthStatus {
  const agronomy = getPlantAgronomy(entity.plantId);
  const daysToMaturity = Math.max(1, agronomy.daysToMaturity);
  const ageDays = Math.max(0, Math.floor((nowMs - entity.createdAt) / DAY_MS));
  const progressPercent = Math.min(140, Math.round((ageDays / daysToMaturity) * 100));
  const daysRemaining = Math.max(0, daysToMaturity - ageDays);
  const stage = getStage(progressPercent);
  const harvestReady = stage === 'harvest';

  return {
    stage,
    stageLabel: stageLabels[stage],
    ageDays,
    daysToMaturity,
    daysRemaining,
    progressPercent,
    visualScale: getVisualScale(stage),
    harvestReady,
    waterLabel: waterLabels[agronomy.waterNeed],
    nextTask: getNextTask(stage, agronomy.waterNeed, daysRemaining)
  };
}

export function getGardenTaskBoard(
  entities: Record<string, GardenEntity>,
  climateProfile?: ClimateProfile,
  planSeason?: PlanSeason,
  nowMs = Date.now(),
  limit = 5
): GardenTaskItem[] {
  const weatherSignals = climateProfile && planSeason ? getMockWeatherSignals(climateProfile, planSeason) : [];

  return Object.values(entities)
    .filter((entity): entity is PlantEntity => entity.type === 'plant')
    .map((entity) => {
      const status = getPlantGrowthStatus(entity, nowMs);
      const weatherAdjustedTask = getWeatherAdjustedTask(entity, status.nextTask, weatherSignals);
      const isCompleted = entity.completedTaskIds?.includes(weatherAdjustedTask.id) || false;
      const weatherBoost = getWeatherPriorityBoost(weatherAdjustedTask.id, weatherSignals);
      return {
        id: entity.id,
        plantName: entity.plant.naming.zh,
        position: `${entity.originX},${entity.originY}`,
        stageLabel: status.stageLabel,
        progressPercent: status.progressPercent,
        daysRemaining: status.daysRemaining,
        task: weatherAdjustedTask,
        priority: isCompleted ? 0 : getTaskPriority(status, weatherAdjustedTask) + weatherBoost
      };
    })
    .filter(item => item.priority > 0)
    .sort((a, b) => b.priority - a.priority || b.progressPercent - a.progressPercent)
    .slice(0, limit);
}

export function summarizeGardenTasks(tasks: GardenTaskItem[]) {
  const harvestCount = tasks.filter(item => item.task.label === '采收').length;
  const waterCount = tasks.filter(item => item.task.id === 'water').length;
  const inspectCount = tasks.filter(item => item.task.id === 'inspect' || item.task.id === 'drainage' || item.task.id === 'cover').length;

  return { harvestCount, waterCount, inspectCount };
}

export function getPlantStarterTask(
  plantId: string,
  climateProfile?: ClimateProfile,
  planSeason?: PlanSeason
): GrowthTask {
  const agronomy = getPlantAgronomy(plantId);
  const defaultTask = getNextTask('seed', agronomy.waterNeed, agronomy.daysToMaturity);
  const weatherSignals = climateProfile && planSeason ? getMockWeatherSignals(climateProfile, planSeason) : [];
  return getWeatherAdjustedTask({
    id: `starter-${plantId}`,
    type: 'plant',
    plantId,
    plant: {
      id: plantId,
      category: 'starter',
      naming: { en: plantId, zh: plantId, emoji: '' },
      dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: agronomy.spacing.plantInch },
      styling: { bg_color: '#000000', border_color: '#000000' },
      relationships: { companions: [], enemies: [] }
    },
    originX: 0,
    originY: 0,
    spanX: 1,
    spanY: 1,
    rotation: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completedTaskIds: []
  }, defaultTask, weatherSignals);
}

function getStage(progressPercent: number): GrowthStageId {
  if (progressPercent >= 100) return 'harvest';
  if (progressPercent >= 75) return 'mature';
  if (progressPercent >= 35) return 'growing';
  if (progressPercent >= 15) return 'seedling';
  return 'seed';
}

function getVisualScale(stage: GrowthStageId) {
  if (stage === 'seed') return 0.58;
  if (stage === 'seedling') return 0.72;
  if (stage === 'growing') return 0.9;
  if (stage === 'mature') return 1;
  return 1.06;
}

function getNextTask(stage: GrowthStageId, waterNeed: WaterNeed, daysRemaining: number): GrowthTask {
  if (stage === 'harvest') {
    return {
      id: 'harvest',
      label: '采收',
      detail: '已经达到成熟期，优先安排采收或记录产量。',
      tone: 'green'
    };
  }

  if (stage === 'mature') {
    return {
      id: 'inspect',
      label: '巡检',
      detail: `距成熟约 ${daysRemaining} 天，检查支架、虫害和果实状态。`,
      tone: 'amber'
    };
  }

  if (waterNeed === 'high') {
    return {
      id: 'water',
      label: '补水',
      detail: '水分需求较高，今天优先检查土壤湿度。',
      tone: 'blue'
    };
  }

  if (stage === 'seed' || stage === 'seedling') {
    return {
      id: 'protect',
      label: '护苗',
      detail: '保持苗床稳定，避免遮阴和过度浇水。',
      tone: 'blue'
    };
  }

  return {
    id: 'maintain',
    label: '维护',
    detail: `继续观察长势，预计 ${daysRemaining} 天后成熟。`,
    tone: 'amber'
  };
}

function getTaskPriority(status: PlantGrowthStatus, task: GrowthTask = status.nextTask) {
  if (task.id === 'harvest') return 100;
  if (task.id === 'cover') return 92;
  if (task.id === 'water') return 80;
  if (task.id === 'drainage') return 76;
  if (task.id === 'inspect') return 70;
  if (task.id === 'protect') return 55;
  return 40;
}

function getWeatherAdjustedTask(
  entity: PlantEntity,
  defaultTask: GrowthTask,
  weatherSignals: WeatherSignal[]
): GrowthTask {
  const agronomy = getPlantAgronomy(entity.plantId);

  if (weatherSignals.some(signal => signal.type === 'cold_snap')) {
    return {
      id: 'cover',
      label: '覆盖',
      detail: '模拟寒潮临近，优先覆盖幼苗和不耐寒作物。',
      tone: 'amber'
    };
  }

  if (weatherSignals.some(signal => signal.type === 'heat' || signal.type === 'dry') && agronomy.waterNeed !== 'low') {
    return {
      id: 'water',
      label: '补水',
      detail: '模拟高温/干旱场景，优先深浇并检查覆盖物。',
      tone: 'blue'
    };
  }

  if (weatherSignals.some(signal => signal.type === 'rain')) {
    return {
      id: 'drainage',
      label: '排水',
      detail: '模拟连续降雨，检查低洼积水、裂果和真菌病害。',
      tone: 'blue'
    };
  }

  return defaultTask;
}

function getWeatherPriorityBoost(taskId: GrowthTask['id'], weatherSignals: WeatherSignal[]) {
  if (taskId === 'cover' && weatherSignals.some(signal => signal.type === 'cold_snap')) return 28;
  if (taskId === 'water' && weatherSignals.some(signal => signal.type === 'heat' || signal.type === 'dry')) return 24;
  if (taskId === 'drainage' && weatherSignals.some(signal => signal.type === 'rain')) return 22;
  return 0;
}
