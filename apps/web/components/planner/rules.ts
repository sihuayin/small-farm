import { plantMap, plants } from './plants';
import type { Plant } from './plants.d';
import type { GardenEntity, PlantEntity, SynergyResult } from './types';
import {
  checkAABBCollision,
  createBoundingBox,
  expandBoundingBox,
  type BoundingBox
} from './utils/math';

export type CompanionRuleEffect = 'companion' | 'enemy';
export type RuleSeverity = 'info' | 'warning' | 'blocker';

export interface CompanionRule {
  sourcePlantId: string;
  targetPlantId: string;
  effect: CompanionRuleEffect;
  severity: RuleSeverity;
  reason: string;
}

const defaultReasons: Record<CompanionRuleEffect, string> = {
  companion: '邻近种植通常有助于提升授粉、防虫、空间利用或土壤互补。',
  enemy: '邻近种植可能增加病虫害传播、养分竞争或生长抑制风险。'
};

export const companionRules: CompanionRule[] = plants.flatMap((plant) => [
  ...plant.relationships.companions.map((targetPlantId) => ({
    sourcePlantId: plant.id,
    targetPlantId,
    effect: 'companion' as const,
    severity: 'info' as const,
    reason: defaultReasons.companion
  })),
  ...plant.relationships.enemies.map((targetPlantId) => ({
    sourcePlantId: plant.id,
    targetPlantId,
    effect: 'enemy' as const,
    severity: 'blocker' as const,
    reason: defaultReasons.enemy
  }))
]);

const ruleIndex = new Map(
  companionRules.map((rule) => [`${rule.sourcePlantId}->${rule.targetPlantId}`, rule])
);

export function getCompanionRule(sourcePlantId: string, targetPlantId: string) {
  return ruleIndex.get(`${sourcePlantId}->${targetPlantId}`);
}

export function evaluateCompanionRules(
  gridX: number,
  gridY: number,
  plant: Plant,
  entities: Record<string, GardenEntity>
): SynergyResult {
  const activeBox = expandBoundingBox(
    createBoundingBox(
      gridX,
      gridY,
      plant.dimensions.grid_span_x,
      plant.dimensions.grid_span_y,
      plant.id
    )
  );

  let companionCount = 0;
  let enemyCount = 0;
  const details: string[] = [];

  for (const entity of Object.values(entities)) {
    if (entity.type !== 'plant') continue;

    const neighborBox = plantEntityToBox(entity);
    if (!checkAABBCollision(activeBox, neighborBox)) continue;

    const rule = getCompanionRule(plant.id, entity.plantId);
    if (!rule) continue;

    const neighborPlant = plantMap.get(entity.plantId);
    const neighborName = neighborPlant?.naming.zh || entity.plantId;

    if (rule.effect === 'enemy') {
      enemyCount++;
      details.push(`相克: ${plant.naming.zh} + ${neighborName}。${rule.reason}`);
    } else {
      companionCount++;
      details.push(`伴生: ${plant.naming.zh} + ${neighborName}。${rule.reason}`);
    }
  }

  return {
    valid: enemyCount === 0,
    status: enemyCount > 0 ? 'bad' : companionCount > 0 ? 'good' : 'neutral',
    companionCount,
    enemyCount,
    details
  };
}

function plantEntityToBox(entity: PlantEntity): BoundingBox {
  return createBoundingBox(
    entity.originX,
    entity.originY,
    entity.spanX,
    entity.spanY,
    entity.plantId
  );
}
