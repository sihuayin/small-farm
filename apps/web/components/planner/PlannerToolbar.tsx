import { plants, tiles, type TileType } from './usePlannerStore';
import { GardenSettingsPanel } from './GardenSettingsPanel';
import { getPlantAgronomy, getPlantCredibilityLevel, getPlantRegionalPriorityScore } from './plants';
import { getPlantingWindowStatus, getSupplementCandidateResult, plantingWindowBadgeClassName } from './plantingWindow';
import type { PlantAgronomy, Season } from './plants.d';
import type { ClimateProfile, GardenPlan, GardenPlanSummary, PlanSeason } from './usePlannerStore';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const DEFAULT_KIT_PLANT_IDS = ['tomato', 'basil', 'lettuce', 'carrot', 'pepper', 'marigold'];
const GARDEN_KIT_STORAGE_KEY = 'small-farm:garden-kit-plants:v1';
type PlantQuickFilter = 'all' | 'current' | 'quick' | 'beginner' | 'perennial' | 'low_water' | 'high_water';
type PlantCredibilityFilter = 'all' | 'core' | 'regional' | 'basic';

function formatClimateSuitability(minZone: number, maxZone: number) {
  return `适应温区 ${minZone}-${maxZone}`;
}

function PlantToken({ plant, size = 'md' }: { plant: (typeof plants)[number]; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-9 w-9' : 'h-10 w-10 md:h-12 md:w-12';
  const glyphSize = size === 'lg' ? 48 : size === 'sm' ? 31 : 34;

  return (
    <div
      className={`relative mx-auto flex ${sizeClass} items-center justify-center border-2 shadow-[0_2px_0_rgba(61,40,20,0.22)]`}
      style={{
        background: 'linear-gradient(145deg, #fffaf0 0%, #f4dfac 100%)',
        borderColor: plant.styling.border_color,
        borderRadius: 6,
        boxShadow: `inset 0 5px 0 rgba(255,255,255,0.55), inset 0 -5px 0 rgba(120,72,24,0.12), 0 3px 0 ${plant.styling.border_color}, 0 7px 12px rgba(61,40,20,0.16)`
      }}
    >
      <PlantGlyph plant={plant} size={glyphSize} />
      <span className="absolute right-1 top-1 h-1 w-4 bg-white/30" />
    </div>
  );
}

function PlantGlyph({ plant, size }: { plant: (typeof plants)[number]; size: number }) {
  const primary = plant.styling.bg_color;
  const dark = plant.styling.border_color;
  const leaf = '#2f9e44';
  const light = '#fff7c2';
  const gradientId = `plant-${plant.id}-paint`;
  const leafGradientId = `plant-${plant.id}-leaf`;
  const shadowId = `plant-${plant.id}-shadow`;
  const fill = `url(#${gradientId})`;
  const leafFill = `url(#${leafGradientId})`;

  const common = {
    stroke: dark,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  };

  const glyph = (() => {
    switch (plant.id) {
      case 'tomato':
        return (
          <>
            <circle cx="16" cy="18" r="8" fill={fill} {...common} />
            <circle cx="22" cy="20" r="6" fill={fill} {...common} />
            <circle cx="13" cy="15" r="2" fill="rgba(255,255,255,0.5)" />
            <circle cx="21" cy="18" r="1.6" fill="rgba(255,255,255,0.45)" />
            <path d="M15 9 L18 4 L21 9 M18 9 L18 5" stroke={leaf} strokeWidth="3" fill="none" />
          </>
        );
      case 'carrot':
        return (
          <>
            <path d="M14 10 L24 12 L17 29 Z" fill={fill} {...common} />
            <path d="M18 13 L20 13 M17 18 L20 18 M16 23 L18 23" stroke="rgba(255,255,255,0.38)" strokeWidth="1.4" />
            <path d="M15 10 L10 4 M17 10 L18 3 M19 10 L25 5" stroke={leaf} strokeWidth="3" fill="none" />
          </>
        );
      case 'corn':
        return (
          <>
            <rect x="13" y="7" width="8" height="20" rx="3" fill={fill} {...common} />
            <path d="M12 23 C5 18 7 11 13 14 M22 23 C29 17 27 11 21 14" fill={leafFill} stroke="#3f6212" strokeWidth="2" />
            <path d="M16 10 L18 10 M15 15 L20 15 M15 20 L20 20" stroke="#fff7a8" strokeWidth="1.5" />
          </>
        );
      case 'pumpkin':
        return (
          <>
            <ellipse cx="16" cy="19" rx="11" ry="8" fill={fill} {...common} />
            <path d="M16 11 C12 15 12 23 16 27 M16 11 C20 15 20 23 16 27" stroke="#c2410c" strokeWidth="2" fill="none" />
            <ellipse cx="12" cy="15" rx="3" ry="2" fill="rgba(255,255,255,0.32)" />
            <path d="M16 11 L18 5" stroke="#3f6212" strokeWidth="3" />
          </>
        );
      case 'sunflower':
        return (
          <>
            <path d="M16 16 L16 29" stroke="#3f6212" strokeWidth="3" />
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (Math.PI * 2 * i) / 8;
                return <circle key={i} cx={16 + Math.cos(angle) * 8} cy={14 + Math.sin(angle) * 8} r="4" fill={fill} stroke="#eab308" strokeWidth="1" />;
            })}
            <circle cx="16" cy="14" r="5" fill="#854d0e" />
          </>
        );
      case 'melon':
        return (
          <>
            <ellipse cx="16" cy="18" rx="12" ry="8" fill={fill} {...common} />
            <path d="M8 18 C12 13 20 13 24 18 M8 18 C12 23 20 23 24 18" stroke="#166534" strokeWidth="2" fill="none" />
            <ellipse cx="12" cy="15" rx="3" ry="1.8" fill="rgba(255,255,255,0.32)" />
          </>
        );
      default:
        if (plant.category === 'flower') {
          return (
            <>
              <path d="M16 17 L16 29" stroke="#3f6212" strokeWidth="3" />
              <circle cx="12" cy="14" r="5" fill={fill} {...common} />
              <circle cx="20" cy="14" r="5" fill={fill} {...common} />
              <circle cx="16" cy="10" r="5" fill={fill} {...common} />
              <circle cx="16" cy="15" r="4" fill={light} stroke={dark} strokeWidth="1" />
            </>
          );
        }

        if (plant.category === 'herb') {
          return (
            <>
              <path d="M16 27 C15 20 17 13 16 6" stroke="#166534" strokeWidth="3" fill="none" />
              <ellipse cx="11" cy="14" rx="5" ry="3" fill={fill} stroke={dark} strokeWidth="1.5" transform="rotate(-25 11 14)" />
              <ellipse cx="22" cy="17" rx="5" ry="3" fill={fill} stroke={dark} strokeWidth="1.5" transform="rotate(25 22 17)" />
              <ellipse cx="13" cy="22" rx="5" ry="3" fill={fill} stroke={dark} strokeWidth="1.5" transform="rotate(-20 13 22)" />
            </>
          );
        }

        if (plant.agronomy?.rotationGroup === 'root') {
          return (
            <>
              <ellipse cx="16" cy="18" rx="8" ry="9" fill={fill} {...common} />
              <ellipse cx="13" cy="14" rx="2.6" ry="2" fill="rgba(255,255,255,0.35)" />
              <path d="M16 27 L14 31 M16 27 L18 31" stroke={dark} strokeWidth="2" />
              <path d="M13 10 L10 5 M17 10 L17 4 M20 10 L24 6" stroke={leaf} strokeWidth="3" fill="none" />
            </>
          );
        }

        return (
          <>
            <ellipse cx="12" cy="18" rx="7" ry="9" fill={fill} {...common} />
            <ellipse cx="21" cy="17" rx="7" ry="9" fill={fill} {...common} />
            <path d="M9 14 C12 9 20 9 23 14" stroke="rgba(255,255,255,0.55)" strokeWidth="2" fill="none" />
          </>
        );
    }
  })();

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <radialGradient id={gradientId} cx="34%" cy="26%" r="74%">
          <stop offset="0%" stopColor="#fff7c2" stopOpacity="0.9" />
          <stop offset="24%" stopColor={primary} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
        <linearGradient id={leafGradientId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="45%" stopColor={leaf} />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
        <filter id={shadowId} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.6" stdDeviation="1.1" floodColor="#2d1b0f" floodOpacity="0.35" />
        </filter>
      </defs>
      <ellipse cx="16" cy="28" rx="10" ry="3" fill="rgba(52,39,20,0.18)" />
      <g filter={`url(#${shadowId})`}>{glyph}</g>
    </svg>
  );
}

function seasonLabel(season: Season) {
  const labels: Record<Season, string> = {
    spring: '春',
    summer: '夏',
    fall: '秋',
    winter: '冬'
  };
  return labels[season];
}

function waterNeedLabel(waterNeed: PlantAgronomy['waterNeed']) {
  if (waterNeed === 'high') return '高需水';
  if (waterNeed === 'low') return '低需水';
  return '中需水';
}

function startMethodLabel(method: PlantAgronomy['startMethod']) {
  if (method === 'direct_sow') return '直播';
  if (method === 'transplant') return '移栽';
  return '直播/移栽';
}

function PlantFactPills({ plant }: { plant: (typeof plants)[number] }) {
  const agronomy = getPlantAgronomy(plant.id);
  const facts = [
    `${agronomy.daysToMaturity} 天成熟`,
    `株距 ${agronomy.spacing.plantInch} in`,
    agronomy.seasons.map(seasonLabel).join('/'),
    waterNeedLabel(agronomy.waterNeed),
    startMethodLabel(agronomy.startMethod)
  ];

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {facts.map(fact => (
        <span key={fact} className="rounded-full border border-amber-900/10 bg-white/65 px-2 py-0.5 text-[9px] font-black leading-4 text-amber-900">
          {fact}
        </span>
      ))}
    </div>
  );
}

function PlantCompactFacts({ plant }: { plant: (typeof plants)[number] }) {
  const agronomy = getPlantAgronomy(plant.id);
  return (
    <div className="mt-1 grid grid-cols-3 gap-1 text-[9px] font-black leading-none text-amber-900">
      <span className="rounded border border-amber-900/10 bg-amber-50 px-1.5 py-1">{agronomy.daysToMaturity}d</span>
      <span className="rounded border border-amber-900/10 bg-amber-50 px-1.5 py-1">{agronomy.spacing.plantInch}in</span>
      <span className="rounded border border-amber-900/10 bg-amber-50 px-1.5 py-1">{agronomy.seasons.map(seasonLabel).join('/')}</span>
    </div>
  );
}

function windowSortScore(status: ReturnType<typeof getPlantingWindowStatus>['status']) {
  if (status === 'in_window') return 5;
  if (status === 'too_early') return 3;
  if (status === 'late') return 2;
  if (status === 'harvest_risk') return 1;
  return 0;
}

const chinaPriorityPlantIds = new Set([
  'bok_choy',
  'kongxin_cai',
  'amaranth',
  'scallion',
  'chive',
  'suanmiao',
  'xiaoyoucai',
  'gai_lan',
  'ginger',
  'baby_napa',
  'wosun',
  'fava_bean',
  'donggua',
  'yardlong_bean',
  'loofah',
  'cilantro',
  'chili',
  'cucumber',
  'lettuce',
  'radish'
]);

function plantSpaceScore(plant: (typeof plants)[number]) {
  const footprint = plant.dimensions.grid_span_x * plant.dimensions.grid_span_y;
  if (footprint <= 1) return 3;
  if (footprint <= 2) return 2;
  if (footprint <= 4) return 1;
  return 0;
}

function plantChinaPriorityScore(plant: (typeof plants)[number], climateProfile: ClimateProfile, planSeason: PlanSeason) {
  let score = 0;
  if (climateProfile.country === 'CN' && chinaPriorityPlantIds.has(plant.id)) score += 4;
  score += getPlantRegionalPriorityScore(plant.id, climateProfile, planSeason);
  if (planSeason === 'summer' && ['kongxin_cai', 'amaranth', 'yardlong_bean', 'loofah', 'chili', 'bitter_melon', 'ginger', 'donggua'].includes(plant.id)) score += 3;
  if (planSeason === 'spring' && ['bok_choy', 'lettuce', 'scallion', 'cilantro', 'radish', 'youmai_cai', 'xiaoyoucai', 'wosun', 'fava_bean'].includes(plant.id)) score += 2;
  if (planSeason === 'fall' && ['bok_choy', 'scallion', 'chive', 'lettuce', 'radish', 'daikon', 'gai_lan', 'cai_xin', 'garland_chrysanthemum', 'suanmiao', 'baby_napa', 'fava_bean'].includes(plant.id)) score += 2;
  return score;
}

function matchesQuickFilter(plant: (typeof plants)[number], filter: PlantQuickFilter, windowStatus: ReturnType<typeof getPlantingWindowStatus>) {
  if (filter === 'all') return true;
  const agronomy = getPlantAgronomy(plant.id);

  if (filter === 'current') return windowStatus.status === 'in_window';
  if (filter === 'quick') return agronomy.daysToMaturity <= 60 && agronomy.rotationGroup !== 'perennial';
  if (filter === 'beginner') {
    return agronomy.daysToMaturity <= 80
      && agronomy.waterNeed !== 'high'
      && plant.dimensions.grid_span_x * plant.dimensions.grid_span_y <= 2
      && windowStatus.status !== 'off_season'
      && windowStatus.status !== 'harvest_risk';
  }
  if (filter === 'perennial') return agronomy.rotationGroup === 'perennial';
  if (filter === 'low_water') return agronomy.waterNeed === 'low';
  if (filter === 'high_water') return agronomy.waterNeed === 'high';

  return true;
}

interface PlannerToolbarProps {
  planId: string;
  planName: string;
  gridWidth: number;
  gridHeight: number;
  cellSizeFeet: number;
  planYear: number;
  planSeason: PlanSeason;
  climateProfile: ClimateProfile;
  planSummaries: GardenPlanSummary[];
  hasUnsavedChanges: boolean;
  lastSavedAt: number | null;
  canUndo: boolean;
  canRedo: boolean;
  workflowMode: 'planning' | 'maintenance';
  activeToolId: string | null;
  activeTileId: TileType | null;
  onRenamePlan: (name: string) => void;
  onSetPlanTime: (year: number, season: PlanSeason) => void;
  onUpdateClimateProfile: (profile: ClimateProfile) => void;
  onResizeGarden: (width: number, height: number, cellSizeFeet: number) => boolean;
  onCreatePlan: () => void;
  onDuplicatePlan: () => void;
  onSwitchPlan: (planId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectPlant: (plantId: string) => void;
  onSelectTile: (tileId: TileType) => void;
  onSave: () => void;
  onLoad: () => void;
  onExportPlan: () => GardenPlan;
  onImportPlan: (plan: GardenPlan) => boolean;
}

export function PlannerToolbar({
  planId,
  planName,
  gridWidth,
  gridHeight,
  cellSizeFeet,
  planYear,
  planSeason,
  climateProfile,
  planSummaries,
  hasUnsavedChanges,
  lastSavedAt,
  canUndo,
  canRedo,
  workflowMode,
  activeToolId,
  activeTileId,
  onRenamePlan,
  onSetPlanTime,
  onUpdateClimateProfile,
  onResizeGarden,
  onCreatePlan,
  onDuplicatePlan,
  onSwitchPlan,
  onUndo,
  onRedo,
  onSelectPlant,
  onSelectTile,
  onSave,
  onLoad,
  onExportPlan,
  onImportPlan
}: PlannerToolbarProps) {
  const isMaintenanceModeForLibrary = workflowMode === 'maintenance';
  const [kitPlantIds, setKitPlantIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_KIT_PLANT_IDS;
    try {
      const raw = window.localStorage.getItem(GARDEN_KIT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        const valid = parsed.filter(id => plants.some(plant => plant.id === id));
        return valid.length > 0 ? valid : DEFAULT_KIT_PLANT_IDS;
      }
    } catch {
      return DEFAULT_KIT_PLANT_IDS;
    }
    return DEFAULT_KIT_PLANT_IDS;
  });
  const [showPlantLibrary, setShowPlantLibrary] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeQuickFilter, setActiveQuickFilter] = useState<PlantQuickFilter>('all');
  const [activeCredibilityFilter, setActiveCredibilityFilter] = useState<PlantCredibilityFilter>('all');
  const [showCredibilityHelp, setShowCredibilityHelp] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectionPulse, setSelectionPulse] = useState(0);
  const categoryTabs = [
    { id: 'all', label: '全部', icon: '✦' },
    { id: 'vegetable', label: '蔬菜', icon: '◼' },
    { id: 'herb', label: '香草', icon: '♧' },
    { id: 'flower', label: '花卉', icon: '✿' },
    { id: 'fruit', label: '果物', icon: '◆' }
  ];
  const quickFilterTabs: Array<{ id: PlantQuickFilter; label: string }> = [
    { id: 'all', label: '全部' },
    { id: 'current', label: '当前适合' },
    { id: 'quick', label: '快速收获' },
    { id: 'beginner', label: '新手友好' },
    { id: 'perennial', label: '多年生' },
    { id: 'low_water', label: '低需水' },
    { id: 'high_water', label: '高需水' }
  ];
  const credibilityTabs: Array<{ id: PlantCredibilityFilter; label: string }> = [
    { id: 'all', label: '全部可信度' },
    { id: 'core', label: '核心校对' },
    { id: 'regional', label: '地区已校正' },
    { id: 'basic', label: '基础资料' }
  ];
  const credibilityGuide = [
    {
      id: 'core',
      label: '核心校对',
      detail: '我们优先核过播种窗口、成熟周期和空间占用，适合先参考。',
      className: 'border-emerald-300 bg-emerald-50 text-emerald-800'
    },
    {
      id: 'regional',
      label: '地区已校正',
      detail: '已按中国地区画像做过窗口偏移和节奏修正，更贴近本地使用。',
      className: 'border-sky-300 bg-sky-50 text-sky-800'
    },
    {
      id: 'basic',
      label: '基础资料',
      detail: '已有基础种植信息，但地区细节仍在补充，适合探索参考。',
      className: 'border-slate-300 bg-slate-100 text-slate-700'
    }
  ] as const;
  const kitPlants = useMemo(() => kitPlantIds
    .map(id => plants.find(plant => plant.id === id))
    .filter((plant): plant is (typeof plants)[number] => Boolean(plant)), [kitPlantIds]);
  const libraryPlants = useMemo(() => {
    const query = librarySearch.trim().toLowerCase();
    return plants
      .map((plant) => {
        const windowStatus = getPlantingWindowStatus(plant, climateProfile, planYear, planSeason);
        const agronomy = getPlantAgronomy(plant.id);
        const supplement = getSupplementCandidateResult(plant, climateProfile, planYear, planSeason);
        const credibility = getPlantCredibilityLevel(plant.id);
        return { plant, windowStatus, agronomy, supplement, credibility };
      })
      .filter(({ plant, windowStatus, supplement, credibility }) => {
        const matchesCategory = activeCategory === 'all' || plant.category === activeCategory;
        const matchesSearch = !query
          || plant.naming.zh.toLowerCase().includes(query)
          || plant.naming.en.toLowerCase().includes(query)
          || plant.id.toLowerCase().includes(query);
        const matchesCredibility = activeCredibilityFilter === 'all' || credibility.level === activeCredibilityFilter;
        return matchesCategory
          && matchesSearch
          && matchesCredibility
          && matchesQuickFilter(plant, activeQuickFilter, windowStatus)
          && (!isMaintenanceModeForLibrary || supplement.eligible || activeQuickFilter !== 'all');
      })
      .sort((a, b) => {
        if (isMaintenanceModeForLibrary && a.supplement.eligible !== b.supplement.eligible) {
          return Number(b.supplement.eligible) - Number(a.supplement.eligible);
        }
        if (isMaintenanceModeForLibrary && a.supplement.eligible && b.supplement.eligible) {
          const supplementDelta = b.supplement.score - a.supplement.score;
          if (supplementDelta !== 0) return supplementDelta;
        }
        const windowDelta = windowSortScore(b.windowStatus.status) - windowSortScore(a.windowStatus.status);
        if (windowDelta !== 0) return windowDelta;
        const chinaPriorityDelta = plantChinaPriorityScore(b.plant, climateProfile, planSeason) - plantChinaPriorityScore(a.plant, climateProfile, planSeason);
        if (chinaPriorityDelta !== 0) return chinaPriorityDelta;
        const seasonDelta = Number(b.agronomy.seasons.includes(planSeason)) - Number(a.agronomy.seasons.includes(planSeason));
        if (seasonDelta !== 0) return seasonDelta;
        const spaceDelta = plantSpaceScore(b.plant) - plantSpaceScore(a.plant);
        if (spaceDelta !== 0) return spaceDelta;
        return a.agronomy.daysToMaturity - b.agronomy.daysToMaturity;
      })
      .map(({ plant }) => plant);
  }, [activeCategory, activeCredibilityFilter, activeQuickFilter, climateProfile, isMaintenanceModeForLibrary, librarySearch, planSeason, planYear]);
  const saveKitPlantIds = (nextIds: string[]) => {
    setKitPlantIds(nextIds);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(GARDEN_KIT_STORAGE_KEY, JSON.stringify(nextIds));
      window.dispatchEvent(new CustomEvent('small-farm:garden-kit-updated', { detail: nextIds }));
    }
  };
  const addPlantToKit = (plantId: string) => {
    if (kitPlantIds.includes(plantId)) return;
    saveKitPlantIds([...kitPlantIds, plantId]);
  };
  const removePlantFromKit = (plantId: string) => {
    const nextIds = kitPlantIds.filter(id => id !== plantId);
    saveKitPlantIds(nextIds.length > 0 ? nextIds : DEFAULT_KIT_PLANT_IDS);
    if (activeToolId === plantId) {
      onSelectPlant(plantId);
    }
  };
  const selectedPlant = plants.find(plant => plant.id === activeToolId);
  const selectedTile = tiles.find(tile => tile.id === activeTileId);
  const selectedPlantWindowStatus = selectedPlant
    ? getPlantingWindowStatus(selectedPlant, climateProfile, planYear, planSeason)
    : null;
  const selectedPlantAgronomy = selectedPlant
    ? getPlantAgronomy(selectedPlant.id)
    : null;
  const bumpSelection = () => setSelectionPulse((value) => value + 1);

  useEffect(() => {
    const handleKitUpdate = (event: Event) => {
      const detail = (event as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) {
        const valid = detail.filter(id => plants.some(plant => plant.id === id));
        setKitPlantIds(valid.length > 0 ? valid : DEFAULT_KIT_PLANT_IDS);
      }
    };

    window.addEventListener('small-farm:garden-kit-updated', handleKitUpdate);
    return () => window.removeEventListener('small-farm:garden-kit-updated', handleKitUpdate);
  }, []);

  useEffect(() => {
    if (!showSettingsPanel) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSettingsPanel(false);
      }
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showSettingsPanel]);

  const isDemoMode = planName === 'Demo Scenario';
  const modeLabel = isDemoMode ? '示例模式' : '正式规划';
  const modeClassName = isDemoMode
    ? 'border-amber-300 bg-amber-100 text-amber-800'
    : 'border-green-300 bg-green-50 text-green-800';
  const isMaintenanceMode = workflowMode === 'maintenance' && !isDemoMode;
  const plantSectionTitle = isDemoMode ? '示例工具箱' : isMaintenanceMode ? '补种工具' : '我的植物列表';
  const plantSectionSubtitle = isMaintenanceMode ? '当前以养护为主，植物列表用于补种或替换。' : `${kitPlants.length} 个可种项目`;

  return (
    <div className="z-20 h-[132px] w-full shrink-0 overflow-y-auto border-b border-amber-900/20 bg-[#f7e8c8] shadow-[inset_0_-6px_0_rgba(120,72,24,0.08)] md:h-auto md:w-72 md:border-b-0 md:border-r md:shadow-[inset_-8px_0_0_rgba(120,72,24,0.08)]">
      <div className="p-2 md:p-4">
        <div className="rounded-lg border-2 border-amber-900/20 bg-[#fff8df] p-2 shadow-[0_3px_0_rgba(120,72,24,0.18)] md:p-3">
          <div className="flex items-center justify-between gap-2 md:hidden">
            <div className="flex min-w-0 items-center gap-1.5">
              <h2 className="truncate text-sm font-black leading-none text-amber-950">小农场背包</h2>
              <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-black leading-none ${modeClassName}`}>
                  {isDemoMode ? '示例' : '正式'}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setShowSettingsPanel(true)}
                className="flex max-w-[144px] flex-wrap items-center justify-end gap-1 text-right"
                aria-label="查看数据状态"
              >
                <span className="rounded-full border border-green-300 bg-green-50 px-1.5 py-0.5 text-[8px] font-black leading-none text-green-800">
                  {plants.length}
                </span>
                <span className="rounded-full border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[8px] font-black leading-none text-sky-800">
                  {isDemoMode ? '参考气候' : '气候'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowSettingsPanel(true)}
                className="rounded-md border-2 border-amber-900/20 bg-white px-2 py-1 text-[10px] font-bold leading-none text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.2)] hover:bg-amber-50"
              >
                设置
              </button>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">{isDemoMode ? '示例工具箱' : '我的植物'}</div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-amber-950">小农场背包</h2>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${modeClassName}`}>
                    {modeLabel}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsPanel(true)}
                className="rounded-md border-2 border-amber-900/20 bg-white px-2 py-1 text-xs font-bold text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.2)] hover:bg-amber-50"
              >
                设置
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowSettingsPanel(true)}
              className="mt-2 flex w-full flex-wrap gap-1 text-left"
              aria-label="查看数据状态"
            >
              <span className="rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-[9px] font-black text-green-800">
                {plants.length} 种作物
              </span>
              <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[9px] font-black text-sky-800">
                {isDemoMode ? '参考气候' : '本地气候'}
              </span>
              <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-700">
                {isDemoMode ? '基础资料' : '作物资料'}
              </span>
            </button>
          </div>
        </div>

        <div
          key={`equipped-${selectionPulse}-${activeToolId || activeTileId || 'empty'}`}
          className="mt-4 hidden rounded-lg border-2 border-amber-900/20 bg-[#fff3c4] p-3 shadow-[0_3px_0_rgba(120,72,24,0.16)] transition-transform duration-150 ease-out md:block"
          style={{ transform: selectionPulse > 0 ? 'scale(1.015)' : undefined }}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">{isDemoMode ? '当前装备' : '当前选择'}</div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md border-2 border-amber-900/20 bg-white text-2xl shadow-inner">
              {selectedPlant ? <PlantToken plant={selectedPlant} size="lg" /> : selectedTile?.emoji || '◇'}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-amber-950">
                {selectedPlant?.naming.zh || selectedTile?.name || '空手'}
              </div>
              <div className="text-xs text-amber-700">
                {selectedPlant ? `${selectedPlant.dimensions.grid_span_x}x${selectedPlant.dimensions.grid_span_y} 格` : selectedTile ? '地块刷子' : '选择植物或地块'}
              </div>
            </div>
          </div>
          {selectedPlant && selectedPlantWindowStatus && selectedPlantAgronomy && (
            <div className="mt-3 rounded-md border border-amber-900/10 bg-white/55 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${plantingWindowBadgeClassName(selectedPlantWindowStatus.status)}`}>
                  {selectedPlantWindowStatus.label}
                </span>
                <span className="text-[9px] font-black text-amber-700">
                  {formatClimateSuitability(selectedPlantAgronomy.hardinessZones[0], selectedPlantAgronomy.hardinessZones[1])}
                </span>
              </div>
              <PlantFactPills plant={selectedPlant} />
              <div className="mt-2 text-[10px] font-bold leading-4 text-amber-800">
                {selectedPlantWindowStatus.detail}
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-end gap-2 md:mt-4 md:justify-between">
          <div className="hidden md:block">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-800">{plantSectionTitle}</h3>
            <div className="text-[10px] font-bold text-amber-700">{plantSectionSubtitle}</div>
          </div>
          <button
            type="button"
            onClick={() => setShowPlantLibrary(true)}
            className="rounded-md border-2 border-green-900/15 bg-green-100 px-2 py-1 text-[10px] font-black text-green-900 shadow-[0_2px_0_rgba(22,101,52,0.12)] hover:bg-green-200"
          >
            {isMaintenanceMode ? '补种植物' : '添加植物'}
          </button>
        </div>

        {isMaintenanceMode && (
          <div className="mt-2 hidden rounded-md border border-sky-200 bg-sky-50 px-2 py-1.5 text-[10px] font-black leading-4 text-sky-900 md:block">
            花园已进入养护阶段。默认先查看任务、风险和采收，左侧植物仅作为补种入口保留。
          </div>
        )}

        <div className={`relative mt-1 md:mt-3 ${isMaintenanceMode ? 'md:opacity-90' : ''}`}>
          <div className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
            {kitPlants.map(plant => (
              <div key={plant.id} className="group relative w-[60px] shrink-0 md:w-auto">
              {(() => {
                const windowStatus = getPlantingWindowStatus(plant, climateProfile, planYear, planSeason);
                return (
              <button
                onClick={() => {
                  bumpSelection();
                  onSelectPlant(plant.id);
                }}
                className={`
                  relative min-h-[58px] w-full rounded-lg border-2 p-1 text-center shadow-[0_3px_0_rgba(120,72,24,0.16)] transition-all md:min-h-[72px] md:p-2
                  hover:-translate-y-0.5 active:translate-y-0
                  ${activeToolId === plant.id
                    ? 'border-amber-800 bg-[#ffe08a] ring-2 ring-amber-300 shadow-[0_4px_0_rgba(146,64,14,0.2)]'
                    : 'border-amber-900/20 bg-[#fff8df] hover:border-amber-700 hover:bg-white'}
                `}
              >
                <PlantToken plant={plant} />
                <div className="mt-0.5 truncate text-[10px] font-bold leading-none text-amber-950 md:mt-1 md:text-xs">{plant.naming.zh}</div>
                {activeToolId === plant.id && (
                  <div className="absolute -right-1 -top-1 rounded-full border border-amber-800/20 bg-white/90 px-1 py-0.5 text-[8px] font-black leading-none text-amber-900 shadow-[0_1px_0_rgba(120,72,24,0.12)]">
                    种植中
                  </div>
                )}
                <div className="mt-0.5 hidden text-[10px] font-medium text-amber-700 md:block">
                  {plant.dimensions.grid_span_x}x{plant.dimensions.grid_span_y}
                </div>
                <div className={`mt-1 hidden rounded-full border px-1 py-0.5 text-[9px] font-black leading-none md:block ${plantingWindowBadgeClassName(windowStatus.status)}`}>
                  {windowStatus.shortLabel}
                </div>
              </button>
                );
              })()}
              {kitPlants.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePlantFromKit(plant.id)}
                  className="absolute -right-1 top-5 hidden h-5 w-5 rounded-full border border-amber-900/20 bg-white text-[10px] font-black text-amber-900 shadow-[0_1px_0_rgba(120,72,24,0.14)] group-hover:block"
                  title={`从工具箱移除${plant.naming.zh}`}
                  aria-label={`从工具箱移除${plant.naming.zh}`}
                >
                  x
                </button>
              )}
              </div>
            ))}
          </div>
          {kitPlants.length > 3 && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center bg-gradient-to-l from-[#fff8df] via-[#fff8df]/85 to-transparent pl-6 pr-1 text-[8px] font-black text-amber-800 md:hidden">
              滑动
            </div>
          )}
        </div>

        {showPlantLibrary && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-emerald-950/28 px-4 backdrop-blur-[2px]">
            <div className="max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-lg border-2 border-amber-950/20 bg-[#fff8df] shadow-[0_8px_0_rgba(120,72,24,0.16),0_24px_44px_rgba(61,40,20,0.24)]">
              <div className="flex items-center justify-between gap-3 border-b-2 border-amber-900/10 bg-[#f4d58d]/70 px-4 py-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">植物库</div>
                  <div className="text-lg font-black text-amber-950">选择要加入工具箱的植物</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPlantLibrary(false)}
                  className="h-8 w-8 rounded-md border border-amber-900/15 bg-white text-sm font-black text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.12)] hover:bg-amber-50"
                  aria-label="关闭植物库"
                >
                  x
                </button>
              </div>
              <div className="border-b border-amber-900/10 p-3">
                <input
                  value={librarySearch}
                  onChange={(event) => setLibrarySearch(event.target.value)}
                  placeholder="搜索番茄、生菜、黄瓜、香草..."
                  className="w-full rounded-md border border-amber-900/20 bg-white px-3 py-2 text-sm font-bold text-amber-950 outline-none focus:border-green-600"
                />
                <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                  {categoryTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveCategory(tab.id)}
                      className={`shrink-0 rounded-md border-2 px-2 py-1 text-xs font-bold shadow-[0_2px_0_rgba(120,72,24,0.16)] transition ${
                        activeCategory === tab.id
                          ? 'border-amber-800 bg-amber-700 text-white'
                          : 'border-amber-900/20 bg-[#fff8df] text-amber-900 hover:bg-white'
                      }`}
                    >
                      <span className="mr-1">{tab.icon}</span>{tab.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                  {quickFilterTabs.map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveQuickFilter(tab.id)}
                      className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black transition ${
                        activeQuickFilter === tab.id
                          ? 'border-green-700 bg-green-700 text-white shadow-[0_2px_0_rgba(22,101,52,0.18)]'
                          : 'border-green-900/15 bg-green-50 text-green-900 hover:bg-green-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                  {credibilityTabs.map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveCredibilityFilter(tab.id)}
                      className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black transition ${
                        activeCredibilityFilter === tab.id
                          ? 'border-sky-700 bg-sky-700 text-white shadow-[0_2px_0_rgba(3,105,161,0.18)]'
                          : 'border-sky-900/15 bg-sky-50 text-sky-900 hover:bg-sky-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 md:hidden">
                  <button
                    type="button"
                    onClick={() => setShowCredibilityHelp(current => !current)}
                    className="rounded-full border border-sky-900/15 bg-white/80 px-2 py-1 text-[10px] font-black text-sky-900"
                  >
                    {showCredibilityHelp ? '收起可信度说明' : '查看可信度说明'}
                  </button>
                </div>
                <div className={`${showCredibilityHelp ? 'mt-2' : 'mt-2 hidden'} md:block`}>
                  <div className="rounded-md border border-sky-900/10 bg-sky-50/70 px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {credibilityGuide.map(item => (
                        <span
                          key={item.id}
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${item.className}`}
                        >
                          {item.label}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 space-y-1 text-[10px] font-bold leading-4 text-amber-900">
                      {credibilityGuide.map(item => (
                        <div key={item.id}>
                          <span className="text-amber-950">{item.label}</span>
                          <span className="text-amber-800">：{item.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-2 rounded-md border border-amber-900/10 bg-white/70 px-3 py-2 text-[10px] font-black leading-4 text-amber-900">
                  当前显示 {libraryPlants.length} 种
                  {activeQuickFilter !== 'all' ? ` · ${quickFilterTabs.find(tab => tab.id === activeQuickFilter)?.label}` : ''}
                  {activeCategory !== 'all' ? ` · ${categoryTabs.find(tab => tab.id === activeCategory)?.label}` : ''}
                  {activeCredibilityFilter !== 'all' ? ` · ${credibilityTabs.find(tab => tab.id === activeCredibilityFilter)?.label}` : ''}
                  {isMaintenanceMode ? '，已优先保留适合季中补种的候选。' : '，已按当前种植窗口优先排序。'}
                </div>
              </div>
              <div className="max-h-[52vh] overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-2">
                  {libraryPlants.map(plant => {
                    const inKit = kitPlantIds.includes(plant.id);
                    const windowStatus = getPlantingWindowStatus(plant, climateProfile, planYear, planSeason);
                    const supplement = getSupplementCandidateResult(plant, climateProfile, planYear, planSeason);
                    const credibility = getPlantCredibilityLevel(plant.id);
                    return (
                      <div key={plant.id} className="rounded-md border border-amber-900/10 bg-white/70 p-2">
                        <div className="grid grid-cols-[auto_1fr_auto] items-start gap-2">
                          <PlantToken plant={plant} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-black text-amber-950">{plant.naming.zh}</div>
                            <div className="truncate text-[10px] font-bold text-amber-700">{plant.naming.en} · {plant.dimensions.grid_span_x}x{plant.dimensions.grid_span_y}</div>
                            <PlantCompactFacts plant={plant} />
                          </div>
                          <button
                            type="button"
                            disabled={inKit}
                            onClick={() => addPlantToKit(plant.id)}
                            className="rounded-md border border-green-900/15 bg-green-100 px-2 py-1 text-[10px] font-black text-green-900 hover:bg-green-200 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                          >
                            {inKit ? '已加入' : '加入'}
                          </button>
                        </div>
                        <div className="mt-2 flex items-start gap-2">
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black ${plantingWindowBadgeClassName(windowStatus.status)}`}>
                            {windowStatus.shortLabel}
                          </span>
                          <div className="line-clamp-2 text-[10px] font-bold leading-4 text-amber-800">
                            {isMaintenanceMode ? supplement.reason : windowStatus.detail}
                          </div>
                        </div>
                        {!isMaintenanceMode && (
                          <div className="mt-1 text-[9px] font-black leading-4 text-amber-700/90">
                            按{climateProfile.climateLabel || climateProfile.city || climateProfile.hardinessZone || '本地地区'}画像推断
                            {(climateProfile.mockWeatherScenario || 'auto') !== 'auto' ? '，并已叠加当前天气参考情景' : ''}
                          </div>
                        )}
                        <div className="mt-1">
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${
                            credibility.level === 'core'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : credibility.level === 'regional'
                                ? 'border-sky-300 bg-sky-50 text-sky-800'
                                : 'border-slate-300 bg-slate-100 text-slate-600'
                          }`}>
                            {credibility.label}
                          </span>
                        </div>
                        {isMaintenanceMode && (
                          <div className="mt-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${supplement.eligible ? 'border-green-300 bg-green-100 text-green-800' : 'border-slate-300 bg-slate-100 text-slate-600'}`}>
                              {supplement.eligible ? '适合补种' : '不建议补种'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 rounded-md border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-[10px] font-black leading-4 text-amber-900">
                  自定义植物即将支持：后续可补充名称、占地、成熟天数、需水和轮作分组。
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 hidden gap-1 overflow-x-auto pb-1">
          {categoryTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`shrink-0 rounded-md border-2 px-2 py-1 text-xs font-bold shadow-[0_2px_0_rgba(120,72,24,0.16)] transition ${
                activeCategory === tab.id
                  ? 'border-amber-800 bg-amber-700 text-white'
                  : 'border-amber-900/20 bg-[#fff8df] text-amber-900 hover:bg-white'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        <div className="mt-3 hidden grid-cols-3 gap-2">
          {libraryPlants.map(plant => (
            <button
              key={plant.id}
              onClick={() => {
                bumpSelection();
                onSelectPlant(plant.id);
              }}
              className={`
                min-h-[72px] rounded-lg border-2 p-2 text-center shadow-[0_3px_0_rgba(120,72,24,0.16)] transition-all
                hover:-translate-y-0.5 active:translate-y-0
                ${activeToolId === plant.id
                  ? 'border-amber-800 bg-[#ffe08a] ring-2 ring-amber-300'
                  : 'border-amber-900/20 bg-[#fff8df] hover:border-amber-700 hover:bg-white'}
              `}
            >
              <PlantToken plant={plant} />
              <div className="mt-1 truncate text-xs font-bold text-amber-950">{plant.naming.zh}</div>
              <div className="mt-0.5 text-[10px] font-medium text-amber-700">
                {plant.dimensions.grid_span_x}x{plant.dimensions.grid_span_y}
              </div>
            </button>
          ))}
        </div>

        <h3 className="mt-3 mb-2 text-xs font-black uppercase tracking-wider text-amber-800 md:mt-6">地块刷子</h3>
        <div className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
          {tiles.map(tile => (
            <button
              key={tile.id}
              onClick={() => {
                bumpSelection();
                onSelectTile(tile.id);
              }}
              className={`
                min-h-[58px] w-[72px] shrink-0 rounded-lg border-2 p-1.5 text-center shadow-[0_3px_0_rgba(120,72,24,0.14)] transition-all hover:-translate-y-0.5 active:translate-y-0 md:min-h-[64px] md:w-auto md:p-2
                ${activeTileId === tile.id
                  ? 'border-green-800 bg-green-100 ring-2 ring-green-300'
                  : 'border-amber-900/20 bg-[#fff8df] hover:border-green-700 hover:bg-white'}
              `}
            >
              <div className="text-xl leading-none">{tile.emoji}</div>
              <div className="mt-1 text-[11px] font-bold text-amber-950">{tile.name}</div>
            </button>
          ))}
        </div>

        {activeTileId && (
          <div className="mt-4 hidden rounded-lg border-2 border-green-800/20 bg-green-50 p-3 shadow-[0_3px_0_rgba(22,101,52,0.12)] md:block">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{tiles.find(t => t.id === activeTileId)?.emoji}</span>
              <div>
                <div className="text-sm font-black text-green-900">
                  {tiles.find(t => t.id === activeTileId)?.name} 绘制中
                </div>
                <div className="text-xs text-green-600">点击网格绘制，再次点击恢复默认</div>
              </div>
            </div>
          </div>
        )}

        {activeToolId && (
          <div className="mt-4 hidden rounded-lg border-2 border-amber-900/20 bg-[#fff8df] p-3 shadow-[0_3px_0_rgba(120,72,24,0.14)] md:block">
            <div className="flex items-center gap-2">
              {plants.find(p => p.id === activeToolId) && (
                <PlantToken plant={plants.find(p => p.id === activeToolId)!} size="sm" />
              )}
              <div>
                <div className="text-sm font-black text-amber-950">
                  {plants.find(p => p.id === activeToolId)?.naming.zh}
                </div>
                <div className="text-xs text-amber-600">
                  {plants.find(p => p.id === activeToolId)?.naming.en}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSettingsPanel && typeof document !== 'undefined' && createPortal((
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/28 px-3 py-5 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="planner-settings-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowSettingsPanel(false);
            }
          }}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-lg border-2 border-amber-950/20 bg-[#fff8df] shadow-[0_8px_0_rgba(120,72,24,0.16),0_24px_44px_rgba(61,40,20,0.24)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b-2 border-amber-900/10 bg-[#f4d58d]/80 px-4 py-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">设置</div>
                <div id="planner-settings-title" className="text-lg font-black text-amber-950">菜园设置与数据</div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsPanel(false)}
                onMouseDown={() => setShowSettingsPanel(false)}
                className="h-8 w-8 rounded-md border border-amber-900/15 bg-white text-sm font-black text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.12)] hover:bg-amber-50"
                aria-label="关闭设置"
              >
                x
              </button>
            </div>
            <div className="overflow-y-auto">
              <GardenSettingsPanel
                planId={planId}
                planName={planName}
                gridWidth={gridWidth}
                gridHeight={gridHeight}
                cellSizeFeet={cellSizeFeet}
                planYear={planYear}
                planSeason={planSeason}
                climateProfile={climateProfile}
                planSummaries={planSummaries}
                hasUnsavedChanges={hasUnsavedChanges}
                lastSavedAt={lastSavedAt}
                canUndo={canUndo}
                canRedo={canRedo}
                onRename={onRenamePlan}
                onSetPlanTime={onSetPlanTime}
                onUpdateClimateProfile={onUpdateClimateProfile}
                onResize={onResizeGarden}
                onCreatePlan={onCreatePlan}
                onDuplicatePlan={onDuplicatePlan}
                onSwitchPlan={onSwitchPlan}
                onUndo={onUndo}
                onRedo={onRedo}
                onSave={onSave}
                onLoad={onLoad}
                onExportPlan={onExportPlan}
                onImportPlan={onImportPlan}
              />
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
