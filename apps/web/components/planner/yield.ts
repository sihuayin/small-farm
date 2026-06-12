/**
 * 产量估算模块
 * 基于植物农艺参数和种植面积估算预期产量
 */

import type { GardenEntity, ClimateProfile } from './types';
import { getPlantAgronomy } from './plants';
import type { PlantAgronomy } from './plants.d';

export interface YieldEstimateResult {
  perPlant: { amount: string; unit: string; basis: string } | null;
  perGrid: { amount: string; unit: string } | null;
  total: { amount: string; unit: string } | null;
  gridCount: number;
  confidence: 'rough' | 'reference' | 'reliable';
  factors: string[];
}

/**
 * 获取单株或单格作物的产量估算
 */
function getBaseYield(agronomy: PlantAgronomy) {
  if (!agronomy.yieldEstimate) return null;
  return {
    amount: agronomy.yieldEstimate.amount,
    unit: agronomy.yieldEstimate.unit,
    basis: agronomy.yieldEstimate.basis,
    confidence: agronomy.yieldEstimate.confidence,
    factors: agronomy.yieldEstimate.factors ?? []
  };
}

/**
 * 对指定实体做产量估算
 */
export function estimateEntityYield(
  entity: GardenEntity,
  climateProfile: ClimateProfile
): YieldEstimateResult {
  if (entity.type !== 'plant' || !entity.plantId) {
    return {
      perPlant: null,
      perGrid: null,
      total: null,
      gridCount: entity.spanX * entity.spanY,
      confidence: 'rough',
      factors: []
    };
  }

  const agronomy = getPlantAgronomy(entity.plantId);
  const base = getBaseYield(agronomy);
  const gridCount = entity.spanX * entity.spanY;

  if (!base) {
    return {
      perPlant: null,
      perGrid: null,
      total: null,
      gridCount,
      confidence: 'rough',
      factors: []
    };
  }

  const perPlantStr = base.basis.includes('每株')
    ? `${base.amount} ${base.unit}`
    : base.basis.includes('每格')
      ? `${base.amount} ${base.unit}`
      : `${base.amount} ${base.unit}（${base.basis}）`;

  // 按格数推算总量
  const amountNum = parseFloat(base.amount.replace(/[~\-].*$/, '').trim());
  const totalAmount = isNaN(amountNum) ? null : `${(amountNum * gridCount).toFixed(1)}`;

  return {
    perPlant: {
      amount: base.amount,
      unit: base.unit,
      basis: base.basis
    },
    perGrid: {
      amount: base.basis.includes('每格') ? `${base.amount} ${base.unit}` : `${amountNum} ${base.unit}（估算）`,
      unit: base.unit,
    },
    total: totalAmount ? {
      amount: totalAmount,
      unit: base.unit
    } : null,
    gridCount,
    confidence: base.confidence,
    factors: base.factors
  };
}

/**
 * 对整个菜园做总产量估算摘要
 */
export function estimateGardenTotalYield(
  entities: Record<string, GardenEntity>,
  climateProfile: ClimateProfile
) {
  let totalPlants = 0;
  let totalGrids = 0;
  const results: Array<{
    plantName: string;
    gridCount: number;
    estimate: YieldEstimateResult;
  }> = [];

  for (const entity of Object.values(entities)) {
    if (entity.type !== 'plant' || !entity.plantId) continue;
    const gridCount = entity.spanX * entity.spanY;
    totalGrids += gridCount;
    totalPlants++;

    const estimate = estimateEntityYield(entity, climateProfile);
    results.push({
      plantName: entity.plant?.naming?.zh || entity.plantId,
      gridCount,
      estimate
    });
  }

  return {
    results,
    totalPlants,
    totalGrids
  };
}

/**
 * 格式化产量估算为简短说明文字
 */
export function formatYieldSummary(
  entity: GardenEntity,
  climateProfile: ClimateProfile
): string {
  const estimate = estimateEntityYield(entity, climateProfile);
  if (!estimate.perPlant) return '';
  const totalText = estimate.total
    ? `，约 ${estimate.total.amount} ${estimate.total.unit}`
    : '';
  return `每${estimate.perPlant.basis.includes('每株') ? '株' : '格'}约 ${estimate.perPlant.amount} ${estimate.perPlant.unit}${totalText}`;
}

