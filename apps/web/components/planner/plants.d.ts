/**
 * 植物数据库 Schema 定义
 * 表现为一棵有向图结构，节点=植物品种，边=伴生/相克关系
 */

export interface PlantDimensions {
  /** 网格 X 方向占用格子数 */
  grid_span_x: number;
  /** 网格 Y 方向占用格子数 */
  grid_span_y: number;
  /** 建议间距（英寸），用于视觉参考 */
  spacing_inch: number;
}

export interface PlantStyling {
  /** 背景填充色（CSS 颜色值） */
  bg_color: string;
  /** 边框/描边色 */
  border_color: string;
}

export interface PlantRelationships {
  /** 伴生植物 ID 列表（绿色标注） */
  companions: string[];
  /** 相克植物 ID 列表（红色标注） */
  enemies: string[];
}

export type PlantFamily =
  | 'nightshade'
  | 'brassica'
  | 'legume'
  | 'allium'
  | 'cucurbit'
  | 'aster'
  | 'apiaceae'
  | 'lamiaceae'
  | 'leafy'
  | 'root'
  | 'flower'
  | 'fruit'
  | 'other';

export type RotationGroup = 'fruiting' | 'leafy' | 'root' | 'legume' | 'flower' | 'perennial' | 'other';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type SunRequirement = 'full_sun' | 'partial_sun' | 'shade';
export type WaterNeed = 'low' | 'medium' | 'high';
export type PlantStartMethod = 'direct_sow' | 'transplant' | 'either';
export type PlantDataConfidence = 'mock' | 'reference';
export type PlantHarvestHabit = 'single' | 'cut_and_come_again' | 'continuous_pick' | 'multiple_flushes';
export type PlantReviewTag =
  | '怕霜'
  | '喜暖土'
  | '冷凉季'
  | '易抽薹'
  | '直播更稳'
  | '出苗保湿'
  | '需支撑'
  | '需引蔓'
  | '怕移栽'
  | '需稳水'
  | '需稳肥';

export interface PlantReviewSummary {
  tags: PlantReviewTag[];
  notes: string[];
}

export interface PlantAgronomy {
  /** 作物科属/功能族，用于轮作、病虫害与推荐系统 */
  family: PlantFamily;
  /** 轮作分组 */
  rotationGroup: RotationGroup;
  /** 适合种植季节 */
  seasons: Season[];
  /** 光照需求 */
  sunRequirement: SunRequirement;
  /** 水分需求 */
  waterNeed: WaterNeed;
  /** USDA 耐寒区范围 */
  hardinessZones: [number, number];
  /** 从播种/移栽到收获的大致天数 */
  daysToMaturity: number;
  /** 建议株距/行距，单位：英寸 */
  spacing: { plantInch: number; rowInch?: number };
  /** 发芽所需天数范围 */
  germinationDays: [number, number];
  /** 播种深度，单位：英寸。移栽作物可省略 */
  plantingDepthInch?: number;
  /** 更适合直播、移栽，或两者均可 */
  startMethod: PlantStartMethod;
  /** 若适合育苗/移栽，建议提前育苗的天数范围 */
  nurseryLeadDays?: [number, number];
  /** 当前资料的可信度标记：reference=参考资料结构，mock=演示占位 */
  dataConfidence: PlantDataConfidence;
  /** 数据来源名称，用于透明说明 */
  dataSourceLabel: string;
  /** 数据来源 URL，未来接真实资料库时使用 */
  dataSourceUrl?: string;
  /** 最近人工校对日期 */
  lastReviewedAt: string;
  /** 可信度说明 */
  confidenceNote: string;
  /** 以末霜日为基准的播种窗口，单位：天 */
  sowingWindow: { startOffsetDays: number; endOffsetDays: number };
  /** 若直播与移栽窗口需要区分，优先显示这两组窗口 */
  directSowWindow?: { startOffsetDays: number; endOffsetDays: number };
  transplantWindow?: { startOffsetDays: number; endOffsetDays: number };
  /** 以播种日为基准的收获窗口，单位：天 */
  harvestWindow: { startOffsetDays: number; endOffsetDays: number };
  /** 若属于持续采收型，首收大致天数 */
  firstHarvestDays?: number;
  /** 若属于持续采收型，连续采收期的大致天数 */
  harvestDurationDays?: [number, number];
  /** 采收方式：一茬收完 / 可反复摘叶 / 可连续摘果 / 多轮抽薹 */
  harvestHabit?: PlantHarvestHabit;
  /** 若适合连续播种，建议的分批补种间隔 */
  successionIntervalDays?: [number, number];
}

export interface Plant {
  /** 唯一标识符 */
  id: string;
  /** 分类：vegetable/fruit/herb/flower */
  category: string;
  /** 命名信息 */
  naming: {
    en: string;
    zh: string;
    /** Emoji 图标（用于 UI 展示） */
    emoji: string;
  };
  /** 空间占用与尺寸 */
  dimensions: PlantDimensions;
  /** 视觉样式 */
  styling: PlantStyling;
  /** 像素艺术素材路径（可选） */
  sprite?: string;
  /** 生化关系图 */
  relationships: PlantRelationships;
  /** 农艺知识扩展，用于轮作、日历和推荐 */
  agronomy?: PlantAgronomy;
}
