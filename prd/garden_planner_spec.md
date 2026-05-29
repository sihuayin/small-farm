# 技术规范说明书：游戏化花园与自给自足规划器内核

## 1. 项目背景与顶层架构
本规范定义了一个基于 Web 的游戏化花园与自给自足规划器的核心引擎。该产品在兼顾严谨的农业实用性（伴生种植算法）的同时，提供高保真、网格吸附的游戏级视觉交互体验。

### 技术栈选型
- Monorepo 工具链：pnpm workspaces
- 核心框架：Next.js (App Router，完全基于客户端 Canvas 渲染)
- 状态管理：Zustand (单一事实源，与视图层高度解耦)
- 2D Canvas 渲染引擎：Konva / react-konva
- 样式库：TailwindCSS

### 项目目录结构映射
- apps/web/app/planner/ -> 规划器页面路由
- apps/web/components/planner/index.tsx -> 动态入口包装组件 (禁用 SSR)
- apps/web/components/planner/GardenCanvas.tsx -> React-Konva 核心舞台组件
- apps/web/components/planner/usePlannerStore.ts -> Zustand 全局状态机
- apps/web/components/planner/utils/math.ts -> 2.5D轴测投影/AABB相交碰撞检测数学公式
- packages/core-assets/ -> 植物百科数据库 Schema 与 JSON 静态资源

## 2. 数据结构规范 (plants.json)
植物数据库表现为一个有向图结构，其中节点是植物品种，边表示共生（伴生）或敌对（相克）的生物学关系。同时，它定义了空间占用字段（grid_span），用于 Canvas 层的 AABB 包围盒碰撞计算。
样例结构包含字段：id, category, naming(en/zh/emoji), dimensions(grid_span_x, grid_span_y, spacing_inch), styling(bg_color, border_color), relationships(companions, enemies)。

## 3. 数学算法引擎规范

### A. 2.5D 轴测投影坐标转换矩阵
视觉层采用标准的 45 度角（垂直与水平比例为 1:2）2.5D 轴测瓦片地图系统。
给定屏幕像素空间坐标 (screenX, screenY) 以及固定的网格尺寸 tileSize（代表菱形瓦片的水平宽度）：
gridX = (screenX / tileSize) + (screenY / (tileSize / 2))
gridY = (screenY / (tileSize / 2)) - (screenX / tileSize)

将网格矩阵坐标 (gridX, gridY) 逆向投影回 2D 屏幕像素坐标以供 Canvas 渲染的公式：
screenX = (gridX - gridY) * (tileSize / 2)
screenY = (gridX + gridY) * (tileSize / 4)

### B. 基于包围盒扩张的邻近生态冲突检测算法
当放置一个多网格占用的植物（如 2x2 的番茄）时，算法需要将该植物的 Bounding Box（包围盒）向外等比扩张 1 个网格单元，以此捕获其外围九宫格内的所有邻居。
利用标准二维 AABB 相交碰撞检测：若扩张后的 activeBox 与已有 targetBox 相交，且 targetBox.plantId 存在于当前植物的 enemies 列表中，触发一票否决制判定为 'bad' (相克)；若存在于 companions 列表中，判定为 'good' (伴生)。

## 4. 状态管理机设计 (usePlannerStore.ts)
Zustand Store 充当纯净的状态机，负责执行数据流的不可变更新。状态包含：grid (Record 结构，KEY 为 "x,y" 字符串，VALUE 包含 plantId, originX, originY), activeToolId, hoveredGrid。

## 5. 视图渲染与性能规约 (GardenCanvas.tsx)
1. 水合与 SSR 安全：必须使用 next/dynamic 配合 { ssr: false } 对组件进行条件式客户端解析，防止 Canvas 库在服务端报错。
2. 网格层离屏缓存优化：2.5D 的菱形网格线/点阵图层必须渲染在独立的 Konva.Layer 中，并在初始化时执行 layer.cache() 将其转为离屏静态图，严禁在鼠标滑动循环中重复计算网格线段。
3. 实时阴影预览：当鼠标在画布网格上滑动时，通过轴测变换矩阵公式实时逆向计算当前悬停的网格矩阵坐标。调用 evaluateSynergy() 实时计算生态关系。若关系为敌对 (bad) 填充半透明红 rgba(239, 68, 68, 0.4)；若关系为伴生 (good) 填充半透明绿 rgba(34, 197, 94, 0.4)。
4. 深度排序防遮挡：渲染画布上的植物时，必须严格按照深度公式 (gridX + gridY) 的计算结果对所有元素进行正向排序绘制，以防止 2.5D 轴测视图下的前后方元素遮挡错位。

## 🤖 Claude Code 终端执行提示词指令
"请扮演技术总监或首席架构师。仔细阅读附带的 garden_planner_spec.md 规范说明书。请在我的 Next.js 客户端组件层中实现 usePlannerStore.ts 状态管理器以及支持 2.5D 交互的 GardenCanvas.tsx 组件。要求严格执行 TypeScript 类型约束，对鼠标移动事件引入节流优化以保证 Canvas 帧率维持在 60fps，并完美实现针对植物跨网格占用的 AABB 生态协同效益检测算法。请直接输出生产级中文源码及详尽中文注释，不要臆造本规范以外的 Schema。"