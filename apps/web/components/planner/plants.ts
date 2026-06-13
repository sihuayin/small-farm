import type { ClimateProfile, PlanSeason } from './types';
import type { Plant, PlantAgronomy, PlantReviewSummary } from './plants.d';

const withBasePath = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${path}`;
const coreReviewedPlantIds = new Set([
  'tomato',
  'basil',
  'pepper',
  'lettuce',
  'spinach',
  'arugula',
  'bok_choy',
  'cilantro',
  'carrot',
  'radish',
  'beet',
  'cucumber',
  'bean',
  'kongxin_cai',
  'amaranth',
  'chive',
  'scallion',
  'youmai_cai',
  'shanghai_qing',
  'cai_xin',
  'garland_chrysanthemum',
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
  'bitter_melon',
  'daikon',
  'kale',
  'broccoli'
]);

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
    sprite: withBasePath('/assets/carrot.png'),
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
    sprite: withBasePath('/assets/pepper.png'),
    relationships: { companions: ['basil', 'tomato', 'carrot'], enemies: ['fennel'] }
  },
  {
    id: 'onion',
    category: 'vegetable',
    naming: { en: 'Onion', zh: '洋葱', emoji: '🧅' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 4 },
    styling: { bg_color: '#f5f5dc', border_color: '#d4c896' },
    sprite: withBasePath('/assets/onion.png'),
    relationships: { companions: ['carrot', 'lettuce', 'tomato'], enemies: ['bean'] }
  },
  {
    id: 'cabbage',
    category: 'vegetable',
    naming: { en: 'Cabbage', zh: '卷心菜', emoji: '🥬' },
    dimensions: { grid_span_x: 2, grid_span_y: 2, spacing_inch: 18 },
    styling: { bg_color: '#84cc16', border_color: '#65a30d' },
    sprite: withBasePath('/assets/cabbage.png'),
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
  },
  {
    id: 'mint',
    category: 'herb',
    naming: { en: 'Mint', zh: '薄荷', emoji: '🌿' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 18 },
    styling: { bg_color: '#34d399', border_color: '#059669' },
    relationships: { companions: ['cabbage', 'tomato', 'pea'], enemies: ['lavender', 'rosemary'] }
  },
  {
    id: 'hyssop',
    category: 'herb',
    naming: { en: 'Hyssop', zh: '牛膝草', emoji: '🌿' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 12 },
    styling: { bg_color: '#6366f1', border_color: '#4338ca' },
    relationships: { companions: ['cabbage', 'strawberry', 'lavender'], enemies: ['radish'] }
  },
  {
    id: 'turnip',
    category: 'vegetable',
    naming: { en: 'Turnip', zh: '芜菁', emoji: '🥬' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 4 },
    styling: { bg_color: '#f3e8ff', border_color: '#a855f7' },
    relationships: { companions: ['pea', 'onion', 'lettuce'], enemies: ['potato'] }
  },
  {
    id: 'leek',
    category: 'vegetable',
    naming: { en: 'Leek', zh: '韭葱', emoji: '🧅' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 6 },
    styling: { bg_color: '#bbf7d0', border_color: '#16a34a' },
    relationships: { companions: ['carrot', 'celery', 'strawberry'], enemies: ['bean', 'pea'] }
  },
  {
    id: 'sweet_potato',
    category: 'vegetable',
    naming: { en: 'Sweet Potato', zh: '红薯', emoji: '🍠' },
    dimensions: { grid_span_x: 2, grid_span_y: 2, spacing_inch: 12 },
    styling: { bg_color: '#f97316', border_color: '#c2410c' },
    relationships: { companions: ['bean', 'thyme', 'dill'], enemies: ['pumpkin', 'potato'] }
  },
  {
    id: 'winter_squash',
    category: 'vegetable',
    naming: { en: 'Winter Squash', zh: '冬南瓜', emoji: '🎃' },
    dimensions: { grid_span_x: 3, grid_span_y: 3, spacing_inch: 36 },
    styling: { bg_color: '#f59e0b', border_color: '#b45309' },
    relationships: { companions: ['corn', 'bean', 'borage'], enemies: ['potato', 'rosemary'] }
  },
  {
    id: 'bok_choy',
    category: 'vegetable',
    naming: { en: 'Bok Choy', zh: '小白菜', emoji: '🥬' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 8 },
    styling: { bg_color: '#86efac', border_color: '#22c55e' },
    relationships: { companions: ['dill', 'onion', 'nasturtium'], enemies: ['strawberry', 'tomato'] }
  },
  {
    id: 'kongxin_cai',
    category: 'vegetable',
    naming: { en: 'Water Spinach', zh: '空心菜', emoji: '🥬' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 6 },
    styling: { bg_color: '#22c55e', border_color: '#15803d' },
    relationships: { companions: ['scallion', 'marigold', 'cilantro'], enemies: ['fennel'] }
  },
  {
    id: 'amaranth',
    category: 'vegetable',
    naming: { en: 'Amaranth Greens', zh: '苋菜', emoji: '🍃' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 5 },
    styling: { bg_color: '#f43f5e', border_color: '#be123c' },
    relationships: { companions: ['scallion', 'lettuce', 'radish'], enemies: ['fennel'] }
  },
  {
    id: 'chive',
    category: 'herb',
    naming: { en: 'Chinese Chive', zh: '韭菜', emoji: '🌿' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 6 },
    styling: { bg_color: '#16a34a', border_color: '#166534' },
    relationships: { companions: ['carrot', 'tomato', 'strawberry'], enemies: ['bean', 'pea'] }
  },
  {
    id: 'scallion',
    category: 'vegetable',
    naming: { en: 'Scallion', zh: '小葱', emoji: '🧅' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 4 },
    styling: { bg_color: '#bbf7d0', border_color: '#16a34a' },
    relationships: { companions: ['carrot', 'lettuce', 'kongxin_cai'], enemies: ['bean', 'pea'] }
  },
  {
    id: 'youmai_cai',
    category: 'vegetable',
    naming: { en: 'Romaine Lettuce', zh: '油麦菜', emoji: '🥬' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 8 },
    styling: { bg_color: '#65a30d', border_color: '#3f6212' },
    relationships: { companions: ['scallion', 'radish', 'cilantro'], enemies: [] }
  },
  {
    id: 'shanghai_qing',
    category: 'vegetable',
    naming: { en: 'Shanghai Bok Choy', zh: '上海青', emoji: '🥬' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 8 },
    styling: { bg_color: '#86efac', border_color: '#22c55e' },
    relationships: { companions: ['scallion', 'lettuce', 'radish'], enemies: ['tomato'] }
  },
  {
    id: 'cai_xin',
    category: 'vegetable',
    naming: { en: 'Choy Sum', zh: '菜心', emoji: '🥬' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 8 },
    styling: { bg_color: '#22c55e', border_color: '#15803d' },
    relationships: { companions: ['scallion', 'cilantro', 'lettuce'], enemies: ['tomato'] }
  },
  {
    id: 'garland_chrysanthemum',
    category: 'vegetable',
    naming: { en: 'Garland Chrysanthemum', zh: '茼蒿', emoji: '🌿' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 8 },
    styling: { bg_color: '#84cc16', border_color: '#4d7c0f' },
    relationships: { companions: ['lettuce', 'scallion', 'cilantro'], enemies: [] }
  },
  {
    id: 'suanmiao',
    category: 'vegetable',
    naming: { en: 'Garlic Sprouts', zh: '蒜苗', emoji: '🌿' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 4 },
    styling: { bg_color: '#a3e635', border_color: '#65a30d' },
    relationships: { companions: ['lettuce', 'carrot', 'tomato'], enemies: ['bean', 'pea'] }
  },
  {
    id: 'xiaoyoucai',
    category: 'vegetable',
    naming: { en: 'Baby Bok Choy', zh: '小油菜', emoji: '🥬' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 8 },
    styling: { bg_color: '#4ade80', border_color: '#16a34a' },
    relationships: { companions: ['scallion', 'radish', 'lettuce'], enemies: ['tomato'] }
  },
  {
    id: 'gai_lan',
    category: 'vegetable',
    naming: { en: 'Chinese Broccoli', zh: '芥蓝', emoji: '🥬' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 10 },
    styling: { bg_color: '#15803d', border_color: '#166534' },
    relationships: { companions: ['scallion', 'cilantro', 'dill'], enemies: ['tomato'] }
  },
  {
    id: 'ginger',
    category: 'vegetable',
    naming: { en: 'Ginger', zh: '生姜', emoji: '🫚' },
    dimensions: { grid_span_x: 1, grid_span_y: 2, spacing_inch: 10 },
    styling: { bg_color: '#d97706', border_color: '#92400e' },
    relationships: { companions: ['scallion', 'bean', 'marigold'], enemies: ['potato'] }
  },
  {
    id: 'baby_napa',
    category: 'vegetable',
    naming: { en: 'Baby Napa Cabbage', zh: '娃娃菜', emoji: '🥬' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 10 },
    styling: { bg_color: '#bef264', border_color: '#65a30d' },
    relationships: { companions: ['scallion', 'lettuce', 'dill'], enemies: ['tomato', 'strawberry'] }
  },
  {
    id: 'wosun',
    category: 'vegetable',
    naming: { en: 'Stem Lettuce', zh: '莴笋', emoji: '🥬' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 10 },
    styling: { bg_color: '#84cc16', border_color: '#4d7c0f' },
    relationships: { companions: ['scallion', 'carrot', 'cilantro'], enemies: [] }
  },
  {
    id: 'fava_bean',
    category: 'vegetable',
    naming: { en: 'Fava Bean', zh: '蚕豆', emoji: '🫘' },
    dimensions: { grid_span_x: 1, grid_span_y: 2, spacing_inch: 8 },
    styling: { bg_color: '#65a30d', border_color: '#3f6212' },
    relationships: { companions: ['corn', 'lettuce', 'radish'], enemies: ['garlic', 'onion', 'suanmiao'] }
  },
  {
    id: 'donggua',
    category: 'vegetable',
    naming: { en: 'Wax Gourd', zh: '冬瓜', emoji: '🍈' },
    dimensions: { grid_span_x: 3, grid_span_y: 2, spacing_inch: 36 },
    styling: { bg_color: '#a3e635', border_color: '#4d7c0f' },
    relationships: { companions: ['yardlong_bean', 'marigold', 'scallion'], enemies: ['potato'] }
  },
  {
    id: 'yardlong_bean',
    category: 'vegetable',
    naming: { en: 'Yardlong Bean', zh: '豇豆', emoji: '🫘' },
    dimensions: { grid_span_x: 1, grid_span_y: 2, spacing_inch: 8 },
    styling: { bg_color: '#65a30d', border_color: '#3f6212' },
    relationships: { companions: ['corn', 'loofah', 'scallion'], enemies: ['onion', 'garlic', 'chive'] }
  },
  {
    id: 'loofah',
    category: 'vegetable',
    naming: { en: 'Loofah', zh: '丝瓜', emoji: '🥒' },
    dimensions: { grid_span_x: 2, grid_span_y: 2, spacing_inch: 24 },
    styling: { bg_color: '#84cc16', border_color: '#4d7c0f' },
    relationships: { companions: ['yardlong_bean', 'nasturtium', 'marigold'], enemies: ['potato', 'sage'] }
  },
  {
    id: 'bitter_melon',
    category: 'vegetable',
    naming: { en: 'Bitter Melon', zh: '苦瓜', emoji: '🥒' },
    dimensions: { grid_span_x: 2, grid_span_y: 1, spacing_inch: 24 },
    styling: { bg_color: '#65a30d', border_color: '#166534' },
    relationships: { companions: ['yardlong_bean', 'scallion', 'marigold'], enemies: ['potato'] }
  },
  {
    id: 'daikon',
    category: 'vegetable',
    naming: { en: 'Daikon Radish', zh: '白萝卜', emoji: '🥕' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 4 },
    styling: { bg_color: '#f8fafc', border_color: '#94a3b8' },
    relationships: { companions: ['lettuce', 'pea', 'scallion'], enemies: ['hyssop'] }
  },
  {
    id: 'calendula',
    category: 'flower',
    naming: { en: 'Calendula', zh: '金盏花', emoji: '🌼' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 10 },
    styling: { bg_color: '#facc15', border_color: '#ca8a04' },
    relationships: { companions: ['tomato', 'cucumber', 'lettuce'], enemies: [] }
  },
  {
    id: 'borage',
    category: 'flower',
    naming: { en: 'Borage', zh: '琉璃苣', emoji: '🌸' },
    dimensions: { grid_span_x: 1, grid_span_y: 1, spacing_inch: 12 },
    styling: { bg_color: '#38bdf8', border_color: '#0284c7' },
    relationships: { companions: ['tomato', 'strawberry', 'winter_squash'], enemies: [] }
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
  harvestWindow: { startOffsetDays: 55, endOffsetDays: 95 },
  harvestHabit: 'single'
};

const agronomyByPlantId: Record<string, Partial<PlantAgronomy>> = {
  tomato: { family: 'nightshade', rotationGroup: 'fruiting', waterNeed: 'medium', daysToMaturity: 80, spacing: { plantInch: 24, rowInch: 36 }, germinationDays: [5, 10], plantingDepthInch: 0.25, startMethod: 'transplant', nurseryLeadDays: [28, 42], sowingWindow: { startOffsetDays: 14, endOffsetDays: 56 }, transplantWindow: { startOffsetDays: 14, endOffsetDays: 56 }, firstHarvestDays: 75, harvestDurationDays: [35, 70], harvestHabit: 'continuous_pick', plantsPerGrid: 1, yieldEstimate: { amount: '3-6', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['品种差异明显', '绑蔓整枝影响坐果率'] } },
  basil: { family: 'lamiaceae', rotationGroup: 'leafy', waterNeed: 'medium', daysToMaturity: 65, spacing: { plantInch: 12, rowInch: 18 }, germinationDays: [5, 10], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: 7, endOffsetDays: 70 }, plantsPerGrid: 1, yieldEstimate: { amount: '100-200', unit: '克', basis: '每株', confidence: 'reference', factors: ['勤摘顶芽可促进分枝'] }, harvestHabit: 'cut_and_come_again', firstHarvestDays: 50, harvestDurationDays: [30, 60], successionIntervalDays: [14, 21] },
  carrot: { family: 'apiaceae', rotationGroup: 'root', waterNeed: 'medium', daysToMaturity: 75, spacing: { plantInch: 3, rowInch: 12 }, germinationDays: [14, 21], plantingDepthInch: 0.25, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -28, endOffsetDays: 150 }, plantsPerGrid: 1, yieldEstimate: { amount: '0.2-0.4', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['土壤疏松度影响根形和单根重'] }, harvestHabit: 'single', firstHarvestDays: 55, harvestDurationDays: [20, 30], successionIntervalDays: [21, 28], seasons: ['spring', 'summer', 'fall'] },
  lettuce: { family: 'leafy', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'high', daysToMaturity: 45, spacing: { plantInch: 8, rowInch: 12 }, germinationDays: [2, 10], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: -45, endOffsetDays: 170 }, directSowWindow: { startOffsetDays: -45, endOffsetDays: 170 }, transplantWindow: { startOffsetDays: -28, endOffsetDays: 150 }, firstHarvestDays: 28, harvestDurationDays: [20, 40], harvestHabit: 'cut_and_come_again', successionIntervalDays: [10, 14], plantsPerGrid: 1, yieldEstimate: { amount: '0.3-0.5', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['分批采收可提高利用率'] } },
  pepper: { family: 'nightshade', rotationGroup: 'fruiting', waterNeed: 'medium', daysToMaturity: 85, spacing: { plantInch: 18, rowInch: 24 }, germinationDays: [7, 21], plantingDepthInch: 0.25, startMethod: 'transplant', nurseryLeadDays: [35, 49], sowingWindow: { startOffsetDays: 14, endOffsetDays: 56 }, transplantWindow: { startOffsetDays: 14, endOffsetDays: 56 }, firstHarvestDays: 80, harvestDurationDays: [30, 60], harvestHabit: 'continuous_pick', plantsPerGrid: 1, yieldEstimate: { amount: '1-2', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['品种和肥力影响较大'] } },
  onion: { family: 'allium', rotationGroup: 'root', waterNeed: 'low', daysToMaturity: 100, spacing: { plantInch: 4, rowInch: 12 }, germinationDays: [7, 14], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: -42, endOffsetDays: 42 } },
  cabbage: { family: 'brassica', rotationGroup: 'leafy', seasons: ['spring', 'fall'], waterNeed: 'high', daysToMaturity: 90, spacing: { plantInch: 18, rowInch: 24 }, germinationDays: [5, 10], plantingDepthInch: 0.25, startMethod: 'transplant', sowingWindow: { startOffsetDays: -42, endOffsetDays: 150 } },
  corn: { family: 'other', rotationGroup: 'fruiting', waterNeed: 'high', daysToMaturity: 90, spacing: { plantInch: 12, rowInch: 30 }, germinationDays: [7, 10], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 14, endOffsetDays: 85 } },
  bean: { family: 'legume', rotationGroup: 'legume', waterNeed: 'medium', daysToMaturity: 60, spacing: { plantInch: 6, rowInch: 18 }, germinationDays: [6, 10], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 14, endOffsetDays: 95 }, plantsPerGrid: 1, yieldEstimate: { amount: '0.8-1.5', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['搭架可延长采收期'] }, harvestHabit: 'continuous_pick', firstHarvestDays: 50, harvestDurationDays: [20, 40], successionIntervalDays: [14, 21] },
  cucumber: { family: 'cucurbit', rotationGroup: 'fruiting', waterNeed: 'high', daysToMaturity: 60, spacing: { plantInch: 12, rowInch: 36 }, germinationDays: [3, 10], plantingDepthInch: 0.5, startMethod: 'either', nurseryLeadDays: [10, 18], sowingWindow: { startOffsetDays: 14, endOffsetDays: 90 }, directSowWindow: { startOffsetDays: 14, endOffsetDays: 90 }, transplantWindow: { startOffsetDays: 18, endOffsetDays: 70 }, firstHarvestDays: 52, harvestDurationDays: [25, 45], harvestHabit: 'continuous_pick', plantsPerGrid: 1, yieldEstimate: { amount: '3-5', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['搭架引蔓可延长采收'] } },
  potato: { family: 'nightshade', rotationGroup: 'root', waterNeed: 'medium', daysToMaturity: 100, spacing: { plantInch: 12, rowInch: 30 }, germinationDays: [14, 28], plantingDepthInch: 4, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -28, endOffsetDays: 42 }, plantsPerGrid: 1, yieldEstimate: { amount: '1-2', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['培土厚度和品种影响单株产量'] }, harvestHabit: 'single', firstHarvestDays: 80, harvestDurationDays: [20, 30] },
  eggplant: { family: 'nightshade', rotationGroup: 'fruiting', waterNeed: 'medium', daysToMaturity: 85, spacing: { plantInch: 24, rowInch: 30 }, germinationDays: [7, 14], plantingDepthInch: 0.25, startMethod: 'transplant', sowingWindow: { startOffsetDays: 14, endOffsetDays: 63 }, plantsPerGrid: 1, yieldEstimate: { amount: '2-3', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['连续结果能力强于大多数茄果'] } },
  spinach: { family: 'leafy', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'high', daysToMaturity: 45, spacing: { plantInch: 4, rowInch: 12 }, germinationDays: [5, 10], plantingDepthInch: 0.5, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -42, endOffsetDays: 170 }, plantsPerGrid: 1, yieldEstimate: { amount: '0.2-0.4', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['冷凉季品质好产量更高'] }, harvestHabit: 'cut_and_come_again', firstHarvestDays: 35, harvestDurationDays: [15, 25], successionIntervalDays: [10, 14] },
  strawberry: { family: 'fruit', rotationGroup: 'perennial', seasons: ['spring'], waterNeed: 'medium', daysToMaturity: 90, spacing: { plantInch: 12, rowInch: 24 }, germinationDays: [14, 28], startMethod: 'transplant', sowingWindow: { startOffsetDays: -28, endOffsetDays: 28 }, plantsPerGrid: 1, yieldEstimate: { amount: '1-2', unit: '斤', basis: '每株', confidence: 'reference', factors: ['连续开花结果，受温度影响较大'] }, harvestHabit: 'continuous_pick', firstHarvestDays: 75, harvestDurationDays: [30, 60], successionIntervalDays: [14, 21], perennialYears: [1, 3] },
  garlic: { family: 'allium', rotationGroup: 'root', seasons: ['fall'], waterNeed: 'low', daysToMaturity: 240, spacing: { plantInch: 6, rowInch: 12 }, germinationDays: [7, 21], plantingDepthInch: 2, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 160, endOffsetDays: 210 }, plantsPerGrid: 1, yieldEstimate: { amount: '0.1-0.2', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['鳞茎大小受品种和春化影响'] }, harvestHabit: 'single', firstHarvestDays: 200, harvestDurationDays: [10, 15] },
  radish: { family: 'brassica', rotationGroup: 'root', seasons: ['spring', 'fall'], daysToMaturity: 30, spacing: { plantInch: 2, rowInch: 8 }, germinationDays: [3, 7], plantingDepthInch: 0.5, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -28, endOffsetDays: 170 }, plantsPerGrid: 1, yieldEstimate: { amount: '0.1-0.2', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['快收型更适合密植'] }, harvestHabit: 'single', firstHarvestDays: 25, harvestDurationDays: [5, 10], successionIntervalDays: [14, 21] },
  pea: { family: 'legume', rotationGroup: 'legume', seasons: ['spring', 'fall'], waterNeed: 'medium', daysToMaturity: 60, spacing: { plantInch: 3, rowInch: 18 }, germinationDays: [7, 14], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -56, endOffsetDays: 14 }, harvestHabit: 'continuous_pick', firstHarvestDays: 55, harvestDurationDays: [15, 25], successionIntervalDays: [14, 21] },
  marigold: { family: 'flower', rotationGroup: 'flower', seasons: ['spring', 'summer'], waterNeed: 'low', daysToMaturity: 55, spacing: { plantInch: 8, rowInch: 12 }, germinationDays: [4, 14], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: 0, endOffsetDays: 70 } },
  sunflower: { family: 'aster', rotationGroup: 'flower', waterNeed: 'medium', daysToMaturity: 90, spacing: { plantInch: 24, rowInch: 30 }, germinationDays: [7, 10], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 14, endOffsetDays: 90 } },
  dill: { family: 'apiaceae', rotationGroup: 'leafy', waterNeed: 'low', daysToMaturity: 55, spacing: { plantInch: 12, rowInch: 18 }, germinationDays: [10, 14], plantingDepthInch: 0.25, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -14, endOffsetDays: 120 } },
  fennel: { family: 'apiaceae', rotationGroup: 'leafy', waterNeed: 'low', daysToMaturity: 80, spacing: { plantInch: 12, rowInch: 18 }, germinationDays: [7, 14], plantingDepthInch: 0.25, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 0, endOffsetDays: 120 } },
  sage: { family: 'lamiaceae', rotationGroup: 'perennial', waterNeed: 'low', daysToMaturity: 75, spacing: { plantInch: 18, rowInch: 24 }, germinationDays: [10, 21], plantingDepthInch: 0.25, startMethod: 'transplant', sowingWindow: { startOffsetDays: 0, endOffsetDays: 84 } },
  rosemary: { family: 'lamiaceae', rotationGroup: 'perennial', waterNeed: 'low', daysToMaturity: 120, spacing: { plantInch: 24, rowInch: 36 }, germinationDays: [14, 28], plantingDepthInch: 0.25, startMethod: 'transplant', sowingWindow: { startOffsetDays: 0, endOffsetDays: 70 } },
  pumpkin: { family: 'cucurbit', rotationGroup: 'fruiting', waterNeed: 'high', daysToMaturity: 110, spacing: { plantInch: 36, rowInch: 72 }, germinationDays: [5, 10], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 14, endOffsetDays: 70 }, harvestHabit: 'single', firstHarvestDays: 100, harvestDurationDays: [20, 40] },
  melon: { family: 'cucurbit', rotationGroup: 'fruiting', waterNeed: 'high', daysToMaturity: 90, spacing: { plantInch: 36, rowInch: 72 }, germinationDays: [4, 10], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 21, endOffsetDays: 70 }, harvestHabit: 'single', firstHarvestDays: 75, harvestDurationDays: [20, 40] },
  zucchini: { family: 'cucurbit', rotationGroup: 'fruiting', waterNeed: 'high', daysToMaturity: 55, spacing: { plantInch: 24, rowInch: 36 }, germinationDays: [4, 10], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 14, endOffsetDays: 90 }, plantsPerGrid: 1, yieldEstimate: { amount: '2-4', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['生长旺盛，及时采收可延长结果期'] }, harvestHabit: 'continuous_pick', firstHarvestDays: 50, harvestDurationDays: [35, 70], successionIntervalDays: [14, 21] },
  kale: { family: 'brassica', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'medium', daysToMaturity: 55, spacing: { plantInch: 12, rowInch: 18 }, germinationDays: [5, 10], plantingDepthInch: 0.5, startMethod: 'either', sowingWindow: { startOffsetDays: -42, endOffsetDays: 170 }, plantsPerGrid: 1, yieldEstimate: { amount: '0.5-1', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['耐寒性强，冬季仍可陆续采收'] } },
  broccoli: { family: 'brassica', rotationGroup: 'leafy', seasons: ['spring', 'fall'], waterNeed: 'high', daysToMaturity: 70, spacing: { plantInch: 18, rowInch: 24 }, germinationDays: [5, 10], plantingDepthInch: 0.25, startMethod: 'transplant', sowingWindow: { startOffsetDays: -35, endOffsetDays: 150 }, plantsPerGrid: 1, yieldEstimate: { amount: '0.3-0.6', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['主花球收后侧花球还可以收'] } },
  cauliflower: { family: 'brassica', rotationGroup: 'leafy', seasons: ['spring', 'fall'], waterNeed: 'high', daysToMaturity: 75, spacing: { plantInch: 18, rowInch: 24 }, germinationDays: [5, 10], plantingDepthInch: 0.25, startMethod: 'transplant', sowingWindow: { startOffsetDays: -35, endOffsetDays: 150 } },
  beet: { family: 'root', rotationGroup: 'root', seasons: ['spring', 'fall'], waterNeed: 'medium', daysToMaturity: 60, spacing: { plantInch: 4, rowInch: 12 }, germinationDays: [5, 12], plantingDepthInch: 0.5, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -28, endOffsetDays: 160 }, harvestHabit: 'single', firstHarvestDays: 45, harvestDurationDays: [15, 25], successionIntervalDays: [21, 28] },
  celery: { family: 'apiaceae', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'high', daysToMaturity: 120, spacing: { plantInch: 8, rowInch: 18 }, germinationDays: [14, 21], plantingDepthInch: 0.125, startMethod: 'transplant', sowingWindow: { startOffsetDays: -28, endOffsetDays: 112 } },
  cilantro: { family: 'apiaceae', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'medium', daysToMaturity: 45, spacing: { plantInch: 6, rowInch: 12 }, germinationDays: [7, 14], plantingDepthInch: 0.25, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -28, endOffsetDays: 170 }, plantsPerGrid: 1, yieldEstimate: { amount: '50-100', unit: '克', basis: '每株', confidence: 'reference', factors: ['生长快，分批播种可连续供应'] }, harvestHabit: 'cut_and_come_again', firstHarvestDays: 30, harvestDurationDays: [15, 25], successionIntervalDays: [14, 21] },
  parsley: { family: 'apiaceae', rotationGroup: 'leafy', seasons: ['spring', 'summer', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'medium', daysToMaturity: 75, spacing: { plantInch: 8, rowInch: 12 }, germinationDays: [14, 28], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: -14, endOffsetDays: 120 }, harvestHabit: 'cut_and_come_again', firstHarvestDays: 60, harvestDurationDays: [45, 90], successionIntervalDays: [14, 21] },
  oregano: { family: 'lamiaceae', rotationGroup: 'perennial', seasons: ['spring', 'summer'], waterNeed: 'low', hardinessZones: [5, 10], daysToMaturity: 80, spacing: { plantInch: 12, rowInch: 18 }, germinationDays: [7, 14], plantingDepthInch: 0.125, startMethod: 'transplant', sowingWindow: { startOffsetDays: 0, endOffsetDays: 84 } },
  thyme: { family: 'lamiaceae', rotationGroup: 'perennial', seasons: ['spring', 'summer'], waterNeed: 'low', hardinessZones: [5, 9], daysToMaturity: 90, spacing: { plantInch: 12, rowInch: 18 }, germinationDays: [14, 28], plantingDepthInch: 0.125, startMethod: 'transplant', sowingWindow: { startOffsetDays: 0, endOffsetDays: 84 } },
  blueberry: { family: 'fruit', rotationGroup: 'perennial', seasons: ['spring'], waterNeed: 'medium', hardinessZones: [4, 8], daysToMaturity: 365, spacing: { plantInch: 36, rowInch: 60 }, germinationDays: [21, 35], startMethod: 'transplant', sowingWindow: { startOffsetDays: -28, endOffsetDays: 42 }, harvestWindow: { startOffsetDays: 365, endOffsetDays: 730 } },
  raspberry: { family: 'fruit', rotationGroup: 'perennial', seasons: ['spring'], waterNeed: 'medium', hardinessZones: [4, 8], daysToMaturity: 365, spacing: { plantInch: 24, rowInch: 72 }, germinationDays: [21, 35], startMethod: 'transplant', sowingWindow: { startOffsetDays: -28, endOffsetDays: 42 }, harvestWindow: { startOffsetDays: 365, endOffsetDays: 730 } },
  blackberry: { family: 'fruit', rotationGroup: 'perennial', seasons: ['spring'], waterNeed: 'medium', hardinessZones: [5, 9], daysToMaturity: 365, spacing: { plantInch: 36, rowInch: 72 }, germinationDays: [21, 35], startMethod: 'transplant', sowingWindow: { startOffsetDays: -28, endOffsetDays: 42 }, harvestWindow: { startOffsetDays: 365, endOffsetDays: 730 } },
  nasturtium: { family: 'flower', rotationGroup: 'flower', seasons: ['spring', 'summer'], waterNeed: 'medium', daysToMaturity: 55, spacing: { plantInch: 10, rowInch: 12 }, germinationDays: [7, 12], plantingDepthInch: 0.5, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 0, endOffsetDays: 90 } },
  lavender: { family: 'lamiaceae', rotationGroup: 'perennial', seasons: ['spring', 'summer'], waterNeed: 'low', hardinessZones: [5, 9], daysToMaturity: 100, spacing: { plantInch: 18, rowInch: 24 }, germinationDays: [14, 28], plantingDepthInch: 0.125, startMethod: 'transplant', sowingWindow: { startOffsetDays: 0, endOffsetDays: 70 } },
  chili: { family: 'nightshade', rotationGroup: 'fruiting', waterNeed: 'medium', daysToMaturity: 80, spacing: { plantInch: 18, rowInch: 24 }, germinationDays: [7, 21], plantingDepthInch: 0.25, startMethod: 'transplant', nurseryLeadDays: [35, 49], sowingWindow: { startOffsetDays: 14, endOffsetDays: 56 }, transplantWindow: { startOffsetDays: 14, endOffsetDays: 56 }, firstHarvestDays: 78, harvestDurationDays: [35, 75], harvestHabit: 'continuous_pick' },
  arugula: { family: 'brassica', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'medium', daysToMaturity: 35, spacing: { plantInch: 4, rowInch: 8 }, germinationDays: [3, 7], plantingDepthInch: 0.25, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -42, endOffsetDays: 170 } },
  chard: { family: 'leafy', rotationGroup: 'leafy', seasons: ['spring', 'summer', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'medium', daysToMaturity: 60, spacing: { plantInch: 10, rowInch: 18 }, germinationDays: [5, 10], plantingDepthInch: 0.5, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -14, endOffsetDays: 150 } },
  okra: { family: 'other', rotationGroup: 'fruiting', seasons: ['summer'], waterNeed: 'medium', hardinessZones: [7, 11], daysToMaturity: 60, spacing: { plantInch: 18, rowInch: 30 }, germinationDays: [7, 14], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 21, endOffsetDays: 90 } },
  asparagus: { family: 'other', rotationGroup: 'perennial', seasons: ['spring'], waterNeed: 'medium', hardinessZones: [3, 8], daysToMaturity: 730, spacing: { plantInch: 18, rowInch: 48 }, germinationDays: [14, 21], plantingDepthInch: 6, startMethod: 'transplant', sowingWindow: { startOffsetDays: -28, endOffsetDays: 28 }, harvestWindow: { startOffsetDays: 730, endOffsetDays: 1095 } },
  mint: { family: 'lamiaceae', rotationGroup: 'perennial', seasons: ['spring', 'summer'], sunRequirement: 'partial_sun', waterNeed: 'medium', hardinessZones: [3, 9], daysToMaturity: 70, spacing: { plantInch: 18, rowInch: 24 }, germinationDays: [10, 15], plantingDepthInch: 0.125, startMethod: 'transplant', sowingWindow: { startOffsetDays: 0, endOffsetDays: 84 } },
  hyssop: { family: 'lamiaceae', rotationGroup: 'perennial', seasons: ['spring', 'summer'], waterNeed: 'low', hardinessZones: [4, 9], daysToMaturity: 85, spacing: { plantInch: 12, rowInch: 18 }, germinationDays: [14, 21], plantingDepthInch: 0.125, startMethod: 'transplant', sowingWindow: { startOffsetDays: 0, endOffsetDays: 84 } },
  turnip: { family: 'brassica', rotationGroup: 'root', seasons: ['spring', 'fall'], waterNeed: 'medium', daysToMaturity: 50, spacing: { plantInch: 4, rowInch: 12 }, germinationDays: [3, 10], plantingDepthInch: 0.5, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -28, endOffsetDays: 170 } },
  leek: { family: 'allium', rotationGroup: 'root', seasons: ['spring', 'fall'], waterNeed: 'medium', daysToMaturity: 120, spacing: { plantInch: 6, rowInch: 18 }, germinationDays: [7, 14], plantingDepthInch: 0.25, startMethod: 'transplant', sowingWindow: { startOffsetDays: -42, endOffsetDays: 112 } },
  sweet_potato: { family: 'root', rotationGroup: 'root', seasons: ['summer'], waterNeed: 'medium', hardinessZones: [8, 11], daysToMaturity: 110, spacing: { plantInch: 12, rowInch: 36 }, germinationDays: [14, 28], plantingDepthInch: 4, startMethod: 'transplant', sowingWindow: { startOffsetDays: 28, endOffsetDays: 84 } },
  winter_squash: { family: 'cucurbit', rotationGroup: 'fruiting', seasons: ['summer'], waterNeed: 'high', daysToMaturity: 100, spacing: { plantInch: 36, rowInch: 72 }, germinationDays: [5, 10], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 14, endOffsetDays: 70 } },
  bok_choy: { family: 'brassica', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'high', daysToMaturity: 45, spacing: { plantInch: 8, rowInch: 12 }, germinationDays: [4, 10], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: -42, endOffsetDays: 170 }, harvestHabit: 'cut_and_come_again', firstHarvestDays: 28, harvestDurationDays: [15, 25], successionIntervalDays: [10, 14] },
  kongxin_cai: { family: 'leafy', rotationGroup: 'leafy', seasons: ['summer'], sunRequirement: 'partial_sun', waterNeed: 'high', hardinessZones: [8, 11], daysToMaturity: 35, spacing: { plantInch: 6, rowInch: 12 }, germinationDays: [5, 10], plantingDepthInch: 0.5, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 7, endOffsetDays: 120 }, directSowWindow: { startOffsetDays: 7, endOffsetDays: 120 }, firstHarvestDays: 24, harvestDurationDays: [30, 60], harvestHabit: 'cut_and_come_again', successionIntervalDays: [12, 18], plantsPerGrid: 1, yieldEstimate: { amount: '1-2', unit: '斤', basis: '每格', confidence: 'reference', factors: ['掐梢采收周期短，可多轮'] } },
  amaranth: { family: 'leafy', rotationGroup: 'leafy', seasons: ['summer'], sunRequirement: 'partial_sun', waterNeed: 'medium', hardinessZones: [7, 11], daysToMaturity: 30, spacing: { plantInch: 5, rowInch: 10 }, germinationDays: [4, 8], plantingDepthInch: 0.25, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 0, endOffsetDays: 110 }, plantsPerGrid: 1, yieldEstimate: { amount: '0.5-1', unit: '斤', basis: '每格', confidence: 'reference', factors: ['夏季生长迅速，适合连续采收'] }, harvestHabit: 'multiple_flushes', firstHarvestDays: 25, harvestDurationDays: [25, 45], successionIntervalDays: [14, 21] },
  chive: { family: 'allium', rotationGroup: 'perennial', seasons: ['spring', 'fall'], waterNeed: 'medium', hardinessZones: [4, 10], daysToMaturity: 60, spacing: { plantInch: 6, rowInch: 12 }, germinationDays: [7, 14], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: -28, endOffsetDays: 112 }, harvestHabit: 'multiple_flushes', plantsPerGrid: 1, yieldEstimate: { amount: '1-2', unit: '斤', basis: '每格', confidence: 'reference', factors: ['多年生，每茬剪收后还会继续长'] }, firstHarvestDays: 60, harvestDurationDays: [365, 1825], successionIntervalDays: [20, 30], transplantWindow: { startOffsetDays: -35, endOffsetDays: -14 }, directSowWindow: { startOffsetDays: -42, endOffsetDays: 30 } },
  scallion: { family: 'allium', rotationGroup: 'root', seasons: ['spring', 'fall'], waterNeed: 'medium', hardinessZones: [5, 10], daysToMaturity: 55, spacing: { plantInch: 4, rowInch: 10 }, germinationDays: [7, 12], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: -35, endOffsetDays: 140 }, directSowWindow: { startOffsetDays: -35, endOffsetDays: 140 }, transplantWindow: { startOffsetDays: -21, endOffsetDays: 120 }, firstHarvestDays: 30, harvestDurationDays: [20, 40], harvestHabit: 'cut_and_come_again', successionIntervalDays: [14, 21], plantsPerGrid: 1, yieldEstimate: { amount: '0.5-1', unit: '斤', basis: '每格', confidence: 'reference', factors: ['分批播种可连续供应'] } },
  youmai_cai: { family: 'leafy', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'medium', hardinessZones: [6, 10], daysToMaturity: 45, spacing: { plantInch: 8, rowInch: 12 }, germinationDays: [3, 8], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: -35, endOffsetDays: 160 }, directSowWindow: { startOffsetDays: -35, endOffsetDays: 160 }, transplantWindow: { startOffsetDays: -21, endOffsetDays: 140 }, firstHarvestDays: 25, harvestDurationDays: [18, 35], harvestHabit: 'cut_and_come_again', successionIntervalDays: [10, 14], plantsPerGrid: 1, yieldEstimate: { amount: '0.3-0.6', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['连续摘叶采收可延长收获期'] } },
  shanghai_qing: { family: 'brassica', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'high', hardinessZones: [6, 10], daysToMaturity: 40, spacing: { plantInch: 8, rowInch: 12 }, germinationDays: [4, 8], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: -35, endOffsetDays: 160 }, directSowWindow: { startOffsetDays: -35, endOffsetDays: 160 }, transplantWindow: { startOffsetDays: -18, endOffsetDays: 135 }, firstHarvestDays: 35, harvestDurationDays: [7, 14], harvestHabit: 'single', successionIntervalDays: [10, 14], plantsPerGrid: 1, yieldEstimate: { amount: '0.3-0.5', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['密植可提高单位面积产量'] } },
  cai_xin: { family: 'brassica', rotationGroup: 'leafy', seasons: ['spring', 'fall'], waterNeed: 'medium', hardinessZones: [7, 10], daysToMaturity: 45, spacing: { plantInch: 8, rowInch: 12 }, germinationDays: [4, 8], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: -28, endOffsetDays: 150 }, directSowWindow: { startOffsetDays: -28, endOffsetDays: 150 }, transplantWindow: { startOffsetDays: -14, endOffsetDays: 126 }, firstHarvestDays: 30, harvestDurationDays: [15, 28], harvestHabit: 'multiple_flushes', successionIntervalDays: [12, 16], plantsPerGrid: 1, yieldEstimate: { amount: '0.2-0.4', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['主薹收后侧薹还会继续出'] } },
  garland_chrysanthemum: { family: 'leafy', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'medium', hardinessZones: [6, 10], daysToMaturity: 40, spacing: { plantInch: 8, rowInch: 12 }, germinationDays: [5, 10], plantingDepthInch: 0.25, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -28, endOffsetDays: 150 }, harvestHabit: 'cut_and_come_again', firstHarvestDays: 30, harvestDurationDays: [15, 25], successionIntervalDays: [10, 14] },
  suanmiao: { family: 'allium', rotationGroup: 'root', seasons: ['spring', 'fall', 'winter'], waterNeed: 'low', hardinessZones: [6, 10], daysToMaturity: 45, spacing: { plantInch: 4, rowInch: 10 }, germinationDays: [7, 14], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -35, endOffsetDays: 180 }, harvestHabit: 'single', firstHarvestDays: 30, harvestDurationDays: [7, 14] },
  xiaoyoucai: { family: 'brassica', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'high', hardinessZones: [6, 10], daysToMaturity: 35, spacing: { plantInch: 8, rowInch: 12 }, germinationDays: [4, 8], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: -35, endOffsetDays: 160 }, harvestHabit: 'cut_and_come_again', firstHarvestDays: 25, harvestDurationDays: [15, 20], successionIntervalDays: [10, 14] },
  gai_lan: { family: 'brassica', rotationGroup: 'leafy', seasons: ['fall', 'winter', 'spring'], waterNeed: 'medium', hardinessZones: [7, 10], daysToMaturity: 55, spacing: { plantInch: 10, rowInch: 14 }, germinationDays: [4, 8], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: -28, endOffsetDays: 170 }, harvestHabit: 'multiple_flushes', firstHarvestDays: 50, harvestDurationDays: [15, 25] },
  ginger: { family: 'root', rotationGroup: 'root', seasons: ['summer'], sunRequirement: 'partial_sun', waterNeed: 'high', hardinessZones: [8, 11], daysToMaturity: 150, spacing: { plantInch: 10, rowInch: 18 }, germinationDays: [14, 28], plantingDepthInch: 2, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 28, endOffsetDays: 110 }, plantsPerGrid: 1, yieldEstimate: { amount: '0.3-0.5', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['生长期长，适合夏秋收获'] }, harvestHabit: 'single', firstHarvestDays: 200, harvestDurationDays: [20, 40] },
  baby_napa: { family: 'brassica', rotationGroup: 'leafy', seasons: ['fall', 'winter', 'spring'], waterNeed: 'high', hardinessZones: [6, 10], daysToMaturity: 55, spacing: { plantInch: 10, rowInch: 14 }, germinationDays: [4, 8], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: -28, endOffsetDays: 170 }, harvestHabit: 'single', firstHarvestDays: 50, harvestDurationDays: [10, 20] },
  wosun: { family: 'leafy', rotationGroup: 'leafy', seasons: ['spring', 'fall'], sunRequirement: 'partial_sun', waterNeed: 'medium', hardinessZones: [6, 10], daysToMaturity: 65, spacing: { plantInch: 10, rowInch: 14 }, germinationDays: [5, 10], plantingDepthInch: 0.25, startMethod: 'either', sowingWindow: { startOffsetDays: -35, endOffsetDays: 160 }, harvestHabit: 'single', firstHarvestDays: 60, harvestDurationDays: [15, 25] },
  fava_bean: { family: 'legume', rotationGroup: 'legume', seasons: ['fall', 'winter', 'spring'], waterNeed: 'medium', hardinessZones: [6, 10], daysToMaturity: 85, spacing: { plantInch: 8, rowInch: 20 }, germinationDays: [7, 14], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -45, endOffsetDays: 140 }, harvestHabit: 'single', firstHarvestDays: 75, harvestDurationDays: [15, 25] },
  donggua: { family: 'cucurbit', rotationGroup: 'fruiting', seasons: ['summer'], waterNeed: 'high', hardinessZones: [8, 11], daysToMaturity: 95, spacing: { plantInch: 36, rowInch: 72 }, germinationDays: [5, 12], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 21, endOffsetDays: 90 }, harvestHabit: 'single', firstHarvestDays: 90, harvestDurationDays: [20, 40] },
  yardlong_bean: { family: 'legume', rotationGroup: 'legume', seasons: ['summer'], waterNeed: 'medium', hardinessZones: [8, 11], daysToMaturity: 65, spacing: { plantInch: 8, rowInch: 24 }, germinationDays: [5, 10], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 14, endOffsetDays: 100 }, directSowWindow: { startOffsetDays: 14, endOffsetDays: 100 }, firstHarvestDays: 58, harvestDurationDays: [30, 55], harvestHabit: 'continuous_pick', plantsPerGrid: 1, yieldEstimate: { amount: '0.5-1', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['连续结果，勤摘可提高后续坐果'] }, successionIntervalDays: [14, 21] },
  loofah: { family: 'cucurbit', rotationGroup: 'fruiting', seasons: ['summer'], waterNeed: 'high', hardinessZones: [8, 11], daysToMaturity: 80, spacing: { plantInch: 24, rowInch: 48 }, germinationDays: [5, 12], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 21, endOffsetDays: 90 }, directSowWindow: { startOffsetDays: 21, endOffsetDays: 90 }, firstHarvestDays: 70, harvestDurationDays: [35, 65], harvestHabit: 'continuous_pick', plantsPerGrid: 1, yieldEstimate: { amount: '2-4', unit: 'kg', basis: '每株', confidence: 'reference', factors: ['水肥充足可多轮结果'] } },
  bitter_melon: { family: 'cucurbit', rotationGroup: 'fruiting', seasons: ['summer'], waterNeed: 'high', hardinessZones: [8, 11], daysToMaturity: 75, spacing: { plantInch: 24, rowInch: 48 }, germinationDays: [5, 12], plantingDepthInch: 1, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 21, endOffsetDays: 90 }, harvestHabit: 'continuous_pick', firstHarvestDays: 65, harvestDurationDays: [30, 60] },
  daikon: { family: 'brassica', rotationGroup: 'root', seasons: ['fall'], waterNeed: 'medium', hardinessZones: [5, 10], daysToMaturity: 55, spacing: { plantInch: 4, rowInch: 12 }, germinationDays: [3, 7], plantingDepthInch: 0.5, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 120, endOffsetDays: 200 }, harvestHabit: 'single', firstHarvestDays: 50, harvestDurationDays: [10, 20], successionIntervalDays: [21, 28] },
  calendula: { family: 'aster', rotationGroup: 'flower', seasons: ['spring', 'summer', 'fall'], waterNeed: 'low', daysToMaturity: 55, spacing: { plantInch: 10, rowInch: 12 }, germinationDays: [5, 15], plantingDepthInch: 0.25, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: -14, endOffsetDays: 120 } },
  borage: { family: 'flower', rotationGroup: 'flower', seasons: ['spring', 'summer'], waterNeed: 'medium', daysToMaturity: 60, spacing: { plantInch: 12, rowInch: 18 }, germinationDays: [5, 15], plantingDepthInch: 0.5, startMethod: 'direct_sow', sowingWindow: { startOffsetDays: 0, endOffsetDays: 90 } }
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

export interface PlantCatalogIssue {
  plantId: string;
  field: 'companions' | 'enemies' | 'agronomy';
  message: string;
}

export function getPlantCatalogIssues(): PlantCatalogIssue[] {
  const knownPlantIds = new Set(plants.map(plant => plant.id));
  const issues: PlantCatalogIssue[] = [];

  for (const plant of plants) {
    for (const field of ['companions', 'enemies'] as const) {
      for (const relatedPlantId of plant.relationships[field]) {
        if (!knownPlantIds.has(relatedPlantId)) {
          issues.push({
            plantId: plant.id,
            field,
            message: `${plant.id}.${field} references missing plant "${relatedPlantId}".`
          });
        }
      }
    }

    if (!agronomyByPlantId[plant.id]) {
      issues.push({
        plantId: plant.id,
        field: 'agronomy',
        message: `${plant.id} uses only the default agronomy profile.`
      });
    }
  }

  return issues;
}

export function getPlantSpacingLabel(plantId: string): string {
  const agronomy = getPlantAgronomy(plantId);
  return `株距 ${agronomy.spacing.plantInch} in${agronomy.spacing.rowInch ? ` / 行距 ${agronomy.spacing.rowInch} in` : ''}`;
}

export function getPlantTimingLabel(plantId: string): string {
  const agronomy = getPlantAgronomy(plantId);
  return `${agronomy.daysToMaturity} 天成熟 · 发芽 ${agronomy.germinationDays[0]}-${agronomy.germinationDays[1]} 天`;
}

const alphaGuidanceNotesByPlantId: Record<string, string[]> = {
  tomato: ['怕霜，夜温稳定后再定植更稳妥。', '结果期通常需要支撑和持续整枝。'],
  basil: ['怕冷，低温会明显拖慢生长。'],
  pepper: ['偏爱暖土，地温不足时前期会很慢。'],
  chili: ['偏爱暖土，前期升温越稳定越容易坐果。'],
  lettuce: ['冷凉季更稳，升温后容易抽薹变苦。'],
  spinach: ['更适合冷凉季，高温下容易抽薹。'],
  arugula: ['生长很快，但高温时也容易抽薹。'],
  bok_choy: ['冷凉季表现更好，热天容易抽薹。'],
  kongxin_cai: ['喜热喜水，盛夏状态往往比春秋更好。', '适合反复掐嫩梢采收，水分不足时容易老。'],
  amaranth: ['耐热快长，适合夏季补种。', '嫩叶口感最好，长太快时要及时采收。'],
  chive: ['多年生，成丛后可以多次剪收。', '根系稳定后比一年生叶菜更省心。'],
  scallion: ['适合分批播种或分株补位。', '水分均匀时葱白更整齐。'],
  youmai_cai: ['春秋窗口最稳，升温后口感会更容易发苦。', '适合连续补种，空位利用率很高。'],
  shanghai_qing: ['冷凉季状态最好，热起来后容易抽薹。', '长势整齐，适合家庭菜园分批收叶。'],
  cai_xin: ['升温太快时容易抽薹，冷凉到温暖过渡期更稳。', '嫩薹阶段口感最好，适合快收快种。'],
  garland_chrysanthemum: ['偏冷凉，春秋种更稳更香。', '长得快，适合补种和边采边收。'],
  suanmiao: ['冷凉到温和季节都能种，适合拿来补边角空位。', '蒜香类作物通常更省心，但不适合和豆科挤在一起。'],
  xiaoyoucai: ['长得很快，适合春秋连续补种。', '热起来后要尽早采，不然容易抽薹。'],
  gai_lan: ['更适合冷凉到温暖过渡期，热天品质会变粗。', '抽薹阶段最适合采收，别拖太久。'],
  ginger: ['喜欢温暖和稳定湿度，启动慢但后劲足。', '更适合夏季长周期地块，不是快收型作物。'],
  baby_napa: ['冷凉季更稳，热起来后很容易抽薹或松散。', '适合秋冬到早春窗口，补种价值很高。'],
  wosun: ['春秋更稳，长杆阶段对水分波动比较敏感。', '既能吃叶也能吃茎，适合家庭菜园提高利用率。'],
  fava_bean: ['冷凉季更适合，通常比豇豆更早进入春季菜园。', '豆科能帮助轮作过渡，但别和葱蒜挤太近。'],
  donggua: ['典型夏季长周期瓜类，占地和搭架空间都要提前留足。', '适合院子型空间，不适合小阳台盒子。'],
  yardlong_bean: ['喜热，搭架后结果会更持续。', '温度不够高时前期容易慢。'],
  loofah: ['典型夏季瓜类，需要尽早搭架引蔓。', '水肥不足时雌花和坐果会受影响。'],
  bitter_melon: ['高温阶段长势更稳，搭架后管理更顺手。', '水分波动大时坐果和果形会受影响。'],
  daikon: ['更适合秋播，热天种容易空心或辣味重。', '土壤疏松时根形更直更整齐。'],
  cilantro: ['偏冷凉，热起来后很容易抽薹。'],
  carrot: ['直播更稳，出苗期需要持续保湿。'],
  radish: ['快收型根菜，缺水时容易变辣或空心。'],
  beet: ['直播更稳，幼苗期保持均匀水分更重要。'],
  cucumber: ['喜温，冷土里容易停滞；开始攀爬后要及时引蔓。'],
  zucchini: ['长势快但占地扩张明显，通风不够时容易出问题。'],
  bean: ['暖土后出苗更整齐，通常不喜欢频繁移栽。'],
  kale: ['冷凉季品质更稳，轻霜后口感通常更甜。'],
  broccoli: ['需水和肥力比较敏感，结球期波动会更明显。']
};

const coreReviewSummaryByPlantId: Record<string, PlantReviewSummary> = {
  tomato: {
    tags: ['怕霜', '喜暖土', '需支撑'],
    notes: ['夜温稳定后再定植更稳。', '结果期尽早绑蔓和整枝，后期更省心。']
  },
  basil: {
    tags: ['怕霜', '喜暖土'],
    notes: ['低温会明显拖慢生长，稳定回暖后状态更好。']
  },
  pepper: {
    tags: ['怕霜', '喜暖土', '需支撑'],
    notes: ['地温不足时启动慢，挂果后建议轻支撑。']
  },
  lettuce: {
    tags: ['冷凉季', '易抽薹', '需稳水'],
    notes: ['适合春秋窗口，热起来后口感和状态都会下滑。']
  },
  spinach: {
    tags: ['冷凉季', '易抽薹', '需稳水'],
    notes: ['高温很容易抽薹，冷凉季更稳更甜。']
  },
  arugula: {
    tags: ['冷凉季', '易抽薹'],
    notes: ['生长快，适合补种，但热天要尽快采收。']
  },
  bok_choy: {
    tags: ['冷凉季', '易抽薹', '需稳水'],
    notes: ['温度波动大时更容易抽薹，水分均匀更稳。']
  },
  kongxin_cai: {
    tags: ['喜暖土', '需稳水'],
    notes: ['高温季节长得快，适合一茬茬掐梢采收。']
  },
  amaranth: {
    tags: ['喜暖土', '直播更稳'],
    notes: ['夏季快收型叶菜，长势很快，适合补种空位。']
  },
  chive: {
    tags: ['需稳水'],
    notes: ['成丛后维护轻，适合长期留在菜园边角。']
  },
  scallion: {
    tags: ['直播更稳', '需稳水'],
    notes: ['适合分批次补种，能把零散空位利用起来。']
  },
  youmai_cai: {
    tags: ['冷凉季', '易抽薹', '需稳水'],
    notes: ['春秋更稳，适合家庭菜园连续补种。']
  },
  shanghai_qing: {
    tags: ['冷凉季', '易抽薹', '需稳水'],
    notes: ['长势整齐，热起来后要预期它容易抽薹。']
  },
  cai_xin: {
    tags: ['冷凉季', '易抽薹', '需稳水'],
    notes: ['适合快收快种，嫩薹阶段品质最好。']
  },
  garland_chrysanthemum: {
    tags: ['冷凉季', '直播更稳'],
    notes: ['春秋更稳，适合边采边收和零散补位。']
  },
  suanmiao: {
    tags: ['冷凉季', '直播更稳'],
    notes: ['适合边角空位和分批补种，管理压力较小。']
  },
  xiaoyoucai: {
    tags: ['冷凉季', '易抽薹', '需稳水'],
    notes: ['长得快，适合春秋快速补种和分批采收。']
  },
  gai_lan: {
    tags: ['冷凉季', '需稳水', '需稳肥'],
    notes: ['适合冷凉到温暖过渡期，抽薹阶段品质最好。']
  },
  ginger: {
    tags: ['喜暖土', '需稳水'],
    notes: ['暖湿环境更稳，适合夏季长周期布局。']
  },
  baby_napa: {
    tags: ['冷凉季', '易抽薹', '需稳水'],
    notes: ['秋冬到早春更稳，适合连续补种。']
  },
  wosun: {
    tags: ['冷凉季', '需稳水'],
    notes: ['叶和茎都能利用，适合家庭菜园提高产出密度。']
  },
  fava_bean: {
    tags: ['冷凉季', '直播更稳'],
    notes: ['适合冷凉季豆类窗口，也能帮助轮作过渡。']
  },
  donggua: {
    tags: ['喜暖土', '需引蔓', '需稳水'],
    notes: ['典型大体量夏季瓜类，更适合院子型空间。']
  },
  yardlong_bean: {
    tags: ['喜暖土', '需引蔓'],
    notes: ['热起来后表现更好，搭架后采收会更连续。']
  },
  loofah: {
    tags: ['喜暖土', '需引蔓', '需稳水'],
    notes: ['典型夏季攀援作物，架子和水肥节奏都要跟上。']
  },
  bitter_melon: {
    tags: ['喜暖土', '需引蔓', '需稳水'],
    notes: ['典型夏季瓜类，高温阶段表现更稳定。']
  },
  daikon: {
    tags: ['冷凉季', '直播更稳', '需稳水'],
    notes: ['秋播更稳，土壤疏松时根形和口感都更好。']
  },
  cilantro: {
    tags: ['冷凉季', '易抽薹'],
    notes: ['适合冷凉季，升温后要预期它很快抽薹。']
  },
  carrot: {
    tags: ['直播更稳', '出苗保湿', '需稳水'],
    notes: ['直播更省折腾，出苗前保持表层湿润很关键。']
  },
  radish: {
    tags: ['直播更稳', '出苗保湿', '需稳水'],
    notes: ['快收型根菜，缺水时口感和根形都会变差。']
  },
  beet: {
    tags: ['直播更稳', '出苗保湿', '需稳水'],
    notes: ['幼苗期最怕忽干忽湿，均匀水分比猛浇更重要。']
  },
  cucumber: {
    tags: ['怕霜', '喜暖土', '需引蔓'],
    notes: ['冷土里容易停滞，开始攀爬后及时引蔓。']
  },
  bean: {
    tags: ['喜暖土', '直播更稳', '怕移栽'],
    notes: ['暖土后出苗更整齐，通常比移栽更稳。']
  },
  kale: {
    tags: ['冷凉季', '需稳肥'],
    notes: ['冷凉季品质更好，肥水稳定时叶片状态更整齐。']
  },
  broccoli: {
    tags: ['冷凉季', '需稳水', '需稳肥'],
    notes: ['结球阶段对水肥波动更敏感，管理节奏要稳。']
  }
};

export function getPlantCredibilityNotes(plantId: string): string[] {
  const agronomy = getPlantAgronomy(plantId);
  const depth = agronomy.plantingDepthInch ? `播种深度 ${agronomy.plantingDepthInch} in` : '移栽为主';
  const alphaNotes = alphaGuidanceNotesByPlantId[plantId] || [];
  return [
    isCoreReviewedPlant(plantId)
      ? '核心校对作物: 已优先整理成熟天数、种植窗口、需水与基础经验提示。'
      : '扩展作物: 已有基础参数，可用于推荐解释，后续继续补充校对。',
    getPlantSpacingLabel(plantId),
    getPlantTimingLabel(plantId),
    `${startMethodLabel(agronomy.startMethod)} · ${depth}`,
    ...alphaNotes.slice(0, 2),
    agronomy.dataConfidence === 'reference'
      ? `资料: ${agronomy.dataSourceLabel} · ${agronomy.lastReviewedAt}`
      : `资料: 演示占位 · ${agronomy.confidenceNote}`
  ];
}

export function getPlantReviewSummary(plantId: string): PlantReviewSummary | null {
  return coreReviewSummaryByPlantId[plantId] || null;
}

export function getPlantCredibilityLevel(plantId: string): {
  level: 'core' | 'regional' | 'basic';
  label: string;
  detail: string;
} {
  if (isCoreReviewedPlant(plantId)) {
    return {
      level: 'core',
      label: '核心校对',
      detail: '成熟天数、窗口、需水和基础经验已优先整理。'
    };
  }

  const regionalizedPlantIds = new Set([
    'kongxin_cai',
    'bitter_melon',
    'donggua',
    'ginger',
    'loofah',
    'yardlong_bean',
    'youmai_cai',
    'shanghai_qing',
    'cai_xin',
    'garland_chrysanthemum',
    'xiaoyoucai',
    'gai_lan',
    'baby_napa',
    'wosun',
    'daikon',
    'fava_bean',
    'suanmiao',
    'lettuce',
    'bok_choy',
    'spinach',
    'cilantro',
    'radish',
    'scallion',
    'chive',
    'carrot',
    'pea',
    'tomato',
    'pepper',
    'eggplant',
    'chili',
    'cucumber',
    'corn',
    'bean',
    'pumpkin',
    'winter_squash',
    'sweet_potato',
    'okra',
    'garlic',
    'onion',
    'leek',
    'broccoli',
    'cauliflower',
    'cabbage',
    'celery',
    'turnip',
    'beet',
    'potato'
  ]);

  if (regionalizedPlantIds.has(plantId)) {
    return {
      level: 'regional',
      label: '地区已校正',
      detail: '已加入中国地区窗口或补种规则，适合本地化推荐。'
    };
  }

  return {
    level: 'basic',
    label: '基础资料',
    detail: '已有基础参数，可参与推荐解释，后续继续补充校对。'
  };
}

export function getPlantRegionalNotes(
  plantId: string,
  climateProfile?: ClimateProfile | null,
  planSeason?: PlanSeason
): string[] {
  const band = climateProfile?.climateBand;
  const season = planSeason || 'spring';
  const notes: string[] = [];

  const add = (note: string) => {
    if (!notes.includes(note)) notes.push(note);
  };

  const warmSeasonPlants = new Set(['kongxin_cai', 'bitter_melon', 'donggua', 'ginger', 'loofah', 'yardlong_bean']);
  const coolSeasonLeafyPlants = new Set([
    'youmai_cai',
    'shanghai_qing',
    'cai_xin',
    'garland_chrysanthemum',
    'xiaoyoucai',
    'gai_lan',
    'baby_napa',
    'wosun',
    'daikon',
    'fava_bean',
    'suanmiao',
    'bok_choy',
    'lettuce',
    'spinach',
    'cilantro',
    'radish',
    'broccoli',
    'kale'
  ]);

  if (warmSeasonPlants.has(plantId)) {
    add('偏暖地块更稳，尽量等土温起来后再连续种。');
    if (band === 'south_humid' || band === 'east_monsoon' || band === 'southwest_plateau') {
      add('在华南、江南或西南盆地，这类夏季作物通常更容易起势。');
    }
    if (band === 'north_cold' || band === 'north_temperate') {
      add('在华北、东北或西北，建议晚一点下地，先避开冷土和倒春寒。');
    }
    if (season === 'spring') {
      add('春季如果夜温还低，前期用地膜或小拱棚会更稳。');
    }
  }

  if (coolSeasonLeafyPlants.has(plantId)) {
    add('这类冷凉型蔬菜更怕闷热，水分要稳，别忽干忽湿。');
    if (band === 'south_humid') {
      add('在华南更适合秋冬春连续安排，盛夏容易抽薹或口感变粗。');
    }
    if (band === 'east_monsoon' || band === 'central') {
      add('在长江流域更适合春秋安排，梅雨和暑热阶段要防徒长、烂叶。');
    }
    if (band === 'north_temperate' || band === 'north_cold') {
      add('在华北、东北通常春秋窗口更稳，夏天要防高温催薹。');
    }
    if (season === 'summer') {
      add('当前季节偏热，若坚持种，优先选半日照并缩短采收周期。');
    }
  }

  if (plantId === 'tomato' || plantId === 'pepper' || plantId === 'eggplant') {
    if (band === 'south_humid') {
      add('华南湿热环境里要更早做通风和病害预防，连雨后尤其要看叶面。');
    }
    if (band === 'north_cold' || band === 'north_temperate') {
      add('北方春季前期先保温，等夜温稳定后再放开长势会更顺。');
    }
  }

  if (plantId === 'scallion' || plantId === 'chive' || plantId === 'suanmiao') {
    if (band === 'south_humid') {
      add('南方潮湿时注意通风，叶尖发黄多半先从积水和闷根排查。');
    }
    if (band === 'north_cold') {
      add('北方冷凉季表现更稳，越夏时要避免长期暴晒和断水。');
    }
  }

  return notes.slice(0, 3);
}

export function getPlantRegionalPriorityScore(
  plantId: string,
  climateProfile?: ClimateProfile | null,
  planSeason?: PlanSeason
) {
  const band = climateProfile?.climateBand;
  const season = planSeason || 'spring';
  let score = 0;

  if (!band) return score;

  if (['kongxin_cai', 'bitter_melon', 'donggua', 'ginger', 'loofah', 'yardlong_bean'].includes(plantId)) {
    if (band === 'south_humid' || band === 'east_monsoon' || band === 'southwest_plateau') score += 4;
    if (band === 'north_temperate') score += 1;
    if (band === 'north_cold') score -= 2;
  }

  if (['youmai_cai', 'shanghai_qing', 'cai_xin', 'garland_chrysanthemum', 'xiaoyoucai', 'gai_lan', 'baby_napa', 'wosun', 'daikon', 'fava_bean', 'suanmiao'].includes(plantId)) {
    if (band === 'south_humid' && (season === 'fall' || season === 'winter' || season === 'spring')) score += 4;
    if ((band === 'east_monsoon' || band === 'central') && (season === 'spring' || season === 'fall')) score += 4;
    if ((band === 'north_temperate' || band === 'north_cold') && (season === 'spring' || season === 'fall')) score += 3;
    if (season === 'summer') score -= 2;
  }

  if (['tomato', 'pepper', 'eggplant', 'cucumber', 'chili'].includes(plantId)) {
    if (band === 'south_humid') score += 2;
    if (band === 'east_monsoon' || band === 'central') score += 2;
    if (band === 'north_temperate') score += 1;
    if (band === 'north_cold' && season === 'spring') score -= 1;
  }

  if (['scallion', 'chive', 'suanmiao', 'radish', 'lettuce', 'bok_choy', 'cilantro'].includes(plantId)) {
    if (band === 'north_temperate' || band === 'north_cold') score += 2;
    if (band === 'south_humid' && season === 'summer') score -= 1;
  }

  return score;
}

function startMethodLabel(method: PlantAgronomy['startMethod']) {
  if (method === 'direct_sow') return '适合直播';
  if (method === 'transplant') return '适合移栽';
  return '直播/移栽均可';
}

export function isCoreReviewedPlant(plantId: string) {
  return coreReviewedPlantIds.has(plantId);
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
