/**
 * 2.5D 轴测投影数学引擎
 * 采用标准 45 度角（垂直与水平比例为 1:2）的轴测瓦片地图系统
 */

export const TILE_SIZE = 64; // 菱形瓦片的水平宽度（像素）

/**
 * 从屏幕像素坐标转换为网格矩阵坐标
 * @param screenX 屏幕 X 坐标（像素）
 * @param screenY 屏幕 Y 坐标（像素）
 * @param tileSize 瓦片尺寸
 * @returns 网格坐标 { gridX, gridY }
 */
export function screenToGrid(screenX: number, screenY: number, tileSize: number = TILE_SIZE): { gridX: number; gridY: number } {
  const gridX = (screenX / tileSize) + (screenY / (tileSize / 2));
  const gridY = (screenY / (tileSize / 2)) - (screenX / tileSize);
  return { gridX, gridY };
}

/**
 * 从网格矩阵坐标转换为屏幕像素坐标（用于 Canvas 渲染）
 * @param gridX 网格 X 坐标
 * @param gridY 网格 Y 坐标
 * @param tileSize 瓦片尺寸
 * @returns 屏幕坐标 { screenX, screenY }
 */
export function gridToScreen(gridX: number, gridY: number, tileSize: number = TILE_SIZE): { screenX: number; screenY: number } {
  const screenX = (gridX - gridY) * (tileSize / 2);
  const screenY = (gridX + gridY) * (tileSize / 4);
  return { screenX, screenY };
}

/**
 * 计算深度排序值（gridX + gridY）
 * 用于 2.5D 轴测视图中的遮挡排序
 */
export function calculateDepth(gridX: number, gridY: number): number {
  return gridX + gridY;
}

/**
 * 轴测投影菱形顶点计算
 * 以 (gridX, gridY) 为中心点，计算菱形四个顶点坐标
 * @param gridX 网格 X 坐标
 * @param gridY 网格 Y 坐标
 * @param tileSize 瓦片尺寸
 * @param inset 顶点内缩量（像素），默认 1.5px 形成细小缝隙
 * @returns 四个顶点坐标数组
 */
export function getDiamondPoints(gridX: number, gridY: number, tileSize: number = TILE_SIZE, inset: number = 1.5): number[] {
  const center = gridToScreen(gridX, gridY, tileSize);
  const halfWidth = tileSize / 2 - inset;
  const halfHeight = tileSize / 4 - inset * 0.5;

  // 菱形顶点：上、右、下、左（向内收缩形成细小缝隙）
  return [
    center.screenX, center.screenY - halfHeight,        // 上顶点
    center.screenX + halfWidth, center.screenY,          // 右顶点
    center.screenX, center.screenY + halfHeight,         // 下顶点
    center.screenX - halfWidth, center.screenY           // 左顶点
  ];
}

// ==================== AABB 包围盒定义 ====================

export interface BoundingBox {
  /** 包围盒左边界（网格坐标） */
  minX: number;
  /** 包围盒上边界（网格坐标） */
  minY: number;
  /** 包围盒右边界（网格坐标） */
  maxX: number;
  /** 包围盒下边界（网格坐标） */
  maxY: number;
  /** 该包围盒关联的植物 ID */
  plantId: string;
}

/**
 * 扩展包围盒（用于生态检测的九宫格搜索）
 * 将原始包围盒向外扩张 1 个网格单元
 */
export function expandBoundingBox(box: BoundingBox, expansion: number = 1): BoundingBox {
  return {
    minX: box.minX - expansion,
    minY: box.minY - expansion,
    maxX: box.maxX + expansion,
    maxY: box.maxY + expansion,
    plantId: box.plantId
  };
}

/**
 * 标准二维 AABB 包围盒相交检测
 * @returns 是否相交
 */
export function checkAABBCollision(box1: BoundingBox, box2: BoundingBox): boolean {
  return !(
    box1.maxX < box2.minX || // box1 在 box2 左侧
    box1.minX > box2.maxX || // box1 在 box2 右侧
    box1.maxY < box2.minY || // box1 在 box2 上方
    box1.minY > box2.maxY    // box1 在 box2 下方
  );
}

/**
 * 根据植物网格占用创建包围盒
 * @param originX 植物原点网格 X 坐标
 * @param originY 植物原点网格 Y 坐标
 * @param spanX 网格 X 方向占用
 * @param spanY 网格 Y 方向占用
 * @param plantId 植物 ID
 */
export function createBoundingBox(
  originX: number,
  originY: number,
  spanX: number,
  spanY: number,
  plantId: string
): BoundingBox {
  return {
    minX: originX,
    minY: originY,
    maxX: originX + spanX,
    maxY: originY + spanY,
    plantId
  };
}

// ==================== 节流工具函数 ====================

/**
 * 节流函数装饰器
 * @param fn 要节流的函数
 * @param delay 延迟毫秒数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = delay - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn.apply(this, args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}