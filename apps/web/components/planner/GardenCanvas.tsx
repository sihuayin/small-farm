/**
 * GardenCanvas.tsx - React-Konva 核心舞台组件
 *
 * 功能：
 * 1. 2.5D 轴测网格渲染（使用像素艺术地块素材）
 * 2. 点击放置植物交互（使用像素艺术植物素材）
 * 3. 实时生态关系预览（绿色伴生/红色相克）
 * 4. 深度排序防遮挡
 */

'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Line, Group, Text, Rect, Circle, Image as KonvaImage } from 'react-konva';
import { usePlannerStore, plants, tiles, type TileType } from './usePlannerStore';
import type { ActivityInput, HarvestInput } from './usePlannerStore';
import { PlannerInspector } from './PlannerInspector';
import { PlannerStatusBar } from './PlannerStatusBar';
import { PlannerToolbar } from './PlannerToolbar';
import { evaluateCompanionRules, getCompanionRule } from './rules';
import { getGardenTaskBoard, getPlantGrowthStatus, type GrowthStageId } from './growth';
import { getPlantAgronomy, getPlantSpacingLabel, getPlantTimingLabel, plantMap } from './plants';
import { shouldRemoveAfterHarvest } from './harvestPolicy';
import { evaluateRotationRules } from './rotation';
import { scorePlacement } from './scoring';
import {
  TILE_SIZE,
  screenToGrid,
  gridToScreen,
  throttle
} from './utils/math';
import type { GardenEntity } from './types';
import type { FirstRunFocusArea } from './PlannerInspector';
import type { SynergyResult } from './types';
import type { PlacementInsight } from './types';
import type { HeatmapLayer } from './types';
import type { PlanSeason } from './types';
import type { TileStatusInfo, TileStatusKind } from './types';
import type { Plant } from './plants.d';

const heatmapLayers: Array<{ id: HeatmapLayer; label: string }> = [
  { id: 'overall', label: '综合' },
  { id: 'companion', label: '伴生' },
  { id: 'rotation', label: '轮作' },
  { id: 'season', label: '季节' },
  { id: 'weather', label: '天气' }
];

const heatmapLegends: Record<HeatmapLayer, { scoreLabel: string; good: string; caution: string; bad: string }> = {
  overall: { scoreLabel: '综合评分', good: '适合', caution: '谨慎', bad: '不推荐' },
  companion: { scoreLabel: '伴生评分', good: '盟友', caution: '中性', bad: '冲突' },
  rotation: { scoreLabel: '轮作风险', good: '安全', caution: '注意', bad: '高风险' },
  season: { scoreLabel: '季节适配', good: '当季适合', caution: '可尝试', bad: '不建议' },
  weather: { scoreLabel: '天气风险', good: '稳定', caution: '需关注', bad: '有风险' }
};

const activityOptions = [
  { id: 'water', label: '浇水' },
  { id: 'cover', label: '覆盖' },
  { id: 'drainage', label: '排水' },
  { id: 'inspect', label: '巡检' },
  { id: 'fertilize', label: '施肥' },
  { id: 'prune', label: '修剪' },
  { id: 'pest', label: '病虫害' }
];

interface HeatmapCell {
  x: number;
  y: number;
  result: SynergyResult;
}

interface PlantVisualState {
  stage: GrowthStageId;
  stageLabel: string;
  progressPercent: number;
  visualScale: number;
  harvestReady: boolean;
}

interface SmartRecommendation {
  id: string;
  name: string;
  score: number;
  reason: string;
}

const defaultPlantVisualState: PlantVisualState = {
  stage: 'mature',
  stageLabel: '成熟中',
  progressPercent: 85,
  visualScale: 1,
  harvestReady: false
};

const seasonAtmosphere: Record<PlanSeason, {
  label: string;
  badge: string;
  background: string;
  groundPattern: string;
  particle: 'petal' | 'spark' | 'leaf' | 'snow';
  particleColor: string;
  overlay: string;
}> = {
  spring: {
    label: '春季',
    badge: 'Bloom',
    background: 'linear-gradient(180deg, #94d8eb 0%, #a7dfc8 46%, #89cf95 100%)',
    groundPattern: 'linear-gradient(90deg,rgba(47,125,63,0.14)_0_1px,transparent_1px_32px),linear-gradient(0deg,rgba(47,125,63,0.12)_0_1px,transparent_1px_32px)',
    particle: 'petal',
    particleColor: '#ffd1dc',
    overlay: 'rgba(255, 236, 205, 0.08)'
  },
  summer: {
    label: '夏季',
    badge: 'Sun High',
    background: 'linear-gradient(180deg, #86d3ed 0%, #99dbb5 44%, #78c77d 100%)',
    groundPattern: 'linear-gradient(90deg,rgba(38,111,52,0.16)_0_1px,transparent_1px_30px),linear-gradient(0deg,rgba(38,111,52,0.13)_0_1px,transparent_1px_30px)',
    particle: 'spark',
    particleColor: '#fff1a8',
    overlay: 'rgba(255, 210, 90, 0.08)'
  },
  fall: {
    label: '秋季',
    badge: 'Harvest',
    background: 'linear-gradient(180deg, #9fcfe4 0%, #c9d397 48%, #c89b5d 100%)',
    groundPattern: 'linear-gradient(90deg,rgba(137,82,29,0.14)_0_1px,transparent_1px_34px),linear-gradient(0deg,rgba(137,82,29,0.12)_0_1px,transparent_1px_34px)',
    particle: 'leaf',
    particleColor: '#d97706',
    overlay: 'rgba(180, 91, 20, 0.1)'
  },
  winter: {
    label: '冬季',
    badge: 'Frost',
    background: 'linear-gradient(180deg, #b7ddea 0%, #cfe6df 50%, #aac8b8 100%)',
    groundPattern: 'linear-gradient(90deg,rgba(235,248,255,0.18)_0_1px,transparent_1px_32px),linear-gradient(0deg,rgba(235,248,255,0.16)_0_1px,transparent_1px_32px)',
    particle: 'snow',
    particleColor: '#f8fafc',
    overlay: 'rgba(240, 249, 255, 0.22)'
  }
};

// ==================== 图片管理器（避免重复加载）====================
/**
 * 将图片中的白色背景转为透明
 */
function removeWhiteBackground(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;

  // 绘制原图
  ctx.drawImage(img, 0, 0);

  // 获取图像数据
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // 遍历每个像素，将白色转为透明
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // 如果 R > 200, G > 200, B > 200 且 Alpha > 200，认为是白色背景
    if (r > 200 && g > 200 && b > 200 && a > 200) {
      data[i + 3] = 0; // 设置 Alpha 为 0（透明）
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function useImageManager(spriteUrls: string[]) {
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    let loaded = 0;
    const total = spriteUrls.length;

    const checkComplete = () => {
      loaded++;
      if (mounted && loaded >= total) {
        setLoadedCount(loaded);
      }
    };

    spriteUrls.forEach(url => {
      // 检查是否已缓存
      if (imagesRef.current.has(url)) {
        checkComplete();
        return;
      }

      const img = new window.Image();
      img.src = url;
      img.onload = () => {
        if (!mounted) return;
        // 处理白色背景
        const canvas = removeWhiteBackground(img);
        const processedImg = new window.Image();
        processedImg.src = canvas.toDataURL();
        processedImg.onload = () => {
          if (mounted) {
            imagesRef.current.set(url, processedImg);
            checkComplete();
          }
        };
        processedImg.onerror = () => {
          if (mounted) {
            // 处理失败，使用原图
            imagesRef.current.set(url, img);
            checkComplete();
          }
        };
      };
      img.onerror = () => {
        if (mounted) {
          loaded++;
          if (loaded >= total) setLoadedCount(loaded);
        }
      };
    });

    return () => {
      mounted = false;
    };
  }, [spriteUrls.join(',')]);

  const getImage = useCallback((url: string | undefined) => {
    if (!url) return null;
    return imagesRef.current.get(url) || null;
  }, []);

  return { getImage, loadedCount };
}

function weatherTaskIcon(taskId: string) {
  if (taskId === 'cover') return '!';
  if (taskId === 'water') return '~';
  if (taskId === 'drainage') return 'D';
  return '?';
}

function weatherTaskStroke(taskId: string) {
  if (taskId === 'cover') return '#f59e0b';
  if (taskId === 'water') return '#0284c7';
  if (taskId === 'drainage') return '#0891b2';
  return '#64748b';
}

function weatherTaskFill(taskId: string) {
  if (taskId === 'cover') return '#fbbf24';
  if (taskId === 'water') return '#38bdf8';
  if (taskId === 'drainage') return '#22d3ee';
  return '#94a3b8';
}

function getGrowthVisualTone(stage: GrowthStageId) {
  if (stage === 'seed') {
    return {
      shadow: 'rgba(61, 39, 22, 0.2)',
      soilGlow: 'rgba(120, 72, 24, 0.22)'
    };
  }
  if (stage === 'seedling') {
    return {
      shadow: 'rgba(34, 51, 24, 0.22)',
      soilGlow: 'rgba(132, 204, 22, 0.2)'
    };
  }
  if (stage === 'harvest') {
    return {
      shadow: 'rgba(74, 54, 18, 0.24)',
      soilGlow: 'rgba(250, 204, 21, 0.2)'
    };
  }
  return {
    shadow: 'rgba(34, 51, 24, 0.24)',
    soilGlow: 'rgba(255, 245, 205, 0.12)'
  };
}

function growthStageBadgeFill(stage: GrowthStageId) {
  if (stage === 'seed') return '#8b5e34';
  if (stage === 'seedling') return '#65a30d';
  if (stage === 'growing') return '#16a34a';
  if (stage === 'mature') return '#d97706';
  return '#f59e0b';
}

function growthStageBadgeStroke(stage: GrowthStageId) {
  if (stage === 'seed') return '#5a3825';
  if (stage === 'seedling') return '#3f6212';
  if (stage === 'growing') return '#166534';
  if (stage === 'mature') return '#92400e';
  return '#a16207';
}

function growthStageProgressFill(stage: GrowthStageId) {
  if (stage === 'seed') return '#d6a66b';
  if (stage === 'seedling') return '#bef264';
  if (stage === 'growing') return '#86efac';
  if (stage === 'mature') return '#fde68a';
  return '#fff7a8';
}

function GrowthPreviewMetric({ label, value, tone }: { label: string; value: number; tone: 'green' | 'amber' | 'gold' }) {
  return (
    <div className={`rounded-md border px-1.5 py-1 text-center ${growthPreviewMetricClassName(tone)}`}>
      <div className="text-sm font-black leading-none">{value}</div>
      <div className="mt-0.5 text-[9px] font-black">{label}</div>
    </div>
  );
}

function TileStateLegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full border border-amber-950/20 ${color}`} />
      <span>{label}</span>
    </div>
  );
}

function DemoTourItem({ label, detail, done, onClick }: { label: string; detail: string; done?: boolean; onClick?: () => void }) {
  const className = `w-full rounded-md border border-green-900/10 bg-white/70 p-1.5 text-left ${onClick ? 'hover:bg-green-100' : ''}`;
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-black text-green-950">{label}</div>
        {done && <div className="text-[10px] font-black text-green-700">✓</div>}
      </div>
      <div className="mt-0.5 text-[9px] font-bold leading-4 text-green-800">{detail}</div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}

interface FirstRunCheckStep {
  id: string;
  label: string;
  detail: string;
  done: boolean;
}

const firstRunFocusByStepId: Record<string, { area: FirstRunFocusArea; label: string; hint: string }> = {
  demo: {
    area: 'tasks',
    label: '加载示例菜园',
    hint: '先进入 Demo 场景，用户不用自己搭建数据。'
  },
  rules: {
    area: 'planning',
    label: '伴生与冲突解释',
    hint: '右侧规划页会解释为什么这个位置适合或冲突。'
  },
  task: {
    area: 'tasks',
    label: '今日养护任务',
    hint: '右侧任务区会定位作物，完成后角标和问题项应消失。'
  },
  harvest: {
    area: 'harvest',
    label: '采收窗口',
    hint: '切到收获页并定位可采收作物，再记录采收。'
  },
  cleanup: {
    area: 'tile',
    label: '待整理地块',
    hint: '右侧地块状态会出现整理按钮，完成后进入下一季规划。'
  },
  'next-season': {
    area: 'tile',
    label: '下一季作物推荐',
    hint: '在地块推荐里选作物，画布会打开轮作安全区域。'
  }
};

function FirstRunCheckItem({
  index,
  step,
  active,
  onClick
}: {
  index: number;
  step: FirstRunCheckStep;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-2 rounded-md border p-1.5 text-left shadow-[0_1px_0_rgba(120,72,24,0.08)] ${
        step.done
          ? 'border-green-900/10 bg-green-50/80 text-green-900'
          : active
            ? 'border-amber-400 bg-amber-50 text-amber-950'
            : 'border-amber-900/10 bg-white/70 text-amber-900 hover:bg-amber-50'
      }`}
    >
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[8px] font-black ${
        step.done
          ? 'border-green-300 bg-green-100 text-green-800'
          : active
            ? 'border-amber-400 bg-[#f4d58d] text-amber-950'
            : 'border-amber-300 bg-amber-100 text-amber-800'
      }`}>
        {step.done ? '✓' : index + 1}
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-black leading-4">{step.label}</span>
        {active && <span className="mt-0.5 block text-[9px] font-bold leading-4 opacity-80">{step.detail}</span>}
      </span>
    </button>
  );
}

function growthPreviewMetricClassName(tone: 'green' | 'amber' | 'gold') {
  if (tone === 'green') return 'border-green-900/10 bg-green-50 text-green-800';
  if (tone === 'gold') return 'border-yellow-900/10 bg-yellow-50 text-yellow-800';
  return 'border-amber-900/10 bg-amber-50 text-amber-800';
}

function getGuidedPathCopy(stepId: string) {
  const copy: Record<string, { title: string; detail: string }> = {
    plant: {
      title: '当前目标：先放置几株作物',
      detail: '布局是所有规则、任务和采收预测的基础。可以从番茄或生菜开始。'
    },
    rules: {
      title: '当前目标：查看规则反馈',
      detail: '热力图会告诉你哪些位置更适合，哪些位置有伴生或轮作风险。'
    },
    preview: {
      title: '当前目标：预览未来长势',
      detail: '用 +60 天看看哪些作物会成熟，提前判断采收和养护压力。'
    },
    tasks: {
      title: '当前目标：完成一项养护任务',
      detail: '任务完成后，缺水、覆盖或排水状态会从画布上自动消失。'
    },
    harvest: {
      title: '当前目标：记录一次采收',
      detail: '采收记录会进入本季统计，并决定是否生成待整理地块。'
    },
    cleanup: {
      title: '当前目标：整理采收后的地块',
      detail: '整理完成后，地块会回到空闲状态，并显示下一季作物推荐。'
    },
    complete: {
      title: '本季闭环已完成',
      detail: '可以继续优化布局、查看 Garden Score，或导出采收与养护记录。'
    }
  };

  return copy[stepId] || copy.complete;
}

interface ShareCardStats {
  score: number;
  plantCount: number;
  speciesCount: number;
  taskCount: number;
  harvestCount: number;
  activityCount: number;
  seasonLabel: string;
  plantNames: string[];
}

interface StarterPlanSummary {
  placed: number;
  requested: number;
  skipped: string[];
  skippedNames: string[];
  reasons: string[];
  nextStep: string;
}

function buildStarterPlanSummary(result: { placed: number; skipped: string[] }, requestedPlantIds: string[], planSeason: PlanSeason): StarterPlanSummary {
  const skippedNames = Array.from(new Set(result.skipped))
    .map(id => plantMap.get(id)?.naming.zh || id)
    .slice(0, 4);
  const reasons = [
    '优先避开相克组合和高风险轮作位置。',
    `优先匹配${seasonLabel(planSeason)}可种作物。`,
    '尽量让伴生组合靠近，并保留可继续扩展的空位。'
  ];

  return {
    placed: result.placed,
    requested: requestedPlantIds.length,
    skipped: result.skipped,
    skippedNames,
    reasons,
    nextStep: result.skipped.length > 0
      ? '可以打开热力图检查未放入作物，或减少工具箱后重新生成。'
      : '可以查看规则热力图，确认伴生、轮作和季节适配。'
  };
}

function getShareGardenScore(stats: Omit<ShareCardStats, 'score' | 'seasonLabel' | 'plantNames'>) {
  const taskPressure = Math.min(30, stats.taskCount * 5);
  const diversityBonus = Math.min(10, Math.max(0, stats.speciesCount - 1) * 2);
  const activityMomentum = Math.min(12, stats.activityCount * 3);
  const harvestMomentum = Math.min(12, stats.harvestCount * 4);
  const plantedBonus = stats.plantCount > 0 ? 8 : 0;
  return Math.max(0, Math.min(100, Math.round(64 - taskPressure + diversityBonus + activityMomentum + harvestMomentum + plantedBonus)));
}

async function createGardenShareCard(stageDataUrl: string, title: string, stats: ShareCardStats) {
  const stageImage = await loadCanvasImage(stageDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return stageDataUrl;

  ctx.fillStyle = '#f7e8c8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const sky = ctx.createLinearGradient(0, 0, 0, 760);
  sky.addColorStop(0, '#9fd8ee');
  sky.addColorStop(0.55, '#b8dfbf');
  sky.addColorStop(1, '#f7e8c8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, 760);

  ctx.fillStyle = 'rgba(255, 248, 223, 0.94)';
  drawRoundRect(ctx, 64, 64, 1072, 1472, 30);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 72, 24, 0.22)';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#2f6f3d';
  ctx.font = '900 34px Arial, sans-serif';
  ctx.fillText('SMALL FARM PLANNER', 104, 130);
  ctx.fillStyle = '#3d2814';
  ctx.font = '900 58px Arial, sans-serif';
  drawWrappedText(ctx, title, 104, 210, 840, 64, 2);
  ctx.fillStyle = '#7c4a18';
  ctx.font = '800 28px Arial, sans-serif';
  const plantText = stats.plantNames.length > 0 ? stats.plantNames.join('、') : '先规划一块小菜园';
  drawWrappedText(ctx, `我的${stats.seasonLabel}小菜园计划：${plantText}`, 104, 315, 900, 38, 2);

  drawScoreBadge(ctx, 896, 104, stats.score);

  const imageBox = { x: 104, y: 405, width: 992, height: 720 };
  ctx.fillStyle = '#fff8df';
  drawRoundRect(ctx, imageBox.x, imageBox.y, imageBox.width, imageBox.height, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 72, 24, 0.18)';
  ctx.lineWidth = 3;
  ctx.stroke();

  const imageScale = Math.min((imageBox.width - 36) / stageImage.width, (imageBox.height - 36) / stageImage.height);
  const drawWidth = stageImage.width * imageScale;
  const drawHeight = stageImage.height * imageScale;
  ctx.drawImage(
    stageImage,
    imageBox.x + (imageBox.width - drawWidth) / 2,
    imageBox.y + (imageBox.height - drawHeight) / 2,
    drawWidth,
    drawHeight
  );

  const metrics = [
    { label: '作物', value: String(stats.plantCount), tone: '#2f9e44' },
    { label: '品种', value: String(stats.speciesCount), tone: '#b7791f' },
    { label: '今日任务', value: String(stats.taskCount), tone: '#0284c7' },
    { label: '本季采收', value: String(stats.harvestCount), tone: '#16a34a' }
  ];
  metrics.forEach((metric, index) => {
    const x = 104 + index * 248;
    drawMetricCard(ctx, x, 1165, 220, 150, metric.value, metric.label, metric.tone);
  });

  ctx.fillStyle = '#3d2814';
  ctx.font = '900 34px Arial, sans-serif';
  ctx.fillText(getShareRecommendation(stats), 104, 1392);
  ctx.fillStyle = '#7c4a18';
  ctx.font = '800 24px Arial, sans-serif';
  drawWrappedText(ctx, '先在规划器里试种一遍，再把真实菜园种下去。', 104, 1440, 780, 34, 2);
  ctx.fillStyle = '#2f6f3d';
  ctx.font = '900 24px Arial, sans-serif';
  ctx.fillText('small-farm planner', 104, 1504);

  return canvas.toDataURL('image/png', 1);
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const chars = Array.from(text);
  let line = '';
  let lines = 0;
  chars.forEach((char, index) => {
    const testLine = line + char;
    const isLast = index === chars.length - 1;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(lines === maxLines - 1 ? `${line.slice(0, Math.max(0, line.length - 1))}…` : line, x, y + lines * lineHeight);
      lines += 1;
      line = char;
      return;
    }
    line = testLine;
    if (isLast && lines < maxLines) {
      ctx.fillText(line, x, y + lines * lineHeight);
    }
  });
}

function drawScoreBadge(ctx: CanvasRenderingContext2D, x: number, y: number, score: number) {
  ctx.fillStyle = score >= 80 ? '#dcfce7' : score >= 60 ? '#fef3c7' : '#fee2e2';
  drawRoundRect(ctx, x, y, 176, 176, 28);
  ctx.fill();
  ctx.strokeStyle = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#3d2814';
  ctx.font = '900 26px Arial, sans-serif';
  ctx.fillText('Garden', x + 36, y + 48);
  ctx.fillText('Score', x + 44, y + 78);
  ctx.font = '900 64px Arial, sans-serif';
  ctx.fillText(String(score), x + 42, y + 142);
}

function drawMetricCard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, value: string, label: string, color: string) {
  ctx.fillStyle = '#fff8df';
  drawRoundRect(ctx, x, y, width, height, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 72, 24, 0.16)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = '900 54px Arial, sans-serif';
  ctx.fillText(value, x + 28, y + 72);
  ctx.fillStyle = '#7c4a18';
  ctx.font = '900 24px Arial, sans-serif';
  ctx.fillText(label, x + 28, y + 118);
}

function getShareRecommendation(stats: ShareCardStats) {
  if (stats.score >= 82) return '这块菜园已经很适合开种';
  if (stats.taskCount > 0) return '先处理今日任务，菜园状态会更稳';
  if (stats.plantCount === 0) return '从几株蔬菜、香草或花开始规划';
  return '这是一版可以继续优化的菜园计划';
}

function sanitizeShareFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'small-farm';
}

function placementScoreLabel(result: SynergyResult) {
  if (result.recommendation === 'excellent') return '很适合';
  if (result.recommendation === 'ok') return '适合';
  if (result.recommendation === 'caution') return '谨慎';
  if (result.recommendation === 'bad') return '不推荐';
  return result.status === 'bad' ? '不推荐' : result.status === 'good' ? '适合' : '中性';
}

function placementScoreFill(result: SynergyResult) {
  if (result.recommendation === 'bad') return '#ef4444';
  if (result.recommendation === 'caution') return '#f59e0b';
  if (result.recommendation === 'excellent') return '#16a34a';
  return '#65a30d';
}

function placementScoreStroke(result: SynergyResult) {
  if (result.recommendation === 'bad') return '#b91c1c';
  if (result.recommendation === 'caution') return '#b45309';
  if (result.recommendation === 'excellent') return '#166534';
  return '#3f6212';
}

function smartRecommendationReason(result: SynergyResult, plant: Plant, planSeason: PlanSeason) {
  if (result.enemyCount > 0) return '附近存在冲突植物，建议换个位置。';
  if (result.companionCount > 0) return `附近有伴生伙伴，适合尝试${plant.naming.zh}。`;
  if (getPlantAgronomy(plant.id).seasons.includes(planSeason)) return '当前季节适配，且没有明显冲突。';
  return '没有明显冲突，但季节适配一般。';
}

function combineSynergyResults(primary: SynergyResult, secondary: SynergyResult): SynergyResult {
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

function placementHeatTone(result: SynergyResult) {
  if (result.recommendation === 'bad') {
    return { fill: 'rgba(239,68,68,0.28)', stroke: '#ef4444', opacity: 0.42 };
  }
  if (result.recommendation === 'caution') {
    return { fill: 'rgba(245,158,11,0.24)', stroke: '#f59e0b', opacity: 0.36 };
  }
  if (result.recommendation === 'excellent') {
    return { fill: 'rgba(34,197,94,0.34)', stroke: '#22c55e', opacity: 0.48 };
  }
  return { fill: 'rgba(132,204,22,0.22)', stroke: '#84cc16', opacity: 0.32 };
}

function heatLayerTone(score: number) {
  if (score < 45) {
    return { fill: 'rgba(239,68,68,0.3)', stroke: '#ef4444', opacity: 0.44 };
  }
  if (score < 65) {
    return { fill: 'rgba(245,158,11,0.25)', stroke: '#f59e0b', opacity: 0.38 };
  }
  if (score >= 86) {
    return { fill: 'rgba(34,197,94,0.36)', stroke: '#22c55e', opacity: 0.5 };
  }
  return { fill: 'rgba(132,204,22,0.22)', stroke: '#84cc16', opacity: 0.34 };
}

function getLayerScore(result: SynergyResult, layer: HeatmapLayer, plant: Plant, planSeason: PlanSeason, climateProfile: { mockWeatherScenario?: string }) {
  if (layer === 'overall') return result.score ?? 72;

  if (layer === 'companion') {
    if (result.enemyCount > 0) return Math.max(0, 34 - result.enemyCount * 8);
    if (result.companionCount > 0) return Math.min(100, 74 + result.companionCount * 10);
    return 62;
  }

  if (layer === 'rotation') {
    const hasRotationRisk = result.details.some(detail => detail.startsWith('轮作提醒') || detail.startsWith('病虫害风险'));
    return hasRotationRisk ? 38 : 78;
  }

  const agronomy = getPlantAgronomy(plant.id);
  if (layer === 'season') {
    return agronomy.seasons.includes(planSeason) ? 86 : 42;
  }

  const scenario = climateProfile.mockWeatherScenario || 'auto';
  if (layer === 'weather') {
    if (scenario === 'dry' && agronomy.waterNeed === 'high') return 42;
    if (scenario === 'heat' && agronomy.seasons.includes('summer')) return 82;
    if (scenario === 'cold_snap' && agronomy.seasons.includes('summer')) return 46;
    if (scenario === 'rain' && agronomy.waterNeed === 'low') return 54;
    return 72;
  }

  return result.score ?? 72;
}

function getLayerResult(result: SynergyResult, layer: HeatmapLayer, plant: Plant, planSeason: PlanSeason, climateProfile: { mockWeatherScenario?: string }): SynergyResult {
  if (layer === 'overall') return result;

  const score = getLayerScore(result, layer, plant, planSeason, climateProfile);
  const recommendation = score < 45 ? 'bad' : score < 65 ? 'caution' : score >= 86 ? 'excellent' : 'ok';
  const details = getLayerDetails(result, layer, plant, planSeason, climateProfile);

  return {
    ...result,
    valid: result.valid && recommendation !== 'bad',
    status: recommendation === 'bad' ? 'bad' : recommendation === 'excellent' ? 'good' : result.status,
    recommendation,
    score,
    details
  };
}

function getLayerDetails(result: SynergyResult, layer: HeatmapLayer, plant: Plant, planSeason: PlanSeason, climateProfile: { mockWeatherScenario?: string }) {
  if (layer === 'companion') {
    const relationDetails = result.details.filter(detail => detail.startsWith('伴生') || detail.startsWith('相克'));
    if (relationDetails.length > 0) return relationDetails;
    return ['伴生图层: 周边没有明显盟友或冲突植物。'];
  }

  if (layer === 'rotation') {
    const rotationDetails = result.details.filter(detail => detail.startsWith('轮作提醒') || detail.startsWith('病虫害风险'));
    if (rotationDetails.length > 0) return rotationDetails;
    return ['轮作图层: 当前地块没有命中历史轮作风险。'];
  }

  const agronomy = getPlantAgronomy(plant.id);
  if (layer === 'season') {
    if (agronomy.seasons.includes(planSeason)) {
      return [`季节图层: 当前季节适合 ${plant.naming.zh}，约 ${getPlantTimingLabel(plant.id)}。`];
    }
    return [`季节图层: ${plant.naming.zh} 更适合 ${agronomy.seasons.map(seasonLabel).join('、')}，建议${getPlantSpacingLabel(plant.id)}。`];
  }

  if (layer === 'weather') {
    const scenario = climateProfile.mockWeatherScenario || 'auto';
    if (scenario === 'dry' && agronomy.waterNeed === 'high') {
      return [`天气图层: Mock 干旱场景下，${plant.naming.zh} 属于高需水作物，维护压力较高。`];
    }
    if (scenario === 'heat' && agronomy.seasons.includes('summer')) {
      return [`天气图层: Mock 高温场景下，${plant.naming.zh} 与夏季条件较匹配，但仍需检查覆盖物和水分。`];
    }
    if (scenario === 'cold_snap' && agronomy.seasons.includes('summer')) {
      return [`天气图层: Mock 寒潮场景下，${plant.naming.zh} 可能需要覆盖保护。`];
    }
    if (scenario === 'rain' && agronomy.waterNeed === 'low') {
      return [`天气图层: Mock 降雨场景下，${plant.naming.zh} 需注意排水，避免根部过湿。`];
    }
    return [`天气图层: 当前 Mock 天气对 ${plant.naming.zh} 没有明显额外风险，真实天气 API 暂未接入。`];
  }

  return result.details;
}

function seasonLabel(season: PlanSeason) {
  const labels: Record<PlanSeason, string> = {
    spring: '春季',
    summer: '夏季',
    fall: '秋季',
    winter: '冬季'
  };
  return labels[season];
}

interface GardenCanvasProps {
  gridWidth?: number;
  gridHeight?: number;
}

export default function GardenCanvas({
  gridWidth = 12,
  gridHeight = 12
}: GardenCanvasProps) {
  // ==================== Refs ====================
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ pointerX: number; pointerY: number; viewX: number; viewY: number } | null>(null);

  // ==================== State ====================
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [isEntityDragging, setIsEntityDragging] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showGuidedPath, setShowGuidedPath] = useState(false);
  const [showFirstRunCheck, setShowFirstRunCheck] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasDismissedWelcome, setHasDismissedWelcome] = useState(false);
  const [firstRunCompletedAt, setFirstRunCompletedAt] = useState<number | null>(null);
  const [completedDemoTourItems, setCompletedDemoTourItems] = useState<Set<string>>(() => new Set());
  const [growthPreviewDays, setGrowthPreviewDays] = useState(0);
  const [heatmapLayer, setHeatmapLayer] = useState<HeatmapLayer>('overall');
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [hoverResult, setHoverResult] = useState<SynergyResult | null>(null);
  const [placementInsight, setPlacementInsight] = useState<PlacementInsight | null>(null);
  const [selectedTileStatus, setSelectedTileStatus] = useState<TileStatusInfo | null>(null);
  const [requestedInspectorTab, setRequestedInspectorTab] = useState<'tasks' | 'planning' | 'harvest' | null>(null);
  const [hoveredTaskEntityId, setHoveredTaskEntityId] = useState<string | null>(null);
  const [safePlacementRepair, setSafePlacementRepair] = useState<{ entityId: string; plantName: string } | null>(null);
  const [nextSeasonTarget, setNextSeasonTarget] = useState<{ gridX: number; gridY: number } | null>(null);
  const [firstRunNextSeasonSelected, setFirstRunNextSeasonSelected] = useState(false);
  const [harvestDraft, setHarvestDraft] = useState<{
    entityId: string;
    quantity: string;
    unit: HarvestInput['unit'];
    note: string;
    removeAfterHarvest: boolean;
    fromScoreRepair: boolean;
  } | null>(null);
  const [activityDraft, setActivityDraft] = useState<{
    entityId: string;
    taskId: string;
    note: string;
  } | null>(null);
  const [animationTick, setAnimationTick] = useState(0);
  const [effects, setEffects] = useState<Array<{
    id: string;
    x: number;
    y: number;
    kind: 'plant' | 'tile' | 'move' | 'blocked';
    createdAt: number;
  }>>([]);
  const [actionFeedback, setActionFeedback] = useState<{
    x: number;
    y: number;
    status: 'ok' | 'blocked' | 'moved';
    label: string;
  } | null>(null);
  const [starterSummary, setStarterSummary] = useState<StarterPlanSummary | null>(null);
  const [shareExportMessage, setShareExportMessage] = useState<string | null>(null);

  // ==================== Store ====================
  const {
    entities,
    occupancyIndex,
    surfaceIndex,
    plantingHistory,
    harvestRecords,
    activityRecords,
    resolvedCleanupKeys,
    climateProfile,
    planId,
    planName,
    cellSizeFeet,
    planYear,
    planSeason,
    planSummaries,
    hasUnsavedChanges,
    lastSavedAt,
    undoStack,
    redoStack,
    activeToolId,
    activeTileId,
    gridWidth: planGridWidth,
    gridHeight: planGridHeight,
    renamePlan,
    resizeGarden,
    setPlanTime,
    updateClimateProfile,
    createPlan,
    loadDemoScenario,
    generateStarterPlan,
    duplicatePlan,
    switchPlan,
    undo,
    redo,
    setActiveTool,
    setActiveTile,
    selectedEntityId,
    selectEntity,
    setTileOverride,
    removeTileOverride,
    resolveCleanupTile,
    getTileAt,
    getEntityAt,
    placePlant,
    removeEntity,
    completePlantTask,
    moveEntity,
    rotateEntity,
    evaluatePlacement,
    exportPlan,
    importPlanAsNew,
    savePlan,
    loadPlan
  } = usePlannerStore();

  const effectiveGridWidth = planGridWidth || gridWidth;
  const effectiveGridHeight = planGridHeight || gridHeight;
  const heatmapLayerLabel = heatmapLayers.find(layer => layer.id === heatmapLayer)?.label || '综合';
  const heatmapLegend = heatmapLegends[heatmapLayer];
  const getGardenKitPlantIds = useCallback(() => {
    const fallback = ['tomato', 'basil', 'lettuce', 'carrot', 'pepper', 'marigold'];
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = window.localStorage.getItem('small-farm:garden-kit-plants:v1');
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((item): item is string => typeof item === 'string' && plants.some(plant => plant.id === item));
        return valid.length > 0 ? valid : fallback;
      }
    } catch {
      return fallback;
    }
    return fallback;
  }, []);

  // ==================== 预加载所有精灵图 ====================
  const allSpriteUrls = useMemo(() => {
    const urls = new Set<string>();
    plants.forEach(p => p.sprite && urls.add(p.sprite));
    tiles.forEach(t => t.sprite && urls.add(t.sprite!));
    return Array.from(urls);
  }, []);

  const { getImage } = useImageManager(allSpriteUrls);
  const minZoom = 0.55;
  const maxZoom = 1.85;
  const atmosphere = seasonAtmosphere[planSeason];
  const growthPreviewNowMs = useMemo(() => Date.now() + growthPreviewDays * 24 * 60 * 60 * 1000, [growthPreviewDays]);
  const currentGardenTasks = useMemo(
    () => getGardenTaskBoard(entities, climateProfile, planSeason, growthPreviewNowMs),
    [climateProfile, entities, growthPreviewNowMs, planSeason]
  );
  const weatherTaskByEntityId = useMemo(() => {
    const taskMap = new Map<string, ReturnType<typeof getGardenTaskBoard>[number]>();
    currentGardenTasks.forEach(task => {
      const entity = entities[task.id];
      if (entity?.type === 'plant' && entity.completedTaskIds?.includes(task.task.id)) {
        return;
      }
      if (task.task.id === 'cover' || task.task.id === 'water' || task.task.id === 'drainage') {
        taskMap.set(task.id, task);
      }
    });
    return taskMap;
  }, [currentGardenTasks, entities]);
  const tileStatusByKey = useMemo(() => {
    const statusMap = new Map<string, TileStatusKind>();
    const resolvedSet = new Set(resolvedCleanupKeys);

    harvestRecords
      .filter(record => record.year === planYear && record.season === planSeason && record.removedAfterHarvest !== false)
      .slice(0, 24)
      .forEach(record => {
        for (let dx = 0; dx < record.spanX; dx++) {
          for (let dy = 0; dy < record.spanY; dy++) {
            const key = `${record.originX + dx},${record.originY + dy}`;
            if (!occupancyIndex[key] && !resolvedSet.has(key)) {
              statusMap.set(key, 'cleanup');
            }
          }
        }
      });

    Object.values(entities)
      .filter((entity): entity is Extract<GardenEntity, { type: 'plant' }> => entity.type === 'plant')
      .forEach(entity => {
        const task = weatherTaskByEntityId.get(entity.id);
        if (!task) return;
        const status: TileStatusKind = task.task.id === 'water'
          ? 'water'
          : task.task.id === 'drainage'
            ? 'drainage'
            : 'cover';
        for (let dx = 0; dx < entity.spanX; dx++) {
          for (let dy = 0; dy < entity.spanY; dy++) {
            statusMap.set(`${entity.originX + dx},${entity.originY + dy}`, status);
          }
        }
      });

    return statusMap;
  }, [entities, harvestRecords, occupancyIndex, planSeason, planYear, resolvedCleanupKeys, weatherTaskByEntityId]);
  const getTileStatusInfo = useCallback((gridX: number, gridY: number): TileStatusInfo | null => {
    const key = `${gridX},${gridY}`;
    const kind = tileStatusByKey.get(key);
    if (!kind && occupancyIndex[key]) return null;
    const resolvedKind = kind || 'idle';

    const base = { kind: resolvedKind, gridX, gridY };
    if (resolvedKind === 'cleanup') {
      return {
        ...base,
        label: '待整理地块',
        detail: '这块地刚完成采收并移除了作物，土壤需要整理后再进入下一轮种植。',
        recommendation: '建议补肥、翻土或覆盖堆肥，再查看轮作建议。',
        tone: 'amber'
      };
    }
    if (resolvedKind === 'water') {
      return {
        ...base,
        label: '缺水提醒',
        detail: '该地块上的作物当前处于补水任务状态。',
        recommendation: '完成补水任务后，蓝色状态边和角标会自动消失。',
        tone: 'blue'
      };
    }
    if (resolvedKind === 'drainage') {
      return {
        ...base,
        label: '排水提醒',
        detail: '模拟降雨条件下，这块地需要检查积水与根部湿度。',
        recommendation: '处理排水任务后，状态会自动清除。',
        tone: 'blue'
      };
    }
    if (resolvedKind === 'cover') {
      return {
        ...base,
        label: '覆盖保护',
        detail: '模拟寒潮或风险天气下，这块地建议覆盖保护。',
        recommendation: '完成覆盖任务后，黄色角标会自动消失。',
        tone: 'amber'
      };
    }
    return {
      ...base,
      label: '空闲地块',
      detail: '这块地当前没有作物或待处理状态。',
      recommendation: '可以放置新作物，或结合热力图查看适合种植的位置。',
      tone: 'green'
    };
  }, [occupancyIndex, tileStatusByKey]);
  const activePlant = useMemo(
    () => activeToolId ? plants.find(p => p.id === activeToolId) || null : null,
    [activeToolId]
  );
  const smartRecommendations = useMemo<SmartRecommendation[]>(() => {
    if (!selectedTileStatus || selectedTileStatus.kind !== 'idle') return [];

    return plants
      .map((plant) => {
        const inBounds = selectedTileStatus.gridX + plant.dimensions.grid_span_x <= effectiveGridWidth
          && selectedTileStatus.gridY + plant.dimensions.grid_span_y <= effectiveGridHeight;
        if (!inBounds) return null;

        const hasCollision = Object.keys(occupancyIndex).some((key) => {
          const [x, y] = key.split(',').map(Number);
          return x >= selectedTileStatus.gridX
            && x < selectedTileStatus.gridX + plant.dimensions.grid_span_x
            && y >= selectedTileStatus.gridY
            && y < selectedTileStatus.gridY + plant.dimensions.grid_span_y;
        });
        if (hasCollision) return null;

        const result = scorePlacement(
          plant,
          combineSynergyResults(
            evaluateCompanionRules(selectedTileStatus.gridX, selectedTileStatus.gridY, plant, entities),
            evaluateRotationRules(selectedTileStatus.gridX, selectedTileStatus.gridY, plant, plantingHistory, planYear, planSeason)
          ),
          climateProfile,
          planSeason
        );
        return {
          id: plant.id,
          name: plant.naming.zh,
          score: result.score ?? 0,
          reason: smartRecommendationReason(result, plant, planSeason),
          valid: result.valid && result.recommendation !== 'bad',
          category: plant.category
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter(item => item.valid)
      .sort((a, b) => {
        const categoryWeight = (item: { category: string }) => item.category === 'vegetable' ? 4 : item.category === 'herb' ? 3 : item.category === 'flower' ? 2 : 1;
        return b.score - a.score || categoryWeight(b) - categoryWeight(a);
      })
      .slice(0, 3)
      .map(({ id, name, score, reason }) => ({ id, name, score, reason }));
  }, [climateProfile, effectiveGridHeight, effectiveGridWidth, entities, occupancyIndex, plantingHistory, planSeason, planYear, selectedTileStatus]);
  const heatmapSampleEvery = useMemo(() => {
    const maxCells = effectiveGridWidth * effectiveGridHeight;
    if (maxCells > 1400) return 3;
    if (maxCells > 420) return 2;
    return 1;
  }, [effectiveGridHeight, effectiveGridWidth]);
  const placementHeatmapCells = useMemo<HeatmapCell[]>(() => {
    if (!activePlant || !showHeatmap) return [];

    const cells: HeatmapCell[] = [];
    for (let y = 0; y < effectiveGridHeight; y += heatmapSampleEvery) {
      for (let x = 0; x < effectiveGridWidth; x += heatmapSampleEvery) {
        if (occupancyIndex[`${x},${y}`]) continue;
        const result = evaluatePlacement(x, y);
        if (typeof result.score !== 'number') continue;
        cells.push({ x, y, result });
      }
    }
    return cells;
  }, [activePlant, showHeatmap, effectiveGridHeight, effectiveGridWidth, heatmapSampleEvery, occupancyIndex, evaluatePlacement]);

  // ==================== 计算画布中心偏移 ====================
  const canvasOffset = useMemo(() => {
    const centerX = dimensions.width / 2;
    const gridPixelWidth = effectiveGridWidth * TILE_SIZE / 2 + effectiveGridHeight * TILE_SIZE / 2;
    const gridPixelHeight = (effectiveGridWidth + effectiveGridHeight) * TILE_SIZE / 4;
    const centerY = (dimensions.height - gridPixelHeight) / 2 + gridPixelHeight / 2;
    return { x: centerX - gridPixelWidth / 2, y: centerY - gridPixelHeight / 4 };
  }, [dimensions, effectiveGridWidth, effectiveGridHeight]);

  // ==================== 初始化 ====================
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    const syncWelcomeForViewport = () => {
      if (window.innerWidth < 768) {
        setShowWelcome(false);
        setHasDismissedWelcome(true);
      }
    };

    syncWelcomeForViewport();
    window.addEventListener('resize', syncWelcomeForViewport);
    return () => window.removeEventListener('resize', syncWelcomeForViewport);
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const timeoutId = window.setTimeout(() => {
      savePlan();
    }, 600);
    return () => window.clearTimeout(timeoutId);
  }, [hasUnsavedChanges, entities, surfaceIndex, planName, planGridWidth, planGridHeight, cellSizeFeet, planYear, planSeason, savePlan]);

  useEffect(() => {
    if (!actionFeedback) return;
    const timeoutId = window.setTimeout(() => setActionFeedback(null), 620);
    return () => window.clearTimeout(timeoutId);
  }, [actionFeedback]);

  useEffect(() => {
    if (effects.length === 0) return;
    const timeoutId = window.setTimeout(() => {
      const cutoff = performance.now() - 900;
      setEffects((current) => current.filter(effect => effect.createdAt > cutoff));
    }, 180);
    return () => window.clearTimeout(timeoutId);
  }, [effects, animationTick]);

  useEffect(() => {
    let frameId = 0;
    let lastUpdate = 0;

    const animate = (time: number) => {
      if (time - lastUpdate > 80) {
        lastUpdate = time;
        setAnimationTick(time);
      }
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const setStageCursor = useCallback((cursor: string) => {
    const stage = stageRef.current;
    const container = stage?.container?.();
    if (container) container.style.cursor = cursor;
  }, []);

  useEffect(() => {
    if (isEntityDragging || isPanning) {
      setStageCursor('grabbing');
      return;
    }

    if (activeToolId) {
      setStageCursor('copy');
      return;
    }

    if (activeTileId) {
      setStageCursor('cell');
      return;
    }

    setStageCursor('grab');
  }, [activeTileId, activeToolId, isEntityDragging, isPanning, setStageCursor]);

  // 地块精灵图裁切区域：1024x1024 素材中菱形内容约在 x:100~924, y:250~774
  const TILE_CROP = useMemo(() => ({ x: 100, y: 255, width: 824, height: 514 }), []);
  const gridToCanvas = useCallback((gridX: number, gridY: number) => {
    const { screenX, screenY } = gridToScreen(gridX, gridY, TILE_SIZE);
    return {
      x: screenX + canvasOffset.x,
      y: screenY + canvasOffset.y
    };
  }, [canvasOffset]);

  const getDiamondPoints = useCallback((gridX: number, gridY: number) => {
    const inset = 0;
    const halfW = TILE_SIZE / 2 - inset;
    const halfH = TILE_SIZE / 4 - inset * 0.5;
    return [0, -halfH, halfW, 0, 0, halfH, -halfW, 0];
  }, []);

  const screenToWorld = useCallback((screenX: number, screenY: number) => ({
    x: (screenX - viewport.x) / viewport.scale,
    y: (screenY - viewport.y) / viewport.scale
  }), [viewport]);

  const worldToGrid = useCallback((x: number, y: number) => {
    const relativeX = x - canvasOffset.x;
    const relativeY = y - canvasOffset.y;
    const { gridX, gridY } = screenToGrid(relativeX, relativeY, TILE_SIZE);
    return { x: Math.floor(gridX), y: Math.floor(gridY) };
  }, [canvasOffset]);

  const zoomAt = useCallback((nextScale: number, anchor?: { x: number; y: number }) => {
    const clampedScale = Math.max(minZoom, Math.min(maxZoom, nextScale));
    setViewport((current) => {
      const point = anchor || { x: dimensions.width / 2, y: dimensions.height / 2 };
      const worldX = (point.x - current.x) / current.scale;
      const worldY = (point.y - current.y) / current.scale;
      return {
        scale: clampedScale,
        x: point.x - worldX * clampedScale,
        y: point.y - worldY * clampedScale
      };
    });
  }, [dimensions]);

  const resetViewport = useCallback(() => {
    setViewport({ x: 0, y: 0, scale: 1 });
  }, []);

  const addEffect = useCallback((x: number, y: number, kind: 'plant' | 'tile' | 'move' | 'blocked') => {
    setEffects((current) => [
      ...current.slice(-18),
      {
        id: `effect-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        x,
        y,
        kind,
        createdAt: performance.now()
      }
    ]);
  }, []);

  const focusEntityInView = useCallback((entityId: string) => {
    const entity = entities[entityId];
    if (!entity) return;

    const target = gridToCanvas(
      entity.originX + entity.spanX / 2 - 0.5,
      entity.originY + entity.spanY / 2 - 0.5
    );
    const nextScale = Math.max(1.08, viewport.scale);
    const visibleCenterX = Math.max(260, dimensions.width / 2 - 140);
    const visibleCenterY = dimensions.height / 2 + 18;

    setViewport({
      scale: nextScale,
      x: visibleCenterX - target.x * nextScale,
      y: visibleCenterY - target.y * nextScale
    });

    setActionFeedback({
      x: entity.originX,
      y: entity.originY,
      status: 'ok',
      label: '已定位'
    });
    addEffect(entity.originX, entity.originY, 'move');
  }, [addEffect, dimensions, entities, gridToCanvas, viewport.scale]);

  const handleTaskSelectEntity = useCallback((entityId: string) => {
    const entity = entities[entityId];
    setHoveredTaskEntityId(null);
    selectEntity(entityId);
    focusEntityInView(entityId);
    if (entity) {
      setActionFeedback({
        x: entity.originX,
        y: entity.originY,
        status: 'ok',
        label: '已定位'
      });
      addEffect(entity.originX, entity.originY, 'move');
    }
  }, [addEffect, entities, focusEntityInView, selectEntity]);

  const handleOpenHarvestPanel = useCallback((entityId: string, source?: 'score') => {
    const entity = entities[entityId];
    setHarvestDraft({
      entityId,
      quantity: '1',
      unit: 'count',
      note: '',
      removeAfterHarvest: entity?.type === 'plant' ? shouldRemoveAfterHarvest(entity.plantId) : true,
      fromScoreRepair: source === 'score'
    });
  }, [entities]);

  const handleOpenActivityPanel = useCallback((entityId: string) => {
    setActivityDraft({
      entityId,
      taskId: 'inspect',
      note: ''
    });
  }, []);

  const handleSubmitHarvest = useCallback(() => {
    if (!harvestDraft) return;
    const entity = entities[harvestDraft.entityId];

    completePlantTask(harvestDraft.entityId, 'harvest', {
      quantity: Number(harvestDraft.quantity) || 0,
      unit: harvestDraft.unit,
      note: harvestDraft.note,
      removeAfterHarvest: harvestDraft.removeAfterHarvest
    });
    if (entity) {
      setActionFeedback({
        x: entity.originX,
        y: entity.originY,
        status: 'ok',
        label: harvestDraft.fromScoreRepair ? 'Score 已刷新' : harvestDraft.removeAfterHarvest ? 'DONE' : 'HARVEST'
      });
      addEffect(entity.originX, entity.originY, harvestDraft.removeAfterHarvest ? 'move' : 'plant');
    }
    setHarvestDraft(null);
    if (harvestDraft.removeAfterHarvest) {
      setRequestedInspectorTab('tasks');
    } else {
      setRequestedInspectorTab('harvest');
    }
  }, [addEffect, completePlantTask, entities, harvestDraft]);

  const handleSubmitActivity = useCallback(() => {
    if (!activityDraft) return;
    const entity = entities[activityDraft.entityId];

    completePlantTask(activityDraft.entityId, activityDraft.taskId, {
      note: activityDraft.note
    } satisfies ActivityInput);
    if (entity) {
      setActionFeedback({
        x: entity.originX,
        y: entity.originY,
        status: 'ok',
        label: 'LOG'
      });
      addEffect(entity.originX, entity.originY, 'move');
    }
    setActivityDraft(null);
    setRequestedInspectorTab('tasks');
  }, [activityDraft, addEffect, completePlantTask, entities]);

  const renderSceneDecorations = useMemo(() => {
    const top = gridToCanvas(0, 0);
    const right = gridToCanvas(effectiveGridWidth, 0);
    const bottom = gridToCanvas(effectiveGridWidth, effectiveGridHeight);
    const left = gridToCanvas(0, effectiveGridHeight);
    const boardPoints = [
      top.x,
      top.y - TILE_SIZE / 4,
      right.x,
      right.y,
      bottom.x,
      bottom.y + TILE_SIZE / 4,
      left.x,
      left.y
    ];

    const edgeMarkers: JSX.Element[] = [];
    const environmentProps: JSX.Element[] = [];
    const pushMarker = (key: string, x: number, y: number, rotation: number) => {
      edgeMarkers.push(
        <Group key={key} x={x} y={y} rotation={rotation} listening={false}>
          <Rect x={-4} y={-18} width={8} height={24} fill="#8b5a2b" stroke="#5d3519" strokeWidth={1.5} cornerRadius={1} />
          <Rect x={-6} y={-22} width={12} height={5} fill="#a36a34" stroke="#5d3519" strokeWidth={1} cornerRadius={1} />
        </Group>
      );
    };

    const noise = (index: number, salt = 0) => {
      const raw = Math.sin(index * 87.73 + salt * 191.17 + effectiveGridWidth * 13.7 + effectiveGridHeight * 19.3) * 43758.5453;
      return raw - Math.floor(raw);
    };

    const addGrass = (key: string, x: number, y: number, scale = 1) => {
      environmentProps.push(
        <Group key={key} x={x} y={y} scaleX={scale} scaleY={scale} listening={false}>
          <Line points={[-8, 0, -5, -10, -2, 0, 1, -13, 4, 0, 8, -8]} stroke="#2f8f46" strokeWidth={2} lineCap="round" />
          <Line points={[-4, 1, 0, -7, 4, 1]} stroke="#7bc96f" strokeWidth={1.5} lineCap="round" />
        </Group>
      );
    };

    const addFlower = (key: string, x: number, y: number, scale = 1) => {
      environmentProps.push(
        <Group key={key} x={x} y={y} scaleX={scale} scaleY={scale} listening={false}>
          <Line points={[0, 0, 0, -11]} stroke="#2f8f46" strokeWidth={2} />
          <Circle x={-4} y={-13} radius={3} fill="#f9a8d4" stroke="#be185d" strokeWidth={1} />
          <Circle x={4} y={-13} radius={3} fill="#fde68a" stroke="#d97706" strokeWidth={1} />
          <Circle x={0} y={-17} radius={3} fill="#fef3c7" stroke="#d97706" strokeWidth={1} />
        </Group>
      );
    };

    const addStone = (key: string, x: number, y: number, scale = 1) => {
      environmentProps.push(
        <Group key={key} x={x} y={y} scaleX={scale} scaleY={scale} listening={false}>
          <Line points={[-9, 1, -5, -5, 5, -7, 11, -1, 6, 5, -5, 5]} closed fill="#94a3b8" stroke="#64748b" strokeWidth={1.5} />
          <Line points={[-3, -4, 5, -5]} stroke="rgba(255,255,255,0.38)" strokeWidth={1.2} />
        </Group>
      );
    };

    const addToolCrate = () => {
      const anchor = gridToCanvas(effectiveGridWidth + 1.35, effectiveGridHeight - 0.25);
      environmentProps.push(
        <Group key="tool-crate" x={anchor.x} y={anchor.y + 34} rotation={-12} listening={false}>
          <Line points={[-28, 4, 0, 17, 28, 4, 0, -9]} closed fill="rgba(67, 42, 22, 0.24)" />
          <Rect x={-19} y={-22} width={38} height={23} fill="#b7793d" stroke="#6b3f1d" strokeWidth={2} cornerRadius={2} />
          <Rect x={-15} y={-18} width={30} height={5} fill="rgba(255,240,190,0.3)" />
          <Line points={[-15, -10, 15, -10]} stroke="#6b3f1d" strokeWidth={2} />
          <Line points={[-25, -22, -9, -39]} stroke="#7c3f1d" strokeWidth={4} lineCap="round" />
          <Line points={[-6, -36, 5, -25]} stroke="#94a3b8" strokeWidth={5} lineCap="round" />
          <Circle x={21} y={-12} radius={8} fill="#60a5fa" stroke="#2563eb" strokeWidth={2} />
          <Rect x={16} y={-21} width={10} height={5} fill="#93c5fd" stroke="#2563eb" strokeWidth={1} cornerRadius={2} />
        </Group>
      );
    };

    for (let x = 0; x <= effectiveGridWidth; x += 2) {
      const north = gridToCanvas(x, 0);
      const south = gridToCanvas(x, effectiveGridHeight);
      pushMarker(`north-${x}`, north.x, north.y - TILE_SIZE / 4 - 3, -26);
      pushMarker(`south-${x}`, south.x, south.y + TILE_SIZE / 4 + 12, 154);
    }

    for (let y = 2; y < effectiveGridHeight; y += 2) {
      const west = gridToCanvas(0, y);
      const east = gridToCanvas(effectiveGridWidth, y);
      pushMarker(`west-${y}`, west.x - TILE_SIZE / 2 - 6, west.y, 26);
      pushMarker(`east-${y}`, east.x + TILE_SIZE / 2 + 6, east.y, -154);
    }

    const decorationCount = Math.max(14, Math.min(28, Math.floor((effectiveGridWidth + effectiveGridHeight) * 1.1)));
    for (let index = 0; index < decorationCount; index++) {
      const side = Math.floor(noise(index, 1) * 4);
      const t = noise(index, 2);
      const jitterX = (noise(index, 3) - 0.5) * 34;
      const jitterY = (noise(index, 4) - 0.5) * 24;
      let anchor;

      if (side === 0) {
        anchor = gridToCanvas(t * effectiveGridWidth, -0.85 - noise(index, 5) * 0.55);
      } else if (side === 1) {
        anchor = gridToCanvas(effectiveGridWidth + 0.85 + noise(index, 5) * 0.55, t * effectiveGridHeight);
      } else if (side === 2) {
        anchor = gridToCanvas(t * effectiveGridWidth, effectiveGridHeight + 0.85 + noise(index, 5) * 0.65);
      } else {
        anchor = gridToCanvas(-0.85 - noise(index, 5) * 0.55, t * effectiveGridHeight);
      }

      const x = anchor.x + jitterX;
      const y = anchor.y + jitterY;
      const scale = 0.75 + noise(index, 6) * 0.65;
      const kind = noise(index, 7);

      if (kind > 0.78) {
        addFlower(`env-flower-${index}`, x, y, scale);
      } else if (kind > 0.55) {
        addStone(`env-stone-${index}`, x, y, scale);
      } else {
        addGrass(`env-grass-${index}`, x, y, scale);
      }
    }

    addToolCrate();

    return (
      <Group listening={false}>
        {environmentProps}
        <Line
          points={boardPoints}
          closed
          fill="rgba(38, 91, 45, 0.2)"
          x={0}
          y={18}
          shadowColor="rgba(40, 72, 37, 0.38)"
          shadowBlur={24}
          shadowOffset={{ x: 0, y: 16 }}
        />
        <Line
          points={boardPoints}
          closed
          fill="rgba(237, 190, 112, 0.34)"
          stroke="rgba(94, 56, 28, 0.38)"
          strokeWidth={5}
        />
        <Line
          points={boardPoints}
          closed
          stroke="rgba(255, 247, 208, 0.72)"
          strokeWidth={2}
          dash={[10, 8]}
        />
        {edgeMarkers}
      </Group>
    );
  }, [effectiveGridWidth, effectiveGridHeight, gridToCanvas]);

  // ==================== 事件处理 ====================
  const handleMouseMove = useCallback(
    throttle((e: any) => {
      const stage = stageRef.current;
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      if (isPanningRef.current && panStartRef.current) {
        didDragRef.current = true;
        const panStart = panStartRef.current;
        setViewport((current) => ({
          ...current,
          x: panStart.viewX + pos.x - panStart.pointerX,
          y: panStart.viewY + pos.y - panStart.pointerY
        }));
        return;
      }

      const world = screenToWorld(pos.x, pos.y);
      const { x: roundedX, y: roundedY } = worldToGrid(world.x, world.y);

      if (roundedX >= 0 && roundedX < effectiveGridWidth && roundedY >= 0 && roundedY < effectiveGridHeight) {
        setHoveredCell({ x: roundedX, y: roundedY });
        if (activePlant) {
          const result = evaluatePlacement(roundedX, roundedY);
          setHoverResult(getLayerResult(result, heatmapLayer, activePlant, planSeason, climateProfile));
        } else {
          setHoverResult(null);
        }

        // 拖拽绘制地块
        if (isDraggingRef.current && activeTileId) {
          didDragRef.current = true;
          setTileOverride(roundedX, roundedY, activeTileId);
        }
      } else {
        setHoveredCell(null);
        setHoverResult(null);
      }
    }, 16),
    [effectiveGridWidth, effectiveGridHeight, activePlant, activeTileId, heatmapLayer, planSeason, climateProfile, setTileOverride, evaluatePlacement, screenToWorld, worldToGrid]
  );

  const handleMouseDown = useCallback((event: any) => {
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    isDraggingRef.current = true;
    didDragRef.current = false;

    if (!activeToolId && !activeTileId && pointer && event.target === stage) {
      isPanningRef.current = true;
      setIsPanning(true);
      panStartRef.current = {
        pointerX: pointer.x,
        pointerY: pointer.y,
        viewX: viewport.x,
        viewY: viewport.y
      };
    }
  }, [activeToolId, activeTileId, viewport]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    isPanningRef.current = false;
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
    setHoverResult(null);
    isDraggingRef.current = false;
    isPanningRef.current = false;
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  const handleWheel = useCallback((event: any) => {
    event.evt.preventDefault();
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;

    const direction = event.evt.deltaY > 0 ? -1 : 1;
    const factor = direction > 0 ? 1.08 : 1 / 1.08;
    zoomAt(viewport.scale * factor, pointer);
  }, [viewport.scale, zoomAt]);

  useEffect(() => {
    if (!hoveredCell || !activePlant) {
      setHoverResult(null);
      return;
    }

    const result = evaluatePlacement(hoveredCell.x, hoveredCell.y);
    setHoverResult(getLayerResult(result, heatmapLayer, activePlant, planSeason, climateProfile));
  }, [activePlant, heatmapLayer, hoveredCell, evaluatePlacement, planSeason, climateProfile]);

  const handleClick = useCallback((e: any) => {
    if (isPanningRef.current || didDragRef.current && !activeTileId) return;
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    const pointerCell = pointer
      ? worldToGrid(screenToWorld(pointer.x, pointer.y).x, screenToWorld(pointer.x, pointer.y).y)
      : null;
    const targetCell = hoveredCell || pointerCell;
    if (!targetCell) return;

    const { x, y } = targetCell;
    if (x < 0 || x >= effectiveGridWidth || y < 0 || y >= effectiveGridHeight) return;

    // 地块绘制模式
    if (activeTileId) {
      // 拖拽已处理，跳过单击
      if (didDragRef.current) return;

      const currentTile = getTileAt(x, y);
      if (currentTile === activeTileId) {
        removeTileOverride(x, y);
      } else {
        setTileOverride(x, y, activeTileId);
      }
      addEffect(x, y, 'tile');
      return;
    }

    // 植物放置/选择模式
    const existingEntity = getEntityAt(x, y);
    if (existingEntity) {
      setPlacementInsight(null);
      setSelectedTileStatus(null);
      selectEntity(existingEntity.id);
    } else if (activeToolId && activePlant) {
      setSelectedTileStatus(null);
      const insightResult = evaluatePlacement(x, y);
      setPlacementInsight({
        gridX: x,
        gridY: y,
        plantName: activePlant.naming.zh,
        layer: heatmapLayer,
        layerLabel: heatmapLayerLabel,
        scoreLabel: heatmapLegend.scoreLabel,
        result: getLayerResult(insightResult, heatmapLayer, activePlant, planSeason, climateProfile)
      });
      const placed = placePlant(x, y, activeToolId);
      setActionFeedback({
        x,
        y,
        status: placed ? 'ok' : 'blocked',
        label: placed ? 'OK' : 'NO'
      });
      addEffect(x, y, placed ? 'plant' : 'blocked');
    } else {
      setPlacementInsight(null);
      setSelectedTileStatus(getTileStatusInfo(x, y));
      selectEntity(null);
    }
  }, [hoveredCell, activeToolId, activeTileId, activePlant, heatmapLayer, heatmapLayerLabel, heatmapLegend.scoreLabel, planSeason, climateProfile, effectiveGridWidth, effectiveGridHeight, screenToWorld, worldToGrid, getTileAt, getEntityAt, setTileOverride, removeTileOverride, evaluatePlacement, placePlant, selectEntity, addEffect, getTileStatusInfo]);

  const handleSelectPlant = useCallback((plantId: string) => {
    // 选择植物时清除地块绘制工具
    if (activeToolId === plantId) {
      setActiveTool(null);
      setPlacementInsight(null);
      setSelectedTileStatus(null);
    } else {
      setActiveTool(plantId);
      setPlacementInsight(null);
      setSelectedTileStatus(null);
    }
  }, [activeToolId, setActiveTool]);

  const handleSelectTile = useCallback((tileId: TileType) => {
    // 选择地块时清除植物工具
    if (activeTileId === tileId) {
      setActiveTile(null);
      setSelectedTileStatus(null);
    } else {
      setActiveTile(tileId);
      setPlacementInsight(null);
      setSelectedTileStatus(null);
    }
  }, [activeTileId, setActiveTile]);

  const canvasToGrid = useCallback((x: number, y: number) => {
    const target = screenToWorld(x, y);
    return worldToGrid(target.x, target.y);
  }, [screenToWorld, worldToGrid]);

  const handleEntityDragStart = useCallback((entityId: string) => {
    selectEntity(entityId);
    isDraggingRef.current = false;
    didDragRef.current = true;
    setIsEntityDragging(true);
  }, [selectEntity]);

  const handleEntityDragEnd = useCallback((entityId: string, nodeX: number, nodeY: number) => {
    const target = worldToGrid(nodeX, nodeY);
    const moved = moveEntity(entityId, target.x, target.y);
    setIsEntityDragging(false);
    setStageCursor(activeToolId ? 'copy' : activeTileId ? 'cell' : 'grab');
    const isSafeRepairTarget = safePlacementRepair?.entityId === entityId;
    if (moved && isSafeRepairTarget) {
      setSafePlacementRepair(null);
      setActiveTool(null);
      setHeatmapLayer('overall');
      setShowHeatmap(true);
    } else if (moved && activeToolId) {
      setActiveTool(null);
      setHeatmapLayer('overall');
    }
    setActionFeedback({
      x: target.x,
      y: target.y,
      status: moved ? 'moved' : 'blocked',
      label: moved ? (isSafeRepairTarget ? '冲突已解除' : '已移动') : (isSafeRepairTarget ? '仍有冲突' : 'NO')
    });
    addEffect(target.x, target.y, moved ? 'move' : 'blocked');
  }, [worldToGrid, moveEntity, addEffect, activeToolId, activeTileId, safePlacementRepair, setActiveTool, setStageCursor]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedEntityId) {
      removeEntity(selectedEntityId);
      setHoverResult(null);
    }
  }, [selectedEntityId, removeEntity]);

  const handleRotateSelected = useCallback(() => {
    if (selectedEntityId) rotateEntity(selectedEntityId);
  }, [selectedEntityId, rotateEntity]);

  const handleFocusSelected = useCallback(() => {
    if (selectedEntityId) focusEntityInView(selectedEntityId);
  }, [focusEntityInView, selectedEntityId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        handleDeleteSelected();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if (event.key.toLowerCase() === 'r') {
        handleRotateSelected();
      }
      if (event.key === 'Escape') {
        selectEntity(null);
        setActiveTool(null);
        setActiveTile(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteSelected, handleRotateSelected, selectEntity, setActiveTool, setActiveTile, undo, redo]);

  // ==================== 渲染函数 ====================

  const getTileImage = useCallback((tileId: string) => {
    const tileConfig = tiles.find(t => t.id === tileId);
    return tileConfig?.sprite ? getImage(tileConfig.sprite) : null;
  }, [getImage]);

  const tileNoise = useCallback((gridX: number, gridY: number, salt = 0) => {
    const raw = Math.sin(gridX * 127.1 + gridY * 311.7 + salt * 59.3) * 43758.5453;
    return raw - Math.floor(raw);
  }, []);

  const tileCanBlend = useCallback((tileId: TileType) => (
    tileId === 'dark_soil' || tileId === 'wet_soil' || tileId === 'raised_bed' || tileId === 'stone_path'
  ), []);

  const renderTileBlend = useCallback((tileId: TileType, gridX: number, gridY: number, pos: { x: number; y: number }) => {
    if (!tileCanBlend(tileId)) return null;

    const sameNorth = getTileAt(gridX, gridY - 1) === tileId;
    const sameSouth = getTileAt(gridX, gridY + 1) === tileId;
    const sameWest = getTileAt(gridX - 1, gridY) === tileId;
    const sameEast = getTileAt(gridX + 1, gridY) === tileId;

    const palette = {
      dark_soil: {
        bridge: 'rgba(96, 53, 31, 0.58)',
        edge: 'rgba(42, 25, 16, 0.42)',
        light: 'rgba(188, 119, 58, 0.28)'
      },
      wet_soil: {
        bridge: 'rgba(55, 76, 69, 0.62)',
        edge: 'rgba(25, 51, 48, 0.5)',
        light: 'rgba(137, 202, 217, 0.26)'
      },
      raised_bed: {
        bridge: 'rgba(148, 90, 39, 0.58)',
        edge: 'rgba(84, 48, 22, 0.56)',
        light: 'rgba(255, 218, 150, 0.28)'
      },
      stone_path: {
        bridge: 'rgba(148, 163, 184, 0.48)',
        edge: 'rgba(71, 85, 105, 0.45)',
        light: 'rgba(248, 250, 252, 0.3)'
      }
    }[tileId];

    const bridges: JSX.Element[] = [];
    const edges: JSX.Element[] = [];

    if (sameNorth) {
      bridges.push(
        <Line key="bridge-n" points={[-19, -9, 0, -18, 19, -9, 0, 0]} x={pos.x} y={pos.y} closed fill={palette.bridge} listening={false} />
      );
    } else {
      edges.push(<Line key="edge-n" points={[-31, -1, 0, -16, 31, -1]} x={pos.x} y={pos.y - 1} stroke={palette.edge} strokeWidth={2.4} lineCap="round" />);
      edges.push(<Line key="edge-n-light" points={[-24, -3, 0, -14, 24, -3]} x={pos.x} y={pos.y - 1} stroke={palette.light} strokeWidth={1.4} lineCap="round" />);
    }

    if (sameSouth) {
      bridges.push(
        <Line key="bridge-s" points={[-19, 9, 0, 18, 19, 9, 0, 0]} x={pos.x} y={pos.y} closed fill={palette.bridge} listening={false} />
      );
    } else {
      edges.push(<Line key="edge-s" points={[-31, 1, 0, 16, 31, 1]} x={pos.x} y={pos.y + 1} stroke={palette.edge} strokeWidth={2.4} lineCap="round" />);
    }

    if (sameWest) {
      bridges.push(
        <Line key="bridge-w" points={[-32, 0, -16, -8, 0, 0, -16, 8]} x={pos.x} y={pos.y} closed fill={palette.bridge} listening={false} />
      );
    } else {
      edges.push(<Line key="edge-w" points={[-31, -1, 0, -16]} x={pos.x} y={pos.y} stroke={palette.edge} strokeWidth={2.2} lineCap="round" />);
      edges.push(<Line key="edge-w-bottom" points={[-31, 1, 0, 16]} x={pos.x} y={pos.y} stroke={palette.edge} strokeWidth={2.2} lineCap="round" />);
    }

    if (sameEast) {
      bridges.push(
        <Line key="bridge-e" points={[32, 0, 16, -8, 0, 0, 16, 8]} x={pos.x} y={pos.y} closed fill={palette.bridge} listening={false} />
      );
    } else {
      edges.push(<Line key="edge-e" points={[31, -1, 0, -16]} x={pos.x} y={pos.y} stroke={palette.edge} strokeWidth={2.2} lineCap="round" />);
      edges.push(<Line key="edge-e-bottom" points={[31, 1, 0, 16]} x={pos.x} y={pos.y} stroke={palette.edge} strokeWidth={2.2} lineCap="round" />);
    }

    return (
      <Group listening={false}>
        {bridges}
        {edges}
      </Group>
    );
  }, [getTileAt, tileCanBlend]);

  const renderTileDetails = useCallback((tileId: TileType, gridX: number, gridY: number, pos: { x: number; y: number }) => {
    const variant = Math.floor(tileNoise(gridX, gridY, 1) * 4);
    const fleckA = tileNoise(gridX, gridY, 2);
    const fleckB = tileNoise(gridX, gridY, 3);
    const fleckC = tileNoise(gridX, gridY, 4);

    if (tileId === 'fence_h' || tileId === 'fence_v' || tileId === 'fence_corner') {
      return null;
    }

    if (tileId === 'stone_path') {
      const offset = variant % 2 === 0 ? -5 : 5;
      return (
        <Group listening={false}>
          <Line
            points={[-22, -3, -8 + offset, -10, 12 + offset, -6, 24, 2, 8 - offset, 9, -12 - offset, 6]}
            x={pos.x}
            y={pos.y}
            closed
            fill="rgba(226, 232, 240, 0.18)"
            stroke="rgba(71, 85, 105, 0.38)"
            strokeWidth={1}
          />
          <Line points={[-8, -7, -2, -1, 8, -3]} x={pos.x} y={pos.y} stroke="rgba(51,65,85,0.28)" strokeWidth={1} />
          <Circle x={pos.x - 12 + fleckA * 18} y={pos.y - 2 + fleckB * 8} radius={1.4} fill="rgba(255,255,255,0.45)" />
        </Group>
      );
    }

    if (tileId === 'raised_bed') {
      return (
        <Group listening={false}>
          <Line points={[-27, -2, 0, 12, 27, -2]} x={pos.x} y={pos.y + 4} stroke="rgba(78, 45, 20, 0.55)" strokeWidth={3} />
          <Line points={[-21, -6, 0, 4, 21, -6]} x={pos.x} y={pos.y} stroke="rgba(173, 104, 46, 0.55)" strokeWidth={2} />
          <Line points={[-10 + variant * 3, -11, 8 + variant * 2, -2]} x={pos.x} y={pos.y} stroke="rgba(255, 230, 170, 0.28)" strokeWidth={1.5} />
        </Group>
      );
    }

    if (tileId === 'wet_soil') {
      return (
        <Group listening={false}>
          <Line points={[-20, -4, -8, -9, 8, -7, 20, -1]} x={pos.x} y={pos.y} stroke="rgba(120, 180, 210, 0.34)" strokeWidth={2} lineCap="round" />
          <Circle x={pos.x - 14 + fleckA * 28} y={pos.y - 5 + fleckB * 10} radius={1.8} fill="rgba(168, 220, 232, 0.45)" />
          <Circle x={pos.x - 10 + fleckC * 24} y={pos.y + 2 + fleckA * 8} radius={1.2} fill="rgba(230, 250, 255, 0.4)" />
          <Line points={[-26, 1, 0, 14, 26, 1]} x={pos.x} y={pos.y} stroke="rgba(38, 76, 64, 0.24)" strokeWidth={1.5} />
        </Group>
      );
    }

    return (
      <Group listening={false}>
        <Line points={[-23, -6, -7, -12, 13, -8, 24, -2]} x={pos.x} y={pos.y} stroke="rgba(87, 48, 28, 0.42)" strokeWidth={2} lineCap="round" />
        <Line points={[-22, 3, -8, 8, 12, 6, 23, 0]} x={pos.x} y={pos.y} stroke="rgba(48, 30, 20, 0.24)" strokeWidth={1.5} lineCap="round" />
        <Circle x={pos.x - 16 + fleckA * 30} y={pos.y - 6 + fleckB * 12} radius={1.4} fill="rgba(225, 170, 95, 0.42)" />
        <Circle x={pos.x - 12 + fleckC * 26} y={pos.y + fleckA * 10} radius={1.1} fill="rgba(70, 42, 24, 0.35)" />
      </Group>
    );
  }, [tileNoise]);

  const renderTileStatusOverlay = useCallback((gridX: number, gridY: number, pos: { x: number; y: number }, points: number[]) => {
    const key = `${gridX},${gridY}`;
    const status = tileStatusByKey.get(key);
    const hasOccupant = Boolean(occupancyIndex[key]);

    if (!status && hasOccupant) return null;

    if (!status) {
      return (
        <Group listening={false}>
          <Circle
            x={pos.x}
            y={pos.y + 2}
            radius={1.6}
            fill="rgba(220, 252, 231, 0.34)"
            stroke="rgba(34, 197, 94, 0.18)"
            strokeWidth={0.8}
          />
        </Group>
      );
    }

    if (status === 'cleanup') {
      return (
        <Group listening={false}>
          <Line
            points={points}
            x={pos.x}
            y={pos.y}
            closed
            stroke="rgba(245, 158, 11, 0.72)"
            strokeWidth={2}
            dash={[5, 4]}
            opacity={0.78}
          />
          <Line points={[-14, -2, 7, 8]} x={pos.x} y={pos.y} stroke="rgba(146, 64, 14, 0.75)" strokeWidth={2.2} lineCap="round" />
          <Line points={[-7, -6, 14, 4]} x={pos.x} y={pos.y} stroke="rgba(251, 191, 36, 0.6)" strokeWidth={1.6} lineCap="round" />
        </Group>
      );
    }

    if (status === 'water' || status === 'drainage') {
      const color = status === 'water' ? '#38bdf8' : '#22d3ee';
      return (
        <Group listening={false}>
          <Line
            points={points}
            x={pos.x}
            y={pos.y}
            closed
            stroke={color}
            strokeWidth={2}
            dash={[4, 4]}
            opacity={0.55}
            shadowColor={color}
            shadowBlur={6}
          />
          <Text
            x={pos.x - 5}
            y={pos.y - 13}
            width={10}
            align="center"
            text={status === 'water' ? '~' : 'D'}
            fontSize={10}
            fontStyle="bold"
            fill="#e0f2fe"
            stroke="#075985"
            strokeWidth={0.8}
          />
        </Group>
      );
    }

    return (
      <Group listening={false}>
        <Line
          points={points}
          x={pos.x}
          y={pos.y}
          closed
          stroke="rgba(245, 158, 11, 0.55)"
          strokeWidth={1.6}
          dash={[3, 4]}
          opacity={0.52}
        />
      </Group>
    );
  }, [occupancyIndex, tileStatusByKey]);

  const renderGrid = () => {
    const cells: JSX.Element[] = [];

    for (let y = 0; y < effectiveGridHeight; y++) {
      for (let x = 0; x < effectiveGridWidth; x++) {
        const pos = gridToCanvas(x, y);
        const points = getDiamondPoints(x, y);
        const effectiveTile = getTileAt(x, y);
        const tileImg = getTileImage(effectiveTile);
        const tileConfig = tiles.find(t => t.id === effectiveTile) || tiles[0];

        // 围栏朝向变换
        let fenceScaleX = 1;
        let fenceOffsetX = 0;
        if (effectiveTile === 'fence_v') {
          fenceScaleX = -1;
          fenceOffsetX = TILE_SIZE;
        }

        cells.push(
          <Group key={`cell-${x}-${y}`}>
            {tileImg ? (
              <>
                <KonvaImage
                  image={tileImg}
                  crop={TILE_CROP}
                  x={pos.x - TILE_SIZE / 2 + fenceOffsetX}
                  y={pos.y - TILE_SIZE / 4}
                  width={TILE_SIZE}
                  height={TILE_SIZE / 2}
                  scaleX={fenceScaleX}
                  listening={false}
                />
                {renderTileBlend(effectiveTile, x, y, pos)}
                {renderTileDetails(effectiveTile, x, y, pos)}
                {renderTileStatusOverlay(x, y, pos, points)}
              </>
            ) : (
              <>
                <Line
                  points={points}
                  x={pos.x}
                  y={pos.y}
                  closed
                  fill={tileConfig.bgColor}
                  stroke="#5a3825"
                  strokeWidth={0.5}
                />
                <Line
                  points={[points[0], points[1], points[2], points[3]]}
                  x={pos.x}
                  y={pos.y}
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth={0.5}
                />
                {renderTileBlend(effectiveTile, x, y, pos)}
                {renderTileDetails(effectiveTile, x, y, pos)}
                {renderTileStatusOverlay(x, y, pos, points)}
              </>
            )}
          </Group>
        );
      }
    }

    return cells;
  };

  const renderGrowthStageGround = useCallback((visualState: PlantVisualState, pulse: number = 0) => {
    const tone = getGrowthVisualTone(visualState.stage);

    return (
      <>
        <Line points={[-22, 5, 0, 15, 22, 5, 0, -6]} closed fill={tone.shadow} />
        <Line points={[-13, -2, 0, 5, 13, -2, 0, -8]} closed fill={tone.soilGlow} />
        {visualState.stage === 'seed' && (
          <Circle x={0} y={-6} radius={4 + pulse * 1.4} fill="#8b5e34" stroke="#5a3825" strokeWidth={1.5} />
        )}
        {visualState.harvestReady && (
          <>
            <Circle
              x={0}
              y={-20}
              radius={24 + pulse * 5}
              fill="rgba(250, 204, 21, 0.13)"
              stroke="rgba(250, 204, 21, 0.44)"
              strokeWidth={2}
            />
            <Circle
              x={0}
              y={-20}
              radius={13 + pulse * 2.5}
              fill="rgba(255, 247, 168, 0.12)"
              stroke="rgba(255, 247, 168, 0.36)"
              strokeWidth={1}
            />
          </>
        )}
      </>
    );
  }, []);

  const renderGrowthStageOverlay = useCallback((plant: any, visualState: PlantVisualState, pulse: number = 0) => {
    const leaf = plant.styling?.border_color || '#3f6212';
    const bloom = plant.category === 'flower' ? plant.styling?.bg_color || '#f472b6' : '#facc15';

    if (visualState.stage === 'seed') {
      return (
        <>
          <Line points={[0, -8, -3, -15, 0, -19, 3, -15, 0, -8]} stroke="#2f9e44" strokeWidth={2.4} lineCap="round" />
          <Circle x={0} y={-8} radius={2.8 + pulse} fill="#84cc16" stroke="#3f6212" strokeWidth={1} />
        </>
      );
    }

    if (visualState.stage === 'seedling') {
      return (
        <>
          <Line points={[0, -8, 0, -25]} stroke={leaf} strokeWidth={2.8} lineCap="round" />
          <Circle x={-7} y={-21} radius={7} scaleY={0.55} rotation={-24} fill="#65a30d" stroke="#3f6212" strokeWidth={1.5} />
          <Circle x={7} y={-21} radius={7} scaleY={0.55} rotation={24} fill="#84cc16" stroke="#3f6212" strokeWidth={1.5} />
          <Circle x={-3} y={-23} radius={1.8} fill="rgba(255,255,255,0.42)" />
        </>
      );
    }

    if (visualState.stage === 'mature') {
      return (
        <>
          <Circle x={-11} y={-34} radius={3.2 + pulse} fill={bloom} stroke="#854d0e" strokeWidth={1} opacity={0.86} />
          <Circle x={12} y={-29} radius={2.8 + pulse * 0.7} fill="#fff7a8" stroke="#a16207" strokeWidth={1} opacity={0.82} />
        </>
      );
    }

    if (visualState.stage === 'harvest') {
      return (
        <>
          <Text
            x={-16}
            y={-60 - pulse * 2}
            width={32}
            align="center"
            text="READY"
            fontSize={7}
            fontStyle="bold"
            fill="#fff7a8"
            stroke="#78350f"
            strokeWidth={0.7}
          />
          <Circle x={11} y={-36} radius={3.4 + pulse} fill="#fff7a8" stroke="#a16207" strokeWidth={1} />
        </>
      );
    }

    return null;
  }, []);

  const renderProceduralPlantSprite = useCallback((plant: any, x: number, y: number, opacity: number = 1, visualState: PlantVisualState = defaultPlantVisualState, pulse: number = 0) => {
    const primary = plant.styling?.bg_color || '#65a30d';
    const dark = plant.styling?.border_color || '#3f6212';
    const leaf = '#2f9e44';
    const rootTone = plant.agronomy?.rotationGroup === 'root';
    const common = { stroke: dark, strokeWidth: 2 };
    const highlight = 'rgba(255, 248, 210, 0.46)';
    const shade = 'rgba(45, 25, 12, 0.18)';

    const sprite = (() => {
      switch (plant.id) {
        case 'tomato':
          return (
            <>
              <Circle x={-5} y={-19} radius={9} fill="#dc2626" {...common} />
              <Circle x={6} y={-17} radius={7} fill="#ef4444" {...common} />
              <Circle x={-8} y={-22} radius={2.5} fill={highlight} />
              <Circle x={3} y={-20} radius={2} fill={highlight} />
              <Circle x={1} y={-14} radius={7} fill={shade} />
              <Line points={[-4, -27, 0, -34, 4, -27, 0, -31, 0, -27]} stroke={leaf} strokeWidth={3} lineCap="round" />
            </>
          );
        case 'carrot':
          return (
            <>
              <Line points={[-6, -26, 9, -22, 0, 5]} closed fill="#ea580c" {...common} />
              <Line points={[-1, -21, 5, -20, 1, -15, 4, -13, 0, -8]} stroke={highlight} strokeWidth={1.6} lineCap="round" />
              <Line points={[6, -21, 0, 4]} stroke={shade} strokeWidth={2.4} lineCap="round" />
              <Line points={[-5, -27, -12, -36, -2, -28, 0, -38, 2, -28, 12, -35]} stroke={leaf} strokeWidth={3} lineCap="round" />
            </>
          );
        case 'corn':
          return (
            <>
              <Rect x={-6} y={-35} width={12} height={28} cornerRadius={5} fill="#fbbf24" {...common} />
              <Rect x={-4} y={-32} width={4} height={20} cornerRadius={2} fill="rgba(255, 248, 200, 0.48)" />
              <Line points={[3, -32, 4, -11]} stroke="rgba(120,72,24,0.22)" strokeWidth={2} />
              <Line points={[-6, -12, -20, -24, -7, -23]} closed fill="#65a30d" stroke="#3f6212" strokeWidth={2} />
              <Line points={[6, -12, 20, -25, 7, -23]} closed fill="#65a30d" stroke="#3f6212" strokeWidth={2} />
              <Line points={[-2, -30, 3, -30, -4, -24, 5, -24, -4, -18, 5, -18]} stroke="#fff7a8" strokeWidth={1.5} />
            </>
          );
        case 'pumpkin':
          return (
            <>
              <Circle x={0} y={-16} radius={13} scaleY={0.72} fill="#ea580c" {...common} />
              <Circle x={-5} y={-19} radius={3} scaleY={0.7} fill={highlight} />
              <Circle x={5} y={-13} radius={5} scaleY={0.55} fill={shade} />
              <Line points={[0, -27, -4, -16, 0, -6, 4, -16, 0, -27]} stroke="#c2410c" strokeWidth={2} fill="none" />
              <Line points={[0, -29, 3, -38]} stroke="#3f6212" strokeWidth={3} lineCap="round" />
            </>
          );
        case 'sunflower':
          return (
            <>
              <Line points={[0, -8, 0, -34]} stroke="#3f6212" strokeWidth={3} lineCap="round" />
              {Array.from({ length: 8 }).map((_, index) => {
                const angle = (Math.PI * 2 * index) / 8;
                return (
                  <Circle
                    key={index}
                    x={Math.cos(angle) * 10}
                    y={-34 + Math.sin(angle) * 10}
                    radius={5}
                    fill="#facc15"
                    stroke="#eab308"
                    strokeWidth={1}
                  />
                );
              })}
              <Circle x={0} y={-34} radius={6} fill="#854d0e" stroke="#5d3519" strokeWidth={1.5} />
              <Circle x={-2} y={-36} radius={1.5} fill="rgba(255,255,255,0.38)" />
            </>
          );
        case 'melon':
          return (
            <>
              <Circle x={0} y={-16} radius={14} scaleY={0.62} fill="#22c55e" {...common} />
              <Circle x={-5} y={-19} radius={3} scaleY={0.6} fill={highlight} />
              <Circle x={6} y={-14} radius={5} scaleY={0.45} fill={shade} />
              <Line points={[-13, -16, -4, -22, 4, -22, 13, -16, 4, -10, -4, -10, -13, -16]} stroke="#166534" strokeWidth={2} fill="none" />
            </>
          );
        case 'strawberry':
          return (
            <>
              <Line points={[0, -5, -10, -18, -6, -29, 6, -29, 10, -18]} closed fill="#f43f5e" {...common} />
              <Circle x={-3} y={-24} radius={2.2} fill={highlight} />
              <Line points={[4, -27, 8, -18, 0, -6]} stroke={shade} strokeWidth={2} />
              <Line points={[-4, -29, 0, -36, 4, -29]} stroke={leaf} strokeWidth={3} lineCap="round" />
              <Circle x={-3} y={-20} radius={1.4} fill="#fff7a8" />
              <Circle x={4} y={-16} radius={1.4} fill="#fff7a8" />
            </>
          );
        default:
          if (plant.category === 'flower') {
            return (
              <>
                <Line points={[0, -8, 0, -29]} stroke="#3f6212" strokeWidth={3} lineCap="round" />
                <Circle x={-7} y={-30} radius={6} fill={primary} {...common} />
                <Circle x={7} y={-30} radius={6} fill={primary} {...common} />
                <Circle x={0} y={-37} radius={6} fill={primary} {...common} />
                <Circle x={0} y={-30} radius={4} fill="#fff7a8" stroke={dark} strokeWidth={1} />
                <Circle x={-2} y={-33} radius={1.4} fill={highlight} />
              </>
            );
          }

          if (plant.category === 'herb') {
            return (
              <>
                <Line points={[0, -7, 0, -36]} stroke="#166534" strokeWidth={3} lineCap="round" />
                <Circle x={-7} y={-27} radius={6} scaleY={0.55} rotation={-25} fill={primary} stroke={dark} strokeWidth={1.5} />
                <Circle x={8} y={-22} radius={6} scaleY={0.55} rotation={25} fill={primary} stroke={dark} strokeWidth={1.5} />
                <Circle x={-6} y={-15} radius={6} scaleY={0.55} rotation={-20} fill={primary} stroke={dark} strokeWidth={1.5} />
                <Line points={[-8, -28, -4, -28, 6, -23, 10, -23]} stroke={highlight} strokeWidth={1.2} lineCap="round" />
              </>
            );
          }

          if (rootTone) {
            return (
              <>
                <Circle x={0} y={-18} radius={10} scaleY={1.12} fill={primary} {...common} />
                <Circle x={-4} y={-23} radius={2.4} scaleY={0.75} fill={highlight} />
                <Circle x={5} y={-14} radius={4} scaleY={0.75} fill={shade} />
                <Line points={[0, -7, -3, 0, 0, -7, 3, 0]} stroke={dark} strokeWidth={2} lineCap="round" />
                <Line points={[-4, -29, -11, -37, 0, -30, 0, -39, 4, -30, 12, -36]} stroke={leaf} strokeWidth={3} lineCap="round" />
              </>
            );
          }

          return (
            <>
              <Circle x={-5} y={-18} radius={10} scaleY={1.1} fill={primary} {...common} />
              <Circle x={7} y={-19} radius={10} scaleY={1.05} fill={primary} {...common} />
              <Circle x={-9} y={-23} radius={2.6} fill={highlight} />
              <Circle x={6} y={-14} radius={5} scaleY={0.55} fill={shade} />
              <Line points={[-11, -23, -2, -29, 11, -25]} stroke="rgba(255,255,255,0.55)" strokeWidth={2} lineCap="round" />
            </>
          );
      }
    })();

    return (
      <Group x={x} y={y} opacity={opacity} listening={false}>
        {renderGrowthStageGround(visualState, pulse)}
        <Group scaleX={visualState.visualScale} scaleY={visualState.visualScale}>
          {visualState.stage === 'seed' || visualState.stage === 'seedling' ? renderGrowthStageOverlay(plant, visualState, pulse) : sprite}
          {visualState.stage !== 'seed' && visualState.stage !== 'seedling' && renderGrowthStageOverlay(plant, visualState, pulse)}
        </Group>
      </Group>
    );
  }, [renderGrowthStageGround, renderGrowthStageOverlay]);

  const renderPlantSprite = useCallback((plant: any, x: number, y: number, opacity: number = 1, visualState: PlantVisualState = defaultPlantVisualState, pulse: number = 0) => {
    const spriteUrl = plant.sprite;
    const img = spriteUrl ? getImage(spriteUrl) : null;
    const preferProceduralSprite = true;

    if (!img || preferProceduralSprite) {
      return renderProceduralPlantSprite(plant, x, y, opacity, visualState, pulse);
    }

    const scale = TILE_SIZE / Math.max(img.width, img.height) * 0.9;
    const width = img.width * scale;
    const height = img.height * scale;

    return (
      <Group listening={false}>
        <Group x={x} y={y}>{renderGrowthStageGround(visualState, pulse)}</Group>
        <KonvaImage
          image={img}
          x={x - (width * visualState.visualScale) / 2}
          y={y - (height * visualState.visualScale) * 0.5}
          width={width * visualState.visualScale}
          height={height * visualState.visualScale}
          opacity={opacity}
          listening={false}
          shadowColor="rgba(36, 45, 24, 0.24)"
          shadowBlur={4}
          shadowOffset={{ x: 0, y: 2 }}
        />
        <Group x={x} y={y}>{renderGrowthStageOverlay(plant, visualState, pulse)}</Group>
      </Group>
    );
  }, [getImage, renderGrowthStageGround, renderGrowthStageOverlay, renderProceduralPlantSprite]);

  const renderPlants = useMemo(() => {
    const sortedEntries = Object.values(entities)
      .filter((entity): entity is Extract<GardenEntity, { type: 'plant' }> => entity.type === 'plant')
      .map((entity) => ({
        key: entity.id,
        entity,
        depth: entity.originX + entity.originY
      }))
      .sort((a, b) => a.depth - b.depth);

    // 构建占用格集合，用于判断文字是否被前排植物遮挡
    const occupiedCells = new Set(Object.keys(occupancyIndex));

    // 判断文字标签是否被前排植物遮挡（正前下方两格有植物则隐藏）
    const isTextOccluded = (ox: number, oy: number) => {
      return occupiedCells.has(`${ox + 1},${oy}`) || occupiedCells.has(`${ox},${oy + 1}`);
    };

    return sortedEntries.map(({ key, entity }) => {
      const { plant, originX, originY } = entity;
      const pos = gridToCanvas(originX, originY);
      const points = getDiamondPoints(originX, originY);
      const showText = !isTextOccluded(originX, originY);
      const isSelected = selectedEntityId === entity.id;
      const isTaskHovered = hoveredTaskEntityId === entity.id;
      const weatherTask = weatherTaskByEntityId.get(entity.id);
      const visibleWeatherTask = weatherTask && !entity.completedTaskIds?.includes(weatherTask.task.id) ? weatherTask : null;
      const selectedPulse = isSelected ? 0.5 + Math.sin(animationTick / 210) * 0.5 : 0;
      const taskPulse = isTaskHovered ? 0.5 + Math.sin(animationTick / 150) * 0.5 : 0;
      const weatherPulse = weatherTask ? 0.5 + Math.sin(animationTick / 260) * 0.5 : 0;
      const growthStatus = getPlantGrowthStatus(entity, growthPreviewNowMs);
      const growthPulse = 0.5 + Math.sin(animationTick / 240 + originX * 0.7 + originY * 0.5) * 0.5;
      const plantVisualState: PlantVisualState = {
        stage: growthStatus.stage,
        stageLabel: growthStatus.stageLabel,
        progressPercent: growthStatus.progressPercent,
        visualScale: growthStatus.visualScale,
        harvestReady: growthStatus.harvestReady
      };
      const harvestBob = growthStatus.harvestReady ? growthPulse * 3 : 0;

      return (
        <Group
          key={key}
          x={pos.x}
          y={pos.y - selectedPulse * 3}
          rotation={entity.rotation}
          draggable
          onClick={(event) => {
            event.cancelBubble = true;
            selectEntity(entity.id);
          }}
          onTap={(event) => {
            event.cancelBubble = true;
            selectEntity(entity.id);
          }}
          onMouseEnter={() => setStageCursor(isEntityDragging ? 'grabbing' : 'grab')}
          onMouseLeave={() => setStageCursor(activeToolId ? 'copy' : activeTileId ? 'cell' : isPanning ? 'grabbing' : 'grab')}
          onDragStart={() => handleEntityDragStart(entity.id)}
          onDragEnd={(event) => handleEntityDragEnd(entity.id, event.target.x(), event.target.y())}
        >
          <Line
            points={points}
            closed
            fill="rgba(255,255,255,0.01)"
            stroke={isSelected ? '#2563eb' : 'rgba(255,255,255,0)'}
            strokeWidth={isSelected ? 3 : 0}
            dash={isSelected ? [5, 3] : undefined}
            shadowColor={isSelected ? '#60a5fa' : undefined}
            shadowBlur={isSelected ? 10 + selectedPulse * 10 : 0}
          />
          {isSelected && (
            <Line
              points={points}
              closed
              scaleX={1.14 + selectedPulse * 0.08}
              scaleY={1.14 + selectedPulse * 0.08}
              stroke="#facc15"
              strokeWidth={2}
              opacity={0.52 + selectedPulse * 0.28}
              dash={[3, 4]}
              listening={false}
            />
          )}
          {isTaskHovered && !isSelected && (
            <Line
              points={points}
              closed
              scaleX={1.18 + taskPulse * 0.12}
              scaleY={1.18 + taskPulse * 0.12}
              stroke="#22d3ee"
              strokeWidth={2.5}
              opacity={0.55 + taskPulse * 0.35}
              dash={[6, 4]}
              shadowColor="#67e8f9"
              shadowBlur={12 + taskPulse * 12}
              listening={false}
            />
          )}
          {visibleWeatherTask && (
            <>
              <Line
                points={points}
                closed
                scaleX={1.04 + weatherPulse * 0.03}
                scaleY={1.04 + weatherPulse * 0.03}
                stroke={weatherTaskStroke(visibleWeatherTask.task.id)}
                strokeWidth={1.4}
                opacity={0.18 + weatherPulse * 0.12}
                dash={[4, 5]}
                shadowColor={weatherTaskStroke(visibleWeatherTask.task.id)}
                shadowBlur={3 + weatherPulse * 4}
                listening={false}
              />
              <Group x={18} y={-34 - weatherPulse} listening={false}>
                <Circle
                  radius={7}
                  fill={weatherTaskFill(visibleWeatherTask.task.id)}
                  stroke={weatherTaskStroke(visibleWeatherTask.task.id)}
                  strokeWidth={1.3}
                  opacity={0.86}
                  shadowColor="rgba(43,31,16,0.16)"
                  shadowBlur={2}
                  shadowOffset={{ x: 0, y: 1 }}
                />
                <Text
                  x={-5}
                  y={-5}
                  width={10}
                  align="center"
                  text={weatherTaskIcon(visibleWeatherTask.task.id)}
                  fontSize={8}
                  fontStyle="bold"
                  fill="#fff"
                />
              </Group>
            </>
          )}
          {renderPlantSprite(plant, 0, -harvestBob, 1, plantVisualState, growthPulse)}
          <Group x={0} y={2} listening={false}>
            <Line
              points={[-16, 6, 0, 13, 16, 6, 0, 0]}
              closed
              stroke={growthStageBadgeStroke(growthStatus.stage)}
              strokeWidth={1.4}
              opacity={0.42}
            />
            <Line
              points={[-12, 6, 0, 11, 12, 6, 0, 1]}
              closed
              stroke={growthStageProgressFill(growthStatus.stage)}
              strokeWidth={2}
              opacity={Math.min(0.84, 0.28 + growthStatus.progressPercent / 170)}
            />
          </Group>
          {(isSelected || isTaskHovered || growthStatus.harvestReady) && (
            <Group x={-22} y={-50 - harvestBob} listening={false}>
              <Rect
                x={0}
                y={0}
                width={44}
                height={13}
                cornerRadius={5}
                fill={growthStageBadgeFill(growthStatus.stage)}
                stroke={growthStageBadgeStroke(growthStatus.stage)}
                strokeWidth={1.1}
                opacity={growthStatus.harvestReady ? 0.96 : 0.88}
                shadowColor="rgba(43,31,16,0.18)"
                shadowBlur={3}
                shadowOffset={{ x: 0, y: 1 }}
              />
              <Text
                x={2}
                y={2}
                width={40}
                align="center"
                text={growthStatus.harvestReady ? '可采收' : growthStatus.stageLabel}
                fontSize={8}
                fontStyle="bold"
                fill="#fff8df"
                stroke="rgba(44,29,14,0.45)"
                strokeWidth={0.6}
              />
            </Group>
          )}
          {showText && (
            <Text
              x={-20}
              y={TILE_SIZE / 4}
              text={plant.naming.zh}
              fontSize={9}
              fill="#fff"
              stroke="#333"
              strokeWidth={0.3}
              listening={false}
            />
          )}
        </Group>
      );
    });
  }, [
    entities,
    occupancyIndex,
    gridToCanvas,
    getDiamondPoints,
    selectedEntityId,
    hoveredTaskEntityId,
    weatherTaskByEntityId,
    growthPreviewNowMs,
    animationTick,
    renderPlantSprite,
    selectEntity,
    handleEntityDragStart,
    handleEntityDragEnd
  ]);

  const renderPlacementHeatmap = useMemo(() => {
    if (!activePlant || !showHeatmap || placementHeatmapCells.length === 0) return null;

    const cells = placementHeatmapCells.map(({ x, y, result }) => {
        const pos = gridToCanvas(x, y);
        const layerScore = getLayerScore(result, heatmapLayer, activePlant, planSeason, climateProfile);
        const tone = heatmapLayer === 'overall' ? placementHeatTone(result) : heatLayerTone(layerScore);
        return (
          <Group key={`heat-${x}-${y}`} listening={false}>
            <Line
              points={getDiamondPoints(x, y)}
              x={pos.x}
              y={pos.y}
              closed
              fill={tone.fill}
              stroke={tone.stroke}
              strokeWidth={0.8}
              opacity={tone.opacity}
            />
            {layerScore >= 82 && (
              <Text
                x={pos.x - 13}
                y={pos.y - 6}
                width={26}
                align="center"
                text={String(layerScore)}
                fontSize={8}
                fontStyle="bold"
                fill="#fff"
                opacity={0.86}
              />
            )}
          </Group>
        );
      });

    return <Group listening={false}>{cells}</Group>;
  }, [activePlant, showHeatmap, placementHeatmapCells, heatmapLayer, planSeason, climateProfile, getDiamondPoints, gridToCanvas]);

  const renderHoverPreview = useMemo(() => {
    if (!hoveredCell) return null;

    const { x, y } = hoveredCell;
    const pos = gridToCanvas(x, y);
    const points = getDiamondPoints(x, y);
    const pulse = 0.5 + Math.sin(animationTick / 190) * 0.5;
    const slowPulse = 0.5 + Math.sin(animationTick / 310) * 0.5;

    // 地块绘制模式预览
    if (activeTileId) {
      const tileImg = getTileImage(activeTileId);
      let fenceScaleX = 1;
      let fenceOffsetX = 0;
      if (activeTileId === 'fence_v') {
        fenceScaleX = -1;
        fenceOffsetX = TILE_SIZE;
      }
      return (
        <Group listening={false}>
          {tileImg && (
            <KonvaImage
              image={tileImg}
              crop={TILE_CROP}
              x={pos.x - TILE_SIZE / 2 + fenceOffsetX}
              y={pos.y - TILE_SIZE / 4}
              width={TILE_SIZE}
              height={TILE_SIZE / 2}
              scaleX={fenceScaleX}
              opacity={0.7}
              listening={false}
            />
          )}
          <Line
            points={points}
            x={pos.x}
            y={pos.y}
            closed
            stroke="#22c55e"
            strokeWidth={2 + pulse}
            dash={[4, 2]}
            opacity={0.7 + pulse * 0.25}
            shadowColor="#22c55e"
            shadowBlur={6 + pulse * 10}
            listening={false}
          />
        </Group>
      );
    }

    // 植物模式预览
    const existingPlant = getEntityAt(x, y);

    if (existingPlant) {
      return (
        <Group listening={false}>
          <Line
            points={points}
            x={pos.x}
            y={pos.y}
            closed
            fill="#3b82f6"
            opacity={0.25}
            stroke="#2563eb"
            strokeWidth={2}
            shadowColor="#60a5fa"
            shadowBlur={8 + pulse * 8}
          />
          <Text
            x={pos.x - 10}
            y={pos.y - 10}
            text="✓"
            fontSize={18}
            fill="#fff"
            stroke="#000"
            strokeWidth={0.5}
          />
        </Group>
      );
    }

    if (activePlant) {
      const plant = activePlant;

      const synergy = evaluatePlacement(x, y);
      let fillColor = 'rgba(100,100,100,0.3)';
      let strokeColor = '#666';
      let previewOffsetX = 0;
      const relationLines = Object.values(entities)
        .filter((entity): entity is Extract<GardenEntity, { type: 'plant' }> => entity.type === 'plant')
        .map((entity) => {
          const rule = getCompanionRule(plant.id, entity.plantId);
          if (!rule) return null;

          const distance = Math.abs(entity.originX - x) + Math.abs(entity.originY - y);
          if (distance > 3) return null;

          const target = gridToCanvas(entity.originX, entity.originY);
          const color = rule.effect === 'enemy' ? '#ef4444' : '#22c55e';
          const orbX = pos.x + (target.x - pos.x) * (0.25 + slowPulse * 0.5);
          const orbY = pos.y - 8 + (target.y - pos.y) * (0.25 + slowPulse * 0.5);
          return (
            <Group key={`relation-${entity.id}`} listening={false}>
              <Line
                points={[pos.x, pos.y - 8, target.x, target.y - 8]}
                stroke={color}
                strokeWidth={3 + pulse}
                opacity={0.58 + pulse * 0.25}
                dash={rule.effect === 'enemy' ? [7, 5] : undefined}
                shadowColor={color}
                shadowBlur={10 + pulse * 8}
              />
              <Circle x={orbX} y={orbY} radius={3 + pulse * 2} fill="#fff8dc" stroke={color} strokeWidth={1.5} opacity={0.86} />
              <Circle x={target.x} y={target.y - 8} radius={4} fill={color} stroke="#fff8dc" strokeWidth={1.5} />
            </Group>
          );
        });

      if (synergy?.status === 'bad') {
        fillColor = '#ef4444';
        strokeColor = '#dc2626';
        previewOffsetX = Math.sin(animationTick / 42) * 3;
      } else if (synergy?.status === 'good') {
        fillColor = '#22c55e';
        strokeColor = '#16a34a';
      }

      return (
        <Group listening={false}>
          {relationLines}
          {synergy?.status !== 'neutral' && (
            <Line
              points={points}
              x={pos.x + previewOffsetX}
              y={pos.y}
              scaleX={1.12 + pulse * 0.12}
              scaleY={1.12 + pulse * 0.12}
              closed
              stroke={strokeColor}
              strokeWidth={3}
              opacity={0.28}
              shadowColor={strokeColor}
              shadowBlur={18}
            />
          )}
          <Line
            points={points}
            x={pos.x + previewOffsetX}
            y={pos.y}
            closed
            fill={fillColor}
            opacity={0.48 + pulse * 0.18}
            stroke={strokeColor}
            strokeWidth={2 + pulse}
            dash={[4, 2]}
            shadowColor={strokeColor}
            shadowBlur={synergy?.status === 'neutral' ? 0 : 12}
          />
          {typeof synergy?.score === 'number' && (
            <Group x={pos.x + previewOffsetX + 30} y={pos.y - 48 - pulse * 4} listening={false}>
              <Rect
                x={-30}
                y={-13}
                width={60}
                height={26}
                cornerRadius={6}
                fill={placementScoreFill(synergy)}
                stroke={placementScoreStroke(synergy)}
                strokeWidth={2}
                shadowColor="rgba(43,31,16,0.26)"
                shadowBlur={6}
                shadowOffset={{ x: 0, y: 2 }}
              />
              <Text
                x={-28}
                y={-10}
                width={56}
                align="center"
                text={`${synergy.score} ${placementScoreLabel(synergy)}`}
                fontSize={10}
                fontStyle="bold"
                fill="#fff"
              />
            </Group>
          )}
          {renderPlantSprite(plant, pos.x + previewOffsetX, pos.y - pulse * 4, 0.72, defaultPlantVisualState, pulse)}
        </Group>
      );
    }

    return null;
  }, [hoveredCell, getEntityAt, activePlant, activeTileId, entities, animationTick, gridToCanvas, getDiamondPoints, getTileImage, evaluatePlacement, renderPlantSprite]);

  const renderActionFeedback = useMemo(() => {
    if (!actionFeedback) return null;
    const pos = gridToCanvas(actionFeedback.x, actionFeedback.y);
    const points = getDiamondPoints(actionFeedback.x, actionFeedback.y);
    const color = actionFeedback.status === 'blocked' ? '#ef4444' : actionFeedback.status === 'moved' ? '#3b82f6' : '#22c55e';
    const fill = actionFeedback.status === 'blocked' ? 'rgba(239,68,68,0.22)' : 'rgba(255,248,220,0.38)';
    const pulse = 0.5 + Math.sin(animationTick / 120) * 0.5;
    const lift = 6 + pulse * 8;

    return (
      <Group listening={false}>
        <Line
          points={points}
          x={pos.x}
          y={pos.y}
          scaleX={1.18 + pulse * 0.18}
          scaleY={1.18 + pulse * 0.18}
          closed
          fill={fill}
          stroke={color}
          strokeWidth={3 + pulse}
          opacity={0.62 + pulse * 0.24}
          shadowColor={color}
          shadowBlur={12 + pulse * 14}
        />
        <Text
          x={pos.x - 22}
          y={pos.y - 42 - lift}
          width={44}
          align="center"
          text={actionFeedback.label}
          fontSize={13}
          fontStyle="bold"
          fill="#fff8df"
          stroke="rgba(44, 29, 14, 0.75)"
          strokeWidth={1.5}
        />
      </Group>
    );
  }, [actionFeedback, animationTick, getDiamondPoints, gridToCanvas]);

  const renderTransientEffects = useMemo(() => {
    if (effects.length === 0) return null;
    const now = animationTick || performance.now();

    return effects.map((effect) => {
      const age = Math.max(0, now - effect.createdAt);
      const progress = Math.min(1, age / 760);
      const pos = gridToCanvas(effect.x, effect.y);
      const color = effect.kind === 'blocked'
        ? '#ef4444'
        : effect.kind === 'tile'
          ? '#f59e0b'
          : effect.kind === 'move'
            ? '#3b82f6'
            : '#22c55e';
      const particleCount = effect.kind === 'blocked' ? 6 : 9;
      const particles = Array.from({ length: particleCount }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / particleCount + (effect.x + effect.y) * 0.35;
        const distance = 10 + progress * (effect.kind === 'tile' ? 22 : 30);
        const wobble = Math.sin(animationTick / 80 + index) * 2;
        const particleX = pos.x + Math.cos(angle) * (distance + wobble);
        const particleY = pos.y - 8 + Math.sin(angle) * distance * 0.45 - progress * 18;
        const radius = Math.max(1.2, 3.2 * (1 - progress));

        return (
          <Circle
            key={`${effect.id}-particle-${index}`}
            x={particleX}
            y={particleY}
            radius={radius}
            fill={index % 3 === 0 ? '#fff7c2' : color}
            stroke="rgba(64, 35, 16, 0.25)"
            strokeWidth={0.7}
            opacity={1 - progress}
          />
        );
      });

      return (
        <Group key={effect.id} listening={false}>
          <Line
            points={getDiamondPoints(effect.x, effect.y)}
            x={pos.x}
            y={pos.y}
            closed
            scaleX={0.8 + progress * 1.25}
            scaleY={0.8 + progress * 1.25}
            stroke={color}
            strokeWidth={Math.max(0.8, 4 * (1 - progress))}
            opacity={(1 - progress) * 0.72}
            shadowColor={color}
            shadowBlur={14}
          />
          {particles}
        </Group>
      );
    });
  }, [effects, animationTick, getDiamondPoints, gridToCanvas]);

  const atmosphereParticles = useMemo(() => (
    Array.from({ length: planSeason === 'winter' ? 26 : 18 }).map((_, index) => {
      const left = (index * 37 + effectiveGridWidth * 11) % 100;
      const delay = -((index * 0.73) % 8);
      const duration = 7 + (index % 5) * 1.7;
      const size = atmosphere.particle === 'snow' ? 3 + (index % 3) : atmosphere.particle === 'spark' ? 2 + (index % 2) : 5 + (index % 4);
      return { id: index, left, delay, duration, size };
    })
  ), [atmosphere.particle, effectiveGridWidth, planSeason]);

  // ==================== 渲染 ====================
  const plantCount = Object.values(entities).filter(entity => entity.type === 'plant').length;
  useEffect(() => {
    if (hasDismissedWelcome || plantCount > 0 || planName === 'Demo Scenario') return;
    setShowWelcome(true);
  }, [hasDismissedWelcome, planName, plantCount]);

  const growthPreviewSummary = useMemo(() => {
    const summary: Record<GrowthStageId, number> = {
      seed: 0,
      seedling: 0,
      growing: 0,
      mature: 0,
      harvest: 0
    };

    Object.values(entities)
      .filter((entity): entity is Extract<GardenEntity, { type: 'plant' }> => entity.type === 'plant')
      .forEach(entity => {
        summary[getPlantGrowthStatus(entity, growthPreviewNowMs).stage] += 1;
      });

    return summary;
  }, [entities, growthPreviewNowMs]);
  const growthPreviewHarvestForecast = useMemo(() => {
    const harvestMap = new Map<string, number>();

    Object.values(entities)
      .filter((entity): entity is Extract<GardenEntity, { type: 'plant' }> => entity.type === 'plant')
      .forEach(entity => {
        const status = getPlantGrowthStatus(entity, growthPreviewNowMs);
        if (status.stage !== 'harvest') return;
        const name = entity.plant.naming.zh;
        harvestMap.set(name, (harvestMap.get(name) || 0) + 1);
      });

    return Array.from(harvestMap.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3);
  }, [entities, growthPreviewNowMs]);
  const growthPreviewFirstHarvestId = useMemo(() => {
    return Object.values(entities)
      .filter((entity): entity is Extract<GardenEntity, { type: 'plant' }> => entity.type === 'plant')
      .filter(entity => getPlantGrowthStatus(entity, growthPreviewNowMs).stage === 'harvest')
      .sort((a, b) => a.originY - b.originY || a.originX - b.originX)[0]?.id || null;
  }, [entities, growthPreviewNowMs]);
  const firstCleanupTileStatus = useMemo(() => {
    const entry = Array.from(tileStatusByKey.entries())
      .filter(([, status]) => status === 'cleanup')
      .sort(([a], [b]) => {
        const [ax, ay] = a.split(',').map(Number);
        const [bx, by] = b.split(',').map(Number);
        return ay - by || ax - bx;
      })[0];
    if (!entry) return null;
    const [x, y] = entry[0].split(',').map(Number);
    return getTileStatusInfo(x, y);
  }, [getTileStatusInfo, tileStatusByKey]);
  const surfaceCount = Object.keys(surfaceIndex).length;
  const seasonalActivityCount = activityRecords.filter(record => record.year === planYear && record.season === planSeason).length;
  const seasonalHarvestCount = harvestRecords.filter(record => record.year === planYear && record.season === planSeason).length;
  const shareCardStats = useMemo<ShareCardStats>(() => {
    const activePlants = Object.values(entities).filter((entity): entity is Extract<GardenEntity, { type: 'plant' }> => entity.type === 'plant');
    const plantNames = Array.from(new Set(activePlants.map(entity => entity.plant.naming.zh))).slice(0, 4);
    const baseStats = {
      plantCount: activePlants.length,
      speciesCount: new Set(activePlants.map(entity => entity.plantId)).size,
      taskCount: currentGardenTasks.length,
      harvestCount: seasonalHarvestCount,
      activityCount: seasonalActivityCount
    };

    return {
      ...baseStats,
      score: getShareGardenScore(baseStats),
      seasonLabel: seasonLabel(planSeason),
      plantNames
    };
  }, [currentGardenTasks.length, entities, planSeason, seasonalActivityCount, seasonalHarvestCount]);
  const firstRunHasRules = completedDemoTourItems.has('companion') || completedDemoTourItems.has('conflict') || (plantCount > 0 && showHeatmap);
  const firstRunHasTaskFocus = seasonalActivityCount > 0 || completedDemoTourItems.has('task');
  const firstRunCheckSteps = useMemo<FirstRunCheckStep[]>(() => ([
    {
      id: 'demo',
      label: '打开示例菜园',
      detail: '载入含伴生、冲突、天气任务和采收窗口的示例菜园。',
      done: planName === 'Demo Scenario' || plantCount > 0
    },
    {
      id: 'rules',
      label: '看懂伴生与冲突',
      detail: '定位番茄或土豆，确认右侧能解释规则，画布能给出反馈。',
      done: firstRunHasRules
    },
    {
      id: 'task',
      label: '完成一个养护任务',
      detail: '从任务或 Score 定位作物，完成后画布角标和评分问题应消失。',
      done: firstRunHasTaskFocus
    },
    {
      id: 'harvest',
      label: '记录一次采收',
      detail: '预览到采收窗口，打开采收记录并确认收获进入本季统计。',
      done: seasonalHarvestCount > 0
    },
    {
      id: 'cleanup',
      label: '整理采收后地块',
      detail: '采收并移除后，定位待整理地块，标记整理完成。',
      done: resolvedCleanupKeys.length > 0 || selectedTileStatus?.kind === 'idle'
    },
    {
      id: 'next-season',
      label: '选择下一季作物',
      detail: '从推荐作物进入放置模式，并显示轮作安全区域。',
      done: firstRunNextSeasonSelected || (activeToolId !== null && heatmapLayer === 'rotation')
    }
  ]), [
    activeToolId,
    firstRunHasRules,
    firstRunHasTaskFocus,
    firstRunNextSeasonSelected,
    heatmapLayer,
    planName,
    plantCount,
    resolvedCleanupKeys.length,
    selectedTileStatus,
    seasonalHarvestCount
  ]);
  const firstRunDoneCount = firstRunCheckSteps.filter(step => step.done).length;
  const firstRunCurrentStep = firstRunCheckSteps.find(step => !step.done) || null;
  const firstRunComplete = firstRunDoneCount === firstRunCheckSteps.length;
  const firstRunFocus = firstRunCurrentStep ? firstRunFocusByStepId[firstRunCurrentStep.id] : null;
  const guidedPathSteps = useMemo(() => ([
    { id: 'plant', label: '种植布局', done: plantCount > 0 },
    { id: 'rules', label: '规则解释', done: plantCount > 0 && showHeatmap },
    { id: 'preview', label: '生长预览', done: growthPreviewDays > 0 },
    { id: 'tasks', label: '任务处理', done: seasonalActivityCount > 0 || currentGardenTasks.length === 0 && plantCount > 0 },
    { id: 'harvest', label: '采收记录', done: seasonalHarvestCount > 0 },
    { id: 'cleanup', label: '地块整理', done: resolvedCleanupKeys.length > 0 }
  ]), [currentGardenTasks.length, growthPreviewDays, plantCount, resolvedCleanupKeys.length, seasonalActivityCount, seasonalHarvestCount, showHeatmap]);
  const guidedPathCurrent = guidedPathSteps.find(step => !step.done) || null;
  const guidedPathComplete = !guidedPathCurrent;
  const guidedPathCopy = getGuidedPathCopy(guidedPathCurrent?.id || 'complete');
  const selectedEntity = selectedEntityId ? entities[selectedEntityId] || null : null;
  const harvestEntity = harvestDraft ? entities[harvestDraft.entityId] || null : null;
  const activityEntity = activityDraft ? entities[activityDraft.entityId] || null : null;
  const canvasCursor = isEntityDragging || isPanning
    ? 'grabbing'
    : activeToolId
      ? 'copy'
      : activeTileId
        ? 'cell'
        : 'grab';
  const resetFirstRunExperience = useCallback(() => {
    loadDemoScenario();
    setShowWelcome(false);
    setHasDismissedWelcome(true);
    setShowGuidedPath(true);
    setShowFirstRunCheck(true);
    setCompletedDemoTourItems(new Set());
    setFirstRunNextSeasonSelected(false);
    setFirstRunCompletedAt(null);
    setGrowthPreviewDays(0);
    setHeatmapLayer('overall');
    setShowHeatmap(true);
    setRequestedInspectorTab('tasks');
    setSelectedTileStatus(null);
    setPlacementInsight(null);
    setActionFeedback(null);
    setNextSeasonTarget(null);
    selectEntity(null);
    setActiveTool(null);
    setActiveTile(null);
  }, [loadDemoScenario, selectEntity, setActiveTile, setActiveTool]);
  useEffect(() => {
    if (firstRunComplete && !firstRunCompletedAt) {
      setFirstRunCompletedAt(Date.now());
    }
    if (!firstRunComplete && firstRunCompletedAt) {
      setFirstRunCompletedAt(null);
    }
  }, [firstRunComplete, firstRunCompletedAt]);
  const startBlankExperience = useCallback(() => {
    createPlan();
    setShowWelcome(false);
    setHasDismissedWelcome(true);
    setShowGuidedPath(true);
    setShowFirstRunCheck(true);
    setCompletedDemoTourItems(new Set());
    setFirstRunNextSeasonSelected(false);
    setFirstRunCompletedAt(null);
    setGrowthPreviewDays(0);
    setHeatmapLayer('overall');
    setShowHeatmap(true);
    setRequestedInspectorTab(null);
    setSelectedTileStatus(null);
    setPlacementInsight(null);
    setActionFeedback(null);
    setNextSeasonTarget(null);
    selectEntity(null);
    setActiveTool(null);
    setActiveTile(null);
  }, [createPlan, selectEntity, setActiveTile, setActiveTool]);
  const handleGenerateStarterPlan = useCallback(() => {
    const requestedPlantIds = getGardenKitPlantIds();
    const result = generateStarterPlan(requestedPlantIds);
    setShowWelcome(false);
    setHasDismissedWelcome(true);
    setShowGuidedPath(false);
    setShowFirstRunCheck(false);
    setCompletedDemoTourItems(new Set(['demo']));
    setFirstRunNextSeasonSelected(false);
    setFirstRunCompletedAt(null);
    setGrowthPreviewDays(0);
    setHeatmapLayer('overall');
    setShowHeatmap(true);
    setRequestedInspectorTab('tasks');
    setSelectedTileStatus(null);
    setPlacementInsight(null);
    setNextSeasonTarget(null);
    setActiveTool(null);
    setActiveTile(null);
    selectEntity(null);
    setActionFeedback({
      x: 6,
      y: 5,
      status: 'ok',
      label: result.placed > 0 ? `生成 ${result.placed}` : '未生成'
    });
    setStarterSummary(buildStarterPlanSummary(result, requestedPlantIds, planSeason));
  }, [generateStarterPlan, getGardenKitPlantIds, planSeason, selectEntity, setActiveTile, setActiveTool]);
  const handleShareGardenImage = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return;

    const dataUrl = stage.toDataURL({
      pixelRatio: 2,
      mimeType: 'image/png',
      quality: 1
    });
    const shareDataUrl = await createGardenShareCard(
      dataUrl,
      `${planName} · ${planYear} ${seasonLabel(planSeason)}`,
      shareCardStats
    );
    const link = document.createElement('a');
    link.href = shareDataUrl;
    link.download = `${sanitizeShareFileName(planName)}-share.png`;
    link.click();
    setActionFeedback({
      x: Math.max(1, Math.floor(effectiveGridWidth / 2)),
      y: Math.max(1, Math.floor(effectiveGridHeight / 2)),
      status: 'ok',
      label: '分享图'
    });
    setShareExportMessage('已生成分享图：包含菜园标题、Garden Score、作物数量和任务状态。');
  }, [effectiveGridHeight, effectiveGridWidth, planName, planSeason, planYear, shareCardStats]);
  const handleFocusPreviewHarvest = useCallback(() => {
    if (!growthPreviewFirstHarvestId) return;
    selectEntity(growthPreviewFirstHarvestId);
    focusEntityInView(growthPreviewFirstHarvestId);
  }, [focusEntityInView, growthPreviewFirstHarvestId, selectEntity]);
  const handleResolveTileStatus = useCallback((status: TileStatusInfo) => {
    if (status.kind !== 'cleanup') return;
    const key = `${status.gridX},${status.gridY}`;
    resolveCleanupTile(key);
    setSelectedTileStatus({
      kind: 'idle',
      gridX: status.gridX,
      gridY: status.gridY,
      label: '空闲地块',
      detail: '这块地已经整理完成，可以进入下一季规划。',
      recommendation: '选择推荐作物后，会自动打开轮作热力图，帮助避开同科连作。',
      tone: 'green'
    });
    setNextSeasonTarget({ gridX: status.gridX, gridY: status.gridY });
    setActionFeedback({
      x: status.gridX,
      y: status.gridY,
      status: 'ok',
      label: 'READY'
    });
    addEffect(status.gridX, status.gridY, 'tile');
    setRequestedInspectorTab('tasks');
  }, [addEffect, resolveCleanupTile]);
  const handleResolveTileTask = useCallback((status: TileStatusInfo) => {
    const taskId = status.kind === 'water'
      ? 'water'
      : status.kind === 'drainage'
        ? 'drainage'
        : status.kind === 'cover'
          ? 'cover'
          : null;
    if (!taskId) return;

    const target = Object.values(entities).find(entity => (
      entity.type === 'plant'
        && status.gridX >= entity.originX
        && status.gridX < entity.originX + entity.spanX
        && status.gridY >= entity.originY
        && status.gridY < entity.originY + entity.spanY
    ));
    if (!target || target.type !== 'plant') return;

    const completed = completePlantTask(target.id, taskId, {
      note: `Tile action: ${status.label}`
    } satisfies ActivityInput);
    if (!completed) return;

    setSelectedTileStatus({
      kind: 'idle',
      gridX: status.gridX,
      gridY: status.gridY,
      label: '任务已完成',
      detail: `${status.label}已经处理，地块状态已刷新。`,
      recommendation: '如果没有其他待办，这里不会再显示操作按钮。',
      tone: 'green'
    });
    setActionFeedback({
      x: status.gridX,
      y: status.gridY,
      status: 'ok',
      label: taskId === 'water' ? 'WATER' : taskId === 'drainage' ? 'DRAIN' : 'COVER'
    });
    addEffect(status.gridX, status.gridY, 'tile');
    setRequestedInspectorTab('tasks');
  }, [addEffect, completePlantTask, entities]);
  const handleSelectRecommendedPlant = useCallback((plantId: string) => {
    setActiveTool(plantId);
    setShowHeatmap(true);
    setHeatmapLayer(nextSeasonTarget ? 'rotation' : 'overall');
    setFirstRunNextSeasonSelected(true);
    selectEntity(null);
    setPlacementInsight(null);
    if (nextSeasonTarget) {
      setActionFeedback({
        x: nextSeasonTarget.gridX,
        y: nextSeasonTarget.gridY,
        status: 'ok',
        label: '下一季'
      });
      addEffect(nextSeasonTarget.gridX, nextSeasonTarget.gridY, 'tile');
    } else {
      setActionFeedback(null);
    }
    setRequestedInspectorTab('tasks');
  }, [addEffect, nextSeasonTarget, selectEntity, setActiveTool]);

  const markDemoTourItem = useCallback((id: string) => {
    setCompletedDemoTourItems((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  const handleFirstRunStep = useCallback((stepId?: string) => {
    const targetStepId = stepId || firstRunCurrentStep?.id;
    if (!targetStepId) {
      setRequestedInspectorTab('harvest');
      return;
    }

    if (targetStepId === 'demo') {
      loadDemoScenario();
      setCompletedDemoTourItems(new Set());
      setFirstRunNextSeasonSelected(false);
      setGrowthPreviewDays(0);
      setRequestedInspectorTab('tasks');
      setSelectedTileStatus(null);
      setPlacementInsight(null);
      return;
    }

    if (targetStepId === 'rules') {
      setShowHeatmap(true);
      setHeatmapLayer('companion');
      setRequestedInspectorTab('planning');
      const tomato = Object.values(entities).find(entity => entity.type === 'plant' && entity.plantId === 'tomato');
      const potato = Object.values(entities).find(entity => entity.type === 'plant' && entity.plantId === 'potato');
      const target = tomato || potato;
      if (target) {
        markDemoTourItem('companion');
        selectEntity(target.id);
        focusEntityInView(target.id);
        setSelectedTileStatus(null);
        setPlacementInsight(null);
      } else {
        setActiveTool('tomato');
      }
      return;
    }

    if (targetStepId === 'task') {
      setRequestedInspectorTab('tasks');
      markDemoTourItem('task');
      const firstTask = currentGardenTasks[0];
      if (firstTask) {
        handleTaskSelectEntity(firstTask.id);
      }
      return;
    }

    if (targetStepId === 'harvest') {
      setGrowthPreviewDays(90);
      setRequestedInspectorTab('harvest');
      markDemoTourItem('harvest');
      if (growthPreviewFirstHarvestId) {
        handleFocusPreviewHarvest();
      }
      return;
    }

    if (targetStepId === 'cleanup') {
      setRequestedInspectorTab('tasks');
      if (firstCleanupTileStatus) {
        setSelectedTileStatus(firstCleanupTileStatus);
        selectEntity(null);
        setPlacementInsight(null);
        setActionFeedback({
          x: firstCleanupTileStatus.gridX,
          y: firstCleanupTileStatus.gridY,
          status: 'ok',
          label: 'CLEAN'
        });
        addEffect(firstCleanupTileStatus.gridX, firstCleanupTileStatus.gridY, 'tile');
      }
      return;
    }

    if (targetStepId === 'next-season') {
      setRequestedInspectorTab('tasks');
      setActiveTile(null);
      setActiveTool('tomato');
      setShowHeatmap(true);
      setHeatmapLayer('rotation');
      setFirstRunNextSeasonSelected(true);
      selectEntity(null);
      setPlacementInsight(null);
      if (selectedTileStatus) {
        setActionFeedback({
          x: selectedTileStatus.gridX,
          y: selectedTileStatus.gridY,
          status: 'ok',
          label: '下一季'
        });
        addEffect(selectedTileStatus.gridX, selectedTileStatus.gridY, 'tile');
      }
    }
  }, [
    addEffect,
    currentGardenTasks,
    entities,
    firstCleanupTileStatus,
    firstRunCurrentStep,
    focusEntityInView,
    growthPreviewFirstHarvestId,
    handleFocusPreviewHarvest,
    handleSelectRecommendedPlant,
    handleTaskSelectEntity,
    loadDemoScenario,
    markDemoTourItem,
    selectEntity,
    setActiveTile,
    selectedTileStatus,
    setActiveTool
  ]);

  const handlePreviewSafePlacement = useCallback((entityId: string) => {
    const entity = entities[entityId];
    if (!entity || entity.type !== 'plant') return;

    setShowHeatmap(true);
    setHeatmapLayer('companion');
    setActiveTool(entity.plantId);
    setSafePlacementRepair({ entityId, plantName: entity.plant.naming.zh });
    setPlacementInsight(null);
    setSelectedTileStatus(null);
    selectEntity(entityId);
    focusEntityInView(entityId);
    setActionFeedback({
      x: entity.originX,
      y: entity.originY,
      status: 'ok',
      label: '安全位置'
    });
    addEffect(entity.originX, entity.originY, 'move');
  }, [addEffect, entities, focusEntityInView, selectEntity, setActiveTool]);

  const handleGuidedNext = useCallback(() => {
    if (guidedPathComplete) {
      setRequestedInspectorTab('harvest');
      return;
    }

    if (plantCount === 0) {
      setActiveTool('tomato');
      setActiveTile(null);
      setPlacementInsight(null);
      setSelectedTileStatus(null);
      return;
    }

    if (!showHeatmap) {
      setShowHeatmap(true);
      return;
    }

    if (growthPreviewDays === 0) {
      setGrowthPreviewDays(60);
      return;
    }

    if (currentGardenTasks.length > 0) {
      handleTaskSelectEntity(currentGardenTasks[0].id);
      return;
    }

    if (growthPreviewFirstHarvestId) {
      handleFocusPreviewHarvest();
      return;
    }

    if (firstCleanupTileStatus) {
      setSelectedTileStatus(firstCleanupTileStatus);
      selectEntity(null);
      setPlacementInsight(null);
      return;
    }

    setShowHeatmap(true);
  }, [
    currentGardenTasks,
    firstCleanupTileStatus,
    growthPreviewDays,
    growthPreviewFirstHarvestId,
    guidedPathComplete,
    handleFocusPreviewHarvest,
    handleTaskSelectEntity,
    plantCount,
    selectEntity,
    setActiveTile,
    setActiveTool,
    showHeatmap
  ]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden md:h-screen md:flex-row">
      <PlannerToolbar
        planId={planId}
        planName={planName}
        gridWidth={effectiveGridWidth}
        gridHeight={effectiveGridHeight}
        cellSizeFeet={cellSizeFeet}
        planYear={planYear}
        planSeason={planSeason}
        climateProfile={climateProfile}
        planSummaries={planSummaries.length > 0 ? planSummaries : [{
          id: planId,
          name: planName,
          width: effectiveGridWidth,
          height: effectiveGridHeight,
          updatedAt: lastSavedAt || Date.now()
        }]}
        hasUnsavedChanges={hasUnsavedChanges}
        lastSavedAt={lastSavedAt}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        activeToolId={activeToolId}
        activeTileId={activeTileId}
        onRenamePlan={renamePlan}
        onSetPlanTime={setPlanTime}
        onUpdateClimateProfile={updateClimateProfile}
        onResizeGarden={resizeGarden}
        onCreatePlan={createPlan}
        onDuplicatePlan={duplicatePlan}
        onSwitchPlan={switchPlan}
        onUndo={undo}
        onRedo={redo}
        onSelectPlant={handleSelectPlant}
        onSelectTile={handleSelectTile}
        onSave={savePlan}
        onLoad={loadPlan}
        onExportPlan={exportPlan}
        onImportPlan={importPlanAsNew}
      />

      {/* 画布容器 */}
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{
          background: atmosphere.background,
          cursor: canvasCursor,
          touchAction: 'none'
        }}
      >
        <style>{`
          @keyframes farm-atmosphere-drift {
            0% { transform: translate3d(0, -12vh, 0) rotate(0deg); opacity: 0; }
            12% { opacity: 0.85; }
            100% { transform: translate3d(var(--drift-x), 112vh, 0) rotate(var(--spin)); opacity: 0; }
          }
        `}</style>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
          style={{ backgroundImage: atmosphere.groundPattern }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: atmosphere.overlay }}
        />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {atmosphereParticles.map((particle) => (
            <span
              key={particle.id}
              className="absolute top-0 block"
              style={{
                left: `${particle.left}%`,
                width: particle.size,
                height: particle.size,
                borderRadius: atmosphere.particle === 'leaf' || atmosphere.particle === 'petal' ? '70% 30% 70% 30%' : '999px',
                background: atmosphere.particleColor,
                opacity: atmosphere.particle === 'spark' ? 0.48 : 0.72,
                boxShadow: atmosphere.particle === 'spark' ? `0 0 10px ${atmosphere.particleColor}` : undefined,
                animation: `farm-atmosphere-drift ${particle.duration}s linear infinite`,
                animationDelay: `${particle.delay}s`,
                ['--drift-x' as string]: `${(particle.id % 2 === 0 ? 1 : -1) * (35 + particle.id * 3)}px`,
                ['--spin' as string]: `${particle.id % 2 === 0 ? 180 : -220}deg`
              }}
            />
          ))}
        </div>
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border-2 border-amber-950/15 bg-[#fff8df]/70 px-2 py-1.5 text-[10px] font-black text-amber-900 shadow-[0_3px_0_rgba(120,72,24,0.12)] md:left-8 md:top-6 md:px-3 md:py-2 md:text-xs">
          {planName} · {planYear} · {atmosphere.label}
        </div>
        <div className="pointer-events-none absolute left-3 top-[48px] rounded-lg border-2 border-white/35 bg-white/35 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-950 shadow-[0_3px_0_rgba(44,82,52,0.1)] backdrop-blur md:left-8 md:top-[74px] md:px-3 md:py-1.5 md:text-[10px]">
          {atmosphere.badge}
        </div>
        {firstRunFocus && !firstRunComplete && (
          <div className="pointer-events-none absolute left-3 right-3 top-[82px] z-10 rounded-lg border-2 border-sky-300/70 bg-sky-50/88 px-3 py-2 text-[10px] font-black leading-4 text-sky-950 shadow-[0_3px_0_rgba(14,116,144,0.12)] backdrop-blur md:left-[292px] md:right-auto md:top-6 md:max-w-xs">
            {firstRunFocus.label} · {firstRunFocus.hint}
          </div>
        )}
        <div className="absolute left-3 top-[112px] z-10 flex max-w-[calc(100%-1.5rem)] gap-1 overflow-x-auto rounded-lg border-2 border-amber-950/20 bg-[#fff8df]/90 p-1 shadow-[0_4px_0_rgba(120,72,24,0.14),0_12px_22px_rgba(61,40,20,0.14)] backdrop-blur md:left-[292px] md:top-[92px] md:max-w-none">
          <button
            type="button"
            onClick={handleGenerateStarterPlan}
            className="shrink-0 rounded-md border border-green-900/15 bg-green-100 px-3 py-1.5 text-xs font-black text-green-900 shadow-[0_2px_0_rgba(22,101,52,0.12)] hover:bg-green-200"
          >
            一键生成
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTool(null);
              setActiveTile(null);
              setRequestedInspectorTab('tasks');
              setSelectedTileStatus({
                kind: 'idle',
                gridX: 1,
                gridY: 1,
                label: '空地智能推荐',
                detail: '点击任意空地也可以获得推荐。这里先给你一个起步位置。',
                recommendation: '展开底部面板，选择推荐植物后会进入放置模式。',
                tone: 'green'
              });
            }}
            className="shrink-0 rounded-md border border-sky-900/15 bg-sky-100 px-3 py-1.5 text-xs font-black text-sky-900 shadow-[0_2px_0_rgba(14,116,144,0.12)] hover:bg-sky-200"
          >
            智能推荐
          </button>
          <button
            type="button"
            onClick={handleShareGardenImage}
            className="shrink-0 rounded-md border border-amber-900/15 bg-white px-3 py-1.5 text-xs font-black text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.12)] hover:bg-amber-50"
          >
            导出分享图
          </button>
        </div>
        {starterSummary && (
          <div className="absolute left-3 right-3 top-[156px] z-30 max-h-[36vh] overflow-y-auto rounded-lg border-2 border-green-900/15 bg-green-50 p-2 text-[10px] font-black leading-4 text-green-950 shadow-[0_3px_0_rgba(22,101,52,0.12),0_14px_24px_rgba(61,40,20,0.14)] md:left-[292px] md:right-auto md:top-[140px] md:max-h-[calc(100vh-180px)] md:w-80 md:p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-green-800">Generated Plan</div>
                <div className="mt-0.5 text-xs font-black text-green-950">
                  已生成 {starterSummary.placed}/{starterSummary.requested} 个种植位
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStarterSummary(null)}
                className="h-6 w-6 shrink-0 rounded border border-green-900/15 bg-white/70 text-[9px] font-black text-green-900"
                aria-label="关闭生成说明"
              >
                x
              </button>
            </div>
            <div className="mt-2 rounded-md border border-green-900/10 bg-white/70 px-2 py-1.5 text-green-900 md:p-2">
              {starterSummary.skipped.length > 0
                ? `有 ${starterSummary.skipped.length} 个作物暂未放入：${starterSummary.skippedNames.join('、') || '未知作物'}。`
                : '已优先避开冲突，并把适合的伴生组合靠近。'}
            </div>
            <div className="mt-2 space-y-1">
              {starterSummary.reasons.map(reason => (
                <div key={reason} className="flex gap-1.5 text-green-900">
                  <span className="text-green-700">✓</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 rounded-md border border-green-900/10 bg-white/60 px-2 py-1 text-green-800">
              {starterSummary.nextStep}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setShowHeatmap(true);
                  setHeatmapLayer('companion');
                  setStarterSummary(null);
                }}
                className="rounded-md border border-green-900/15 bg-white/80 px-2 py-1.5 text-[9px] font-black text-green-900 shadow-[0_1px_0_rgba(22,101,52,0.1)] hover:bg-green-100"
              >
                看热力图
              </button>
              <button
                type="button"
                onClick={handleShareGardenImage}
                className="rounded-md border border-sky-900/15 bg-sky-100 px-2 py-1.5 text-[9px] font-black text-sky-900 shadow-[0_1px_0_rgba(14,116,144,0.1)] hover:bg-sky-200"
              >
                分享图
              </button>
              <button
                type="button"
                onClick={handleGenerateStarterPlan}
                className="rounded-md border border-amber-900/15 bg-[#f4d58d] px-2 py-1.5 text-[9px] font-black text-amber-950 shadow-[0_1px_0_rgba(120,72,24,0.1)] hover:bg-[#f8df9d]"
              >
                重新生成
              </button>
            </div>
          </div>
        )}
        {shareExportMessage && (
          <div className="absolute left-3 right-3 top-[160px] z-30 rounded-lg border-2 border-sky-900/15 bg-sky-50 px-3 py-2 text-[10px] font-black leading-4 text-sky-950 shadow-[0_3px_0_rgba(14,116,144,0.12)] md:left-[292px] md:right-auto md:top-[220px] md:w-72">
            {shareExportMessage}
            <button
              type="button"
              onClick={() => setShareExportMessage(null)}
              className="ml-2 rounded border border-sky-900/15 bg-white/70 px-1.5 py-0.5 text-[9px] font-black text-sky-900"
            >
              关闭
            </button>
          </div>
        )}
        <div className="absolute left-8 top-[112px] z-10 hidden rounded-lg border-2 border-amber-950/15 bg-[#fff8df]/78 p-2 shadow-[0_3px_0_rgba(120,72,24,0.1)] backdrop-blur md:block">
          <div className="text-[9px] font-black uppercase tracking-wider text-amber-800">Tile State</div>
          <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] font-black text-amber-900">
            <TileStateLegendItem color="bg-green-300" label="空闲" />
            <TileStateLegendItem color="bg-amber-300" label="待整理" />
            <TileStateLegendItem color="bg-sky-300" label="缺水" />
            <TileStateLegendItem color="bg-cyan-300" label="排水" />
          </div>
        </div>
        <div className="absolute left-8 top-[190px] z-10 hidden w-64 rounded-lg border-2 border-amber-950/15 bg-[#fff8df]/88 p-2 shadow-[0_3px_0_rgba(120,72,24,0.1),0_12px_24px_rgba(61,40,20,0.12)] backdrop-blur md:block">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[9px] font-black uppercase tracking-wider text-amber-800">Starter Path</div>
              <div className="mt-0.5 text-xs font-black text-amber-950">
                {firstRunCurrentStep ? firstRunCurrentStep.label : '体验路径已完成'}
              </div>
            </div>
            <div className="rounded-full border border-green-900/10 bg-green-50 px-2 py-0.5 text-[10px] font-black text-green-800">
              {firstRunDoneCount}/{firstRunCheckSteps.length}
            </div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-100">
            <div
              className="h-full rounded-full bg-green-500"
              style={{ width: `${Math.round((firstRunDoneCount / firstRunCheckSteps.length) * 100)}%` }}
            />
          </div>
          <div className="mt-2 max-h-8 overflow-hidden text-[10px] font-bold leading-4 text-amber-700">
            {firstRunCurrentStep
              ? firstRunCurrentStep.detail
              : '规则解释、任务闭环、采收整理和下一季推荐都已跑通。'}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleFirstRunStep()}
              className="rounded-md border border-green-900/15 bg-green-100 px-2 py-1.5 text-[10px] font-black text-green-900 shadow-[0_1px_0_rgba(22,101,52,0.1)] hover:bg-green-200"
            >
              {firstRunCurrentStep ? '执行当前' : '看结果'}
            </button>
            <button
              type="button"
              onClick={() => setShowFirstRunCheck(true)}
              className="rounded-md border border-amber-900/15 bg-white/80 px-2 py-1.5 text-[10px] font-black text-amber-900 shadow-[0_1px_0_rgba(120,72,24,0.1)] hover:bg-amber-50"
            >
              详情
            </button>
          </div>
        </div>
        {showFirstRunCheck && (
          <div className="absolute left-8 top-[290px] z-20 hidden max-h-[calc(100%-318px)] w-72 overflow-y-auto rounded-lg border-2 border-amber-950/15 bg-[#fff8df]/94 p-3 shadow-[0_4px_0_rgba(120,72,24,0.12),0_18px_30px_rgba(61,40,20,0.18)] backdrop-blur md:block">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Garden Guide</div>
                <div className="mt-0.5 text-sm font-black text-amber-950">新手导览</div>
              </div>
              <button
                type="button"
                onClick={() => setShowFirstRunCheck(false)}
                className="h-7 w-7 rounded-md border border-amber-900/15 bg-white text-xs font-black text-amber-900 shadow-[0_1px_0_rgba(120,72,24,0.1)] hover:bg-amber-50"
                aria-label="关闭体验导览"
              >
                x
              </button>
            </div>
            <div className={`mt-2 rounded-md border p-2 ${
              firstRunComplete
                ? 'border-green-300 bg-green-50'
                : 'border-amber-900/10 bg-[#fff8df]/80'
            }`}>
              <div className="text-[10px] font-black text-amber-950">
                {firstRunCurrentStep ? `当前：${firstRunCurrentStep.label}` : '完成：可以邀请体验用户'}
              </div>
              <div className="mt-0.5 text-[9px] font-bold leading-4 text-amber-700">
                {firstRunCurrentStep
                  ? firstRunCurrentStep.detail
                  : '核心路径已经覆盖规则解释、任务闭环、采收、地块整理和下一季推荐。'}
              </div>
            </div>
            {firstRunCompletedAt && (
              <div className="mt-2 rounded-md border border-green-300 bg-white/80 px-2 py-1 text-[10px] font-black leading-4 text-green-900">
                体验路径已跑通：规则、任务、采收、整理和下一季推荐都能被用户理解并操作。
              </div>
            )}
            {firstRunFocus && !firstRunComplete && (
              <div className="mt-2 rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-[10px] font-black leading-4 text-sky-950">
                当前看这里：{firstRunFocus.label}。{firstRunFocus.hint}
              </div>
            )}
            <div className="mt-2 space-y-1">
              {firstRunCheckSteps.map((step, index) => (
                <FirstRunCheckItem
                  key={step.id}
                  index={index}
                  step={step}
                  active={firstRunCurrentStep?.id === step.id}
                  onClick={() => handleFirstRunStep(step.id)}
                />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFirstRunStep()}
                className="rounded-md border-2 border-green-900/15 bg-green-100 px-3 py-1.5 text-xs font-black text-green-900 shadow-[0_2px_0_rgba(22,101,52,0.12)] hover:bg-green-200"
              >
                {firstRunCurrentStep ? '执行当前' : '查看结果'}
              </button>
              <button
                type="button"
                onClick={resetFirstRunExperience}
                className="rounded-md border border-amber-900/15 bg-white/75 px-3 py-1.5 text-[10px] font-black text-amber-900 shadow-[0_1px_0_rgba(120,72,24,0.1)] hover:bg-amber-50"
              >
                重置场景
              </button>
            </div>
            <div className="mt-3 rounded-md border border-amber-900/10 bg-white/70 p-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Feedback Notes</div>
              <div className="mt-1 space-y-1 text-[9px] font-bold leading-4 text-amber-700">
                <div>可以用 3 分钟快速判断它是否适合你的真实菜园。</div>
                <div>按导览走完后，看看规则、操作和推荐是否清楚。</div>
                <div>如果愿意反馈，告诉我们哪里最有用、哪里还不够可信。</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGuidedPath(value => !value)}
              className="mt-2 flex w-full items-center justify-between rounded-md border border-amber-900/10 bg-white/65 px-2 py-1.5 text-left text-[10px] font-black text-amber-900 hover:bg-amber-50"
            >
              <span>高级路径</span>
              <span>{guidedPathSteps.filter(step => step.done).length}/{guidedPathSteps.length}</span>
            </button>
            {showGuidedPath && (
              <div className="mt-2 rounded-md border border-amber-900/10 bg-white/65 p-2">
                <div className="text-[10px] font-black text-amber-950">{guidedPathCopy.title}</div>
                <div className="mt-1 text-[9px] font-bold leading-4 text-amber-700">{guidedPathCopy.detail}</div>
                <div className="mt-2 space-y-1">
                  {guidedPathSteps.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-2 text-[9px] font-black text-amber-900">
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full border text-[8px] ${
                        step.done
                          ? 'border-green-300 bg-green-100 text-green-800'
                          : 'border-amber-300 bg-amber-100 text-amber-800'
                      }`}>
                        {step.done ? '✓' : index + 1}
                      </span>
                      <span>{step.label}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleGuidedNext}
                  className="mt-2 w-full rounded-md border border-green-900/15 bg-green-100 px-2 py-1 text-[10px] font-black text-green-900 hover:bg-green-200"
                >
                  {guidedPathComplete ? '查看评分' : '下一步'}
                </button>
              </div>
            )}
          </div>
        )}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border-2 border-amber-950/20 bg-[#fff8df]/90 p-1 shadow-[0_4px_0_rgba(120,72,24,0.14),0_12px_22px_rgba(61,40,20,0.14)] backdrop-blur md:right-80 md:top-4">
          <button
            type="button"
            onClick={() => zoomAt(viewport.scale / 1.14)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-amber-900/15 bg-white text-lg font-black text-amber-950 shadow-[0_2px_0_rgba(120,72,24,0.12)] hover:bg-amber-50"
            aria-label="缩小"
            title="缩小"
          >
            -
          </button>
          <div className="min-w-[54px] px-2 text-center text-xs font-black text-amber-900">
            {Math.round(viewport.scale * 100)}%
          </div>
          <button
            type="button"
            onClick={() => zoomAt(viewport.scale * 1.14)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-amber-900/15 bg-white text-lg font-black text-amber-950 shadow-[0_2px_0_rgba(120,72,24,0.12)] hover:bg-amber-50"
            aria-label="放大"
            title="放大"
          >
            +
          </button>
          <button
            type="button"
            onClick={resetViewport}
            className="h-8 rounded-md border border-amber-900/15 bg-[#f4d58d] px-2 text-xs font-black text-amber-950 shadow-[0_2px_0_rgba(120,72,24,0.12)] hover:bg-[#f8df9d]"
            title="重置视角"
          >
            重置
          </button>
        </div>
        <div className="absolute bottom-12 left-8 z-10 hidden w-64 rounded-lg border-2 border-amber-950/20 bg-[#fff8df]/90 p-3 shadow-[0_4px_0_rgba(120,72,24,0.14),0_12px_22px_rgba(61,40,20,0.14)] backdrop-blur md:block">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Growth Preview</div>
              <div className="mt-0.5 text-xs font-black text-amber-950">
                {growthPreviewDays === 0 ? '今天' : `+${growthPreviewDays} 天`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGrowthPreviewDays(0)}
              disabled={growthPreviewDays === 0}
              className="h-7 rounded-md border border-amber-900/15 bg-white px-2 text-[10px] font-black text-amber-900 shadow-[0_1px_0_rgba(120,72,24,0.1)] hover:bg-amber-50 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              Today
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={120}
            step={5}
            value={growthPreviewDays}
            onChange={(event) => setGrowthPreviewDays(Number(event.target.value))}
            className="mt-3 w-full accent-green-700"
            aria-label="生长预览天数"
          />
          <div className="mt-2 grid grid-cols-4 gap-1">
            {[30, 60, 90, 120].map(day => (
              <button
                key={day}
                type="button"
                onClick={() => setGrowthPreviewDays(day)}
                className={`h-6 rounded-md border text-[9px] font-black shadow-[0_1px_0_rgba(120,72,24,0.1)] ${
                  growthPreviewDays === day
                    ? 'border-green-900/15 bg-green-100 text-green-900'
                    : 'border-amber-900/10 bg-white/75 text-amber-800 hover:bg-amber-50'
                }`}
              >
                +{day}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            <GrowthPreviewMetric label="生长" value={growthPreviewSummary.growing} tone="green" />
            <GrowthPreviewMetric label="成熟" value={growthPreviewSummary.mature} tone="amber" />
            <GrowthPreviewMetric label="采收" value={growthPreviewSummary.harvest} tone="gold" />
          </div>
          <div className="mt-2 rounded-md border border-amber-900/10 bg-white/65 px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[9px] font-black uppercase tracking-wider text-amber-700">Harvest Forecast</div>
              {growthPreviewFirstHarvestId && (
                <button
                  type="button"
                  onClick={handleFocusPreviewHarvest}
                  className="h-5 rounded border border-green-900/15 bg-green-100 px-1.5 text-[9px] font-black text-green-900 hover:bg-green-200"
                >
                  定位采收
                </button>
              )}
            </div>
            <div className="mt-1 text-[10px] font-black leading-4 text-amber-950">
              {growthPreviewHarvestForecast.length > 0
                ? growthPreviewHarvestForecast.map(([name, count]) => `${name} x${count}`).join(' · ')
                : growthPreviewDays === 0
                  ? '今天暂无集中采收'
                  : '该时间点暂无集中采收'}
            </div>
          </div>
          <div className="mt-1 flex justify-between text-[9px] font-black text-amber-700">
            <span>0d</span>
            <span>60d</span>
            <span>120d</span>
          </div>
        </div>
        {activeToolId && (
          <div className="absolute right-3 top-16 z-10 w-44 rounded-lg border-2 border-amber-950/20 bg-[#fff8df]/92 p-2 shadow-[0_4px_0_rgba(120,72,24,0.14),0_12px_22px_rgba(61,40,20,0.14)] backdrop-blur md:right-80 md:w-56">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Placement</div>
                <div className="text-xs font-black text-amber-950">推荐热力图</div>
              </div>
              <button
                type="button"
                onClick={() => setShowHeatmap(value => !value)}
                className={`h-8 rounded-md border px-3 text-xs font-black shadow-[0_2px_0_rgba(120,72,24,0.12)] ${
                  showHeatmap
                    ? 'border-green-900/15 bg-green-100 text-green-900 hover:bg-green-200'
                    : 'border-amber-900/15 bg-white text-amber-900 hover:bg-amber-50'
                }`}
                aria-pressed={showHeatmap}
                title="显示或隐藏放置推荐热力图"
              >
                {showHeatmap ? '开' : '关'}
              </button>
            </div>
            <div className="mt-2 hidden grid-cols-5 gap-1 md:grid">
              {heatmapLayers.map(layer => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => setHeatmapLayer(layer.id)}
                  className={`h-7 rounded-md border text-[10px] font-black shadow-[0_1px_0_rgba(120,72,24,0.1)] ${
                    heatmapLayer === layer.id
                      ? 'border-amber-900/20 bg-[#f4d58d] text-amber-950'
                      : 'border-amber-900/10 bg-white/75 text-amber-800 hover:bg-amber-50'
                  }`}
                  aria-pressed={heatmapLayer === layer.id}
                  title={`${layer.label}热力图`}
                >
                  {layer.label}
                </button>
              ))}
            </div>
            {safePlacementRepair && (
              <div className="mt-2 rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-[10px] font-black leading-4 text-sky-950">
                拖动当前{safePlacementRepair.plantName}到绿色区域；成功后冲突会从 Score 中移除。
              </div>
            )}
            <div className="mt-2 hidden grid-cols-3 gap-1 text-[10px] font-black text-amber-950 md:grid">
              <div className="rounded-md border border-green-700/20 bg-green-100 px-1.5 py-1">
                <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-green-500" />
                {heatmapLegend.good}
              </div>
              <div className="rounded-md border border-amber-700/20 bg-amber-100 px-1.5 py-1">
                <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-amber-500" />
                {heatmapLegend.caution}
              </div>
              <div className="rounded-md border border-red-700/20 bg-red-100 px-1.5 py-1">
                <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-red-500" />
                {heatmapLegend.bad}
              </div>
            </div>
          </div>
        )}
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onWheel={handleWheel}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
          <Layer x={viewport.x} y={viewport.y} scaleX={viewport.scale} scaleY={viewport.scale}>
            {renderSceneDecorations}
            {renderGrid()}
            {renderPlacementHeatmap}
            {renderPlants}
          </Layer>
          <Layer x={viewport.x} y={viewport.y} scaleX={viewport.scale} scaleY={viewport.scale}>
            {renderHoverPreview}
            {renderActionFeedback}
            {renderTransientEffects}
          </Layer>
        </Stage>

        <PlannerStatusBar
          plantCount={plantCount}
          surfaceCount={surfaceCount}
          activeToolId={activeToolId}
          activeTileId={activeTileId}
        />

        {showWelcome && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-emerald-950/24 px-4 backdrop-blur-[2px]">
            <div className="w-full max-w-md rounded-lg border-2 border-amber-950/20 bg-[#fff8df] p-4 shadow-[0_8px_0_rgba(120,72,24,0.16),0_24px_44px_rgba(61,40,20,0.24)]">
              <div className="text-[10px] font-black uppercase tracking-wider text-green-800">Small Farm</div>
              <div className="mt-1 text-2xl font-black leading-tight text-amber-950">先试着规划一块小菜园</div>
              <div className="mt-2 text-xs font-bold leading-5 text-amber-800">
                选择蔬菜、香草或花，先在规划器里试种一遍，再决定真实菜园怎么下手。
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] font-black text-green-900">
                <div className="rounded-md border border-green-900/10 bg-green-50 px-2 py-2">智能摆放</div>
                <div className="rounded-md border border-green-900/10 bg-green-50 px-2 py-2">规则解释</div>
                <div className="rounded-md border border-green-900/10 bg-green-50 px-2 py-2">分享导出</div>
              </div>
              <button
                type="button"
                onClick={handleGenerateStarterPlan}
                className="mt-4 w-full rounded-md border-2 border-green-900/15 bg-green-100 px-3 py-2 text-sm font-black text-green-900 shadow-[0_3px_0_rgba(22,101,52,0.14)] hover:bg-green-200"
              >
                快速生成我的菜园
              </button>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={resetFirstRunExperience}
                  className="rounded-md border border-amber-900/15 bg-white/80 px-3 py-1.5 text-xs font-black text-amber-900 shadow-[0_1px_0_rgba(120,72,24,0.1)] hover:bg-amber-50"
                >
                  体验示例菜园
                </button>
                <button
                  type="button"
                  onClick={startBlankExperience}
                  className="rounded-md border border-amber-900/15 bg-white/80 px-3 py-1.5 text-xs font-black text-amber-900 shadow-[0_1px_0_rgba(120,72,24,0.1)] hover:bg-amber-50"
                >
                  空白开始
                </button>
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowWelcome(false);
                    setHasDismissedWelcome(true);
                  }}
                  className="w-full rounded-md border border-amber-900/10 bg-white/55 px-3 py-1.5 text-xs font-black text-amber-800 hover:bg-amber-50"
                >
                  继续当前菜园
                </button>
              </div>
            </div>
          </div>
        )}

        <PlannerInspector
          entities={entities}
          plantingHistory={plantingHistory}
          harvestRecords={harvestRecords}
          activityRecords={activityRecords}
          climateProfile={climateProfile}
          planYear={planYear}
          planSeason={planSeason}
          growthPreviewNowMs={growthPreviewNowMs}
          selectedEntity={selectedEntity}
          hoverResult={hoverResult}
          placementInsight={placementInsight}
          selectedTileStatus={selectedTileStatus}
          onResolveTileStatus={handleResolveTileStatus}
          onResolveTileTask={handleResolveTileTask}
          requestedTab={requestedInspectorTab}
          activeLayerLabel={heatmapLayerLabel}
          activeScoreLabel={heatmapLegend.scoreLabel}
          onSelectEntity={handleTaskSelectEntity}
          onHoverTaskEntity={setHoveredTaskEntityId}
          onCompletePlantTask={completePlantTask}
          onOpenHarvestPanel={handleOpenHarvestPanel}
          onOpenActivityPanel={handleOpenActivityPanel}
          onSelectRecommendedPlant={handleSelectRecommendedPlant}
          onPreviewSafePlacement={handlePreviewSafePlacement}
          onDeleteSelected={handleDeleteSelected}
          onRotateSelected={handleRotateSelected}
          onFocusSelected={handleFocusSelected}
          firstRunFocus={firstRunFocus}
          smartRecommendations={smartRecommendations}
        />

        {harvestDraft && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/28 px-4 backdrop-blur-[2px]">
            <div className="w-full max-w-sm rounded-lg border-2 border-amber-950/20 bg-[#fff8df] p-4 text-sm shadow-[0_8px_0_rgba(120,72,24,0.16),0_24px_44px_rgba(61,40,20,0.28)]">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Harvest Log</div>
              <div className="mt-1 text-lg font-black text-amber-950">
                {harvestEntity?.type === 'plant' ? harvestEntity.plant.naming.zh : '采收记录'}
              </div>
              {harvestDraft.fromScoreRepair && (
                <div className="mt-2 rounded-md border border-green-300 bg-green-50 px-2 py-1 text-[10px] font-black text-green-900">
                  修复采收窗口：提交后会写入收获记录、刷新 Garden Score，并在移除作物后标记待整理地块。
                </div>
              )}
              <div className="mt-3 grid grid-cols-[1fr_110px] gap-2">
                <label className="text-xs font-black text-amber-900">
                  数量
                  <input
                    value={harvestDraft.quantity}
                    onChange={(event) => setHarvestDraft(current => current ? { ...current, quantity: event.target.value } : current)}
                    className="mt-1 w-full rounded-md border-2 border-amber-900/15 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 outline-none focus:border-green-500"
                    type="number"
                    min="0"
                    step="0.1"
                  />
                </label>
                <label className="text-xs font-black text-amber-900">
                  单位
                  <select
                    value={harvestDraft.unit}
                    onChange={(event) => setHarvestDraft(current => current ? { ...current, unit: event.target.value as HarvestInput['unit'] } : current)}
                    className="mt-1 w-full rounded-md border-2 border-amber-900/15 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 outline-none focus:border-green-500"
                  >
                    <option value="count">个</option>
                    <option value="bunch">把</option>
                    <option value="lb">磅</option>
                    <option value="kg">千克</option>
                  </select>
                </label>
              </div>
              <label className="mt-3 block text-xs font-black text-amber-900">
                备注
                <textarea
                  value={harvestDraft.note}
                  onChange={(event) => setHarvestDraft(current => current ? { ...current, note: event.target.value } : current)}
                  className="mt-1 h-20 w-full resize-none rounded-md border-2 border-amber-900/15 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 outline-none focus:border-green-500"
                  placeholder="口感、大小、病虫害、保存方式..."
                />
              </label>
              <label className="mt-3 flex items-center justify-between rounded-md border border-amber-900/10 bg-white/70 px-3 py-2 text-xs font-black text-amber-900">
                <span>采收后移除作物</span>
                <input
                  type="checkbox"
                  checked={harvestDraft.removeAfterHarvest}
                  onChange={(event) => setHarvestDraft(current => current ? { ...current, removeAfterHarvest: event.target.checked } : current)}
                  className="h-4 w-4 accent-green-600"
                />
              </label>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setHarvestDraft(null)}
                  className="rounded-md border-2 border-amber-900/15 bg-white px-3 py-1.5 text-xs font-black text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.12)] hover:bg-amber-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSubmitHarvest}
                  className="rounded-md border-2 border-green-900/15 bg-green-100 px-3 py-1.5 text-xs font-black text-green-900 shadow-[0_2px_0_rgba(22,101,52,0.12)] hover:bg-green-200"
                >
                  {harvestDraft.fromScoreRepair ? '提交并刷新 Score' : harvestDraft.removeAfterHarvest ? '记录并移除' : '仅记录采收'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activityDraft && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/28 px-4 backdrop-blur-[2px]">
            <div className="w-full max-w-sm rounded-lg border-2 border-amber-950/20 bg-[#fff8df] p-4 text-sm shadow-[0_8px_0_rgba(120,72,24,0.16),0_24px_44px_rgba(61,40,20,0.28)]">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Activity Log</div>
              <div className="mt-1 text-lg font-black text-amber-950">
                {activityEntity?.type === 'plant' ? activityEntity.plant.naming.zh : '操作记录'}
              </div>
              <label className="mt-3 block text-xs font-black text-amber-900">
                操作类型
                <select
                  value={activityDraft.taskId}
                  onChange={(event) => setActivityDraft(current => current ? { ...current, taskId: event.target.value } : current)}
                  className="mt-1 w-full rounded-md border-2 border-amber-900/15 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 outline-none focus:border-green-500"
                >
                  {activityOptions.map(option => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block text-xs font-black text-amber-900">
                备注
                <textarea
                  value={activityDraft.note}
                  onChange={(event) => setActivityDraft(current => current ? { ...current, note: event.target.value } : current)}
                  className="mt-1 h-20 w-full resize-none rounded-md border-2 border-amber-900/15 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 outline-none focus:border-green-500"
                  placeholder="用水量、覆盖材料、肥料、病虫害观察..."
                />
              </label>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActivityDraft(null)}
                  className="rounded-md border-2 border-amber-900/15 bg-white px-3 py-1.5 text-xs font-black text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.12)] hover:bg-amber-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSubmitActivity}
                  className="rounded-md border-2 border-green-900/15 bg-green-100 px-3 py-1.5 text-xs font-black text-green-900 shadow-[0_2px_0_rgba(22,101,52,0.12)] hover:bg-green-200"
                >
                  保存操作
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 提示 */}
        {activeTileId ? (
          <div className="absolute left-3 top-[76px] rounded-lg border-2 border-green-950/20 bg-green-100 px-3 py-1.5 text-xs font-black text-green-950 shadow-[0_4px_0_rgba(22,101,52,0.16)] md:left-4 md:top-20 md:px-4 md:py-2 md:text-sm">
            地块刷子 · {tiles.find(t => t.id === activeTileId)?.name}
          </div>
        ) : activeToolId ? (
          <div className="absolute left-3 top-[76px] rounded-lg border-2 border-amber-950/20 bg-[#ffe08a] px-3 py-1.5 text-xs font-black text-amber-950 shadow-[0_4px_0_rgba(120,72,24,0.18)] md:left-4 md:top-20 md:px-4 md:py-2 md:text-sm">
            放置模式 · {activePlant?.naming.zh}
          </div>
        ) : (
          <div className="absolute left-3 top-[76px] rounded-lg border-2 border-slate-950/20 bg-white/80 px-3 py-1.5 text-xs font-black text-slate-800 shadow-[0_4px_0_rgba(51,65,85,0.12)] md:left-4 md:top-20 md:px-4 md:py-2 md:text-sm">
            选择工具 · 拖动已放置植物
          </div>
        )}
      </div>
    </div>
  );
}
