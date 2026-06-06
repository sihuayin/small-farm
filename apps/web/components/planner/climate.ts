import type { ClimateProfile, MockWeatherScenario, PlanSeason, WeatherSignal } from './types';

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

export function getMockWeatherSignals(
  climateProfile: ClimateProfile,
  planSeason: PlanSeason
): WeatherSignal[] {
  const zoneNumber = Number.parseInt(climateProfile.hardinessZone, 10) || (
    climateProfile.climateBand === 'south_humid' ? 10
      : climateProfile.climateBand === 'east_monsoon' ? 8
      : climateProfile.climateBand === 'central' ? 8
      : climateProfile.climateBand === 'north_temperate' ? 6
      : climateProfile.climateBand === 'north_cold' ? 5
      : 7
  );
  const scenario = climateProfile.mockWeatherScenario || 'auto';
  if (scenario !== 'auto') return [createWeatherSignal(scenario)];

  const signals: WeatherSignal[] = [];

  if (planSeason === 'spring' && zoneNumber <= 7) {
    signals.push(createWeatherSignal('cold_snap'));
  }

  if (planSeason === 'summer' && zoneNumber >= 7) {
    signals.push(createWeatherSignal('heat'));
  }

  if (planSeason === 'fall') {
    signals.push(createWeatherSignal('rain'));
  }

  if (signals.length === 0) {
    signals.push(createWeatherSignal('dry'));
  }

  return signals;
}

function createWeatherSignal(scenario: Exclude<MockWeatherScenario, 'auto'>): WeatherSignal {
  const signals: Record<Exclude<MockWeatherScenario, 'auto'>, WeatherSignal> = {
    cold_snap: {
      id: 'mock-cold-snap',
      type: 'cold_snap',
      label: '倒春寒提醒',
      detail: '未来 3 天夜间低温接近霜点，幼苗和茄果类作物建议提前覆盖保温。',
      severity: 'warning',
      startsInDays: 3
    },
    heat: {
      id: 'mock-heat',
      type: 'heat',
      label: '高温提醒',
      detail: '未来 5 天白天高温偏强，瓜果和叶菜建议清晨深浇、午后避晒。',
      severity: 'watch',
      startsInDays: 2
    },
    rain: {
      id: 'mock-rain',
      type: 'rain',
      label: '连阴雨提醒',
      detail: '本周有连续降雨窗口，采收前后留意裂果、积水和真菌病害。',
      severity: 'info',
      startsInDays: 4
    },
    dry: {
      id: 'mock-dry',
      type: 'dry',
      label: '少雨偏干提醒',
      detail: '未来一周降雨偏少，建议检查覆盖物、土壤含水量和补水频次。',
      severity: 'watch',
      startsInDays: 1
    }
  };

  return signals[scenario];
}
