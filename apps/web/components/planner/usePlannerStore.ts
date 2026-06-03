import { create } from 'zustand';
import { getPlantAgronomy, plantMap, plants, tiles, type TileType } from './plants';
import type { Plant } from './plants.d';
import { evaluateCompanionRules } from './rules';
import { createPlantingRecords, evaluateRotationRules } from './rotation';
import { scorePlacement } from './scoring';
import type {
  ActivityRecord,
  ClimateProfile,
  GardenEntity,
  GardenPlan,
  GardenPlanLibrary,
  GardenPlanSummary,
  GridCell,
  HarvestRecord,
  OccupancyIndex,
  PlantingRecord,
  PlanSeason,
  SurfaceEntity,
  SynergyResult
} from './types';
import { gridKey } from './types';

const DEFAULT_GRID_WIDTH = 12;
const DEFAULT_GRID_HEIGHT = 12;
const DEFAULT_CELL_SIZE_FEET = 1;
const PLAN_STORAGE_KEY = 'small-farm:garden-plan:v1';
const PLAN_LIBRARY_STORAGE_KEY = 'small-farm:garden-plan-library:v1';
const HISTORY_LIMIT = 80;

interface PlannerState {
  planId: string;
  planName: string;
  gridWidth: number;
  gridHeight: number;
  cellSizeFeet: number;
  planYear: number;
  planSeason: PlanSeason;
  planSummaries: GardenPlanSummary[];
  lastSavedAt: number | null;
  hasUnsavedChanges: boolean;
  undoStack: GardenPlan[];
  redoStack: GardenPlan[];
  entities: Record<string, GardenEntity>;
  occupancyIndex: OccupancyIndex;
  surfaceIndex: OccupancyIndex;
  plantingHistory: Record<string, PlantingRecord[]>;
  harvestRecords: HarvestRecord[];
  activityRecords: ActivityRecord[];
  resolvedCleanupKeys: string[];
  climateProfile: ClimateProfile;
  activeToolId: string | null;
  activeTileId: TileType | null;
  hoveredGrid: { x: number; y: number } | null;
  selectedEntityId: string | null;
  setActiveTool: (toolId: string | null) => void;
  setActiveTile: (tileId: TileType | null) => void;
  setHoveredGrid: (grid: { x: number; y: number } | null) => void;
  selectEntity: (entityId: string | null) => void;
  renamePlan: (name: string) => void;
  setPlanTime: (year: number, season: PlanSeason) => void;
  updateClimateProfile: (profile: ClimateProfile) => void;
  resizeGarden: (width: number, height: number, cellSizeFeet: number) => boolean;
  createPlan: () => void;
  loadDemoScenario: () => void;
  generateStarterPlan: (plantIds?: string[]) => { placed: number; skipped: string[] };
  duplicatePlan: () => void;
  switchPlan: (planId: string) => boolean;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  placePlant: (gridX: number, gridY: number, plantId: string) => boolean;
  removePlant: (gridX: number, gridY: number) => void;
  removeEntity: (entityId: string) => void;
  completePlantTask: (entityId: string, taskId: string, input?: HarvestInput | ActivityInput) => boolean;
  moveEntity: (entityId: string, gridX: number, gridY: number) => boolean;
  rotateEntity: (entityId: string) => void;
  setTileOverride: (gridX: number, gridY: number, tileId: TileType) => boolean;
  removeTileOverride: (gridX: number, gridY: number) => void;
  resolveCleanupTile: (key: string) => void;
  clearGrid: () => void;
  getTileAt: (gridX: number, gridY: number) => TileType;
  getPlantAt: (gridX: number, gridY: number) => GridCell | undefined;
  getEntityAt: (gridX: number, gridY: number) => GardenEntity | undefined;
  evaluatePlacement: (gridX: number, gridY: number) => SynergyResult;
  exportPlan: () => GardenPlan;
  importPlanAsNew: (plan: GardenPlan) => boolean;
  importPlan: (plan: GardenPlan) => void;
  savePlan: () => void;
  loadPlan: () => boolean;
}

const now = () => Date.now();
const createEntityId = () => `entity_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const createPlanId = () => `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export interface HarvestInput {
  quantity: number;
  unit: HarvestRecord['unit'];
  note: string;
  removeAfterHarvest?: boolean;
}

export interface ActivityInput {
  note: string;
}

const defaultClimateProfile: ClimateProfile = {
  zipCode: '',
  hardinessZone: '7a',
  lastFrostDate: '04-15',
  firstFrostDate: '10-15',
  mockWeatherScenario: 'auto'
};

export const usePlannerStore = create<PlannerState>((set, get) => ({
  planId: createPlanId(),
  planName: '我的菜园',
  gridWidth: DEFAULT_GRID_WIDTH,
  gridHeight: DEFAULT_GRID_HEIGHT,
  cellSizeFeet: DEFAULT_CELL_SIZE_FEET,
  planYear: new Date().getFullYear(),
  planSeason: 'spring',
  planSummaries: [],
  lastSavedAt: null,
  hasUnsavedChanges: false,
  undoStack: [],
  redoStack: [],
  entities: {},
  occupancyIndex: {},
  surfaceIndex: {},
  plantingHistory: {},
  harvestRecords: [],
  activityRecords: [],
  resolvedCleanupKeys: [],
  climateProfile: defaultClimateProfile,
  activeToolId: null,
  activeTileId: null,
  hoveredGrid: null,
  selectedEntityId: null,

  setActiveTool: (toolId) => set({ activeToolId: toolId, activeTileId: null }),
  setActiveTile: (tileId) => set({ activeTileId: tileId, activeToolId: null }),
  setHoveredGrid: (grid) => set({ hoveredGrid: grid }),
  selectEntity: (entityId) => set({ selectedEntityId: entityId }),

  renamePlan: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    pushHistory(get, set);
    set({ planName: trimmed, hasUnsavedChanges: true });
  },

  setPlanTime: (year, season) => {
    const nextYear = Math.max(2000, Math.min(2100, Math.floor(year)));
    const state = get();
    if (state.planYear === nextYear && state.planSeason === season) return;
    pushHistory(get, set);
    set({ planYear: nextYear, planSeason: season, hasUnsavedChanges: true });
  },

  updateClimateProfile: (profile) => {
    pushHistory(get, set);
    set({
      climateProfile: {
        zipCode: profile.zipCode.trim(),
        hardinessZone: profile.hardinessZone.trim() || defaultClimateProfile.hardinessZone,
        lastFrostDate: normalizeMonthDay(profile.lastFrostDate, defaultClimateProfile.lastFrostDate),
        firstFrostDate: normalizeMonthDay(profile.firstFrostDate, defaultClimateProfile.firstFrostDate),
        mockWeatherScenario: profile.mockWeatherScenario || 'auto'
      },
      hasUnsavedChanges: true
    });
  },

  resizeGarden: (width, height, cellSizeFeet) => {
    const nextWidth = Math.max(1, Math.min(64, Math.floor(width)));
    const nextHeight = Math.max(1, Math.min(64, Math.floor(height)));
    const nextCellSize = Math.max(0.25, Math.min(20, Number(cellSizeFeet) || DEFAULT_CELL_SIZE_FEET));
    const state = get();

    for (const entity of Object.values(state.entities)) {
      if (!isWithinBounds(entity.originX, entity.originY, entity.spanX, entity.spanY, nextWidth, nextHeight)) {
        return false;
      }
    }

    pushHistory(get, set);
    set({
      gridWidth: nextWidth,
      gridHeight: nextHeight,
      cellSizeFeet: nextCellSize,
      hasUnsavedChanges: true
    });
    return true;
  },

  createPlan: () => {
    get().savePlan();
    const timestamp = now();
    set({
      planId: createPlanId(),
      planName: `新菜园 ${new Date(timestamp).toLocaleDateString('zh-CN')}`,
      gridWidth: DEFAULT_GRID_WIDTH,
      gridHeight: DEFAULT_GRID_HEIGHT,
      cellSizeFeet: DEFAULT_CELL_SIZE_FEET,
      planYear: new Date().getFullYear(),
      planSeason: 'spring',
      entities: {},
      occupancyIndex: {},
      surfaceIndex: {},
      plantingHistory: {},
      harvestRecords: [],
      activityRecords: [],
      resolvedCleanupKeys: [],
      climateProfile: defaultClimateProfile,
      activeToolId: null,
      activeTileId: null,
      selectedEntityId: null,
      lastSavedAt: null,
      hasUnsavedChanges: true,
      undoStack: [],
      redoStack: []
    });
    get().savePlan();
  },

  loadDemoScenario: () => {
    get().savePlan();
    const demo = createDemoPlan();
    get().importPlan(demo);
    set({ hasUnsavedChanges: true, lastSavedAt: null });
    get().savePlan();
  },

  generateStarterPlan: (plantIds) => {
    const timestamp = now();
    const state = get();
    const requestedPlantIds = normalizeStarterPlantIds(plantIds);
    const nextEntities: Record<string, GardenEntity> = {};
    let nextOccupancy: OccupancyIndex = {};
    let nextPlantingHistory: Record<string, PlantingRecord[]> = {};
    const skipped: string[] = [];

    for (const plantId of orderStarterPlantIds(requestedPlantIds)) {
      const plant = plantMap.get(plantId);
      if (!plant) {
        skipped.push(plantId);
        continue;
      }

      const candidate = findStarterPlacement(
        plant,
        nextEntities,
        nextOccupancy,
        nextPlantingHistory,
        state.gridWidth,
        state.gridHeight,
        state.planYear,
        state.planSeason,
        state.climateProfile
      );

      if (!candidate) {
        skipped.push(plantId);
        continue;
      }

      const entityId = `starter_${plant.id}_${candidate.x}_${candidate.y}_${timestamp}`;
      const createdAt = timestamp - starterAgeDays(plant.id) * 24 * 60 * 60 * 1000;
      const entity: GardenEntity = {
        id: entityId,
        type: 'plant',
        originX: candidate.x,
        originY: candidate.y,
        spanX: plant.dimensions.grid_span_x,
        spanY: plant.dimensions.grid_span_y,
        rotation: 0,
        createdAt,
        updatedAt: createdAt,
        plantId: plant.id,
        plant
      };

      nextEntities[entityId] = entity;
      nextOccupancy = writeFootprint(nextOccupancy, entityId, candidate.x, candidate.y, plant.dimensions.grid_span_x, plant.dimensions.grid_span_y);
      nextPlantingHistory = mergePlantingHistory(
        nextPlantingHistory,
        createPlantingRecords(candidate.x, candidate.y, plant, state.planYear, state.planSeason, createdAt)
      );
    }

    pushHistory(get, set);
    set((current) => ({
      planName: current.planName === '我的菜园' || current.planName.startsWith('新菜园') ? '智能生成菜园' : current.planName,
      entities: nextEntities,
      occupancyIndex: nextOccupancy,
      surfaceIndex: {},
      plantingHistory: nextPlantingHistory,
      harvestRecords: [],
      activityRecords: [],
      resolvedCleanupKeys: [],
      activeToolId: null,
      activeTileId: null,
      selectedEntityId: Object.keys(nextEntities)[0] || null,
      hasUnsavedChanges: true
    }));
    get().savePlan();

    return { placed: Object.keys(nextEntities).length, skipped };
  },

  duplicatePlan: () => {
    get().savePlan();
    const plan = get().exportPlan();
    const timestamp = now();
    const duplicated: GardenPlan = {
      ...plan,
      id: createPlanId(),
      name: `${plan.name} 副本`,
      updatedAt: timestamp,
      entities: { ...plan.entities },
      occupancyIndex: { ...plan.occupancyIndex },
      surfaceIndex: { ...plan.surfaceIndex },
      plantingHistory: { ...(plan.plantingHistory || {}) },
      harvestRecords: [...(plan.harvestRecords || [])],
      activityRecords: [...(plan.activityRecords || [])],
      resolvedCleanupKeys: [...(plan.resolvedCleanupKeys || [])],
      climateProfile: plan.climateProfile || defaultClimateProfile
    };
    get().importPlan(duplicated);
    get().savePlan();
  },

  switchPlan: (planId) => {
    get().savePlan();
    const library = readPlanLibrary();
    if (!library) return false;
    const plan = library?.plans.find(item => item.id === planId);
    if (!plan) return false;
    get().importPlan(plan);
    set({
      planSummaries: summarizePlans(library.plans),
      hasUnsavedChanges: false,
      lastSavedAt: plan.updatedAt,
      undoStack: [],
      redoStack: []
    });
    return true;
  },

  undo: () => {
    const state = get();
    const previous = state.undoStack[state.undoStack.length - 1];
    if (!previous) return;
    const current = state.exportPlan();
    applyPlanSnapshot(previous, set, {
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [current, ...state.redoStack].slice(0, HISTORY_LIMIT),
      hasUnsavedChanges: true
    });
  },

  redo: () => {
    const state = get();
    const next = state.redoStack[0];
    if (!next) return;
    const current = state.exportPlan();
    applyPlanSnapshot(next, set, {
      undoStack: [...state.undoStack, current].slice(-HISTORY_LIMIT),
      redoStack: state.redoStack.slice(1),
      hasUnsavedChanges: true
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  placePlant: (gridX, gridY, plantId) => {
    const plant = plantMap.get(plantId);
    if (!plant) return false;

    const state = get();
    const spanX = plant.dimensions.grid_span_x;
    const spanY = plant.dimensions.grid_span_y;

    if (!isWithinBounds(gridX, gridY, spanX, spanY, state.gridWidth, state.gridHeight)) {
      return false;
    }

    if (hasObjectCollision(gridX, gridY, spanX, spanY, state.occupancyIndex)) {
      return false;
    }

    if (hasBlockedPlantingTile(gridX, gridY, spanX, spanY, state.surfaceIndex, state.entities)) {
      return false;
    }

    const synergy = evaluateCompanionRules(gridX, gridY, plant, state.entities);
    if (synergy.status === 'bad') return false;

    const id = createEntityId();
    const timestamp = now();
    const entity: GardenEntity = {
      id,
      type: 'plant',
      originX: gridX,
      originY: gridY,
      spanX,
      spanY,
      rotation: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      plantId,
      plant
    };

    pushHistory(get, set);
    const newHistoryRecords = createPlantingRecords(gridX, gridY, plant, state.planYear, state.planSeason, timestamp);
    set((s) => ({
      entities: { ...s.entities, [id]: entity },
      occupancyIndex: writeFootprint(s.occupancyIndex, id, gridX, gridY, spanX, spanY),
      plantingHistory: mergePlantingHistory(s.plantingHistory, newHistoryRecords),
      selectedEntityId: id,
      hasUnsavedChanges: true
    }));

    return true;
  },

  removePlant: (gridX, gridY) => {
    const entity = get().getEntityAt(gridX, gridY);
    if (entity?.type === 'plant') {
      get().removeEntity(entity.id);
    }
  },

  removeEntity: (entityId) => {
    pushHistory(get, set);
    set((s) => {
      const entity = s.entities[entityId];
      if (!entity) return s;

      const { [entityId]: _, ...entities } = s.entities;
      const surfaceIndex = entity.type === 'plant'
        ? s.surfaceIndex
        : removeFootprint(s.surfaceIndex, entityId);

      return {
        entities,
        occupancyIndex: entity.type === 'plant'
          ? removeFootprint(s.occupancyIndex, entityId)
          : s.occupancyIndex,
        surfaceIndex,
        selectedEntityId: s.selectedEntityId === entityId ? null : s.selectedEntityId,
        hasUnsavedChanges: true
      };
    });
  },

  completePlantTask: (entityId, taskId, input) => {
    const entity = get().entities[entityId];
    if (!entity || entity.type !== 'plant') return false;

    pushHistory(get, set);

    if (taskId === 'harvest') {
      set((s) => {
        const target = s.entities[entityId];
        if (!target || target.type !== 'plant') return s;

        const removeAfterHarvest = (input as HarvestInput | undefined)?.removeAfterHarvest ?? true;
        const { [entityId]: _, ...entitiesWithoutTarget } = s.entities;
        const timestamp = now();
        const harvestRecord: HarvestRecord = {
          id: `harvest_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
          entityId,
          plantId: target.plantId,
          plantName: target.plant.naming.zh,
          year: s.planYear,
          season: s.planSeason,
          originX: target.originX,
          originY: target.originY,
          spanX: target.spanX,
          spanY: target.spanY,
          quantity: Math.max(0, Number((input as HarvestInput | undefined)?.quantity) || 0),
          unit: (input as HarvestInput | undefined)?.unit || 'count',
          note: input?.note?.trim() || '',
          removedAfterHarvest: removeAfterHarvest,
          harvestedAt: timestamp
        };
        return {
          entities: removeAfterHarvest ? entitiesWithoutTarget : {
            ...s.entities,
            [entityId]: { ...target, updatedAt: timestamp }
          },
          occupancyIndex: removeAfterHarvest ? removeFootprint(s.occupancyIndex, entityId) : s.occupancyIndex,
          harvestRecords: [harvestRecord, ...s.harvestRecords].slice(0, HISTORY_LIMIT),
          selectedEntityId: removeAfterHarvest ? null : s.selectedEntityId,
          hasUnsavedChanges: true
        };
      });
      return true;
    }

    set((s) => {
      const target = s.entities[entityId];
      if (!target || target.type !== 'plant') return s;

      const timestamp = now();
      const completedTaskIds = Array.from(new Set([...(target.completedTaskIds || []), taskId]));
      const activityRecord: ActivityRecord = {
        id: `activity_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
        entityId,
        plantId: target.plantId,
        plantName: target.plant.naming.zh,
        taskId,
        taskLabel: taskLabel(taskId),
        year: s.planYear,
        season: s.planSeason,
        originX: target.originX,
        originY: target.originY,
        note: input?.note?.trim() || '',
        completedAt: timestamp
      };
      return {
        entities: {
          ...s.entities,
          [entityId]: {
            ...target,
            completedTaskIds,
            updatedAt: timestamp
          }
        },
        activityRecords: [activityRecord, ...s.activityRecords].slice(0, HISTORY_LIMIT),
        hasUnsavedChanges: true
      };
    });

    return true;
  },

  moveEntity: (entityId, gridX, gridY) => {
    const state = get();
    const entity = state.entities[entityId];
    if (!entity) return false;

    if (!isWithinBounds(gridX, gridY, entity.spanX, entity.spanY, state.gridWidth, state.gridHeight)) {
      return false;
    }

    if (
      entity.type === 'plant' &&
      hasObjectCollision(gridX, gridY, entity.spanX, entity.spanY, state.occupancyIndex, entityId)
    ) {
      return false;
    }

    if (
      entity.type === 'plant' &&
      evaluateCompanionRules(gridX, gridY, entity.plant, state.entities).status === 'bad'
    ) {
      return false;
    }

    pushHistory(get, set);
    set((s) => {
      const moved = { ...entity, originX: gridX, originY: gridY, updatedAt: now() } as GardenEntity;
      return {
        entities: { ...s.entities, [entityId]: moved },
        occupancyIndex: entity.type === 'plant'
          ? writeFootprint(removeFootprint(s.occupancyIndex, entityId), entityId, gridX, gridY, entity.spanX, entity.spanY)
          : s.occupancyIndex,
        surfaceIndex: entity.type === 'plant'
          ? s.surfaceIndex
          : writeFootprint(removeFootprint(s.surfaceIndex, entityId), entityId, gridX, gridY, entity.spanX, entity.spanY),
        hasUnsavedChanges: true
      };
    });

    return true;
  },

  rotateEntity: (entityId) => {
    pushHistory(get, set);
    set((s) => {
      const entity = s.entities[entityId];
      if (!entity) return s;

      const nextRotation = ((entity.rotation + 90) % 360) as GardenEntity['rotation'];
      return {
        entities: {
          ...s.entities,
          [entityId]: { ...entity, rotation: nextRotation, updatedAt: now() } as GardenEntity
        },
        hasUnsavedChanges: true
      };
    });
  },

  setTileOverride: (gridX, gridY, tileId) => {
    const state = get();
    if (!isWithinBounds(gridX, gridY, 1, 1, state.gridWidth, state.gridHeight)) return false;
    if (tileId === 'stone_path' && state.occupancyIndex[gridKey(gridX, gridY)]) return false;

    const existingId = state.surfaceIndex[gridKey(gridX, gridY)];
    const type = tileToEntityType(tileId);
    const timestamp = now();

    pushHistory(get, set);
    set((s) => {
      const entities = { ...s.entities };
      let surfaceIndex = { ...s.surfaceIndex };

      if (existingId) {
        delete entities[existingId];
        surfaceIndex = removeFootprint(surfaceIndex, existingId);
      }

      const id = createEntityId();
      const entity: SurfaceEntity = {
        id,
        type,
        originX: gridX,
        originY: gridY,
        spanX: 1,
        spanY: 1,
        rotation: tileId === 'fence_v' ? 90 : 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        tileId
      };

      return {
        entities: { ...entities, [id]: entity },
        surfaceIndex: writeFootprint(surfaceIndex, id, gridX, gridY, 1, 1),
        hasUnsavedChanges: true
      };
    });
    return true;
  },

  removeTileOverride: (gridX, gridY) => {
    const entityId = get().surfaceIndex[gridKey(gridX, gridY)];
    if (entityId) get().removeEntity(entityId);
  },

  resolveCleanupTile: (key) => {
    pushHistory(get, set);
    set((s) => ({
      resolvedCleanupKeys: Array.from(new Set([...s.resolvedCleanupKeys, key])),
      hasUnsavedChanges: true
    }));
  },

  clearGrid: () => {
    pushHistory(get, set);
    set({ entities: {}, occupancyIndex: {}, surfaceIndex: {}, resolvedCleanupKeys: [], selectedEntityId: null, hasUnsavedChanges: true });
  },

  getTileAt: (gridX, gridY) => {
    const state = get();
    const entityId = state.surfaceIndex[gridKey(gridX, gridY)];
    const entity = entityId ? state.entities[entityId] : null;
    return entity && entity.type !== 'plant' && 'tileId' in entity ? entity.tileId : 'dark_soil';
  },

  getPlantAt: (gridX, gridY) => {
    const entity = get().getEntityAt(gridX, gridY);
    if (entity?.type !== 'plant') return undefined;
    return {
      plant: entity.plant,
      originX: entity.originX,
      originY: entity.originY,
      entityId: entity.id
    };
  },

  getEntityAt: (gridX, gridY) => {
    const state = get();
    const entityId = state.occupancyIndex[gridKey(gridX, gridY)];
    return entityId ? state.entities[entityId] : undefined;
  },

  evaluatePlacement: (gridX, gridY) => {
    const state = get();
    const plant = state.activeToolId ? plantMap.get(state.activeToolId) : null;
    if (!plant) {
      return { valid: true, status: 'neutral', recommendation: 'ok', score: 72, companionCount: 0, enemyCount: 0, details: [] };
    }

    if (!isWithinBounds(
      gridX,
      gridY,
      plant.dimensions.grid_span_x,
      plant.dimensions.grid_span_y,
      state.gridWidth,
      state.gridHeight
    )) {
      return {
        valid: false,
        status: 'bad',
        recommendation: 'bad',
        score: 0,
        companionCount: 0,
        enemyCount: 1,
        details: ['超出花园边界']
      };
    }

    if (hasObjectCollision(gridX, gridY, plant.dimensions.grid_span_x, plant.dimensions.grid_span_y, state.occupancyIndex)) {
      return {
        valid: false,
        status: 'bad',
        recommendation: 'bad',
        score: 0,
        companionCount: 0,
        enemyCount: 1,
        details: ['目标区域已被其他对象占用']
      };
    }

    if (hasBlockedPlantingTile(gridX, gridY, plant.dimensions.grid_span_x, plant.dimensions.grid_span_y, state.surfaceIndex, state.entities)) {
      return {
        valid: false,
        status: 'bad',
        recommendation: 'bad',
        score: 0,
        companionCount: 0,
        enemyCount: 1,
        details: ['石板路上不能种植，先取消石板后再种植']
      };
    }

    return scorePlacement(
      plant,
      mergeSynergyResults(
        evaluateCompanionRules(gridX, gridY, plant, state.entities),
        evaluateRotationRules(gridX, gridY, plant, state.plantingHistory, state.planYear, state.planSeason)
      ),
      state.climateProfile,
      state.planSeason,
      state.planYear
    );
  },

  exportPlan: () => {
    const state = get();
    return {
      schemaVersion: 1,
      id: state.planId,
      name: state.planName,
      width: state.gridWidth,
      height: state.gridHeight,
      cellSizeFeet: state.cellSizeFeet,
      year: state.planYear,
      season: state.planSeason,
      entities: state.entities,
      occupancyIndex: state.occupancyIndex,
      surfaceIndex: state.surfaceIndex,
      plantingHistory: state.plantingHistory,
      harvestRecords: state.harvestRecords,
      activityRecords: state.activityRecords,
      resolvedCleanupKeys: state.resolvedCleanupKeys,
      climateProfile: state.climateProfile,
      updatedAt: now()
    };
  },

  importPlan: (plan) => {
    applyPlanSnapshot(plan, set, {
      undoStack: [],
      redoStack: [],
      hasUnsavedChanges: false,
      lastSavedAt: plan.updatedAt
    });
  },

  importPlanAsNew: (plan) => {
    if (!isValidGardenPlan(plan)) return false;
    const imported: GardenPlan = {
      ...plan,
      id: createPlanId(),
      name: `${plan.name || '导入菜园'} 导入`,
      updatedAt: now(),
      entities: { ...plan.entities },
      occupancyIndex: { ...plan.occupancyIndex },
      surfaceIndex: { ...plan.surfaceIndex },
      plantingHistory: { ...(plan.plantingHistory || {}) },
      harvestRecords: [...(plan.harvestRecords || [])],
      activityRecords: [...(plan.activityRecords || [])],
      resolvedCleanupKeys: [...(plan.resolvedCleanupKeys || [])],
      climateProfile: plan.climateProfile || defaultClimateProfile
    };
    get().savePlan();
    get().importPlan(imported);
    get().savePlan();
    return true;
  },

  savePlan: () => {
    if (typeof window === 'undefined') return;
    const plan = get().exportPlan();
    const library = upsertPlan(plan);
    window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
    set({
      planSummaries: summarizePlans(library.plans),
      lastSavedAt: plan.updatedAt,
      hasUnsavedChanges: false
    });
  },

  loadPlan: () => {
    if (typeof window === 'undefined') return false;

    try {
      const library = readPlanLibrary();
      if (library && library.plans.length > 0) {
        const plan = library.plans.find(item => item.id === library.activePlanId) || library.plans[0];
        get().importPlan(plan);
        set({ planSummaries: summarizePlans(library.plans), lastSavedAt: plan.updatedAt, hasUnsavedChanges: false });
        return true;
      }

      const legacyRaw = window.localStorage.getItem(PLAN_STORAGE_KEY);
      if (!legacyRaw) {
        get().savePlan();
        return true;
      }
      const plan = JSON.parse(legacyRaw) as GardenPlan;
      if (!isValidGardenPlan(plan)) return false;
      get().importPlan(plan);
      get().savePlan();
      return true;
    } catch {
      return false;
    }
  }
}));

function applyPlanSnapshot(
  plan: GardenPlan,
  set: StoreSet,
  extra: Partial<PlannerState> = {}
) {
  set({
    planId: plan.id,
    planName: plan.name,
    gridWidth: plan.width,
    gridHeight: plan.height,
    cellSizeFeet: plan.cellSizeFeet,
    planYear: plan.year,
    planSeason: plan.season,
    entities: plan.entities,
    occupancyIndex: plan.occupancyIndex,
    surfaceIndex: plan.surfaceIndex,
    plantingHistory: plan.plantingHistory || {},
    harvestRecords: plan.harvestRecords || [],
    activityRecords: plan.activityRecords || [],
    resolvedCleanupKeys: plan.resolvedCleanupKeys || [],
    climateProfile: plan.climateProfile || defaultClimateProfile,
    selectedEntityId: null,
    activeToolId: null,
    activeTileId: null,
    ...extra
  });
}

function pushHistory(
  get: () => PlannerState,
  set: StoreSet
) {
  const snapshot = get().exportPlan();
  set((state) => ({
    undoStack: [...state.undoStack, snapshot].slice(-HISTORY_LIMIT),
    redoStack: []
  }));
}

function isValidGardenPlan(plan: GardenPlan): plan is GardenPlan {
  return Boolean(
    plan &&
    plan.schemaVersion === 1 &&
    typeof plan.id === 'string' &&
    typeof plan.name === 'string' &&
    Number.isFinite(plan.width) &&
    Number.isFinite(plan.height) &&
    Number.isFinite(plan.cellSizeFeet) &&
    plan.entities &&
    plan.occupancyIndex &&
    plan.surfaceIndex
  );
}

function mergePlantingHistory(
  existing: Record<string, PlantingRecord[]>,
  additions: Record<string, PlantingRecord[]>
) {
  const next = { ...existing };
  for (const [key, records] of Object.entries(additions)) {
    next[key] = [...(next[key] || []), ...records];
  }
  return next;
}

function normalizeMonthDay(value: string, fallback: string) {
  const match = value.trim().match(/^(\d{1,2})-(\d{1,2})$/);
  if (!match) return fallback;

  const month = Math.max(1, Math.min(12, Number(match[1])));
  const day = Math.max(1, Math.min(31, Number(match[2])));
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function taskLabel(taskId: string) {
  const labels: Record<string, string> = {
    protect: '护苗',
    water: '补水',
    inspect: '巡检',
    maintain: '维护',
    cover: '覆盖',
    drainage: '排水',
    fertilize: '施肥',
    prune: '修剪',
    pest: '病虫害'
  };
  return labels[taskId] || taskId;
}

function createDemoPlan(): GardenPlan {
  const timestamp = now();
  const year = new Date(timestamp).getFullYear();
  const entities: Record<string, GardenEntity> = {};
  let occupancyIndex: OccupancyIndex = {};
  const plantingHistory: Record<string, PlantingRecord[]> = {};
  const addPlant = (plantId: string, x: number, y: number, ageDays: number, completedTaskIds: string[] = []) => {
    const plant = plantMap.get(plantId);
    if (!plant) return null;
    const id = `demo_${plantId}_${x}_${y}`;
    const createdAt = timestamp - ageDays * 24 * 60 * 60 * 1000;
    const entity: GardenEntity = {
      id,
      type: 'plant',
      originX: x,
      originY: y,
      spanX: plant.dimensions.grid_span_x,
      spanY: plant.dimensions.grid_span_y,
      rotation: 0,
      createdAt,
      updatedAt: createdAt,
      plantId,
      plant,
      completedTaskIds
    };
    entities[id] = entity;
    occupancyIndex = writeFootprint(occupancyIndex, id, x, y, plant.dimensions.grid_span_x, plant.dimensions.grid_span_y);
    Object.assign(plantingHistory, mergePlantingHistory(plantingHistory, createPlantingRecords(x, y, plant, year, 'spring', createdAt)));
    return entity;
  };

  const tomato = addPlant('tomato', 6, 5, 18);
  addPlant('basil', 5, 6, 18);
  addPlant('potato', 9, 5, 18);
  addPlant('lettuce', 3, 7, 50, ['cover']);
  addPlant('carrot', 4, 8, 68);
  addPlant('bean', 8, 8, 15);
  addPlant('pepper', 7, 7, 10);

  const harvestedPlant = plantMap.get('radish');
  const harvestedAt = timestamp - 2 * 24 * 60 * 60 * 1000;
  if (harvestedPlant) {
    Object.assign(plantingHistory, mergePlantingHistory(plantingHistory, createPlantingRecords(2, 4, harvestedPlant, year, 'spring', timestamp - 35 * 24 * 60 * 60 * 1000)));
  }

  const harvestRecords: HarvestRecord[] = harvestedPlant ? [{
    id: `demo_harvest_${timestamp}`,
    entityId: 'demo_radish_removed',
    plantId: 'radish',
    plantName: harvestedPlant.naming.zh,
    year,
    season: 'spring',
    originX: 2,
    originY: 4,
    spanX: 1,
    spanY: 1,
    quantity: 6,
    unit: 'count',
    note: '演示：整株采收后留下待整理地块。',
    removedAfterHarvest: true,
    harvestedAt
  }] : [];

  const activityRecords: ActivityRecord[] = tomato ? [{
    id: `demo_activity_${timestamp}`,
    entityId: tomato.id,
    plantId: tomato.plantId,
    plantName: tomato.plant.naming.zh,
    taskId: 'inspect',
    taskLabel: taskLabel('inspect'),
    year,
    season: 'spring',
    originX: tomato.originX,
    originY: tomato.originY,
    note: '演示：番茄与罗勒相邻，伴生关系良好。',
    completedAt: timestamp - 24 * 60 * 60 * 1000
  }] : [];

  return {
    schemaVersion: 1,
    id: createPlanId(),
    name: 'Demo Scenario',
    width: DEFAULT_GRID_WIDTH,
    height: DEFAULT_GRID_HEIGHT,
    cellSizeFeet: DEFAULT_CELL_SIZE_FEET,
    year,
    season: 'spring',
    entities,
    occupancyIndex,
    surfaceIndex: {},
    plantingHistory,
    harvestRecords,
    activityRecords,
    resolvedCleanupKeys: [],
    climateProfile: {
      ...defaultClimateProfile,
      mockWeatherScenario: 'cold_snap'
    },
    updatedAt: timestamp
  };
}

const DEFAULT_STARTER_PLANTS = ['tomato', 'basil', 'lettuce', 'carrot', 'pepper', 'marigold'];

function normalizeStarterPlantIds(plantIds?: string[]) {
  const source = plantIds && plantIds.length > 0 ? plantIds : DEFAULT_STARTER_PLANTS;
  const seen = new Set<string>();
  return source
    .filter(id => plantMap.has(id))
    .filter(id => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 10);
}

function orderStarterPlantIds(plantIds: string[]) {
  const priority = (plantId: string) => {
    const plant = plantMap.get(plantId);
    if (!plant) return 0;
    const spanArea = plant.dimensions.grid_span_x * plant.dimensions.grid_span_y;
    const companionWeight = plant.relationships.companions.length;
    const categoryWeight = plant.category === 'vegetable' ? 4 : plant.category === 'herb' ? 3 : plant.category === 'flower' ? 2 : 1;
    return spanArea * 10 + companionWeight * 2 + categoryWeight;
  };
  return [...plantIds].sort((a, b) => priority(b) - priority(a));
}

function findStarterPlacement(
  plant: Plant,
  entities: Record<string, GardenEntity>,
  occupancyIndex: OccupancyIndex,
  plantingHistory: Record<string, PlantingRecord[]>,
  gridWidth: number,
  gridHeight: number,
  year: number,
  season: PlanSeason,
  climateProfile: ClimateProfile
) {
  const candidates: Array<{ x: number; y: number; score: number }> = [];
  const margin = 1;

  for (let y = margin; y <= gridHeight - plant.dimensions.grid_span_y - margin; y++) {
    for (let x = margin; x <= gridWidth - plant.dimensions.grid_span_x - margin; x++) {
      if (!isWithinBounds(x, y, plant.dimensions.grid_span_x, plant.dimensions.grid_span_y, gridWidth, gridHeight)) continue;
      if (hasObjectCollision(x, y, plant.dimensions.grid_span_x, plant.dimensions.grid_span_y, occupancyIndex)) continue;

      const result = scorePlacement(
        plant,
        mergeSynergyResults(
          evaluateCompanionRules(x, y, plant, entities),
          evaluateRotationRules(x, y, plant, plantingHistory, year, season)
        ),
        climateProfile,
        season,
        year
      );

      if (!result.valid || result.recommendation === 'bad') continue;
      const centerBias = starterCenterBias(x, y, plant, gridWidth, gridHeight);
      const companionBias = result.companionCount * 12;
      const categoryBias = plant.category === 'vegetable' ? 6 : plant.category === 'herb' ? 5 : plant.category === 'flower' ? 4 : 2;
      candidates.push({
        x,
        y,
        score: (result.score || 0) + centerBias + companionBias + categoryBias
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score)[0] || null;
}

function starterCenterBias(
  x: number,
  y: number,
  plant: Plant,
  gridWidth: number,
  gridHeight: number
) {
  const centerX = gridWidth / 2;
  const centerY = gridHeight / 2;
  const plantCenterX = x + plant.dimensions.grid_span_x / 2;
  const plantCenterY = y + plant.dimensions.grid_span_y / 2;
  const distance = Math.abs(centerX - plantCenterX) + Math.abs(centerY - plantCenterY);
  return Math.max(0, 18 - distance * 2);
}

function starterAgeDays(plantId: string) {
  const plant = plantMap.get(plantId);
  if (!plant) return 8;
  const maturity = getPlantAgronomy(plantId).daysToMaturity;
  return Math.max(7, Math.min(42, Math.round(maturity * 0.22)));
}

function mergeSynergyResults(primary: SynergyResult, secondary: SynergyResult): SynergyResult {
  return {
    valid: primary.valid && secondary.valid,
    status: primary.status === 'bad'
      ? 'bad'
      : primary.status === 'good'
        ? 'good'
        : secondary.status,
    companionCount: primary.companionCount + secondary.companionCount,
    enemyCount: primary.enemyCount + secondary.enemyCount,
    details: [...primary.details, ...secondary.details]
  };
}

type StoreSet = (
  partial: Partial<PlannerState> | ((state: PlannerState) => Partial<PlannerState>),
  replace?: boolean
) => void;

function isWithinBounds(
  gridX: number,
  gridY: number,
  spanX: number,
  spanY: number,
  gridWidth: number,
  gridHeight: number
) {
  return gridX >= 0 && gridY >= 0 && gridX + spanX <= gridWidth && gridY + spanY <= gridHeight;
}

function hasObjectCollision(
  gridX: number,
  gridY: number,
  spanX: number,
  spanY: number,
  occupancyIndex: OccupancyIndex,
  ignoreEntityId?: string
) {
  for (let dx = 0; dx < spanX; dx++) {
    for (let dy = 0; dy < spanY; dy++) {
      const occupant = occupancyIndex[gridKey(gridX + dx, gridY + dy)];
      if (occupant && occupant !== ignoreEntityId) return true;
    }
  }
  return false;
}

function writeFootprint(
  index: OccupancyIndex,
  entityId: string,
  gridX: number,
  gridY: number,
  spanX: number,
  spanY: number
) {
  const next = { ...index };
  for (let dx = 0; dx < spanX; dx++) {
    for (let dy = 0; dy < spanY; dy++) {
      next[gridKey(gridX + dx, gridY + dy)] = entityId;
    }
  }
  return next;
}

function removeFootprint(index: OccupancyIndex, entityId: string) {
  const next = { ...index };
  for (const [key, value] of Object.entries(next)) {
    if (value === entityId) delete next[key];
  }
  return next;
}

function tileToEntityType(tileId: TileType): SurfaceEntity['type'] {
  if (tileId === 'raised_bed') return 'bed';
  if (tileId === 'stone_path') return 'path';
  if (tileId.startsWith('fence')) return 'fence';
  return 'soil';
}

function hasBlockedPlantingTile(
  gridX: number,
  gridY: number,
  spanX: number,
  spanY: number,
  surfaceIndex: OccupancyIndex,
  entities: Record<string, GardenEntity>
) {
  for (let dx = 0; dx < spanX; dx++) {
    for (let dy = 0; dy < spanY; dy++) {
      const surfaceId = surfaceIndex[gridKey(gridX + dx, gridY + dy)];
      const surface = surfaceId ? entities[surfaceId] : null;
      if (surface && surface.type !== 'plant' && 'tileId' in surface && surface.tileId === 'stone_path') {
        return true;
      }
    }
  }
  return false;
}

function readPlanLibrary(): GardenPlanLibrary | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(PLAN_LIBRARY_STORAGE_KEY);
  if (!raw) return null;

  try {
    const library = JSON.parse(raw) as GardenPlanLibrary;
    if (library.schemaVersion !== 1 || !Array.isArray(library.plans)) return null;
    return library;
  } catch {
    return null;
  }
}

function upsertPlan(plan: GardenPlan): GardenPlanLibrary {
  const existing = readPlanLibrary();
  const plans = existing?.plans.filter(item => item.id !== plan.id) || [];
  const library: GardenPlanLibrary = {
    schemaVersion: 1,
    activePlanId: plan.id,
    plans: [...plans, plan].sort((a, b) => b.updatedAt - a.updatedAt)
  };
  window.localStorage.setItem(PLAN_LIBRARY_STORAGE_KEY, JSON.stringify(library));
  return library;
}

function summarizePlans(plans: GardenPlan[]): GardenPlanSummary[] {
  return plans.map(plan => ({
    id: plan.id,
    name: plan.name,
    width: plan.width,
    height: plan.height,
    updatedAt: plan.updatedAt
  }));
}

export { plantMap, plants, tiles };
export { tileMap, type TileConfig, type TileType } from './plants';
export type { ClimateProfile, GardenEntity, GardenPlan, GardenPlanSummary, GridCell, MockWeatherScenario, PlanSeason, SynergyResult } from './types';
