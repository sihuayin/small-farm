import type { ClimateProfile, MockWeatherScenario, PlanSeason, WeatherSignal, WeeklyForecast, WeatherDay } from './types';

interface ClimatePreset {
  name: string;
  hardinessZone: string;
  lastFrostDate: string;
  firstFrostDate: string;
}

const zipPrefixPresets: Array<{ min: number; max: number; preset: ClimatePreset }> = [
  { min: 0, max: 2799, preset: { name: 'Northeast', hardinessZone: '6a', lastFrostDate: '05-05', firstFrostDate: '10-05' } },
  { min: 2800, max: 2999, preset: { name: 'Southern New England', hardinessZone: '6b', lastFrostDate: '04-25', firstFrostDate: '10-15' } },
  { min: 3000, max: 3999, preset: { name: 'New Hampshire / Vermont', hardinessZone: '5b', lastFrostDate: '05-15', firstFrostDate: '09-25' } },
  { min: 4000, max: 4999, preset: { name: 'Maine', hardinessZone: '5a', lastFrostDate: '05-20', firstFrostDate: '09-20' } },
  { min: 10000, max: 19999, preset: { name: 'Mid-Atlantic', hardinessZone: '7a', lastFrostDate: '04-15', firstFrostDate: '10-25' } },
  { min: 20000, max: 29999, preset: { name: 'Southeast', hardinessZone: '8a', lastFrostDate: '03-25', firstFrostDate: '11-10' } },
  { min: 30000, max: 34999, preset: { name: 'Georgia / North Florida', hardinessZone: '8b', lastFrostDate: '03-15', firstFrostDate: '11-20' } },
  { min: 35000, max: 39999, preset: { name: 'Deep South', hardinessZone: '8a', lastFrostDate: '03-20', firstFrostDate: '11-15' } },
  { min: 40000, max: 49999, preset: { name: 'Great Lakes / Ohio Valley', hardinessZone: '6a', lastFrostDate: '05-01', firstFrostDate: '10-10' } },
  { min: 50000, max: 59999, preset: { name: 'Upper Midwest', hardinessZone: '5a', lastFrostDate: '05-15', firstFrostDate: '09-25' } },
  { min: 60000, max: 69999, preset: { name: 'Central Plains', hardinessZone: '6a', lastFrostDate: '04-25', firstFrostDate: '10-10' } },
  { min: 70000, max: 79999, preset: { name: 'South Central', hardinessZone: '8a', lastFrostDate: '03-15', firstFrostDate: '11-15' } },
  { min: 80000, max: 83999, preset: { name: 'Rocky Mountains', hardinessZone: '5b', lastFrostDate: '05-20', firstFrostDate: '09-25' } },
  { min: 84000, max: 89999, preset: { name: 'Great Basin / Desert', hardinessZone: '7a', lastFrostDate: '04-20', firstFrostDate: '10-20' } },
  { min: 90000, max: 92999, preset: { name: 'Southern California', hardinessZone: '10a', lastFrostDate: '02-15', firstFrostDate: '12-15' } },
  { min: 93000, max: 96999, preset: { name: 'California Coast / Valley', hardinessZone: '9b', lastFrostDate: '03-01', firstFrostDate: '11-30' } },
  { min: 97000, max: 97999, preset: { name: 'Oregon', hardinessZone: '8b', lastFrostDate: '04-10', firstFrostDate: '11-05' } },
  { min: 98000, max: 99499, preset: { name: 'Washington / Idaho', hardinessZone: '8a', lastFrostDate: '04-15', firstFrostDate: '10-25' } }
];

export function inferClimateProfileFromZip(zipCode: string): { profile: ClimateProfile; source: string } | null {
  const normalizedZip = zipCode.replace(/\D/g, '').slice(0, 5);
  if (normalizedZip.length < 3) return null;

  const zipValue = Number(normalizedZip.padEnd(5, '0'));
  const match = zipPrefixPresets.find(item => zipValue >= item.min && zipValue <= item.max);
  if (!match) return null;

  return {
    profile: {
      country: 'CN',
      zipCode: normalizedZip,
      hardinessZone: match.preset.hardinessZone,
      lastFrostDate: match.preset.lastFrostDate,
      firstFrostDate: match.preset.firstFrostDate,
      mockWeatherScenario: 'auto'
    },
    source: match.preset.name
  };
}

type ChinaClimatePreset = {
  province: string;
  city?: string;
  district?: string;
  climateBand: NonNullable<ClimateProfile['climateBand']>;
  climateLabel: string;
  hardinessZone: string;
  lastFrostDate: string;
  firstFrostDate: string;
};

const chinaProvincePresets: ChinaClimatePreset[] = [
  { province: '北京', climateBand: 'north_temperate', climateLabel: '华北平原', hardinessZone: '6b', lastFrostDate: '04-10', firstFrostDate: '10-20' },
  { province: '天津', climateBand: 'north_temperate', climateLabel: '华北平原', hardinessZone: '6b', lastFrostDate: '04-08', firstFrostDate: '10-24' },
  { province: '河北', climateBand: 'north_temperate', climateLabel: '华北平原', hardinessZone: '6b', lastFrostDate: '04-12', firstFrostDate: '10-18' },
  { province: '山西', climateBand: 'north_temperate', climateLabel: '黄土高原', hardinessZone: '5b', lastFrostDate: '04-20', firstFrostDate: '10-05' },
  { province: '辽宁', climateBand: 'north_cold', climateLabel: '辽东平原', hardinessZone: '5b', lastFrostDate: '04-28', firstFrostDate: '09-28' },
  { province: '吉林', climateBand: 'north_cold', climateLabel: '东北平原', hardinessZone: '4b', lastFrostDate: '05-05', firstFrostDate: '09-20' },
  { province: '黑龙江', climateBand: 'north_cold', climateLabel: '东北寒地', hardinessZone: '4a', lastFrostDate: '05-12', firstFrostDate: '09-15' },
  { province: '江苏', climateBand: 'east_monsoon', climateLabel: '江淮平原', hardinessZone: '8a', lastFrostDate: '03-18', firstFrostDate: '11-15' },
  { province: '浙江', climateBand: 'east_monsoon', climateLabel: '江南湿润', hardinessZone: '8a', lastFrostDate: '03-15', firstFrostDate: '11-20' },
  { province: '安徽', climateBand: 'central', climateLabel: '江淮过渡', hardinessZone: '7b', lastFrostDate: '03-22', firstFrostDate: '11-08' },
  { province: '福建', climateBand: 'south_humid', climateLabel: '东南沿海', hardinessZone: '9b', lastFrostDate: '02-20', firstFrostDate: '12-10' },
  { province: '江西', climateBand: 'central', climateLabel: '江南内陆', hardinessZone: '8a', lastFrostDate: '03-12', firstFrostDate: '11-22' },
  { province: '山东', climateBand: 'north_temperate', climateLabel: '华东北缘', hardinessZone: '6b', lastFrostDate: '04-10', firstFrostDate: '10-20' },
  { province: '河南', climateBand: 'central', climateLabel: '中原平原', hardinessZone: '7a', lastFrostDate: '03-25', firstFrostDate: '11-02' },
  { province: '湖北', climateBand: 'central', climateLabel: '长江中游', hardinessZone: '8a', lastFrostDate: '03-18', firstFrostDate: '11-18' },
  { province: '湖南', climateBand: 'central', climateLabel: '江南丘陵', hardinessZone: '8a', lastFrostDate: '03-10', firstFrostDate: '11-25' },
  { province: '广东', climateBand: 'south_humid', climateLabel: '华南湿热', hardinessZone: '10a', lastFrostDate: '02-05', firstFrostDate: '12-20' },
  { province: '广西', climateBand: 'south_humid', climateLabel: '华南湿热', hardinessZone: '9b', lastFrostDate: '02-12', firstFrostDate: '12-10' },
  { province: '海南', climateBand: 'south_humid', climateLabel: '热带滨海', hardinessZone: '11a', lastFrostDate: '01-20', firstFrostDate: '12-31' },
  { province: '重庆', climateBand: 'southwest_plateau', climateLabel: '西南盆地', hardinessZone: '8a', lastFrostDate: '03-08', firstFrostDate: '11-28' },
  { province: '四川', climateBand: 'southwest_plateau', climateLabel: '西南盆地', hardinessZone: '8a', lastFrostDate: '03-05', firstFrostDate: '11-30' },
  { province: '贵州', climateBand: 'southwest_plateau', climateLabel: '云贵高原', hardinessZone: '8b', lastFrostDate: '03-05', firstFrostDate: '11-18' },
  { province: '云南', climateBand: 'southwest_plateau', climateLabel: '低纬高原', hardinessZone: '9a', lastFrostDate: '02-25', firstFrostDate: '12-05' },
  { province: '陕西', climateBand: 'north_temperate', climateLabel: '关中平原', hardinessZone: '6b', lastFrostDate: '04-08', firstFrostDate: '10-22' },
  { province: '甘肃', climateBand: 'north_temperate', climateLabel: '西北内陆', hardinessZone: '5b', lastFrostDate: '04-25', firstFrostDate: '09-30' },
  { province: '青海', climateBand: 'north_cold', climateLabel: '高寒高原', hardinessZone: '4b', lastFrostDate: '05-15', firstFrostDate: '09-10' },
  { province: '宁夏', climateBand: 'north_temperate', climateLabel: '西北灌区', hardinessZone: '5b', lastFrostDate: '04-20', firstFrostDate: '10-02' },
  { province: '新疆', climateBand: 'north_temperate', climateLabel: '西北干旱区', hardinessZone: '6a', lastFrostDate: '04-25', firstFrostDate: '09-28' },
  { province: '内蒙古', climateBand: 'north_cold', climateLabel: '北方高原', hardinessZone: '4b', lastFrostDate: '05-08', firstFrostDate: '09-18' }
];

const chinaCityPresets: ChinaClimatePreset[] = [
  { province: '北京', city: '北京', climateBand: 'north_temperate', climateLabel: '华北平原', hardinessZone: '6b', lastFrostDate: '04-10', firstFrostDate: '10-20' },
  { province: '天津', city: '天津', climateBand: 'north_temperate', climateLabel: '华北平原', hardinessZone: '6b', lastFrostDate: '04-08', firstFrostDate: '10-24' },
  { province: '河北', city: '石家庄', climateBand: 'north_temperate', climateLabel: '华北平原', hardinessZone: '6b', lastFrostDate: '04-12', firstFrostDate: '10-18' },
  { province: '辽宁', city: '沈阳', climateBand: 'north_cold', climateLabel: '辽东平原', hardinessZone: '5b', lastFrostDate: '04-28', firstFrostDate: '09-28' },
  { province: '吉林', city: '长春', climateBand: 'north_cold', climateLabel: '东北平原', hardinessZone: '4b', lastFrostDate: '05-05', firstFrostDate: '09-20' },
  { province: '黑龙江', city: '哈尔滨', climateBand: 'north_cold', climateLabel: '东北寒地', hardinessZone: '4a', lastFrostDate: '05-12', firstFrostDate: '09-15' },
  { province: '上海', city: '上海', climateBand: 'east_monsoon', climateLabel: '江南沿海', hardinessZone: '8b', lastFrostDate: '03-10', firstFrostDate: '11-30' },
  { province: '江苏', city: '南京', climateBand: 'east_monsoon', climateLabel: '江淮平原', hardinessZone: '8a', lastFrostDate: '03-18', firstFrostDate: '11-15' },
  { province: '江苏', city: '苏州', climateBand: 'east_monsoon', climateLabel: '江南水网', hardinessZone: '8b', lastFrostDate: '03-12', firstFrostDate: '11-28' },
  { province: '浙江', city: '杭州', climateBand: 'east_monsoon', climateLabel: '江南湿润', hardinessZone: '8a', lastFrostDate: '03-15', firstFrostDate: '11-20' },
  { province: '浙江', city: '宁波', climateBand: 'east_monsoon', climateLabel: '东海沿岸', hardinessZone: '8b', lastFrostDate: '03-10', firstFrostDate: '11-28' },
  { province: '福建', city: '福州', climateBand: 'south_humid', climateLabel: '东南沿海', hardinessZone: '9b', lastFrostDate: '02-20', firstFrostDate: '12-10' },
  { province: '福建', city: '厦门', climateBand: 'south_humid', climateLabel: '闽南滨海', hardinessZone: '10a', lastFrostDate: '02-10', firstFrostDate: '12-20' },
  { province: '山东', city: '济南', climateBand: 'north_temperate', climateLabel: '华东北缘', hardinessZone: '6b', lastFrostDate: '04-10', firstFrostDate: '10-20' },
  { province: '山东', city: '青岛', climateBand: 'north_temperate', climateLabel: '胶东沿海', hardinessZone: '7a', lastFrostDate: '04-08', firstFrostDate: '10-28' },
  { province: '河南', city: '郑州', climateBand: 'central', climateLabel: '中原平原', hardinessZone: '7a', lastFrostDate: '03-25', firstFrostDate: '11-02' },
  { province: '广东', city: '广州', climateBand: 'south_humid', climateLabel: '华南湿热', hardinessZone: '10a', lastFrostDate: '02-05', firstFrostDate: '12-20' },
  { province: '广东', city: '深圳', climateBand: 'south_humid', climateLabel: '华南滨海', hardinessZone: '10b', lastFrostDate: '01-25', firstFrostDate: '12-25' },
  { province: '湖北', city: '武汉', climateBand: 'central', climateLabel: '长江中游', hardinessZone: '8a', lastFrostDate: '03-18', firstFrostDate: '11-18' },
  { province: '湖南', city: '长沙', climateBand: 'central', climateLabel: '江南丘陵', hardinessZone: '8a', lastFrostDate: '03-10', firstFrostDate: '11-25' },
  { province: '江西', city: '南昌', climateBand: 'central', climateLabel: '江南内陆', hardinessZone: '8a', lastFrostDate: '03-12', firstFrostDate: '11-22' },
  { province: '四川', city: '成都', climateBand: 'southwest_plateau', climateLabel: '西南盆地', hardinessZone: '8a', lastFrostDate: '03-05', firstFrostDate: '11-30' },
  { province: '重庆', city: '重庆', climateBand: 'southwest_plateau', climateLabel: '西南盆地', hardinessZone: '8a', lastFrostDate: '03-08', firstFrostDate: '11-28' },
  { province: '贵州', city: '贵阳', climateBand: 'southwest_plateau', climateLabel: '云贵高原', hardinessZone: '8b', lastFrostDate: '03-05', firstFrostDate: '11-18' },
  { province: '云南', city: '昆明', climateBand: 'southwest_plateau', climateLabel: '低纬高原', hardinessZone: '9a', lastFrostDate: '02-25', firstFrostDate: '12-05' },
  { province: '陕西', city: '西安', climateBand: 'north_temperate', climateLabel: '关中平原', hardinessZone: '6b', lastFrostDate: '04-08', firstFrostDate: '10-22' },
  { province: '甘肃', city: '兰州', climateBand: 'north_temperate', climateLabel: '西北内陆', hardinessZone: '5b', lastFrostDate: '04-25', firstFrostDate: '09-30' },
  { province: '青海', city: '西宁', climateBand: 'north_cold', climateLabel: '高寒高原', hardinessZone: '4b', lastFrostDate: '05-15', firstFrostDate: '09-10' },
  { province: '宁夏', city: '银川', climateBand: 'north_temperate', climateLabel: '西北灌区', hardinessZone: '5b', lastFrostDate: '04-20', firstFrostDate: '10-02' },
  { province: '新疆', city: '乌鲁木齐', climateBand: 'north_temperate', climateLabel: '西北干旱区', hardinessZone: '6a', lastFrostDate: '04-25', firstFrostDate: '09-28' }
];

export function inferChinaClimateProfile(
  province: string,
  city: string,
  district = ''
): { profile: ClimateProfile; source: string } | null {
  const normalizedProvince = normalizeRegionName(province);
  const normalizedCity = normalizeRegionName(city);
  if (!normalizedProvince) return null;

  const cityMatch = normalizedCity
    ? chinaCityPresets.find(item => item.province === normalizedProvince && normalizeRegionName(item.city || '') === normalizedCity)
    : null;
  const provinceMatch = chinaProvincePresets.find(item => item.province === normalizedProvince);
  const match = cityMatch || provinceMatch;
  if (!match) return null;
  const resolvedCity = cityMatch?.city || city.trim();

  return {
    profile: {
      country: 'CN',
      province: normalizedProvince,
      city: resolvedCity,
      district: district.trim(),
      climateBand: match.climateBand,
      climateLabel: match.climateLabel,
      zipCode: `${normalizedProvince}${resolvedCity ? resolvedCity : ''}${district ? ` ${district.trim()}` : ''}`,
      hardinessZone: match.hardinessZone,
      lastFrostDate: match.lastFrostDate,
      firstFrostDate: match.firstFrostDate,
      mockWeatherScenario: 'auto'
    },
    source: cityMatch ? `${cityMatch.city}城市画像` : `${normalizedProvince}省级画像`
  };
}

function normalizeRegionName(value: string) {
  return value.trim().replace(/(省|市|自治区|特别行政区|地区|盟)$/g, '');
}

// ==================== 季节性天气引擎 ====================
// 基于气候画像和中国省级数据模拟真实天气信号
// 后续可替换为真实天气 API

interface ClimateNormals {
  summerTempHigh: [number, number];  // 夏季高温范围
  summerTempLow: [number, number];   // 夏季低温范围
  winterTempHigh: [number, number];
  winterTempLow: [number, number];
  springRainfall: 'low' | 'medium' | 'high';
  summerRainfall: 'low' | 'medium' | 'high';
  fallRainfall: 'low' | 'medium' | 'high';
  frostRisk: 'low' | 'medium' | 'high';  // 倒春寒/早霜风险
  typhoonRisk: boolean;
}

const climateNormalsByBand: Record<string, ClimateNormals> = {
  north_cold: {
    summerTempHigh: [22, 28], summerTempLow: [12, 18],
    winterTempHigh: [-10, 0], winterTempLow: [-25, -15],
    springRainfall: 'low', summerRainfall: 'medium', fallRainfall: 'low',
    frostRisk: 'high', typhoonRisk: false
  },
  north_temperate: {
    summerTempHigh: [28, 34], summerTempLow: [18, 23],
    winterTempHigh: [0, 8], winterTempLow: [-8, 0],
    springRainfall: 'low', summerRainfall: 'medium', fallRainfall: 'low',
    frostRisk: 'high', typhoonRisk: false
  },
  central: {
    summerTempHigh: [30, 36], summerTempLow: [22, 27],
    winterTempHigh: [5, 12], winterTempLow: [-2, 5],
    springRainfall: 'high', summerRainfall: 'high', fallRainfall: 'medium',
    frostRisk: 'medium', typhoonRisk: false
  },
  east_monsoon: {
    summerTempHigh: [32, 38], summerTempLow: [24, 28],
    winterTempHigh: [3, 10], winterTempLow: [-3, 4],
    springRainfall: 'high', summerRainfall: 'high', fallRainfall: 'medium',
    frostRisk: 'medium', typhoonRisk: true
  },
  south_humid: {
    summerTempHigh: [32, 36], summerTempLow: [24, 28],
    winterTempHigh: [14, 22], winterTempLow: [8, 15],
    springRainfall: 'high', summerRainfall: 'high', fallRainfall: 'medium',
    frostRisk: 'low', typhoonRisk: true
  },
  southwest_plateau: {
    summerTempHigh: [22, 28], summerTempLow: [14, 18],
    winterTempHigh: [12, 18], winterTempLow: [2, 8],
    springRainfall: 'medium', summerRainfall: 'medium', fallRainfall: 'low',
    frostRisk: 'medium', typhoonRisk: false
  }
};

const defaultNormals: ClimateNormals = {
  summerTempHigh: [28, 34], summerTempLow: [18, 24],
  winterTempHigh: [4, 12], winterTempLow: [-4, 4],
  springRainfall: 'medium', summerRainfall: 'medium', fallRainfall: 'medium',
  frostRisk: 'medium', typhoonRisk: false
};

function getClimateNormals(climateProfile: ClimateProfile): ClimateNormals {
  const band = climateProfile.climateBand || 'central';
  return climateNormalsByBand[band] || defaultNormals;
}

function getSeasonTempRange(normals: ClimateNormals, season: PlanSeason): [number, number] {
  if (season === 'summer') return normals.summerTempHigh;
  if (season === 'winter') return normals.winterTempHigh;
  // spring/fall: 取夏冬中间值
  const summerAvg = (normals.summerTempHigh[0] + normals.summerTempHigh[1]) / 2;
  const winterAvg = (normals.winterTempHigh[0] + normals.winterTempHigh[1]) / 2;
  const midLow = Math.min(summerAvg, winterAvg) + Math.abs(summerAvg - winterAvg) * 0.25;
  const midHigh = Math.min(summerAvg, winterAvg) + Math.abs(summerAvg - winterAvg) * 0.75;
  return [Math.round(midLow), Math.round(midHigh)];
}

function getSeasonLowRange(normals: ClimateNormals, season: PlanSeason): [number, number] {
  if (season === 'summer') return normals.summerTempLow;
  if (season === 'winter') return normals.winterTempLow;
  const summerAvg = (normals.summerTempLow[0] + normals.summerTempLow[1]) / 2;
  const winterAvg = (normals.winterTempLow[0] + normals.winterTempLow[1]) / 2;
  const midLow = Math.min(summerAvg, winterAvg) + Math.abs(summerAvg - winterAvg) * 0.25;
  const midHigh = Math.min(summerAvg, winterAvg) + Math.abs(summerAvg - winterAvg) * 0.75;
  return [Math.round(midLow), Math.round(midHigh)];
}

function getSeasonRainfall(normals: ClimateNormals, season: PlanSeason): 'low' | 'medium' | 'high' {
  if (season === 'summer') return normals.summerRainfall;
  if (season === 'fall') return normals.fallRainfall;
  return normals.springRainfall; // spring/winter
}

function randomInRange(seed: number, min: number, max: number): number {
  const r = ((seed * 9301 + 49297) % 233280) / 233280;
  return Math.round(min + r * (max - min));
}

function generateForecastDays(normals: ClimateNormals, season: PlanSeason, count: number): {
  days: WeatherDay[];
  summary: string;
} {
  const days: import('./types').WeatherDay[] = [];
  const tempRange = getSeasonTempRange(normals, season);
  const lowRange = getSeasonLowRange(normals, season);
  const rainfall = getSeasonRainfall(normals, season);
  const baseDate = new Date();
  const rainfallWeights: Record<string, number> = { low: 0.1, medium: 0.3, high: 0.5 };

  let rainChance = rainfallWeights[rainfall];
  // 夏季更高概率阵雨
  if (season === 'summer') rainChance = Math.min(1, rainChance + 0.1);
  // 秋季稳定
  if (season === 'fall') rainChance = Math.max(0.05, rainChance - 0.05);

  for (let i = 0; i < count; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    const seed = i * 7 + 3;
    const tempHigh = randomInRange(seed, tempRange[0], tempRange[1]);
    const tempLow = randomInRange(seed + 1, lowRange[0], lowRange[1]);
    const rainSeed = randomInRange(seed + 2, 0, 100) / 100;
    const isRain = rainSeed < rainChance;
    const isStorm = isRain && season === 'summer' && rainSeed < rainChance * 0.2;
    const isCloudy = !isRain && rainSeed < rainChance + 0.25;
    const humidity = isRain ? randomInRange(seed + 3, 70, 95) : isCloudy ? randomInRange(seed + 4, 50, 75) : randomInRange(seed + 5, 30, 55);
    const precipitation = isRain ? (isStorm ? randomInRange(seed + 6, 10, 50) : randomInRange(seed + 7, 1, 15)) : 0;
    const windSpeed = isStorm ? randomInRange(seed + 8, 20, 50) : randomInRange(seed + 9, 5, 20);

    days.push({
      date: dateStr,
      tempHigh: Math.max(tempLow + 2, tempHigh),
      tempLow: Math.min(tempLow, tempHigh - 2),
      condition: isStorm ? 'storm' : isRain ? 'rain' : isCloudy ? 'cloudy' : 'sunny',
      precipitation,
      humidity,
      windSpeed
    });
  }

  const avgHigh = Math.round(days.reduce((s, d) => s + d.tempHigh, 0) / days.length);
  const avgLow = Math.round(days.reduce((s, d) => s + d.tempLow, 0) / days.length);
  const rainDays = days.filter(d => d.condition === 'rain' || d.condition === 'storm').length;
  const summary = rainDays > 0
    ? `${avgHigh}°/${avgLow}° · ${rainDays}/${count} 天有雨`
    : `${avgHigh}°/${avgLow}° · 少雨`;

  return { days, summary };
}

export function getSeasonWeatherForecast(
  climateProfile: ClimateProfile,
  planSeason: PlanSeason
): WeeklyForecast {
  const normals = getClimateNormals(climateProfile);
  return generateForecastDays(normals, planSeason, 7);
}

export function generateWeatherSignals(
  climateProfile: ClimateProfile,
  planSeason: PlanSeason
): WeatherSignal[] {
  const normals = getClimateNormals(climateProfile);
  const signals: WeatherSignal[] = [];
  const zoneNumber = Number.parseInt(climateProfile.hardinessZone, 10) || 7;
  const forecast = generateForecastDays(normals, planSeason, 7);
  const avgHigh = Math.round(forecast.days.reduce((s, d) => s + d.tempHigh, 0) / forecast.days.length);
  const avgLow = Math.round(forecast.days.reduce((s, d) => s + d.tempLow, 0) / forecast.days.length);
  const rainDays = forecast.days.filter(d => d.condition === 'rain' || d.condition === 'storm').length;
  const stormDays = forecast.days.filter(d => d.condition === 'storm').length;

  // 信号 1：霜冻风险（春季 + 北方 + 秋季末）
  if (planSeason === 'spring' && (normals.frostRisk === 'high' || zoneNumber <= 6)) {
    signals.push({
      id: 'season-frost',
      type: 'frost',
      label: '季节霜冻风险提示',
      detail: `本季平均晚霜在 ${climateProfile.lastFrostDate} 前后，当前周最低气温约 ${avgLow}°C，嫩苗和茄果类建议盖降温前完成定植或提前覆盖。`,
      severity: 'warning',
      startsInDays: 1,
      forecast
    });
  }

  // 信号 2：高温提醒（夏季 + 中南部）
  if (planSeason === 'summer' && zoneNumber >= 7) {
    signals.push({
      id: 'season-heat',
      type: 'heat',
      label: '季节高温提醒',
      detail: `本季白天高温约 ${avgHigh}°C，瓜果和叶菜建议清晨深浇、午后避暬，可考虑阳光网或遮阳罩。`,
      severity: rainDays >= 3 ? 'info' : 'watch',
      startsInDays: 1,
      forecast
    });
  }

  // 信号 3：连阴雨（春季多雨区 / 夏季 + 秋季）
  if (rainDays >= 3) {
    signals.push({
      id: 'season-rain',
      type: 'rain',
      label: rainDays >= 5 ? '连阴雨警示' : '连阴雨提醒',
      detail: rainDays >= 5
        ? `本周 ${rainDays}/7 天有雨，降水偏多。收采前后留意裂果、积水和真菌病害，可提前开理沟排水。`
        : `本周 ${rainDays}/7 天有雨，建议检查排水和覆盖。收采后尽快移除湿叶，减少真菌滋生。`,
      severity: rainDays >= 5 ? 'warning' : 'info',
      startsInDays: 0,
      forecast
    });
  }

  // 信号 4：台风/强风预警（夏季 + 台风区）
  if (planSeason === 'summer' && normals.typhoonRisk && stormDays > 0) {
    signals.push({
      id: 'season-storm',
      type: 'storm',
      label: '暴风预警',
      detail: `本周有 ${stormDays} 天强降雨/大风风险，建议提前加固支架、收回阳罩，高木类作物注意防风。`,
      severity: 'warning',
      startsInDays: forecast.days.findIndex(d => d.condition === 'storm'),
      forecast
    });
  }

  // 信号 5：少雨偏干（低降雨季节）
  if (rainDays <= 1 && planSeason !== 'winter' && signals.length <= 1) {
    signals.push({
      id: 'season-dry',
      type: 'dry',
      label: '少雨偏干提醒',
      detail: `本周 ${rainDays}/7 天有雨，降水偏少。建议检查覆盖物、土壤含水量和补水频次，早晨深浇更益于保壤。`,
      severity: 'watch',
      startsInDays: 1,
      forecast
    });
  }

  // 信号 6：秋季霜冻提醒
  if (planSeason === 'fall' && (normals.frostRisk === 'high' || zoneNumber <= 6)) {
    signals.push({
      id: 'season-fall-frost',
      type: 'frost',
      label: '秋季霜冻提醒',
      detail: `平均初霜在 ${climateProfile.firstFrostDate} 前后，怕冷作物建议在那之前尽快收完。晚熟地块提前准备小棚或覆盖材料。`,
      severity: 'info',
      startsInDays: Math.max(1, Math.round(14 - forecast.days[0].tempLow / 2)),
      forecast
    });
  }

  return signals.slice(0, 4);  // 最多返回 4 个
}
