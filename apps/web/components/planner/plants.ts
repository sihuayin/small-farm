import type { Plant, PlantAgronomy } from './plants.d';

/**
 * 植物百科数据库
 * 每个植物定义其空间占用 (grid_span) 和生化关系 (companions/enemies)
 * 有对应游戏资源的植物使用像素艺术素材
 */
export const plants: Plant[] = [
  {
    id: 'tomato',
    category: 'vegetable',
    naming: { en: 'Tomato', zh: '番茄', emoji: '🍅' },
    dimensions: { grid_span_x: 2, grid_span_y: 2, spacing_inch: 24 },
    styling: { bg_color: '#dc2626', border_color: '#991b1b' },
    sprite: '/assets/tomato.png',
    relationships: { companions: ['basil', 'carrot', 'marigold'], enemies: ['cabbage', 'fennel', 'corn'] }
  },
  {
    id: 'basil',
    category: 'herb',
    naming: { en: 'Basil', zh: '罗勒', emoji: '🌿' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 12 },
    styling: { bg_color: '#16a34a', border_color: '#15803d' },
    sprite: '/assets/basil.png',
    relationships: { companions: ['tomato', 'pepper'], enemies: ['sage'] }
  },
  {
    id: 'carrot',
    category: 'vegetable',
    naming: { en: 'Carrot', zh: '胡萝卜', emoji: '🥕' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 3 },
    styling: { bg_color: '#ea580c', border_color: '#c2410c' },
    relationships: { companions: ['tomato', 'onion', 'lettuce'], enemies: ['dill'] }
  },
  {
    id: 'lettuce',
    category: 'vegetable',
    naming: { en: 'Lettuce', zh: '生菜', emoji: '🥬' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 8 },
    styling: { bg_color: '#22c55e', border_color: '#16a34a' },
    sprite: '/assets/lettuce.png',
    relationships: { companions: ['carrot', 'radish', 'strawberry'], enemies: [] }
  },
  {
    id: 'pepper',
    category: 'vegetable',
    naming: { en: 'Bell Pepper', zh: '甜椒', emoji: '🫑' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 18 },
    styling: { bg_color: '#eab308', border_color: '#ca8a04' },
    relationships: { companions: ['basil', 'tomato', 'carrot'], enemies: ['fennel'] }
  },
  {
    id: 'onion',
    category: 'vegetable',
    naming: { en: 'Onion', zh: '洋葱', emoji: '🧅' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 4 },
    styling: { bg_color: '#f5f5dc', border_color: '#d4c896' },
    relationships: { companions: ['carrot', 'lettuce', 'tomato'], enemies: ['bean'] }
  },
  {
    id: 'cabbage',
    category: 'vegetable',
    naming: { en: 'Cabbage', zh: '卷心菜', emoji: '🥬' },
    dimensions: { grid_span_x: 2, grid_span_y: 2, spacing_inch: 18 },
    styling: { bg_color: '#84cc16', border_color: '#65a30d' },
    relationships: { companions: ['dill', 'onion'], enemies: ['tomato', 'strawberry'] }
  },
  {
    id: 'corn',
    category: 'vegetable',
    naming: { en: 'Corn', zh: '玉米', emoji: '🌽' },
    dimensions: { grid_span_x: 1, grid_span_y: 3, spacing_inch: 12 },
    styling: { bg_color: '#fbbf24', border_color: '#f59e0b' },
    relationships: { companions: ['bean', 'pumpkin'], enemies: ['tomato'] }
  },
  {
    id: 'bean',
    category: 'vegetable',
    naming: { en: 'Green Bean', zh: '四季豆', emoji: '🫘' },
    dimensions: { grid_span_x: 1, grid_span_y: 2, spacing_inch: 6 },
    styling: { bg_color: '#65a30d', border_color: '#4d7c0f' },
    relationships: { companions: ['corn', 'carrot', 'cucumber'], enemies: ['onion', 'garlic'] }
  },
  {
    id: 'cucumber',
    category: 'vegetable',
    naming: { en: 'Cucumber', zh: '黄瓜', emoji: '🥒' },
    dimensions: { grid_span_x: 2, grid_span_y: 1, spacing_inch: 12 },
    styling: { bg_color: '#4ade80', border_color: '#22c55e' },
    relationships: { companions: ['bean', 'pea', 'sunflower'], enemies: ['potato', 'melon'] }
  },
  {
    id: 'potato',
    category: 'vegetable',
    naming: { en: 'Potato', zh: '土豆', emoji: '🥔' },
    dimensions: { grid_span_x: 2, grid_span_y: 2, spacing_inch: 12 },
    styling: { bg_color: '#a16207', border_color: '#854d0e' },
    relationships: { companions: ['bean', 'corn', 'cabbage'], enemies: ['cucumber', 'tomato', 'pumpkin'] }
  },
  {
    id: 'eggplant',
    category: 'vegetable',
    naming: { en: 'Eggplant', zh: '茄子', emoji: '🍆' },
    dimensions: { grid_span_x: 2, grid_span_y: 2, spacing_inch: 24 },
    styling: { bg_color: '#7c3aed', border_color: '#6d28d9' },
    relationships: { companions: ['bean', 'pepper', 'spinach'], enemies: ['fennel'] }
  },
  {
    id: 'spinach',
    category: 'vegetable',
    naming: { en: 'Spinach', zh: '菠菜', emoji: '🥬' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 4 },
    styling: { bg_color: '#166534', border_color: '#14532d' },
    relationships: { companions: ['eggplant', 'strawberry', 'radish'], enemies: [] }
  },
  {
    id: 'strawberry',
    category: 'fruit',
    naming: { en: 'Strawberry', zh: '草莓', emoji: '🍓' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 12 },
    styling: { bg_color: '#f43f5e', border_color: '#e11d48' },
    relationships: { companions: ['lettuce', 'spinach', 'onion'], enemies: ['cabbage'] }
  },
  {
    id: 'garlic',
    category: 'vegetable',
    naming: { en: 'Garlic', zh: '大蒜', emoji: '🧄' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 6 },
    styling: { bg_color: '#fef3c7', border_color: '#fde68a' },
    relationships: { companions: ['tomato', 'pepper', 'strawberry'], enemies: ['bean', 'pea'] }
  },
  {
    id: 'radish',
    category: 'vegetable',
    naming: { en: 'Radish', zh: '萝卜', emoji: '🔴' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 2 },
    styling: { bg_color: '#f87171', border_color: '#ef4444' },
    relationships: { companions: ['lettuce', 'spinach', 'pea'], enemies: ['hyssop'] }
  },
  {
    id: 'pea',
    category: 'vegetable',
    naming: { en: 'Pea', zh: '豌豆', emoji: '🟢' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 3 },
    styling: { bg_color: '#4ade80', border_color: '#22c55e' },
    relationships: { companions: ['carrot', 'radish', 'cucumber'], enemies: ['garlic', 'onion'] }
  },
  {
    id: 'marigold',
    category: 'flower',
    naming: { en: 'Marigold', zh: '万寿菊', emoji: '🌼' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 8 },
    styling: { bg_color: '#fbbf24', border_color: '#f59e0b' },
    relationships: { companions: ['tomato', 'pepper', 'eggplant'], enemies: [] }
  },
  {
    id: 'sunflower',
    category: 'flower',
    naming: { en: 'Sunflower', zh: '向日葵', emoji: '🌻' },
    dimensions: { grid_span_x: 1, grid_span_y: 2, spacing_inch: 24 },
    styling: { bg_color: '#facc15', border_color: '#eab308' },
    relationships: { companions: ['cucumber', 'corn', 'pumpkin'], enemies: ['potato'] }
  },
  {
    id: 'dill',
    category: 'herb',
    naming: { en: 'Dill', zh: '莳萝', emoji: '🌾' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 12 },
    styling: { bg_color: '#84cc16', border_color: '#65a30d' },
    relationships: { companions: ['cabbage', 'cucumber', 'lettuce'], enemies: ['carrot'] }
  },
  {
    id: 'fennel',
    category: 'herb',
    naming: { en: 'Fennel', zh: '茴香', emoji: '🌿' },
    dimensions: { grid_span_x: 1, grid_span_y: 2, spacing_inch: 12 },
    styling: { bg_color: '#a3e635', border_color: '#84cc16' },
    relationships: { companions: [], enemies: ['tomato', 'pepper', 'eggplant', 'bean'] }
  },
  {
    id: 'sage',
    category: 'herb',
    naming: { en: 'Sage', zh: '鼠尾草', emoji: '💜' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 18 },
    styling: { bg_color: '#8b5cf6', border_color: '#7c3aed' },
    relationships: { companions: ['rosemary', 'cabbage', 'carrot'], enemies: ['basil', 'cucumber'] }
  },
  {
    id: 'rosemary',
    category: 'herb',
    naming: { en: 'Rosemary', zh: '迷迭香', emoji: '🪴' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 24 },
    styling: { bg_color: '#0d9488', border_color: '#0f766e' },
    relationships: { companions: ['sage', 'bean', 'cabbage'], enemies: ['pumpkin'] }
  },
  {
    id: 'pumpkin',
    category: 'vegetable',
    naming: { en: 'Pumpkin', zh: '南瓜', emoji: '🎃' },
    dimensions: { grid_span_x: 3, grid_span_y: 3, spacing_inch: 36 },
    styling: { bg_color: '#ea580c', border_color: '#c2410c' },
    relationships: { companions: ['corn', 'bean', 'sunflower'], enemies: ['potato', 'rosemary'] }
  },
  {
    id: 'melon',
    category: 'fruit',
    naming: { en: 'Watermelon', zh: '西瓜', emoji: '🍉' },
    dimensions: { grid_span_x: 3, grid_span_y: 1, spacing_inch: 36 },
    styling: { bg_color: '#22c55e', border_color: '#16a34a' },
    relationships: { companions: ['corn', 'radish'], enemies: ['cucumber', 'potato'] }
  }
];

const agronomyDefaults: PlantAgronomy = {
  family: 'other',
  rotationGroup: 'other',
  seasons: ['spring', 'summer'],
  sunRequirement: 'full_sun',
  waterNeed: 'medium',
  hardinessZones: [3, 10],
  daysToMaturity: 70,
  sowingWindow: { startOffsetDays: -14, endOffsetDays: 28 },
  harvestWindow: { startOffsetDays: 55, endOffsetDays: 95 }
};

const agronomyByPlantId: Record<string, Partial<PlantAgronomy>> = {
  tomato: { family: 'nightshade', rotationGroup: 'fruiting', waterNeed: 'medium', daysToMaturity: 80 },
  basil: { family: 'lamiaceae', rotationGroup: 'leafy', waterNeed: 'medium', daysToMaturity: 65 },
  carrot: { family: 'apiaceae', rotationGroup: 'root', waterNeed: 'medium', daysToMaturity: 75 },
  lettuce: { family: 'leafy', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'high', daysToMaturity: 45 },
  pepper: { family: 'nightshade', rotationGroup: 'fruiting', waterNeed: 'medium', daysToMaturity: 85 },
  onion: { family: 'allium', rotationGroup: 'root', waterNeed: 'low', daysToMaturity: 100 },
  cabbage: { family: 'brassica', rotationGroup: 'leafy', seasons: ['spring', 'fall'], waterNeed: 'high', daysToMaturity: 90 },
  corn: { family: 'other', rotationGroup: 'fruiting', waterNeed: 'high', daysToMaturity: 90 },
  bean: { family: 'legume', rotationGroup: 'legume', waterNeed: 'medium', daysToMaturity: 60 },
  cucumber: { family: 'cucurbit', rotationGroup: 'fruiting', waterNeed: 'high', daysToMaturity: 60 },
  potato: { family: 'nightshade', rotationGroup: 'root', waterNeed: 'medium', daysToMaturity: 100 },
  eggplant: { family: 'nightshade', rotationGroup: 'fruiting', waterNeed: 'medium', daysToMaturity: 85 },
  spinach: { family: 'leafy', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'high', daysToMaturity: 45 },
  strawberry: { family: 'fruit', rotationGroup: 'perennial', seasons: ['spring'], waterNeed: 'medium', daysToMaturity: 90 },
  garlic: { family: 'allium', rotationGroup: 'root', seasons: ['fall'], waterNeed: 'low', daysToMaturity: 240 },
  radish: { family: 'brassica', rotationGroup: 'root', seasons: ['spring', 'fall'], daysToMaturity: 30 },
  pea: { family: 'legume', rotationGroup: 'legume', seasons: ['spring', 'fall'], waterNeed: 'medium', daysToMaturity: 60 },
  marigold: { family: 'flower', rotationGroup: 'flower', seasons: ['spring', 'summer'], waterNeed: 'low', daysToMaturity: 55 },
  sunflower: { family: 'aster', rotationGroup: 'flower', waterNeed: 'medium', daysToMaturity: 90 },
  dill: { family: 'apiaceae', rotationGroup: 'leafy', waterNeed: 'low', daysToMaturity: 55 },
  fennel: { family: 'apiaceae', rotationGroup: 'leafy', waterNeed: 'low', daysToMaturity: 80 },
  sage: { family: 'lamiaceae', rotationGroup: 'perennial', waterNeed: 'low', daysToMaturity: 75 },
  rosemary: { family: 'lamiaceae', rotationGroup: 'perennial', waterNeed: 'low', daysToMaturity: 120 },
  pumpkin: { family: 'cucurbit', rotationGroup: 'fruiting', waterNeed: 'high', daysToMaturity: 110 },
  melon: { family: 'cucurbit', rotationGroup: 'fruiting', waterNeed: 'high', daysToMaturity: 90 }
};

export function getPlantAgronomy(plantId: string): PlantAgronomy {
  return { ...agronomyDefaults, ...agronomyByPlantId[plantId] };
}

/**
 * 植物 ID 到植物实例的映射（用于快速查找）
 */
export const plantMap: Map<string, Plant> = new Map(plants.map(p => [p.id, p]));

/**
 * 地块类型枚举
 */
export type TileType =
  | 'dark_soil'        // 暗棕色耕地
  | 'wet_soil'         // 浇水土壤（深色）
  | 'raised_bed'       // 木质升高苗床
  | 'stone_path'       // 石板路
  | 'fence_h'          // 横向木栅栏
  | 'fence_v'          // 纵向木栅栏
  | 'fence_corner';    // 转角木栅栏

/**
 * 地块配置
 */
export interface TileConfig {
  id: TileType;
  name: string;
  emoji: string;
  bgColor: string;
  sprite?: string;
}

export const tiles: TileConfig[] = [
  { id: 'dark_soil', name: '耕地', emoji: '🌱', bgColor: '#8B4513', sprite: '/assets/dark_soil.png' },
  { id: 'wet_soil', name: '湿土', emoji: '💧', bgColor: '#654321', sprite: '/assets/wet_soil.png' },
  { id: 'raised_bed', name: '苗床', emoji: '🪵', bgColor: '#DEB887', sprite: '/assets/raised_bed.png' },
  { id: 'stone_path', name: '石板路', emoji: '🪨', bgColor: '#A9A9A9', sprite: '/assets/stone_path.png' },
  { id: 'fence_h', name: '围栏(横)', emoji: '↔️', bgColor: '#8B7355', sprite: '/assets/fence.png' },
  { id: 'fence_v', name: '围栏(纵)', emoji: '↕️', bgColor: '#8B7355', sprite: '/assets/fence.png' },
  { id: 'fence_corner', name: '围栏(角)', emoji: '🔲', bgColor: '#8B7355', sprite: '/assets/fence.png' },
];

export const tileMap: Map<TileType, TileConfig> = new Map(tiles.map(t => [t.id, t]));
