import type { Plant } from './plants.d';
import type { TileType } from './plants';

export type EntityType = 'plant' | 'bed' | 'path' | 'fence' | 'irrigation' | 'note' | 'soil';

export interface GardenEntityBase {
  id: string;
  type: EntityType;
  originX: number;
  originY: number;
  spanX: number;
  spanY: number;
  rotation: 0 | 90 | 180 | 270;
  createdAt: number;
  updatedAt: number;
}

export interface PlantEntity extends GardenEntityBase {
  type: 'plant';
  plantId: string;
  plant: Plant;
  completedTaskIds?: string[];
  harvestedAt?: number;
}

export interface SurfaceEntity extends GardenEntityBase {
  type: 'bed' | 'path' | 'fence' | 'soil';
  tileId: TileType;
}

export interface IrrigationEntity extends GardenEntityBase {
  type: 'irrigation';
  radius: number;
}

export interface NoteEntity extends GardenEntityBase {
  type: 'note';
  text: string;
}

export type GardenEntity = PlantEntity | SurfaceEntity | IrrigationEntity | NoteEntity;

export type OccupancyIndex = Record<string, string>;
export type PlanSeason = 'spring' | 'summer' | 'fall' | 'winter';

export interface PlantingRecord {
  id: string;
  plantId: string;
  plantName: string;
  family: string;
  rotationGroup: string;
  year: number;
  season: PlanSeason;
  originX: number;
  originY: number;
  spanX: number;
  spanY: number;
  createdAt: number;
}

export interface HarvestRecord {
  id: string;
  entityId: string;
  plantId: string;
  plantName: string;
  year: number;
  season: PlanSeason;
  originX: number;
  originY: number;
  spanX: number;
  spanY: number;
  quantity: number;
  unit: 'count' | 'lb' | 'kg' | 'bunch';
  note: string;
  removedAfterHarvest?: boolean;
  harvestedAt: number;
}

export interface ActivityRecord {
  id: string;
  entityId: string;
  plantId: string;
  plantName: string;
  taskId: string;
  taskLabel: string;
  year: number;
  season: PlanSeason;
  originX: number;
  originY: number;
  note: string;
  completedAt: number;
}

export interface ClimateProfile {
  country?: 'CN';
  province?: string;
  city?: string;
  district?: string;
  climateBand?: 'north_cold' | 'north_temperate' | 'central' | 'south_humid' | 'southwest_plateau' | 'east_monsoon';
  climateLabel?: string;
  zipCode: string;
  hardinessZone: string;
  lastFrostDate: string;
  firstFrostDate: string;
  mockWeatherScenario?: MockWeatherScenario;
}

export type MockWeatherScenario = 'auto' | 'cold_snap' | 'heat' | 'rain' | 'dry';

export interface WeatherDay {
  date: string;
  tempHigh: number;
  tempLow: number;
  condition: 'sunny' | 'cloudy' | 'rain' | 'storm';
  precipitation: number;
  humidity: number;
  windSpeed: number;
}

export interface WeeklyForecast {
  days: WeatherDay[];
  summary: string;
}

export interface WeatherSignal {
  id: string;
  type: 'cold_snap' | 'heat' | 'rain' | 'dry' | 'frost' | 'storm' | 'ideal';
  label: string;
  detail: string;
  severity: 'info' | 'watch' | 'warning';
  startsInDays: number;
  /** 可选：关联的周预报数据 */
  forecast?: WeeklyForecast;
}

export interface GardenPlan {
  schemaVersion: 1;
  id: string;
  name: string;
  width: number;
  height: number;
  cellSizeFeet: number;
  year: number;
  season: PlanSeason;
  entities: Record<string, GardenEntity>;
  occupancyIndex: OccupancyIndex;
  surfaceIndex: OccupancyIndex;
  plantingHistory: Record<string, PlantingRecord[]>;
  harvestRecords?: HarvestRecord[];
  activityRecords?: ActivityRecord[];
  resolvedCleanupKeys?: string[];
  climateProfile?: ClimateProfile;
  updatedAt: number;
}

export interface GardenPlanSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  updatedAt: number;
}

export interface GardenPlanLibrary {
  schemaVersion: 1;
  activePlanId: string;
  plans: GardenPlan[];
}

export interface GridCell {
  plant: Plant;
  originX: number;
  originY: number;
  entityId: string;
}

export interface SynergyResult {
  valid: boolean;
  status: 'good' | 'bad' | 'neutral';
  recommendation?: 'excellent' | 'ok' | 'caution' | 'bad';
  score?: number;
  companionCount: number;
  enemyCount: number;
  details: string[];
}

export type HeatmapLayer = 'overall' | 'companion' | 'rotation' | 'season' | 'weather';

export interface PlacementInsight {
  gridX: number;
  gridY: number;
  plantName: string;
  layer: HeatmapLayer;
  layerLabel: string;
  scoreLabel: string;
  result: SynergyResult;
}

export type TileStatusKind =
  | 'idle'
  | 'cleanup'
  | 'water'
  | 'cover'
  | 'drainage'
  | 'water_done'
  | 'cover_done'
  | 'drainage_done';

export interface TileStatusInfo {
  kind: TileStatusKind;
  gridX: number;
  gridY: number;
  label: string;
  detail: string;
  recommendation: string;
  tone: 'green' | 'amber' | 'blue';
}

export const gridKey = (x: number, y: number) => `${x},${y}`;
