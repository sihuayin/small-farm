import type { Plant, PlantAgronomy } from './plants.d';

const withBasePath = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${path}`;

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
    sprite: withBasePath('/assets/tomato.png'),
    relationships: { companions: ['basil', 'carrot', 'marigold'], enemies: ['cabbage', 'fennel', 'corn'] }
  },
  {
    id: 'basil',
    category: 'herb',
    naming: { en: 'Basil', zh: '罗勒', emoji: '🌿' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 12 },
    styling: { bg_color: '#16a34a', border_color: '#15803d' },
    sprite: withBasePath('/assets/basil.png'),
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
    sprite: withBasePath('/assets/lettuce.png'),
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
  },
  {
    id: 'zucchini',
    category: 'vegetable',
    naming: { en: 'Zucchini', zh: '西葫芦', emoji: '🥒' },
    dimensions: { grid_span_x: 2, grid_span_y: 2, spacing_inch: 24 },
    styling: { bg_color: '#65a30d', border_color: '#3f6212' },
    relationships: { companions: ['corn', 'bean', 'nasturtium'], enemies: ['potato'] }
  },
  {
    id: 'kale',
    category: 'vegetable',
    naming: { en: 'Kale', zh: '羽衣甘蓝', emoji: '🥬' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 12 },
    styling: { bg_color: '#15803d', border_color: '#166534' },
    relationships: { companions: ['onion', 'dill', 'marigold'], enemies: ['strawberry'] }
  },
  {
    id: 'broccoli',
    category: 'vegetable',
    naming: { en: 'Broccoli', zh: '西兰花', emoji: '🥦' },
    dimensions: { grid_span_x: 2, grid_span_y: 2, spacing_inch: 18 },
    styling: { bg_color: '#16a34a', border_color: '#166534' },
    relationships: { companions: ['dill', 'onion', 'sage'], enemies: ['strawberry', 'tomato'] }
  },
  {
    id: 'cauliflower',
    category: 'vegetable',
    naming: { en: 'Cauliflower', zh: '花椰菜', emoji: '🥦' },
    dimensions: { grid_span_x: 2, grid_span_y: 2, spacing_inch: 18 },
    styling: { bg_color: '#e7e5e4', border_color: '#a8a29e' },
    relationships: { companions: ['dill', 'onion', 'sage'], enemies: ['strawberry', 'tomato'] }
  },
  {
    id: 'beet',
    category: 'vegetable',
    naming: { en: 'Beet', zh: '甜菜根', emoji: '🟣' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 4 },
    styling: { bg_color: '#be123c', border_color: '#881337' },
    relationships: { companions: ['onion', 'lettuce', 'kale'], enemies: ['bean'] }
  },
  {
    id: 'celery',
    category: 'vegetable',
    naming: { en: 'Celery', zh: '芹菜', emoji: '🥬' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 8 },
    styling: { bg_color: '#84cc16', border_color: '#4d7c0f' },
    relationships: { companions: ['tomato', 'bean', 'cabbage'], enemies: ['carrot'] }
  },
  {
    id: 'cilantro',
    category: 'herb',
    naming: { en: 'Cilantro', zh: '香菜', emoji: '🌿' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 6 },
    styling: { bg_color: '#22c55e', border_color: '#15803d' },
    relationships: { companions: ['spinach', 'lettuce', 'pepper'], enemies: ['fennel'] }
  },
  {
    id: 'parsley',
    category: 'herb',
    naming: { en: 'Parsley', zh: '欧芹', emoji: '🌿' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 8 },
    styling: { bg_color: '#16a34a', border_color: '#166534' },
    relationships: { companions: ['tomato', 'pepper', 'asparagus'], enemies: ['lettuce'] }
  },
  {
    id: 'oregano',
    category: 'herb',
    naming: { en: 'Oregano', zh: '牛至', emoji: '🌿' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 12 },
    styling: { bg_color: '#0f766e', border_color: '#115e59' },
    relationships: { companions: ['pepper', 'tomato', 'broccoli'], enemies: [] }
  },
  {
    id: 'thyme',
    category: 'herb',
    naming: { en: 'Thyme', zh: '百里香', emoji: '🌿' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 12 },
    styling: { bg_color: '#2dd4bf', border_color: '#0f766e' },
    relationships: { companions: ['cabbage', 'eggplant', 'strawberry'], enemies: [] }
  },
  {
    id: 'blueberry',
    category: 'fruit',
    naming: { en: 'Blueberry', zh: '蓝莓', emoji: '🫐' },
    dimensions: { grid_span_x: 2, grid_span_y: 2, spacing_inch: 36 },
    styling: { bg_color: '#2563eb', border_color: '#1e3a8a' },
    relationships: { companions: ['thyme', 'strawberry'], enemies: ['potato'] }
  },
  {
    id: 'raspberry',
    category: 'fruit',
    naming: { en: 'Raspberry', zh: '覆盆子', emoji: '🍓' },
    dimensions: { grid_span_x: 1, grid_span_y: 2, spacing_inch: 24 },
    styling: { bg_color: '#e11d48', border_color: '#9f1239' },
    relationships: { companions: ['garlic', 'marigold', 'thyme'], enemies: ['potato'] }
  },
  {
    id: 'blackberry',
    category: 'fruit',
    naming: { en: 'Blackberry', zh: '黑莓', emoji: '🫐' },
    dimensions: { grid_span_x: 1, grid_span_y: 2, spacing_inch: 36 },
    styling: { bg_color: '#4c1d95', border_color: '#2e1065' },
    relationships: { companions: ['garlic', 'thyme'], enemies: ['potato'] }
  },
  {
    id: 'nasturtium',
    category: 'flower',
    naming: { en: 'Nasturtium', zh: '旱金莲', emoji: '🌺' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 10 },
    styling: { bg_color: '#fb923c', border_color: '#c2410c' },
    relationships: { companions: ['cucumber', 'zucchini', 'cabbage'], enemies: [] }
  },
  {
    id: 'lavender',
    category: 'flower',
    naming: { en: 'Lavender', zh: '薰衣草', emoji: '🪻' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 18 },
    styling: { bg_color: '#a78bfa', border_color: '#7c3aed' },
    relationships: { companions: ['rosemary', 'sage', 'thyme'], enemies: ['mint'] }
  },
  {
    id: 'chili',
    category: 'vegetable',
    naming: { en: 'Chili Pepper', zh: '辣椒', emoji: '🌶️' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 18 },
    styling: { bg_color: '#dc2626', border_color: '#991b1b' },
    relationships: { companions: ['basil', 'oregano', 'onion'], enemies: ['fennel'] }
  },
  {
    id: 'arugula',
    category: 'vegetable',
    naming: { en: 'Arugula', zh: '芝麻菜', emoji: '🥬' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 4 },
    styling: { bg_color: '#65a30d', border_color: '#3f6212' },
    relationships: { companions: ['lettuce', 'beet', 'onion'], enemies: [] }
  },
  {
    id: 'chard',
    category: 'vegetable',
    naming: { en: 'Swiss Chard', zh: '瑞士甜菜', emoji: '🥬' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 10 },
    styling: { bg_color: '#22c55e', border_color: '#be123c' },
    relationships: { companions: ['bean', 'onion', 'radish'], enemies: [] }
  },
  {
    id: 'okra',
    category: 'vegetable',
    naming: { en: 'Okra', zh: '秋葵', emoji: '🌱' },
    dimensions: { grid_span_x: 1, grid_span_y: 2, spacing_inch: 18 },
    styling: { bg_color: '#4ade80', border_color: '#15803d' },
    relationships: { companions: ['pepper', 'eggplant', 'basil'], enemies: ['potato'] }
  },
  {
    id: 'asparagus',
    category: 'vegetable',
    naming: { en: 'Asparagus', zh: '芦笋', emoji: '🌱' },
    dimensions: { grid_span_x: 1, grid_span_y: 2, spacing_inch: 18 },
    styling: { bg_color: '#86efac', border_color: '#15803d' },
    relationships: { companions: ['parsley', 'tomato', 'basil'], enemies: ['onion', 'garlic'] }
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
  spacing: { plantInch: 12, rowInch: 18 },
  germinationDays: [7, 14],
  plantingDepthInch: 0.5,
  startMethod: 'either',
  dataConfidence: 'reference',
  dataSourceLabel: 'Backyard reference profile',
  lastReviewedAt: '2026-05-31',
  confidenceNote: '人工整理的常见后院园艺参数，适合 Alpha 推荐解释；仍需接入正式地区资料源复核。',
  sowingWindow: { startOffsetDays: -14, endOffsetDays: 28 },
  harvestWindow: { startOffsetDays: 55, endOffsetDays: 95 }
};

const agronomyByPlantId: Record<string, Partial<PlantAgronomy>> = {
  tomato: { family: 'nightshade', rotationGroup: 'fruiting', waterNeed: 'medium', daysToMaturity: 80, spacing: { plantInch: 24, rowInch: 36 }, germinationDays: [5, 10], plantingDepthInch: 0.25, startMethod: 'transplant', sowingWindow: { startOffsetDays: 14, endOffsetDays: 56 } },
  basil: { family: 'lamiaceae', rotationGroup: 'leafy', waterNeed: 'medium', daysToMaturity: 65, spacing: { plantInch: 12, rowInch: 18 }, germinationDays: [5, 10], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: 7, endOffsetDays: 70 } },
  carrot: { family: 'apiaceae', rotationGroup: 'root', waterNeed: 'medium', daysToMaturity: 75, spacing: { plantInch: 3, rowInch: 12 }, germinationDays: [14, 21], plantingDepthInch: 0.25, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -28, endOffsetDays: 150 } },
  lettuce: { family: 'leafy', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'high', daysToMaturity: 45, spacing: { plantInch: 8, rowInch: 12 }, germinationDays: [2, 10], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: -45, endOffsetDays: 170 } },
  pepper: { family: 'nightshade', rotationGroup: 'fruiting', waterNeed: 'medium', daysToMaturity: 85, spacing: { plantInch: 18, rowInch: 24 }, germinationDays: [7, 21], plantingDepthInch: 0.25, startMethod: 'transplant', sowingWindow: { startOffsetDays: 14, endOffsetDays: 56 } },
  onion: { family: 'allium', rotationGroup: 'root', waterNeed: 'low', daysToMaturity: 100, spacing: { plantInch: 4, rowInch: 12 }, germinationDays: [7, 14], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: -42, endOffsetDays: 42 } },
  cabbage: { family: 'brassica', rotationGroup: 'leafy', seasons: ['spring', 'fall'], waterNeed: 'high', daysToMaturity: 90, spacing: { plantInch: 18, rowInch: 24 }, germinationDays: [5, 10], plantingDepthInch: 0.25, startMethod: 'transplant', sowingWindow: { startOffsetDays: -42, endOffsetDays: 150 } },
  corn: { family: 'other', rotationGroup: 'fruiting', waterNeed: 'high', daysToMaturity: 90, spacing: { plantInch: 12, rowInch: 30 }, germinationDays: [7, 10], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 14, endOffsetDays: 85 } },
  bean: { family: 'legume', rotationGroup: 'legume', waterNeed: 'medium', daysToMaturity: 60, spacing: { plantInch: 6, rowInch: 18 }, germinationDays: [6, 10], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 14, endOffsetDays: 95 } },
  cucumber: { family: 'cucurbit', rotationGroup: 'fruiting', waterNeed: 'high', daysToMaturity: 60, spacing: { plantInch: 12, rowInch: 36 }, germinationDays: [3, 10], plantingDepthInch: 0.5, startMethod: 'either', sowingWindow: { startOffsetDays: 14, endOffsetDays: 90 } },
  potato: { family: 'nightshade', rotationGroup: 'root', waterNeed: 'medium', daysToMaturity: 100, spacing: { plantInch: 12, rowInch: 30 }, germinationDays: [14, 28], plantingDepthInch: 4, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -28, endOffsetDays: 42 } },
  eggplant: { family: 'nightshade', rotationGroup: 'fruiting', waterNeed: 'medium', daysToMaturity: 85, spacing: { plantInch: 24, rowInch: 30 }, germinationDays: [7, 14], plantingDepthInch: 0.25, startMethod: 'transplant', sowingWindow: { startOffsetDays: 14, endOffsetDays: 63 } },
  spinach: { family: 'leafy', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'high', daysToMaturity: 45, spacing: { plantInch: 4, rowInch: 12 }, germinationDays: [5, 10], plantingDepthInch: 0.5, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -42, endOffsetDays: 170 } },
  strawberry: { family: 'fruit', rotationGroup: 'perennial', seasons: ['spring'], waterNeed: 'medium', daysToMaturity: 90, spacing: { plantInch: 12, rowInch: 24 }, germinationDays: [14, 28], startMethod: 'transplant', sowingWindow: { startOffsetDays: -28, endOffsetDays: 28 } },
  garlic: { family: 'allium', rotationGroup: 'root', seasons: ['fall'], waterNeed: 'low', daysToMaturity: 240, spacing: { plantInch: 6, rowInch: 12 }, germinationDays: [7, 21], plantingDepthInch: 2, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 160, endOffsetDays: 210 } },
  radish: { family: 'brassica', rotationGroup: 'root', seasons: ['spring', 'fall'], daysToMaturity: 30, spacing: { plantInch: 2, rowInch: 8 }, germinationDays: [3, 7], plantingDepthInch: 0.5, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -28, endOffsetDays: 170 } },
  pea: { family: 'legume', rotationGroup: 'legume', seasons: ['spring', 'fall'], waterNeed: 'medium', daysToMaturity: 60, spacing: { plantInch: 3, rowInch: 18 }, germinationDays: [7, 14], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -56, endOffsetDays: 14 } },
  marigold: { family: 'flower', rotationGroup: 'flower', seasons: ['spring', 'summer'], waterNeed: 'low', daysToMaturity: 55, spacing: { plantInch: 8, rowInch: 12 }, germinationDays: [4, 14], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: 0, endOffsetDays: 70 } },
  sunflower: { family: 'aster', rotationGroup: 'flower', waterNeed: 'medium', daysToMaturity: 90, spacing: { plantInch: 24, rowInch: 30 }, germinationDays: [7, 10], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 14, endOffsetDays: 90 } },
  dill: { family: 'apiaceae', rotationGroup: 'leafy', waterNeed: 'low', daysToMaturity: 55, spacing: { plantInch: 12, rowInch: 18 }, germinationDays: [10, 14], plantingDepthInch: 0.25, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -14, endOffsetDays: 120 } },
  fennel: { family: 'apiaceae', rotationGroup: 'leafy', waterNeed: 'low', daysToMaturity: 80, spacing: { plantInch: 12, rowInch: 18 }, germinationDays: [7, 14], plantingDepthInch: 0.25, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 0, endOffsetDays: 120 } },
  sage: { family: 'lamiaceae', rotationGroup: 'perennial', waterNeed: 'low', daysToMaturity: 75, spacing: { plantInch: 18, rowInch: 24 }, germinationDays: [10, 21], plantingDepthInch: 0.25, startMethod: 'transplant', sowingWindow: { startOffsetDays: 0, endOffsetDays: 84 } },
  rosemary: { family: 'lamiaceae', rotationGroup: 'perennial', waterNeed: 'low', daysToMaturity: 120, spacing: { plantInch: 24, rowInch: 36 }, germinationDays: [14, 28], plantingDepthInch: 0.25, startMethod: 'transplant', sowingWindow: { startOffsetDays: 0, endOffsetDays: 70 } },
  pumpkin: { family: 'cucurbit', rotationGroup: 'fruiting', waterNeed: 'high', daysToMaturity: 110, spacing: { plantInch: 36, rowInch: 72 }, germinationDays: [5, 10], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 14, endOffsetDays: 70 } },
  melon: { family: 'cucurbit', rotationGroup: 'fruiting', waterNeed: 'high', daysToMaturity: 90, spacing: { plantInch: 36, rowInch: 72 }, germinationDays: [4, 10], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 21, endOffsetDays: 70 } },
  zucchini: { family: 'cucurbit', rotationGroup: 'fruiting', waterNeed: 'high', daysToMaturity: 55, spacing: { plantInch: 24, rowInch: 36 }, germinationDays: [4, 10], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 14, endOffsetDays: 90 } },
  kale: { family: 'brassica', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'medium', daysToMaturity: 55, spacing: { plantInch: 12, rowInch: 18 }, germinationDays: [5, 10], plantingDepthInch: 0.5, startMethod: 'either', sowingWindow: { startOffsetDays: -42, endOffsetDays: 170 } },
  broccoli: { family: 'brassica', rotationGroup: 'leafy', seasons: ['spring', 'fall'], waterNeed: 'high', daysToMaturity: 70, spacing: { plantInch: 18, rowInch: 24 }, germinationDays: [5, 10], plantingDepthInch: 0.25, startMethod: 'transplant', sowingWindow: { startOffsetDays: -35, endOffsetDays: 150 } },
  cauliflower: { family: 'brassica', rotationGroup: 'leafy', seasons: ['spring', 'fall'], waterNeed: 'high', daysToMaturity: 75, spacing: { plantInch: 18, rowInch: 24 }, germinationDays: [5, 10], plantingDepthInch: 0.25, startMethod: 'transplant', sowingWindow: { startOffsetDays: -35, endOffsetDays: 150 } },
  beet: { family: 'root', rotationGroup: 'root', seasons: ['spring', 'fall'], waterNeed: 'medium', daysToMaturity: 60, spacing: { plantInch: 4, rowInch: 12 }, germinationDays: [5, 12], plantingDepthInch: 0.5, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -28, endOffsetDays: 160 } },
  celery: { family: 'apiaceae', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'high', daysToMaturity: 120, spacing: { plantInch: 8, rowInch: 18 }, germinationDays: [14, 21], plantingDepthInch: 0.125, startMethod: 'transplant', sowingWindow: { startOffsetDays: -28, endOffsetDays: 112 } },
  cilantro: { family: 'apiaceae', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'medium', daysToMaturity: 45, spacing: { plantInch: 6, rowInch: 12 }, germinationDays: [7, 14], plantingDepthInch: 0.25, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -28, endOffsetDays: 170 } },
  parsley: { family: 'apiaceae', rotationGroup: 'leafy', seasons: ['spring', 'summer', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'medium', daysToMaturity: 75, spacing: { plantInch: 8, rowInch: 12 }, germinationDays: [14, 28], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: -14, endOffsetDays: 120 } },
  oregano: { family: 'lamiaceae', rotationGroup: 'perennial', seasons: ['spring', 'summer'], waterNeed: 'low', hardinessZones: [5, 10], daysToMaturity: 80, spacing: { plantInch: 12, rowInch: 18 }, germinationDays: [7, 14], plantingDepthInch: 0.125, startMethod: 'transplant', sowingWindow: { startOffsetDays: 0, endOffsetDays: 84 } },
  thyme: { family: 'lamiaceae', rotationGroup: 'perennial', seasons: ['spring', 'summer'], waterNeed: 'low', hardinessZones: [5, 9], daysToMaturity: 90, spacing: { plantInch: 12, rowInch: 18 }, germinationDays: [14, 28], plantingDepthInch: 0.125, startMethod: 'transplant', sowingWindow: { startOffsetDays: 0, endOffsetDays: 84 } },
  blueberry: { family: 'fruit', rotationGroup: 'perennial', seasons: ['spring'], waterNeed: 'medium', hardinessZones: [4, 8], daysToMaturity: 365, spacing: { plantInch: 36, rowInch: 60 }, germinationDays: [21, 35], startMethod: 'transplant', sowingWindow: { startOffsetDays: -28, endOffsetDays: 42 }, harvestWindow: { startOffsetDays: 365, endOffsetDays: 730 } },
  raspberry: { family: 'fruit', rotationGroup: 'perennial', seasons: ['spring'], waterNeed: 'medium', hardinessZones: [4, 8], daysToMaturity: 365, spacing: { plantInch: 24, rowInch: 72 }, germinationDays: [21, 35], startMethod: 'transplant', sowingWindow: { startOffsetDays: -28, endOffsetDays: 42 }, harvestWindow: { startOffsetDays: 365, endOffsetDays: 730 } },
  blackberry: { family: 'fruit', rotationGroup: 'perennial', seasons: ['spring'], waterNeed: 'medium', hardinessZones: [5, 9], daysToMaturity: 365, spacing: { plantInch: 36, rowInch: 72 }, germinationDays: [21, 35], startMethod: 'transplant', sowingWindow: { startOffsetDays: -28, endOffsetDays: 42 }, harvestWindow: { startOffsetDays: 365, endOffsetDays: 730 } },
  nasturtium: { family: 'flower', rotationGroup: 'flower', seasons: ['spring', 'summer'], waterNeed: 'medium', daysToMaturity: 55, spacing: { plantInch: 10, rowInch: 12 }, germinationDays: [7, 12], plantingDepthInch: 0.5, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 0, endOffsetDays: 90 } },
  lavender: { family: 'lamiaceae', rotationGroup: 'perennial', seasons: ['spring', 'summer'], waterNeed: 'low', hardinessZones: [5, 9], daysToMaturity: 100, spacing: { plantInch: 18, rowInch: 24 }, germinationDays: [14, 28], plantingDepthInch: 0.125, startMethod: 'transplant', sowingWindow: { startOffsetDays: 0, endOffsetDays: 70 } },
  chili: { family: 'nightshade', rotationGroup: 'fruiting', waterNeed: 'medium', daysToMaturity: 80, spacing: { plantInch: 18, rowInch: 24 }, germinationDays: [7, 21], plantingDepthInch: 0.25, startMethod: 'transplant', sowingWindow: { startOffsetDays: 14, endOffsetDays: 56 } },
  arugula: { family: 'brassica', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'medium', daysToMaturity: 35, spacing: { plantInch: 4, rowInch: 8 }, germinationDays: [3, 7], plantingDepthInch: 0.25, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -42, endOffsetDays: 170 } },
  chard: { family: 'leafy', rotationGroup: 'leafy', seasons: ['spring', 'summer', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'medium', daysToMaturity: 60, spacing: { plantInch: 10, rowInch: 18 }, germinationDays: [5, 10], plantingDepthInch: 0.5, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -14, endOffsetDays: 150 } },
  okra: { family: 'other', rotationGroup: 'fruiting', seasons: ['summer'], waterNeed: 'medium', hardinessZones: [7, 11], daysToMaturity: 60, spacing: { plantInch: 18, rowInch: 30 }, germinationDays: [7, 14], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 21, endOffsetDays: 90 } },
  asparagus: { family: 'other', rotationGroup: 'perennial', seasons: ['spring'], waterNeed: 'medium', hardinessZones: [3, 8], daysToMaturity: 730, spacing: { plantInch: 18, rowInch: 48 }, germinationDays: [14, 21], plantingDepthInch: 6, startMethod: 'transplant', sowingWindow: { startOffsetDays: -28, endOffsetDays: 28 }, harvestWindow: { startOffsetDays: 730, endOffsetDays: 1095 } }
};

export function getPlantAgronomy(plantId: string): PlantAgronomy {
  const plant = plants.find(item => item.id === plantId);
  const override = agronomyByPlantId[plantId] || {};
  return {
    ...agronomyDefaults,
    ...override,
    spacing: {
      plantInch: override.spacing?.plantInch || plant?.dimensions.spacing_inch || agronomyDefaults.spacing.plantInch,
      rowInch: override.spacing?.rowInch || agronomyDefaults.spacing.rowInch
    }
  };
}

export function getPlantSpacingLabel(plantId: string): string {
  const agronomy = getPlantAgronomy(plantId);
  return `株距 ${agronomy.spacing.plantInch} in${agronomy.spacing.rowInch ? ` / 行距 ${agronomy.spacing.rowInch} in` : ''}`;
}

export function getPlantTimingLabel(plantId: string): string {
  const agronomy = getPlantAgronomy(plantId);
  return `${agronomy.daysToMaturity} 天成熟 · 发芽 ${agronomy.germinationDays[0]}-${agronomy.germinationDays[1]} 天`;
}

export function getPlantCredibilityNotes(plantId: string): string[] {
  const agronomy = getPlantAgronomy(plantId);
  const depth = agronomy.plantingDepthInch ? `播种深度 ${agronomy.plantingDepthInch} in` : '移栽为主';
  return [
    getPlantSpacingLabel(plantId),
    getPlantTimingLabel(plantId),
    `${startMethodLabel(agronomy.startMethod)} · ${depth}`,
    agronomy.dataConfidence === 'reference'
      ? `资料: ${agronomy.dataSourceLabel} · ${agronomy.lastReviewedAt}`
      : `资料: 演示占位 · ${agronomy.confidenceNote}`
  ];
}

function startMethodLabel(method: PlantAgronomy['startMethod']) {
  if (method === 'direct_sow') return '适合直播';
  if (method === 'transplant') return '适合移栽';
  return '直播/移栽均可';
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
  { id: 'dark_soil', name: '耕地', emoji: '🌱', bgColor: '#8B4513', sprite: withBasePath('/assets/dark_soil.png') },
  { id: 'wet_soil', name: '湿土', emoji: '💧', bgColor: '#654321', sprite: withBasePath('/assets/wet_soil.png') },
  { id: 'raised_bed', name: '苗床', emoji: '🪵', bgColor: '#DEB887', sprite: withBasePath('/assets/raised_bed.png') },
  { id: 'stone_path', name: '石板路', emoji: '🪨', bgColor: '#A9A9A9', sprite: withBasePath('/assets/stone_path.png') },
  { id: 'fence_h', name: '围栏(横)', emoji: '↔️', bgColor: '#8B7355', sprite: withBasePath('/assets/fence.png') },
  { id: 'fence_v', name: '围栏(纵)', emoji: '↕️', bgColor: '#8B7355', sprite: withBasePath('/assets/fence.png') },
  { id: 'fence_corner', name: '围栏(角)', emoji: '🔲', bgColor: '#8B7355', sprite: withBasePath('/assets/fence.png') },
];

export const tileMap: Map<TileType, TileConfig> = new Map(tiles.map(t => [t.id, t]));
