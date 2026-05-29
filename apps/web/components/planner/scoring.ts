import { getPlantAgronomy } from './plants';
import type { Plant } from './plants.d';
import type { ClimateProfile, PlanSeason, SynergyResult } from './types';

export function scorePlacement(
  plant: Plant,
  synergy: SynergyResult,
  climateProfile: ClimateProfile,
  planSeason: PlanSeason
): SynergyResult {
  let score = 72;
  const details = [...synergy.details];
  const agronomy = getPlantAgronomy(plant.id);

  score += synergy.companionCount * 8;
  score -= synergy.enemyCount * 35;

  if (!agronomy.seasons.includes(planSeason)) {
    score -= 18;
    details.push(`季节扣分: ${plant.naming.zh} 更适合 ${agronomy.seasons.map(seasonLabel).join('、')}。`);
  } else {
    score += 8;
    details.push(`季节加分: 当前季节适合 ${plant.naming.zh}。`);
  }

  const zoneNumber = Number.parseInt(climateProfile.hardinessZone, 10);
  if (Number.isFinite(zoneNumber)) {
    const [minZone, maxZone] = agronomy.hardinessZones;
    if (zoneNumber < minZone || zoneNumber > maxZone) {
      score -= 12;
      details.push(`耐寒区扣分: Zone ${climateProfile.hardinessZone} 超出建议 ${minZone}-${maxZone}。`);
    } else {
      score += 5;
    }
  }

  if (agronomy.waterNeed === 'high' && climateProfile.mockWeatherScenario === 'dry') {
    score -= 10;
    details.push('天气扣分: 干旱场景下高需水作物维护压力更高。');
  }

  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const recommendation = getRecommendation(clampedScore, synergy.status);

  return {
    ...synergy,
    valid: synergy.valid && recommendation !== 'bad',
    status: recommendation === 'bad' ? 'bad' : recommendation === 'excellent' ? 'good' : synergy.status,
    recommendation,
    score: clampedScore,
    details
  };
}

function getRecommendation(score: number, status: SynergyResult['status']): NonNullable<SynergyResult['recommendation']> {
  if (status === 'bad' || score < 45) return 'bad';
  if (score < 65) return 'caution';
  if (score >= 86) return 'excellent';
  return 'ok';
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
