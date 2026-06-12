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
  baseline: {
    anchorHint: string;
    startShiftDays: number;
    endShiftDays: number;
    scoreBonus: number;
  };
  cropAdjustment: {
    startShiftDays: number;
    endShiftDays: number;
    detailHint: string;
  };
  runtimeAdjustment: {
    startShiftDays: number;
    endShiftDays: number;
    scoreDelta: number;
    source: 'mock';
    detailHint: string;
  };
}

export interface SupplementCandidateResult {
  eligible: boolean;
  score: number;
  reason: string;
}

const refinedCityNames = new Set([
  '北京',
  '天津',
  '上海',
  '重庆',
  '杭州',
  '宁波',
  '广州',
  '深圳',
  '东莞',
  '佛山',
  '武汉',
  '成都',
  '西安',
  '南京',
  '苏州',
  '青岛',
  '济南',
  '郑州',
  '长沙',
  '昆明',
  '贵阳',
  '南宁',
  '海口',
  '福州',
  '厦门',
  '合肥',
  '南昌',
  '沈阳',
  '大连',
  '哈尔滨',
  '太原',
  '石家庄',
  '兰州',
  '乌鲁木齐',
  '呼和浩特',
  '拉萨',
  '银川',
  '西宁',
  '长春'
]);

export function getClimateCalibrationStatus(climateProfile: ClimateProfile) {
  const city = (climateProfile.city || '').trim();
  if (city && refinedCityNames.has(city)) {
    return {
      level: 'city_refined' as const,
      label: '已启用城市精细校正',
      detail: `${city} 已启用城市级作物窗口微调。`
    };
  }

  if (city || climateProfile.province) {
    return {
      level: 'regional' as const,
      label: '当前按区域画像推断',
      detail: '当前仍以省级或区域气候画像为主，尚未命中城市精细校正。'
    };
  }

  return {
    level: 'basic' as const,
    label: '当前按基础气候参数推断',
    detail: '当前主要依据气候分区、霜冻日期和季节节奏做判断。'
  };
}

export function getPlantingWindowStatus(
  plant: Plant,
  climateProfile: ClimateProfile,
  planYear: number,
  planSeason: PlanSeason
): PlantingWindowResult {
  const agronomy = getPlantAgronomy(plant.id);
  const planDate = getPlanSeasonDate(planYear, planSeason, climateProfile);
  const lastFrostDate = parseMonthDayDate(planYear, climateProfile.lastFrostDate || '04-15');
  const firstFrostDate = parseMonthDayDate(planYear, climateProfile.firstFrostDate || '10-15');
  const climatePattern = getClimateSeasonPattern(climateProfile, planSeason);
  const baseAnchorDate = getSeasonAnchorDate(planYear, planSeason, climateProfile, lastFrostDate, firstFrostDate, agronomy.daysToMaturity);
  const cropRegionShift = getCropRegionalWindowShift(plant.id, climateProfile, planSeason);
  const runtimeAdjustment = getRuntimeWindowAdjustment(climateProfile, planSeason, plant.id);
  const windowStart = addDays(
    baseAnchorDate,
    agronomy.sowingWindow.startOffsetDays + climatePattern.startShiftDays + cropRegionShift.startShiftDays + runtimeAdjustment.startShiftDays
  );
  const windowEnd = addDays(
    baseAnchorDate,
    agronomy.sowingWindow.endOffsetDays + climatePattern.endShiftDays + cropRegionShift.endShiftDays + runtimeAdjustment.endShiftDays
  );
  const harvestDate = addDays(planDate, agronomy.daysToMaturity);
  const seasonNames = agronomy.seasons.map(seasonLabel).join('、');
  const windowText = `${formatMonthDay(windowStart)}-${formatMonthDay(windowEnd)}`;
  const climateLabel = climateProfile.climateLabel || climateProfile.city || climateProfile.hardinessZone || '本地地区';
  const detailTail = `${cropRegionShift.detailHint}${runtimeAdjustment.detailHint}`.trim();

  if (!agronomy.seasons.includes(planSeason)) {
    return {
      status: 'off_season',
      label: '非主季',
      shortLabel: '季节不优',
      detail: `更适合${seasonNames}，在${climateLabel}建议窗口约 ${windowText}。${detailTail}`,
      scoreDelta: -16,
      windowStart,
      windowEnd,
      planDate,
      baseline: climatePattern,
      cropAdjustment: cropRegionShift,
      runtimeAdjustment
    };
  }

  if (planDate < windowStart) {
    return {
      status: 'too_early',
      label: '等待窗口',
      shortLabel: '还偏早',
      detail: `建议约 ${formatMonthDay(windowStart)} 后开始，按${climateLabel}${climatePattern.anchorHint}推算。${detailTail}`,
      scoreDelta: -8 + runtimeAdjustment.scoreDelta,
      windowStart,
      windowEnd,
      planDate,
      baseline: climatePattern,
      cropAdjustment: cropRegionShift,
      runtimeAdjustment
    };
  }

  if (planDate > windowEnd) {
    const frostRisk = harvestDate > firstFrostDate;
    return {
      status: frostRisk ? 'harvest_risk' : 'late',
      label: frostRisk ? '采收有霜冻风险' : '窗口偏晚',
      shortLabel: frostRisk ? '霜冻风险' : '偏晚',
      detail: frostRisk
        ? `按 ${agronomy.daysToMaturity} 天成熟估算，在${climateLabel}采收可能晚于初霜 ${formatMonthDay(firstFrostDate)}。${detailTail}`
        : `在${climateLabel}已过建议窗口 ${windowText}，仍可试种但确定性下降。${detailTail}`,
      scoreDelta: (frostRisk ? -18 : -10) + runtimeAdjustment.scoreDelta,
      windowStart,
      windowEnd,
      planDate,
      baseline: climatePattern,
      cropAdjustment: cropRegionShift,
      runtimeAdjustment
    };
  }

  return {
    status: 'in_window',
    label: '当前适合',
    shortLabel: '适合种',
    detail: `当前在建议窗口 ${windowText} 内，按${climateLabel}${climatePattern.anchorHint}推算。${detailTail}`,
    scoreDelta: 10 + climatePattern.scoreBonus + runtimeAdjustment.scoreDelta,
    windowStart,
    windowEnd,
    planDate,
    baseline: climatePattern,
    cropAdjustment: cropRegionShift,
    runtimeAdjustment
  };
}

export function plantingWindowBadgeClassName(status: PlantingWindowStatus) {
  if (status === 'in_window') return 'border-green-300 bg-green-100 text-green-800';
  if (status === 'too_early') return 'border-sky-300 bg-sky-100 text-sky-800';
  if (status === 'late' || status === 'harvest_risk') return 'border-amber-300 bg-amber-100 text-amber-800';
  return 'border-slate-300 bg-slate-100 text-slate-700';
}

export function getSupplementCandidateResult(
  plant: Plant,
  climateProfile: ClimateProfile,
  planYear: number,
  planSeason: PlanSeason
): SupplementCandidateResult {
  const agronomy = getPlantAgronomy(plant.id);
  const windowStatus = getPlantingWindowStatus(plant, climateProfile, planYear, planSeason);
  const footprint = plant.dimensions.grid_span_x * plant.dimensions.grid_span_y;
  const isCompact = footprint <= 2;
  const quickThreshold = getRegionalSupplementMaturityThreshold(climateProfile, planSeason);
  const isQuick = agronomy.daysToMaturity <= quickThreshold;
  const isPerennial = agronomy.rotationGroup === 'perennial';
  const needsTransplant = agronomy.startMethod === 'transplant';
  const waterLabel = agronomy.waterNeed === 'low' ? '低需水' : agronomy.waterNeed === 'high' ? '高需水' : '中等需水';
  const footprintLabel = `${plant.dimensions.grid_span_x}x${plant.dimensions.grid_span_y}`;

  if (windowStatus.status !== 'in_window') {
    return {
      eligible: false,
      score: 0,
      reason: `当前更适合补种处于建议窗口内的作物；${plant.naming.zh} 现在是“${windowStatus.shortLabel}”。`
    };
  }

  if (isPerennial) {
    return {
      eligible: false,
      score: 0,
      reason: '多年生作物更适合季初规划，不适合作为季中补种。'
    };
  }

  if (!isCompact) {
    return {
      eligible: false,
      score: 0,
      reason: '占地偏大，不适合在养护阶段插空补种。'
    };
  }

  if (!isQuick) {
    return {
      eligible: false,
      score: 0,
      reason: `成熟周期 ${agronomy.daysToMaturity} 天偏长，按${regionalSupplementThresholdLabel(climateProfile, planSeason, quickThreshold)}更适合季初布局。`
    };
  }

  const waterBonus = agronomy.waterNeed === 'low' ? 10 : agronomy.waterNeed === 'medium' ? 6 : 0;
  const transplantPenalty = needsTransplant ? 8 : 0;
  const score = 100 - footprint * 8 - Math.max(0, agronomy.daysToMaturity - 45) - transplantPenalty + waterBonus;

  return {
    eligible: true,
    score,
    reason: `${windowStatus.shortLabel} · ${agronomy.daysToMaturity} 天左右可收 · ${footprintLabel} 小占地 · ${waterLabel}${needsTransplant ? ' · 需移栽' : ' · 直播友好'} · ${regionalSupplementPaceHint(climateProfile, planSeason)}`
  };
}

function getPlanSeasonDate(year: number, season: PlanSeason, climateProfile: ClimateProfile) {
  const climateBand = climateProfile.climateBand || 'east_monsoon';
  const seasonMonthDayByBand: Record<NonNullable<ClimateProfile['climateBand']>, Record<PlanSeason, string>> = {
    north_cold: {
      spring: '05-05',
      summer: '07-10',
      fall: '08-25',
      winter: '01-10'
    },
    north_temperate: {
      spring: '04-18',
      summer: '07-01',
      fall: '09-05',
      winter: '01-12'
    },
    central: {
      spring: '04-05',
      summer: '06-25',
      fall: '09-15',
      winter: '01-15'
    },
    east_monsoon: {
      spring: '03-28',
      summer: '06-20',
      fall: '09-20',
      winter: '01-18'
    },
    south_humid: {
      spring: '03-10',
      summer: '06-15',
      fall: '10-05',
      winter: '01-20'
    },
    southwest_plateau: {
      spring: '03-25',
      summer: '06-25',
      fall: '09-10',
      winter: '01-16'
    }
  };

  return parseMonthDayDate(year, seasonMonthDayByBand[climateBand][season]);
}

function getSeasonAnchorDate(
  year: number,
  season: PlanSeason,
  climateProfile: ClimateProfile,
  lastFrostDate: Date,
  firstFrostDate: Date,
  daysToMaturity: number
) {
  const climateBand = climateProfile.climateBand || 'east_monsoon';

  if (season === 'spring') {
    return lastFrostDate;
  }

  if (season === 'summer') {
    const summerOffsets: Record<NonNullable<ClimateProfile['climateBand']>, number> = {
      north_cold: 28,
      north_temperate: 21,
      central: 14,
      east_monsoon: 10,
      south_humid: 7,
      southwest_plateau: 14
    };
    return addDays(lastFrostDate, summerOffsets[climateBand]);
  }

  if (season === 'fall') {
    const fallLeadDays = daysToMaturity + 35;
    return addDays(firstFrostDate, -fallLeadDays);
  }

  const winterLeadDays: Record<NonNullable<ClimateProfile['climateBand']>, number> = {
    north_cold: 140,
    north_temperate: 125,
    central: 110,
    east_monsoon: 95,
    south_humid: 75,
    southwest_plateau: 115
  };

  return addDays(firstFrostDate, -winterLeadDays[climateBand]);
}

function getClimateSeasonPattern(climateProfile: ClimateProfile, season: PlanSeason) {
  const climateBand = climateProfile.climateBand || 'east_monsoon';
  const patterns: Record<NonNullable<ClimateProfile['climateBand']>, Record<PlanSeason, {
    startShiftDays: number;
    endShiftDays: number;
    scoreBonus: number;
    anchorHint: string;
  }>> = {
    north_cold: {
      spring: { startShiftDays: 10, endShiftDays: 0, scoreBonus: -1, anchorHint: '春季晚霜节奏' },
      summer: { startShiftDays: 12, endShiftDays: 0, scoreBonus: 0, anchorHint: '夏季回暖节奏' },
      fall: { startShiftDays: -10, endShiftDays: -20, scoreBonus: -2, anchorHint: '秋季早霜边界' },
      winter: { startShiftDays: -18, endShiftDays: -26, scoreBonus: -4, anchorHint: '冬前保温边界' }
    },
    north_temperate: {
      spring: { startShiftDays: 5, endShiftDays: 5, scoreBonus: 0, anchorHint: '春季末霜窗口' },
      summer: { startShiftDays: 8, endShiftDays: 6, scoreBonus: 0, anchorHint: '初夏稳定升温节奏' },
      fall: { startShiftDays: -6, endShiftDays: -12, scoreBonus: -1, anchorHint: '秋播降温节奏' },
      winter: { startShiftDays: -10, endShiftDays: -18, scoreBonus: -3, anchorHint: '入冬前防寒边界' }
    },
    central: {
      spring: { startShiftDays: 0, endShiftDays: 10, scoreBonus: 1, anchorHint: '春季升温节奏' },
      summer: { startShiftDays: 4, endShiftDays: 12, scoreBonus: 1, anchorHint: '梅雨后高温节奏' },
      fall: { startShiftDays: 0, endShiftDays: -6, scoreBonus: 1, anchorHint: '秋播回凉节奏' },
      winter: { startShiftDays: -6, endShiftDays: -10, scoreBonus: -1, anchorHint: '越冬防护边界' }
    },
    east_monsoon: {
      spring: { startShiftDays: -4, endShiftDays: 14, scoreBonus: 1, anchorHint: '江南春季升温节奏' },
      summer: { startShiftDays: 0, endShiftDays: 10, scoreBonus: 1, anchorHint: '梅雨转盛夏节奏' },
      fall: { startShiftDays: 6, endShiftDays: 4, scoreBonus: 2, anchorHint: '秋播回凉窗口' },
      winter: { startShiftDays: 0, endShiftDays: -6, scoreBonus: 0, anchorHint: '冬季保温边界' }
    },
    south_humid: {
      spring: { startShiftDays: -10, endShiftDays: 18, scoreBonus: 2, anchorHint: '华南早春升温节奏' },
      summer: { startShiftDays: -4, endShiftDays: 8, scoreBonus: 1, anchorHint: '长夏高温节奏' },
      fall: { startShiftDays: 12, endShiftDays: 12, scoreBonus: 2, anchorHint: '秋冬续种窗口' },
      winter: { startShiftDays: 8, endShiftDays: 10, scoreBonus: 1, anchorHint: '暖冬种植节奏' }
    },
    southwest_plateau: {
      spring: { startShiftDays: -2, endShiftDays: 8, scoreBonus: 1, anchorHint: '高原回暖节奏' },
      summer: { startShiftDays: 2, endShiftDays: 8, scoreBonus: 0, anchorHint: '雨热同期节奏' },
      fall: { startShiftDays: -2, endShiftDays: -8, scoreBonus: 1, anchorHint: '秋季昼夜温差节奏' },
      winter: { startShiftDays: -4, endShiftDays: -10, scoreBonus: -1, anchorHint: '冬季冷夜边界' }
    }
  };

  return patterns[climateBand][season];
}

function getCropRegionalWindowShift(
  plantId: string,
  climateProfile: ClimateProfile,
  planSeason: PlanSeason
) {
  const band = climateProfile.climateBand || 'east_monsoon';
  let startShiftDays = 0;
  let endShiftDays = 0;
  let detailHint = '';

  if (['kongxin_cai', 'bitter_melon', 'donggua', 'loofah', 'yardlong_bean', 'ginger'].includes(plantId)) {
    if (band === 'north_temperate') {
      startShiftDays += 7;
      endShiftDays -= 4;
      detailHint = ' 北方暖季作物更看地温，通常要等土壤真正暖起来再下地。';
    } else if (band === 'north_cold') {
      startShiftDays += 12;
      endShiftDays -= 8;
      detailHint = ' 寒地暖季窗口更短，尽量往最稳的高温段靠。';
    } else if (band === 'south_humid') {
      startShiftDays -= 6;
      endShiftDays += 8;
      detailHint = ' 华南暖季更长，这类作物通常可以更早开种、也更能往后续。';
    }
  }

  if (['youmai_cai', 'shanghai_qing', 'cai_xin', 'garland_chrysanthemum', 'xiaoyoucai', 'gai_lan', 'baby_napa', 'wosun', 'daikon', 'fava_bean', 'suanmiao'].includes(plantId)) {
    if (band === 'south_humid') {
      if (planSeason === 'fall' || planSeason === 'winter') {
        startShiftDays -= 8;
        endShiftDays += 12;
        detailHint = ' 华南秋冬春窗口更长，这类冷凉菜通常能连续安排。';
      } else if (planSeason === 'spring') {
        endShiftDays -= 6;
        detailHint = ' 华南春末升温快，春季窗口通常收得更早。';
      }
    } else if (band === 'north_temperate' || band === 'north_cold') {
      if (planSeason === 'spring') {
        startShiftDays += 4;
        detailHint = ' 北方春播冷凉菜仍要看回温节奏，别太早下种。';
      }
      if (planSeason === 'fall') {
        startShiftDays -= 6;
        endShiftDays -= 6;
        detailHint = ' 北方秋季降温更快，冷凉菜通常要更早一轮安排。';
      }
    }
  }

  if (['tomato', 'pepper', 'eggplant', 'chili', 'cucumber'].includes(plantId)) {
    if (band === 'south_humid') {
      startShiftDays -= 4;
      endShiftDays += 6;
      detailHint = ' 华南暖季来得更早，但湿热期也要更重视通风和病害压力。';
    } else if (band === 'north_cold') {
      startShiftDays += 8;
      endShiftDays -= 4;
      detailHint = ' 寒地茄果类更依赖稳定夜温，通常要晚一点再定植。';
    }
  }

  if (['lettuce', 'bok_choy', 'spinach', 'cilantro', 'radish', 'scallion', 'chive', 'carrot', 'pea'].includes(plantId)) {
    if (band === 'south_humid') {
      if (planSeason === 'spring') {
        endShiftDays -= 8;
        detailHint = ' 华南春季回温快，这类快菜和香辛类通常要更早收尾。';
      }
      if (planSeason === 'fall' || planSeason === 'winter') {
        startShiftDays -= 6;
        endShiftDays += 10;
        detailHint = ' 华南秋冬窗口更长，这类快菜和葱蒜类通常更适合连续安排。';
      }
    } else if (band === 'north_cold') {
      if (planSeason === 'spring') {
        startShiftDays += 6;
        detailHint = ' 寒地春季仍要防地温偏低，直播类作物别太早抢种。';
      }
      if (planSeason === 'fall') {
        startShiftDays -= 8;
        endShiftDays -= 10;
        detailHint = ' 寒地秋季降温更快，快菜和根菜通常要提前一轮安排。';
      }
    }
  }

  if (['corn', 'bean', 'pumpkin', 'winter_squash', 'sweet_potato', 'okra'].includes(plantId)) {
    if (band === 'north_temperate') {
      startShiftDays += 5;
      endShiftDays -= 5;
      detailHint = ' 北方这类暖季长生育期作物更要卡住稳定高温段。';
    } else if (band === 'north_cold') {
      startShiftDays += 10;
      endShiftDays -= 10;
      detailHint = ' 寒地长生育期作物窗口更短，通常要更保守地安排。';
    } else if (band === 'south_humid') {
      startShiftDays -= 4;
      endShiftDays += 6;
      detailHint = ' 华南暖季更长，这类大体量暖季作物通常能更早起步。';
    }
  }

  if (['garlic', 'onion', 'leek'].includes(plantId)) {
    if (band === 'south_humid') {
      if (planSeason === 'fall' || planSeason === 'winter') {
        startShiftDays += 4;
        endShiftDays += 12;
        detailHint = ' 华南葱蒜类更适合落在真正转凉后的窗口，后段通常还能拉得更长。';
      }
    } else if (band === 'north_temperate' || band === 'north_cold') {
      if (planSeason === 'fall') {
        startShiftDays -= 8;
        endShiftDays -= 6;
        detailHint = ' 北方葱蒜类常要更早一点下去，先让它在入冬前稳根。';
      }
      if (planSeason === 'spring') {
        startShiftDays += 3;
        detailHint = ' 北方春季葱蒜类也要避开最冷那段土温。';
      }
    }
  }

  if (['broccoli', 'cauliflower', 'cabbage', 'celery'].includes(plantId)) {
    if (band === 'south_humid') {
      if (planSeason === 'spring') {
        endShiftDays -= 10;
        detailHint = ' 华南春末升温快，这类十字花科和芹菜类通常要更早完成主窗口。';
      }
      if (planSeason === 'fall' || planSeason === 'winter') {
        startShiftDays += 4;
        endShiftDays += 14;
        detailHint = ' 华南更适合把这类冷凉型作物放到真正凉下来后的长窗口里。';
      }
    } else if (band === 'north_cold') {
      if (planSeason === 'spring') {
        startShiftDays += 6;
        detailHint = ' 寒地春季栽培这类作物要更看回温，前期过冷容易拖慢。';
      }
      if (planSeason === 'fall') {
        startShiftDays -= 10;
        endShiftDays -= 10;
        detailHint = ' 寒地秋凉来得快，这类中长周期冷凉菜通常要提前一轮。';
      }
    }
  }

  if (['pea', 'fava_bean'].includes(plantId)) {
    if (band === 'south_humid') {
      if (planSeason === 'spring') {
        endShiftDays -= 10;
        detailHint = ' 华南豆科冷凉菜春末容易被升温推着走，通常收口更早。';
      }
      if (planSeason === 'fall' || planSeason === 'winter') {
        startShiftDays -= 6;
        endShiftDays += 12;
        detailHint = ' 华南秋冬更适合豆科冷凉作物连续安排。';
      }
    } else if (band === 'north_temperate' || band === 'north_cold') {
      if (planSeason === 'spring') {
        startShiftDays += 4;
        detailHint = ' 北方春季豆类直播仍要等土壤化透回温。';
      }
      if (planSeason === 'fall') {
        startShiftDays -= 8;
        endShiftDays -= 8;
        detailHint = ' 北方秋豆更看回凉速度，通常要尽早安排。';
      }
    }
  }

  if (['turnip', 'beet', 'potato', 'sweet_potato'].includes(plantId)) {
    if (band === 'south_humid') {
      if (plantId === 'sweet_potato') {
        startShiftDays -= 5;
        endShiftDays += 6;
        detailHint = ' 华南甘薯窗口更长，通常能更早定植、也更能往后拖。';
      } else if (planSeason === 'spring') {
        endShiftDays -= 8;
        detailHint = ' 华南根菜春季窗口收得更快，越往后越容易受升温影响。';
      }
    } else if (band === 'north_cold') {
      if (plantId === 'sweet_potato') {
        startShiftDays += 10;
        endShiftDays -= 10;
        detailHint = ' 寒地甘薯更依赖稳定高温段，窗口通常要保守很多。';
      } else if (planSeason === 'fall') {
        startShiftDays -= 6;
        endShiftDays -= 8;
        detailHint = ' 寒地秋根菜更适合提早一轮安排，给膨大期留足时间。';
      }
    }
  }

  const cityRefinement = getCityWindowRefinement(plantId, climateProfile, planSeason);
  if (cityRefinement) {
    startShiftDays += cityRefinement.startShiftDays;
    endShiftDays += cityRefinement.endShiftDays;
    detailHint = detailHint
      ? `${detailHint} ${cityRefinement.detailHint}`.trim()
      : cityRefinement.detailHint;
  }

  return { startShiftDays, endShiftDays, detailHint };
}

function getCityWindowRefinement(
  plantId: string,
  climateProfile: ClimateProfile,
  planSeason: PlanSeason
) {
  const city = (climateProfile.city || '').trim();
  if (!city) return null;

  const coreWarmSeasonPlants = ['tomato', 'pepper', 'chili', 'cucumber', 'kongxin_cai'];
  const quickLeafyPlants = ['lettuce', 'scallion'];

  if (city === '北京' || city === '西安') {
    if (planSeason === 'spring' && coreWarmSeasonPlants.includes(plantId)) {
      return {
        startShiftDays: 3,
        endShiftDays: -1,
        detailHint: `${city}春季夜温稳定通常还要再等一小段，暖季菜定植可略晚一点。`
      };
    }
    if (planSeason === 'fall' && quickLeafyPlants.includes(plantId)) {
      return {
        startShiftDays: -4,
        endShiftDays: -3,
        detailHint: `${city}秋季回凉快，快菜和葱类通常更适合提前一轮安排。`
      };
    }
  }

  if (city === '上海' || city === '杭州' || city === '武汉') {
    if (planSeason === 'spring' && plantId === 'lettuce') {
      return {
        startShiftDays: -2,
        endShiftDays: -6,
        detailHint: `${city}春末升温会更快，生菜主窗口通常收口更早。`
      };
    }
    if (planSeason === 'spring' && ['tomato', 'pepper', 'cucumber'].includes(plantId)) {
      return {
        startShiftDays: -2,
        endShiftDays: 3,
        detailHint: `${city}春季回暖较稳，茄果和瓜类通常可以略早启动。`
      };
    }
    if (planSeason === 'summer' && plantId === 'scallion') {
      return {
        startShiftDays: 2,
        endShiftDays: -2,
        detailHint: `${city}盛夏湿热偏重，小葱夏播通常更适合错开最闷热的一段。`
      };
    }
  }

  if (city === '南京' || city === '苏州' || city === '长沙') {
    if (planSeason === 'spring' && ['shanghai_qing', 'youmai_cai', 'cai_xin', 'lettuce'].includes(plantId)) {
      return {
        startShiftDays: -2,
        endShiftDays: -5,
        detailHint: `${city}春末升温和湿度抬升都偏快，叶菜窗口通常会更早收口。`
      };
    }
    if (planSeason === 'fall' && ['shanghai_qing', 'youmai_cai', 'cai_xin', 'chive', 'scallion'].includes(plantId)) {
      return {
        startShiftDays: 0,
        endShiftDays: 6,
        detailHint: `${city}秋季回凉相对平顺，叶菜和葱韭类通常可以多排一轮。`
      };
    }
    if (planSeason === 'summer' && ['yardlong_bean', 'loofah'].includes(plantId)) {
      return {
        startShiftDays: -2,
        endShiftDays: 4,
        detailHint: `${city}夏季热量和湿度都够，豇豆和丝瓜通常可以更积极一点安排。`
      };
    }
  }

  if (city === '广州' || city === '深圳') {
    if ((planSeason === 'fall' || planSeason === 'winter') && quickLeafyPlants.includes(plantId)) {
      return {
        startShiftDays: -4,
        endShiftDays: 8,
        detailHint: `${city}秋冬长季更明显，叶菜和葱类通常可以拉成长窗口连续安排。`
      };
    }
    if (planSeason === 'spring' && coreWarmSeasonPlants.includes(plantId)) {
      return {
        startShiftDays: -4,
        endShiftDays: 4,
        detailHint: `${city}暖季来得更早，核心暖季作物通常可以更积极一些。`
      };
    }
    if (planSeason === 'summer' && plantId === 'lettuce') {
      return {
        startShiftDays: 0,
        endShiftDays: -8,
        detailHint: `${city}夏季高温闷湿明显，生菜类更容易提前收口。`
      };
    }
  }

  if (city === '成都') {
    if (planSeason === 'spring' && ['tomato', 'pepper', 'chili'].includes(plantId)) {
      return {
        startShiftDays: 2,
        endShiftDays: 2,
        detailHint: '成都春季前段偏湿凉，茄果类更适合等地温和连续晴暖后再发力。'
      };
    }
    if ((planSeason === 'fall' || planSeason === 'winter') && ['lettuce', 'scallion', 'kongxin_cai'].includes(plantId)) {
      return {
        startShiftDays: -2,
        endShiftDays: 6,
        detailHint: '成都秋冬窗口通常更平顺，叶菜和小葱类安排空间会更宽一些。'
      };
    }
  }

  if (city === '青岛') {
    if (planSeason === 'spring' && ['tomato', 'pepper', 'cucumber', 'yardlong_bean', 'loofah'].includes(plantId)) {
      return {
        startShiftDays: 3,
        endShiftDays: -2,
        detailHint: '青岛春季海风和地温回升偏慢，暖季作物通常更适合再稳一小段后安排。'
      };
    }
    if (planSeason === 'fall' && ['lettuce', 'shanghai_qing', 'youmai_cai', 'scallion'].includes(plantId)) {
      return {
        startShiftDays: -3,
        endShiftDays: 2,
        detailHint: '青岛秋季白天温和、夜间转凉较快，快菜和葱类适合略提前进入窗口。'
      };
    }
  }

  if (city === '郑州') {
    if (planSeason === 'spring' && ['tomato', 'pepper', 'cucumber'].includes(plantId)) {
      return {
        startShiftDays: -1,
        endShiftDays: 3,
        detailHint: '郑州春季回暖比较直接，核心暖季菜通常可以顺着稳定升温略早展开。'
      };
    }
    if (planSeason === 'summer' && ['shanghai_qing', 'youmai_cai', 'lettuce'].includes(plantId)) {
      return {
        startShiftDays: 3,
        endShiftDays: -5,
        detailHint: '郑州盛夏热压更明显，叶菜类夏播通常要避开最热的一段。'
      };
    }
    if (planSeason === 'fall' && ['cai_xin', 'scallion', 'chive'].includes(plantId)) {
      return {
        startShiftDays: -2,
        endShiftDays: 4,
        detailHint: '郑州秋播窗口通常比较干脆，菜心和葱韭类适合早一轮接上。'
      };
    }
  }

  if (city === '昆明') {
    if (planSeason === 'spring' && ['lettuce', 'shanghai_qing', 'youmai_cai', 'cai_xin', 'scallion'].includes(plantId)) {
      return {
        startShiftDays: -3,
        endShiftDays: 6,
        detailHint: '昆明春季温和、昼夜温差稳定，快菜和葱类窗口通常更宽。'
      };
    }
    if (planSeason === 'summer' && ['tomato', 'pepper', 'cucumber', 'yardlong_bean'].includes(plantId)) {
      return {
        startShiftDays: 1,
        endShiftDays: 5,
        detailHint: '昆明夏季高温不极端，暖季菜更适合顺着雨热节奏平稳推进。'
      };
    }
    if ((planSeason === 'fall' || planSeason === 'winter') && ['lettuce', 'youmai_cai', 'chive'].includes(plantId)) {
      return {
        startShiftDays: -2,
        endShiftDays: 8,
        detailHint: '昆明秋冬冷凉菜窗口通常更长，适合拉开连续种植节奏。'
      };
    }
  }


  // === 东北地区 ===
  if (city === '沈阳' || city === '大连') {
    if (planSeason === 'spring' && ['tomato', 'pepper', 'cucumber', 'yardlong_bean'].includes(plantId)) {
      return {
        startShiftDays: 5,
        endShiftDays: -1,
        detailHint: `${city}春季回暖偏慢，暖季菜更适合等地温和晴稳后再定植。`
      };
    }
    if (planSeason === 'summer' && ['lettuce', 'scallion', 'shanghai_qing'].includes(plantId)) {
      return {
        startShiftDays: -3,
        endShiftDays: 2,
        detailHint: `${city}夏季昼长充足但夜间回凉快，叶菜类安排空间比内地更紧。`
      };
    }
    if (planSeason === 'fall' && ['shanghai_qing', 'youmai_cai', 'cai_xin'].includes(plantId)) {
      return {
        startShiftDays: -5,
        endShiftDays: -3,
        detailHint: `${city}秋季降温快于同纬度内陆，叶菜窗口会提前收口。`
      };
    }
  }

  if (city === '哈尔滨') {
    if (planSeason === 'spring' && ['tomato', 'pepper', 'cucumber'].includes(plantId)) {
      return {
        startShiftDays: 8,
        endShiftDays: -2,
        detailHint: '哈尔滨春季冻土融化迟，暖季菜更适合在明显回暖后再安排。'
      };
    }
    if (planSeason === 'summer' && ['lettuce', 'scallion', 'radish'].includes(plantId)) {
      return {
        startShiftDays: -5,
        endShiftDays: 0,
        detailHint: '哈尔滨夏季短但日照长，快菜更适合集中安排前段窗口。'
      };
    }
  }

  // === 华北平原扩展 ===
  if (city === '天津') {
    if (planSeason === 'spring' && ['tomato', 'pepper', 'cucumber'].includes(plantId)) {
      return {
        startShiftDays: 1,
        endShiftDays: 2,
        detailHint: '天津春季沿海偏凉，暖季菜略晚一点定植更稳。'
      };
    }
    if (planSeason === 'summer' && ['shanghai_qing', 'youmai_cai', 'lettuce'].includes(plantId)) {
      return {
        startShiftDays: 2,
        endShiftDays: -4,
        detailHint: '天津夏季湿热明显，叶菜窗口通常要避开最热时段。'
      };
    }
  }

  if (city === '济南') {
    if (planSeason === 'spring' && ['tomato', 'pepper', 'cucumber'].includes(plantId)) {
      return {
        startShiftDays: -1,
        endShiftDays: 2,
        detailHint: '济南春季升温偏快，暖季菜的基础窗口可以略灵活展开。'
      };
    }
    if (planSeason === 'summer' && ['shanghai_qing', 'lettuce', 'youmai_cai'].includes(plantId)) {
      return {
        startShiftDays: 3,
        endShiftDays: -6,
        detailHint: '济南夏季高温显著，叶菜夏播更适合避开最热的一段。'
      };
    }
    if (planSeason === 'fall' && ['cai_xin', 'scallion', 'chive'].includes(plantId)) {
      return {
        startShiftDays: -2,
        endShiftDays: 3,
        detailHint: '济南秋季回温平稳，秋菜窗口比较干脆。'
      };
    }
  }

  // === 华东/江淮 ===
  if (city === '宁波') {
    if (planSeason === 'spring' && ['tomato', 'pepper', 'cucumber'].includes(plantId)) {
      return {
        startShiftDays: -1,
        endShiftDays: 4,
        detailHint: '宁波春季沿海回暖略缓，暖季菜前期窗口可以适当放宽。'
      };
    }
    if (planSeason === 'summer' && ['lettuce', 'scallion'].includes(plantId)) {
      return {
        startShiftDays: 0,
        endShiftDays: -5,
        detailHint: '宁波夏季台风和湿热交替，叶菜窗口更适合提前收紧。'
      };
    }
  }

  if (city === '合肥') {
    if (planSeason === 'spring' && ['lettuce', 'shanghai_qing', 'youmai_cai', 'cai_xin'].includes(plantId)) {
      return {
        startShiftDays: -2,
        endShiftDays: -4,
        detailHint: '合肥春末升温节奏快，叶菜窗口通常收口偏早。'
      };
    }
    if (planSeason === 'summer' && ['yardlong_bean', 'loofah'].includes(plantId)) {
      return {
        startShiftDays: -2,
        endShiftDays: 3,
        detailHint: '合肥夏季热量充足，瓜豆类可以更积极安排。'
      };
    }
  }

  // === 华南扩展 ===
  if (city === '东莞' || city === '佛山') {
    if ((planSeason === 'fall' || planSeason === 'winter') && ['lettuce', 'scallion', 'kongxin_cai'].includes(plantId)) {
      return {
        startShiftDays: -5,
        endShiftDays: 10,
        detailHint: `${city}秋冬长季非常明显，叶菜窗口可以拉长连续安排。`
      };
    }
    if (planSeason === 'spring' && ['tomato', 'pepper', 'chili', 'cucumber'].includes(plantId)) {
      return {
        startShiftDays: -3,
        endShiftDays: 5,
        detailHint: `${city}春季回暖早，暖季作物适合更积极安排。`
      };
    }
  }

  if (city === '南宁') {
    if ((planSeason === 'fall' || planSeason === 'winter') && ['lettuce', 'scallion', 'kongxin_cai'].includes(plantId)) {
      return {
        startShiftDays: -6,
        endShiftDays: 12,
        detailHint: '南宁冬季温和，叶菜窗口远比长江流域宽，可以多排几轮。'
      };
    }
    if (planSeason === 'spring' && coreWarmSeasonPlants.includes(plantId)) {
      return {
        startShiftDays: -5,
        endShiftDays: 5,
        detailHint: '南宁春季早暖明显，暖季作物窗口可以更早启动。'
      };
    }
  }

  if (city === '海口') {
    if ((planSeason === 'winter' || planSeason === 'spring') && ['lettuce', 'scallion', 'kongxin_cai'].includes(plantId)) {
      return {
        startShiftDays: -10,
        endShiftDays: 20,
        detailHint: '海口基本无霜冻，适合全年滚动安排叶菜和快菜。'
      };
    }
    if ((planSeason === 'summer' || planSeason === 'spring') && ['tomato', 'pepper', 'cucumber'].includes(plantId)) {
      return {
        startShiftDays: -8,
        endShiftDays: 6,
        detailHint: '海口夏季高温多雨，暖季作物注意避雨和高畦安排。'
      };
    }
  }

  // === 西南扩展 ===
  if (city === '贵阳') {
    if (planSeason === 'spring' && ['lettuce', 'shanghai_qing', 'youmai_cai', 'cai_xin'].includes(plantId)) {
      return {
        startShiftDays: -2,
        endShiftDays: 5,
        detailHint: '贵阳春季阴雨多升温慢，叶菜窗口比同纬度略宽。'
      };
    }
    if (planSeason === 'summer' && ['tomato', 'pepper', 'cucumber'].includes(plantId)) {
      return {
        startShiftDays: 1,
        endShiftDays: 3,
        detailHint: '贵阳夏季不极端高温，暖季菜适合顺着雨热节奏平稳推进。'
      };
    }
  }

  if (city === '重庆') {
    if (planSeason === 'spring' && ['tomato', 'pepper', 'chili'].includes(plantId)) {
      return {
        startShiftDays: 2,
        endShiftDays: 2,
        detailHint: '重庆春季前段偏湿冷，茄果类适合当地温和晴暖后再发力。'
      };
    }
    if (planSeason === 'summer' && ['lettuce', 'shanghai_qing', 'youmai_cai'].includes(plantId)) {
      return {
        startShiftDays: 0,
        endShiftDays: -8,
        detailHint: '重庆夏季高温闷热明显，叶菜窗口收口早，更适合安排耐热品种。'
      };
    }
    if (planSeason === 'fall' && ['lettuce', 'scallion', 'kongxin_cai'].includes(plantId)) {
      return {
        startShiftDays: -2,
        endShiftDays: 5,
        detailHint: '重庆秋季高温逐步缓解，叶菜窗口可以平稳接上。'
      };
    }
  }

  // === 东南沿海 ===
  if (city === '福州' || city === '厦门') {
    if ((planSeason === 'fall' || planSeason === 'winter') && ['lettuce', 'scallion', 'kongxin_cai'].includes(plantId)) {
      return {
        startShiftDays: -5,
        endShiftDays: 10,
        detailHint: `${city}秋冬温度适中，叶菜和快菜适合拉成长窗口安排。`
      };
    }
    if (planSeason === 'spring' && coreWarmSeasonPlants.includes(plantId)) {
      return {
        startShiftDays: -3,
        endShiftDays: 4,
        detailHint: `${city}春季回暖较早，暖季菜可以更积极启动。`
      };
    }
  }

  // === 西北地区 ===
  if (city === '兰州') {
    if (planSeason === 'spring' && ['tomato', 'pepper', 'cucumber'].includes(plantId)) {
      return {
        startShiftDays: 3,
        endShiftDays: -1,
        detailHint: '兰州春季回温较慢且偏干，暖季菜定植略晚更稳。'
      };
    }
    if (planSeason === 'summer' && ['lettuce', 'radish', 'scallion'].includes(plantId)) {
      return {
        startShiftDays: -3,
        endShiftDays: 4,
        detailHint: '兰州夏季温差大且日照充足，快菜和叶菜安排空间不错。'
      };
    }
  }

  if (city === '乌鲁木齐') {
    if (planSeason === 'spring' && ['tomato', 'pepper', 'cucumber'].includes(plantId)) {
      return {
        startShiftDays: 5,
        endShiftDays: -2,
        detailHint: '乌鲁木齐春季回温晚且偏干，暖季菜窗口需要更保守。'
      };
    }
    if (planSeason === 'summer' && ['lettuce', 'radish', 'scallion'].includes(plantId)) {
      return {
        startShiftDays: -5,
        endShiftDays: 2,
        detailHint: '乌鲁木齐夏季昼夜温差大，快菜适合集中安排在前段。'
      };
    }
  }

  // === 华北/华中扩展 ===
  if (city === '石家庄') {
    if (planSeason === 'spring' && ['tomato', 'pepper', 'cucumber'].includes(plantId)) {
      return {
        startShiftDays: 0,
        endShiftDays: 2,
        detailHint: '石家庄春季升温稳定，暖季菜可以按基础窗口安排。'
      };
    }
    if (planSeason === 'summer' && ['shanghai_qing', 'youmai_cai', 'lettuce'].includes(plantId)) {
      return {
        startShiftDays: 2,
        endShiftDays: -5,
        detailHint: '石家庄夏季干热明显，叶菜窗口需避开最热时段。'
      };
    }
  }

  if (city === '太原') {
    if (planSeason === 'spring' && ['tomato', 'pepper', 'cucumber'].includes(plantId)) {
      return {
        startShiftDays: 4,
        endShiftDays: -1,
        detailHint: '太原春季偏凉且干燥，暖季菜需等地温和气温稳定后再定植。'
      };
    }
    if (planSeason === 'fall' && ['lettuce', 'scallion', 'cai_xin'].includes(plantId)) {
      return {
        startShiftDays: -4,
        endShiftDays: 2,
        detailHint: '太原秋季降温偏快，叶菜窗口需提前安排。'
      };
    }
  }

  if (city === '南昌') {
    if (planSeason === 'spring' && ['lettuce', 'shanghai_qing', 'youmai_cai', 'cai_xin'].includes(plantId)) {
      return {
        startShiftDays: -2,
        endShiftDays: -5,
        detailHint: '南昌春季升温偏快、湿度大，叶菜窗口容易提前收口。'
      };
    }
    if (planSeason === 'summer' && ['yardlong_bean', 'loofah', 'kongxin_cai'].includes(plantId)) {
      return {
        startShiftDays: -2,
        endShiftDays: 4,
        detailHint: '南昌夏季高温高湿，耐热类瓜豆适合积极安排。'
      };
    }
  }
  return null;
}

function getRuntimeWindowAdjustment(
  climateProfile: ClimateProfile,
  planSeason: PlanSeason,
  plantId: string
) {
  const scenario = climateProfile.mockWeatherScenario || 'auto';
  let startShiftDays = 0;
  let endShiftDays = 0;
  let scoreDelta = 0;
  let detailHint = '';

  if (scenario === 'cold_snap') {
    startShiftDays += 4;
    endShiftDays -= 2;
    scoreDelta -= 2;
    detailHint = ' 当前按偏冷风险情景收紧了前段窗口。';
  } else if (scenario === 'heat') {
    if (planSeason === 'spring') endShiftDays -= 4;
    if (['lettuce', 'bok_choy', 'spinach', 'youmai_cai', 'xiaoyoucai', 'shanghai_qing'].includes(plantId)) {
      endShiftDays -= 4;
      scoreDelta -= 2;
      detailHint = ' 当前按偏热风险情景，冷凉菜窗口会更早收口。';
    } else {
      scoreDelta += 1;
      detailHint = ' 当前按偏热风险情景，暖季作物窗口会略偏积极。';
    }
  } else if (scenario === 'rain') {
    scoreDelta -= 1;
    detailHint = ' 当前按偏湿风险情景，建议把窗口理解得更保守一点。';
  } else if (scenario === 'dry') {
    if (['kongxin_cai', 'cucumber', 'loofah', 'bitter_melon', 'donggua'].includes(plantId)) {
      scoreDelta -= 2;
      detailHint = ' 当前按偏干风险情景，高需水作物的实际成功率会略降。';
    } else {
      detailHint = ' 当前按偏干风险情景，建议同步评估补水能力。';
    }
  }

  return {
    startShiftDays,
    endShiftDays,
    scoreDelta,
    source: 'mock' as const,
    detailHint
  };
}

function getRegionalSupplementMaturityThreshold(
  climateProfile: ClimateProfile,
  planSeason: PlanSeason
) {
  const band = climateProfile.climateBand || 'east_monsoon';
  if (band === 'south_humid') {
    return planSeason === 'fall' || planSeason === 'winter' ? 95 : 85;
  }
  if (band === 'east_monsoon' || band === 'central') {
    return planSeason === 'fall' ? 82 : 75;
  }
  if (band === 'north_temperate') {
    return planSeason === 'fall' ? 65 : 70;
  }
  if (band === 'north_cold') {
    return 60;
  }
  if (band === 'southwest_plateau') {
    return 72;
  }
  return 75;
}

function regionalSupplementThresholdLabel(
  climateProfile: ClimateProfile,
  planSeason: PlanSeason,
  threshold: number
) {
  const band = climateProfile.climateBand || 'east_monsoon';
  if (band === 'south_humid') return `${climateProfile.climateLabel || '华南'}这季补种更常按 ${threshold} 天内回收来判断`;
  if (band === 'east_monsoon' || band === 'central') return `${climateProfile.climateLabel || '长江流域'}这季补种更常按 ${threshold} 天内回收来判断`;
  if (band === 'north_temperate' || band === 'north_cold') return `北方季中补种通常更看 ${threshold} 天内能否收回`;
  return `当前地区补种更常按 ${threshold} 天内回收来判断`;
}

function regionalSupplementPaceHint(
  climateProfile: ClimateProfile,
  planSeason: PlanSeason
) {
  const band = climateProfile.climateBand || 'east_monsoon';
  if (band === 'south_humid') {
    return planSeason === 'fall' || planSeason === 'winter' ? '适合顺着长季做连续补种' : '适合边采边补、连续衔接';
  }
  if (band === 'east_monsoon' || band === 'central') {
    return '适合分批补种，留出下一轮接替空间';
  }
  if (band === 'north_temperate' || band === 'north_cold') {
    return '更适合抓紧本季窗口做短周期补种';
  }
  if (band === 'southwest_plateau') {
    return '适合看昼夜温差节奏，稳住后再补种';
  }
  return '适合作为当前节奏下的补种选择';
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
