import { getPlantAgronomy, plantMap } from './plants';
import type { Plant } from './plants.d';
import type { PlantingRecord, PlanSeason, SynergyResult } from './types';
import { gridKey } from './types';

const HIGH_RISK_FAMILIES = new Set(['nightshade', 'brassica', 'cucurbit']);

const rotationAdvice: Record<string, string[]> = {
  legume: ['leafy', 'fruiting'],
  leafy: ['root', 'legume'],
  root: ['fruiting', 'legume'],
  fruiting: ['legume', 'leafy'],
  flower: ['leafy', 'root'],
  perennial: ['leafy', 'legume'],
  other: ['legume', 'leafy']
};

const rotationGroupLabels: Record<string, string> = {
  fruiting: '果菜',
  leafy: '叶菜',
  root: '根菜',
  legume: '豆科',
  flower: '花卉',
  perennial: '多年生',
  other: '其他'
};

export function evaluateRotationRules(
  gridX: number,
  gridY: number,
  plant: Plant,
  plantingHistory: Record<string, PlantingRecord[]>,
  currentYear: number,
  currentSeason: PlanSeason
): SynergyResult {
  const agronomy = getPlantAgronomy(plant.id);
  const footprintRecords = getFootprintRecords(
    gridX,
    gridY,
    plant.dimensions.grid_span_x,
    plant.dimensions.grid_span_y,
    plantingHistory
  );

  const details: string[] = [];
  const seen = new Set<string>();

  for (const record of footprintRecords) {
    if (record.year === currentYear && record.season === currentSeason) continue;

    const recordKey = `${record.plantId}-${record.year}-${record.season}-${record.originX}-${record.originY}`;
    if (seen.has(recordKey)) continue;
    seen.add(recordKey);

    if (record.rotationGroup === agronomy.rotationGroup) {
      details.push(
        `轮作提醒: 这里在 ${record.year} ${seasonLabel(record.season)} 种过${record.plantName}，同属${rotationGroupLabel(record.rotationGroup)}组，建议换一类作物。`
      );
    }

    if (record.family === agronomy.family && HIGH_RISK_FAMILIES.has(agronomy.family)) {
      details.push(
        `病虫害风险: ${record.plantName}与${plant.naming.zh}属于同一高风险科属，建议间隔 3 年再种。`
      );
    }
  }

  return {
    valid: true,
    status: 'neutral',
    companionCount: 0,
    enemyCount: 0,
    details
  };
}

export function createPlantingRecords(
  gridX: number,
  gridY: number,
  plant: Plant,
  year: number,
  season: PlanSeason,
  timestamp: number
): Record<string, PlantingRecord[]> {
  const agronomy = getPlantAgronomy(plant.id);
  const record: PlantingRecord = {
    id: `record_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
    plantId: plant.id,
    plantName: plant.naming.zh,
    family: agronomy.family,
    rotationGroup: agronomy.rotationGroup,
    year,
    season,
    originX: gridX,
    originY: gridY,
    spanX: plant.dimensions.grid_span_x,
    spanY: plant.dimensions.grid_span_y,
    createdAt: timestamp
  };

  const recordsByCell: Record<string, PlantingRecord[]> = {};
  for (let dx = 0; dx < plant.dimensions.grid_span_x; dx++) {
    for (let dy = 0; dy < plant.dimensions.grid_span_y; dy++) {
      recordsByCell[gridKey(gridX + dx, gridY + dy)] = [record];
    }
  }
  return recordsByCell;
}

export function getNextRotationSuggestions(entityPlantId: string) {
  const plant = plantMap.get(entityPlantId);
  if (!plant) return [];

  const agronomy = getPlantAgronomy(entityPlantId);
  return (rotationAdvice[agronomy.rotationGroup] || rotationAdvice.other).map(group => ({
    group,
    label: rotationGroupLabel(group),
    examples: Array.from(plantMap.values())
      .filter(candidate => getPlantAgronomy(candidate.id).rotationGroup === group)
      .slice(0, 3)
      .map(candidate => candidate.naming.zh)
  }));
}

function getFootprintRecords(
  gridX: number,
  gridY: number,
  spanX: number,
  spanY: number,
  plantingHistory: Record<string, PlantingRecord[]>
) {
  const records: PlantingRecord[] = [];
  for (let dx = 0; dx < spanX; dx++) {
    for (let dy = 0; dy < spanY; dy++) {
      records.push(...(plantingHistory[gridKey(gridX + dx, gridY + dy)] || []));
    }
  }
  return records;
}

function rotationGroupLabel(group: string) {
  return rotationGroupLabels[group] || group;
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
