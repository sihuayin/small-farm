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
    nextTask: applyPlantAgronomyTaskDetail(entity.plantId, stage, getNextTask(stage, agronomy.waterNeed, daysRemaining), daysRemaining)
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
      const weatherAdjustedTask = applyRegionalTaskDetail(
        getWeatherAdjustedTask(entity, status.nextTask, weatherSignals),
        climateProfile,
        planSeason
      );
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
  return applyRegionalTaskDetail(getWeatherAdjustedTask({
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
  }, defaultTask, weatherSignals), climateProfile, planSeason);
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
      detail: '已经进入采收窗口，优先采收并记录产量与状态。',
      tone: 'green'
    };
  }

  if (stage === 'mature') {
    return {
      id: 'inspect',
      label: '看苗情',
      detail: `距成熟约 ${daysRemaining} 天，重点查看搭架、病虫和挂果状态。`,
      tone: 'amber'
    };
  }

  if (waterNeed === 'high') {
    return {
      id: 'water',
      label: '补水',
      detail: '这类作物需水偏高，今天优先摸土看墒情再补水。',
      tone: 'blue'
    };
  }

  if (stage === 'seed' || stage === 'seedling') {
    return {
      id: 'protect',
      label: '护苗',
      detail: '保持土面湿润和通风，避免闷苗、徒长或浇水过猛。',
      tone: 'blue'
    };
  }

  return {
    id: 'maintain',
    label: '养护',
    detail: `继续按节奏养护，预计 ${daysRemaining} 天后进入成熟段。`,
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
      label: '防寒覆盖',
      detail: '倒春寒风险偏高，优先给幼苗和怕冷作物加盖薄膜或无纺布。',
      tone: 'amber'
    };
  }

  if (weatherSignals.some(signal => signal.type === 'heat' || signal.type === 'dry') && agronomy.waterNeed !== 'low') {
    return {
      id: 'water',
      label: '补水',
      detail: '这一段偏热偏干，优先早晚补水，并顺手检查覆盖物是否还能保墒。',
      tone: 'blue'
    };
  }

  if (weatherSignals.some(signal => signal.type === 'rain')) {
    return {
      id: 'drainage',
      label: '理沟排水',
      detail: '连续阴雨或梅雨阶段，优先看低洼积水、裂果和霉病风险。',
      tone: 'blue'
    };
  }

  return defaultTask;
}

function applyPlantAgronomyTaskDetail(
  plantId: string,
  stage: GrowthStageId,
  task: GrowthTask,
  daysRemaining: number
): GrowthTask {
  const agronomy = getPlantAgronomy(plantId);

  if (task.id === 'harvest') {
    if (agronomy.harvestHabit === 'continuous_pick') {
      return {
        ...task,
        detail: '已经进采收期，先摘成熟果，通常越摘越容易继续结果。'
      };
    }
    if (agronomy.harvestHabit === 'cut_and_come_again') {
      return {
        ...task,
        detail: '已经进剪收期，注意留茬，别一把剪到底。'
      };
    }
    if (agronomy.harvestHabit === 'multiple_flushes') {
      return {
        ...task,
        detail: '已经进分轮采收期，先收主薹或第一轮嫩叶，给下一轮留势。'
      };
    }
  }

  if (task.id === 'inspect' && stage === 'mature') {
    if (agronomy.harvestHabit === 'continuous_pick' && agronomy.firstHarvestDays) {
      return {
        ...task,
        detail: `离首收约 ${Math.max(0, daysRemaining)} 天，重点看挂果、支撑和是否该开始勤摘。`
      };
    }
    if (agronomy.harvestHabit === 'cut_and_come_again') {
      return {
        ...task,
        detail: `离首轮剪收约 ${Math.max(0, daysRemaining)} 天，重点看叶量、留茬和是否要补一批。`
      };
    }
    if (agronomy.harvestHabit === 'multiple_flushes') {
      return {
        ...task,
        detail: `离首轮采收约 ${Math.max(0, daysRemaining)} 天，重点看主薹或中心叶位，别错过这一轮。`
      };
    }
  }

  if (task.id === 'protect' && (stage === 'seed' || stage === 'seedling')) {
    if (agronomy.startMethod === 'transplant' && agronomy.nurseryLeadDays) {
      return {
        ...task,
        detail: `现在更像育苗期，先稳温稳湿；这类作物通常提前 ${agronomy.nurseryLeadDays[0]}-${agronomy.nurseryLeadDays[1]} 天起苗更顺。`
      };
    }
    if (agronomy.startMethod === 'direct_sow') {
      return {
        ...task,
        detail: '现在更像直播出苗期，先保墒、轻浇，别让表土板结。'
      };
    }
  }

  if (task.id === 'maintain' && agronomy.successionIntervalDays) {
    return {
      ...task,
      detail: `${task.detail} 这类作物通常每 ${agronomy.successionIntervalDays[0]}-${agronomy.successionIntervalDays[1]} 天接一批会更顺。`
    };
  }

  return task;
}

function getWeatherPriorityBoost(taskId: GrowthTask['id'], weatherSignals: WeatherSignal[]) {
  if (taskId === 'cover' && weatherSignals.some(signal => signal.type === 'cold_snap')) return 28;
  if (taskId === 'water' && weatherSignals.some(signal => signal.type === 'heat' || signal.type === 'dry')) return 24;
  if (taskId === 'drainage' && weatherSignals.some(signal => signal.type === 'rain')) return 22;
  return 0;
}

function applyRegionalTaskDetail(
  task: GrowthTask,
  climateProfile?: ClimateProfile,
  planSeason?: PlanSeason
): GrowthTask {
  const band = climateProfile?.climateBand;
  const season = planSeason || 'spring';

  if (task.id === 'water') {
    if (band === 'south_humid') {
      return { ...task, detail: '华南或湿热地区补水要少量多次，同时看根部闷湿和叶面病害，别只是一味加水。' };
    }
    if (band === 'east_monsoon' || band === 'central') {
      return { ...task, detail: season === 'summer' ? '江南、华中夏季补水更适合放在早晚，同时留意闷热和雨后返潮。' : '江南、华中补水时先摸土看墒情，避免晴雨切换下忽干忽湿。' };
    }
    if (band === 'north_temperate' || band === 'north_cold') {
      return { ...task, detail: '北方补水更看播种窗口和升温节奏，优先浇透再保墒，减少频繁浅浇。' };
    }
  }

  if (task.id === 'drainage') {
    if (band === 'south_humid' || band === 'east_monsoon' || band === 'central') {
      return { ...task, detail: '当前更像南方连阴雨节奏，优先理沟排水，再看黄叶、裂果和霉病风险。' };
    }
  }

  if (task.id === 'cover') {
    if (band === 'north_temperate' || band === 'north_cold') {
      return { ...task, detail: '北方窗口短，遇到倒春寒或秋凉时先保温，别让幼苗和暖季作物吃冷风。' };
    }
    if (band === 'southwest_plateau') {
      return { ...task, detail: '高原或盆地昼夜温差更明显，夜里先做覆盖，白天再看通风散湿。' };
    }
  }

  if (task.id === 'protect') {
    if (band === 'south_humid') {
      return { ...task, detail: '湿热地区护苗重点是通风、控水和防闷苗，别让表土一直黏湿。' };
    }
    if (band === 'north_temperate' || band === 'north_cold') {
      return { ...task, detail: '北方护苗重点是稳温和保墒，出苗前后尽量别让冷风和断水打断节奏。' };
    }
  }

  if (task.id === 'maintain') {
    if (band === 'south_humid') {
      return { ...task, detail: '当前更适合按连续养护节奏推进，边采边整，顺手预留下一轮补种位置。' };
    }
    if (band === 'east_monsoon' || band === 'central') {
      return { ...task, detail: '当前更适合分批养护和分批续种，保持一块采、一块长、一块待补的节奏。' };
    }
    if (band === 'north_temperate' || band === 'north_cold') {
      return { ...task, detail: '当前更适合抓紧本季窗口做集中养护，优先把成熟、补水和保温节奏排顺。' };
    }
  }

  if (task.id === 'inspect' && (band === 'south_humid' || band === 'east_monsoon')) {
    return { ...task, detail: '当前巡检重点放在通风、叶面状态和雨后病害，尤其注意连湿后的闷棚感。' };
  }

  return task;
}
