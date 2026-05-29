// 植物数据库 Schema 定义
// 表现为一棵有向图结构，节点=植物品种，边=伴生/相克关系

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

export interface PlantAgronomy {
  family: PlantFamily;
  rotationGroup: RotationGroup;
  seasons: Season[];
  sunRequirement: SunRequirement;
  waterNeed: WaterNeed;
  hardinessZones: [number, number];
  daysToMaturity: number;
  sowingWindow: { startOffsetDays: number; endOffsetDays: number };
  harvestWindow: { startOffsetDays: number; endOffsetDays: number };
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
  /** 生化关系图 */
  relationships: PlantRelationships;
  /** 农艺知识扩展，用于轮作、日历和推荐 */
  agronomy?: PlantAgronomy;
}
