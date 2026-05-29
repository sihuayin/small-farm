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
      zipCode: normalizedZip,
      hardinessZone: match.preset.hardinessZone,
      lastFrostDate: match.preset.lastFrostDate,
      firstFrostDate: match.preset.firstFrostDate,
      mockWeatherScenario: 'auto'
    },
    source: match.preset.name
  };
}

export function getMockWeatherSignals(
  climateProfile: ClimateProfile,
  planSeason: PlanSeason
): WeatherSignal[] {
  const zoneNumber = Number.parseInt(climateProfile.hardinessZone, 10) || 7;
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
      label: '模拟寒潮',
      detail: '未来 3 天夜间低温接近霜点，幼苗和番茄类作物建议覆盖。',
      severity: 'warning',
      startsInDays: 3
    },
    heat: {
      id: 'mock-heat',
      type: 'heat',
      label: '模拟高温',
      detail: '未来 5 天白天高温偏强，高需水作物建议早晨深浇。',
      severity: 'watch',
      startsInDays: 2
    },
    rain: {
      id: 'mock-rain',
      type: 'rain',
      label: '模拟降雨',
      detail: '本周有连续降雨窗口，采收前留意裂果和真菌病害。',
      severity: 'info',
      startsInDays: 4
    },
    dry: {
      id: 'mock-dry',
      type: 'dry',
      label: '模拟干燥',
      detail: '未来一周降雨偏少，建议检查覆盖物和土壤含水量。',
      severity: 'watch',
      startsInDays: 1
    }
  };

  return signals[scenario];
}
