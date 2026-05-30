import { useEffect, useRef, useState } from 'react';
import { tiles } from './usePlannerStore';
import { getPlantAgronomy, plantMap } from './plants';
import { getNextRotationSuggestions } from './rotation';
import { getGardenTaskBoard, getPlantGrowthStatus, summarizeGardenTasks, type GrowthStageId } from './growth';
import { getGardenCalendarReminders } from './calendar';
import { getSeasonTimeline } from './timeline';
import { getCompanionRule } from './rules';
import type { ActivityRecord, ClimateProfile, GardenEntity, HarvestRecord, PlacementInsight, PlantEntity, PlantingRecord, PlanSeason, SynergyResult, TileStatusInfo } from './types';
import type { HarvestInput } from './usePlannerStore';

type InspectorTab = 'tasks' | 'planning' | 'harvest';
type HarvestFilter = 'season' | 'plant' | 'all';
type ActivityFilter = 'season' | 'plant' | 'all';
type SnapshotActionId = 'first-task' | 'tasks' | 'calendar' | 'harvest' | 'activity' | 'planning';
type GardenScoreReasonAction = SnapshotActionId | 'select-entity' | 'rule';
type InspectorFocusArea = 'tasks' | 'planning' | 'harvest' | 'calendar' | 'activity';
export type FirstRunFocusArea = InspectorFocusArea | 'tile' | 'growth';
type GardenScoreReason = {
  label: string;
  tone: 'green' | 'amber' | 'red';
  actionId: GardenScoreReasonAction;
  entityId?: string;
  focusArea: InspectorFocusArea;
  focusLabel: string;
};

interface PlannerInspectorProps {
  entities: Record<string, GardenEntity>;
  plantingHistory: Record<string, PlantingRecord[]>;
  harvestRecords: HarvestRecord[];
  activityRecords: ActivityRecord[];
  climateProfile: ClimateProfile;
  planYear: number;
  planSeason: PlanSeason;
  growthPreviewNowMs: number;
  selectedEntity: GardenEntity | null;
  hoverResult: SynergyResult | null;
  placementInsight: PlacementInsight | null;
  selectedTileStatus: TileStatusInfo | null;
  onResolveTileStatus: (status: TileStatusInfo) => void;
  onResolveTileTask: (status: TileStatusInfo) => void;
  requestedTab: InspectorTab | null;
  activeLayerLabel: string;
  activeScoreLabel: string;
  onSelectEntity: (entityId: string) => void;
  onHoverTaskEntity: (entityId: string | null) => void;
  onCompletePlantTask: (entityId: string, taskId: string, input?: HarvestInput | { note: string }) => boolean;
  onOpenHarvestPanel: (entityId: string, source?: 'score') => void;
  onOpenActivityPanel: (entityId: string) => void;
  onSelectRecommendedPlant: (plantId: string) => void;
  onPreviewSafePlacement: (entityId: string) => void;
  onDeleteSelected: () => void;
  onRotateSelected: () => void;
  onFocusSelected: () => void;
  firstRunFocus?: {
    label: string;
    area: FirstRunFocusArea;
  } | null;
}

export function PlannerInspector({
  entities,
  plantingHistory,
  harvestRecords,
  activityRecords,
  climateProfile,
  planYear,
  planSeason,
  growthPreviewNowMs,
  selectedEntity,
  hoverResult,
  placementInsight,
  selectedTileStatus,
  onResolveTileStatus,
  onResolveTileTask,
  requestedTab,
  activeLayerLabel,
  activeScoreLabel,
  onSelectEntity,
  onHoverTaskEntity,
  onCompletePlantTask,
  onOpenHarvestPanel,
  onOpenActivityPanel,
  onSelectRecommendedPlant,
  onPreviewSafePlacement,
  onDeleteSelected,
  onRotateSelected,
  onFocusSelected,
  firstRunFocus
}: PlannerInspectorProps) {
  const selectedTitle = selectedEntity ? getEntityTitle(selectedEntity) : selectedTileStatus ? selectedTileStatus.label : '未选择对象';
  const selectedMeta = selectedEntity
    ? `${selectedEntity.spanX} x ${selectedEntity.spanY} 格 · ${selectedEntity.originX},${selectedEntity.originY}`
    : selectedTileStatus
      ? `${selectedTileStatus.gridX},${selectedTileStatus.gridY} · ${tileStatusToneLabel(selectedTileStatus.tone)}`
    : '点击或拖动画布上的植物进行编辑';
  const rotationSuggestions = selectedEntity?.type === 'plant'
    ? getNextRotationSuggestions(selectedEntity.plantId)
    : [];
  const growthStatus = selectedEntity?.type === 'plant'
    ? getPlantGrowthStatus(selectedEntity, growthPreviewNowMs)
    : null;
  const gardenTasks = getGardenTaskBoard(entities, climateProfile, planSeason, growthPreviewNowMs);
  const gardenTaskPressure = getGardenTaskBoard(entities, climateProfile, planSeason, growthPreviewNowMs, Number.POSITIVE_INFINITY);
  const selectedWeatherTask = selectedEntity?.type === 'plant'
    ? gardenTasks.find(task => task.id === selectedEntity.id)?.task || null
    : null;
  const selectedActionTask = growthStatus?.harvestReady
    ? growthStatus.nextTask
    : selectedWeatherTask || growthStatus?.nextTask || null;
  const selectedTaskDone = selectedEntity?.type === 'plant' && selectedActionTask
    ? selectedEntity.completedTaskIds?.includes(selectedActionTask.id)
    : false;
  const taskSummary = summarizeGardenTasks(gardenTasks);
  const pressureTaskSummary = summarizeGardenTasks(gardenTaskPressure);
  const seasonalHarvests = harvestRecords.filter(record => record.year === planYear && record.season === planSeason);
  const seasonalActivities = activityRecords.filter(record => record.year === planYear && record.season === planSeason);
  const activePlantEntities = Object.values(entities).filter(entity => entity.type === 'plant');
  const harvestReadyPlants = activePlantEntities.filter(entity => getPlantGrowthStatus(entity, growthPreviewNowMs).harvestReady);
  const rawCalendarReminders = getGardenCalendarReminders(entities, climateProfile, planYear, planSeason);
  const [activeTab, setActiveTab] = useState<InspectorTab>(placementInsight ? 'planning' : 'tasks');
  const [harvestFilter, setHarvestFilter] = useState<HarvestFilter>(selectedEntity?.type === 'plant' ? 'plant' : 'season');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>(selectedEntity?.type === 'plant' ? 'plant' : 'season');
  const [focusCue, setFocusCue] = useState<{ label: string; area: InspectorFocusArea; createdAt: number } | null>(null);
  const [resolvedWeatherReminderIds, setResolvedWeatherReminderIds] = useState<Set<string>>(() => new Set());
  const [repairIntent, setRepairIntent] = useState<{ type: 'task' | 'harvest'; entityId?: string } | null>(null);
  const pendingManualTabRef = useRef<InspectorTab | null>(null);
  const calendarReminders = rawCalendarReminders.filter(reminder => !resolvedWeatherReminderIds.has(reminder.id));
  const seasonSnapshot = {
    plantCount: activePlantEntities.length,
    speciesCount: new Set(activePlantEntities.map(entity => entity.plantId)).size,
    harvestReadyCount: harvestReadyPlants.length,
    harvestCount: seasonalHarvests.length,
    activityCount: seasonalActivities.length,
    score: getGardenScore(activePlantEntities.length, gardenTaskPressure.length, harvestReadyPlants.length, calendarReminders.length, seasonalHarvests.length, seasonalActivities.length),
    scoreReasons: getGardenScoreReasons(activePlantEntities, gardenTaskPressure, calendarReminders, harvestReadyPlants, seasonalHarvests.length, seasonalActivities.length),
    actions: getGardenScoreActions(activePlantEntities.length, gardenTaskPressure, calendarReminders.length, harvestReadyPlants.length, seasonalHarvests.length, seasonalActivities.length),
    topActivity: getTopActivityLabel(seasonalActivities),
    latestRecord: getLatestSeasonRecord(seasonalHarvests, seasonalActivities)
  };
  const timelineItems = getSeasonTimeline(entities, harvestRecords, activityRecords, climateProfile, planYear, planSeason);
  const selectedPlantAgronomy = selectedEntity?.type === 'plant'
    ? getPlantAgronomy(selectedEntity.plantId)
    : null;
  const selectedPlantActivities = selectedEntity?.type === 'plant'
    ? activityRecords.filter(record => record.entityId === selectedEntity.id || record.plantId === selectedEntity.plantId).slice(0, 4)
    : [];
  const selectedPlantHarvests = selectedEntity?.type === 'plant'
    ? harvestRecords.filter(record => record.entityId === selectedEntity.id || record.plantId === selectedEntity.plantId).slice(0, 4)
    : [];
  const companionNames = selectedEntity?.type === 'plant'
    ? selectedEntity.plant.relationships.companions.map(id => plantMap.get(id)?.naming.zh || id).slice(0, 4)
    : [];
  const enemyNames = selectedEntity?.type === 'plant'
    ? selectedEntity.plant.relationships.enemies.map(id => plantMap.get(id)?.naming.zh || id).slice(0, 4)
    : [];
  const ruleResult = hoverResult || placementInsight?.result || null;
  const ruleTitle = placementInsight && !hoverResult
    ? `${placementInsight.plantName} · ${placementInsight.gridX},${placementInsight.gridY} · ${placementInsight.layerLabel}`
    : null;
  const ruleScoreLabel = hoverResult ? activeScoreLabel : placementInsight?.scoreLabel || activeScoreLabel;
  const ruleLayerLabel = hoverResult ? activeLayerLabel : placementInsight?.layerLabel || activeLayerLabel;
  const filteredHarvests = harvestFilter === 'all'
    ? harvestRecords
    : harvestFilter === 'plant' && selectedEntity?.type === 'plant'
      ? harvestRecords.filter(record => record.entityId === selectedEntity.id || record.plantId === selectedEntity.plantId)
      : seasonalHarvests;
  const filteredActivities = (activityFilter === 'all'
    ? activityRecords
    : activityFilter === 'plant' && selectedEntity?.type === 'plant'
      ? activityRecords.filter(record => record.entityId === selectedEntity.id || record.plantId === selectedEntity.plantId)
      : seasonalActivities
  ).slice().sort((a, b) => b.completedAt - a.completedAt);
  const filteredHarvestSummary = summarizeHarvests(filteredHarvests);
  const filteredHarvestByPlant = summarizeHarvestsByPlant(filteredHarvests);
  const harvestExportName = getHarvestExportName(harvestFilter, planYear, planSeason, selectedEntity);
  const activityExportName = getActivityExportName(activityFilter, planYear, planSeason, selectedEntity);
  const planningBadge = ruleResult?.recommendation === 'bad' || ruleResult?.recommendation === 'caution'
    ? '!'
    : ruleResult
      ? '规则'
      : rotationSuggestions.length > 0
        ? String(rotationSuggestions.length)
        : '';
  const tabItems: Array<{ id: InspectorTab; label: string; badge: string; tone: 'neutral' | 'warning' | 'success' }> = [
    { id: 'tasks', label: '任务', badge: String(gardenTasks.length), tone: gardenTasks.length > 0 ? 'warning' : 'neutral' },
    { id: 'planning', label: '规划', badge: planningBadge, tone: planningBadge === '!' ? 'warning' : ruleResult ? 'success' : 'neutral' },
    { id: 'harvest', label: '收获', badge: String(seasonalHarvests.length), tone: seasonalHarvests.length > 0 ? 'success' : 'neutral' }
  ];

  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    if (requestedTab) return;

    if (placementInsight) {
      setActiveTab('planning');
      return;
    }

    if (selectedTileStatus) {
      setActiveTab('tasks');
      return;
    }

    if (selectedEntity?.type === 'plant') {
      if (pendingManualTabRef.current) {
        setActiveTab(pendingManualTabRef.current);
        pendingManualTabRef.current = null;
        return;
      }

      setActiveTab('tasks');
    }
  }, [placementInsight, requestedTab, selectedEntity?.id, selectedTileStatus]);

  useEffect(() => {
    setHarvestFilter(selectedEntity?.type === 'plant' ? 'plant' : 'season');
    setActivityFilter(selectedEntity?.type === 'plant' ? 'plant' : 'season');
  }, [selectedEntity?.id]);

  useEffect(() => {
    if (!focusCue) return;
    const timeout = window.setTimeout(() => setFocusCue(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [focusCue]);

  useEffect(() => {
    if (!firstRunFocus) return;

    const targetTab: InspectorTab = firstRunFocus.area === 'planning'
      ? 'planning'
      : firstRunFocus.area === 'harvest'
        ? 'harvest'
        : 'tasks';

    setActiveTab(targetTab);
    setFocusCue({
      label: firstRunFocus.label,
      area: firstRunFocus.area === 'tile' || firstRunFocus.area === 'growth' ? 'tasks' : firstRunFocus.area,
      createdAt: Date.now()
    });
  }, [firstRunFocus?.area, firstRunFocus?.label]);

  const handleSnapshotAction = (actionId: SnapshotActionId) => {
    if (actionId === 'first-task') {
      const firstTask = gardenTasks[0];
      if (firstTask) {
        onSelectEntity(firstTask.id);
      }
      setActiveTab('tasks');
      return;
    }

    if (actionId === 'tasks') {
      setActiveTab('tasks');
      return;
    }

    if (actionId === 'activity') {
      setActivityFilter(selectedEntity?.type === 'plant' ? 'plant' : 'season');
      setActiveTab('tasks');
      return;
    }

    if (actionId === 'harvest') {
      setHarvestFilter(selectedEntity?.type === 'plant' ? 'plant' : 'season');
      setActiveTab('harvest');
      return;
    }

    if (actionId === 'planning') {
      setActiveTab('planning');
      return;
    }

    setActiveTab('harvest');
  };

  const handleScoreReasonAction = (reason: GardenScoreReason) => {
    setFocusCue({
      label: reason.focusLabel,
      area: reason.focusArea,
      createdAt: Date.now()
    });

    if (reason.entityId) {
      onSelectEntity(reason.entityId);
    }

    if (reason.actionId === 'first-task') {
      setRepairIntent({ type: 'task', entityId: reason.entityId });
    } else if (reason.actionId === 'harvest') {
      setRepairIntent({ type: 'harvest', entityId: reason.entityId });
    } else {
      setRepairIntent(null);
    }

    if (reason.actionId === 'select-entity') {
      setActiveTab('tasks');
      return;
    }

    if (reason.actionId === 'rule') {
      pendingManualTabRef.current = 'planning';
      setActiveTab('planning');
      return;
    }

    if (reason.actionId === 'calendar') {
      pendingManualTabRef.current = 'harvest';
      setActiveTab('harvest');
      return;
    }

    handleSnapshotAction(reason.actionId);
  };

  const isTaskRepairFocus = repairIntent?.type === 'task' && repairIntent.entityId === selectedEntity?.id && !selectedTaskDone;
  const isRuleRepairFocus = focusCue?.area === 'planning' && focusCue.label.includes('伴生冲突') && selectedEntity?.type === 'plant';
  const isHarvestRepairFocus = repairIntent?.type === 'harvest' && repairIntent.entityId === selectedEntity?.id && selectedEntity?.type === 'plant' && selectedActionTask?.id === 'harvest';

  const handleCompleteSelectedTask = () => {
    if (selectedEntity?.type !== 'plant' || !growthStatus) return;

    const actionTask = selectedActionTask || growthStatus.nextTask;
    if (actionTask.id === 'harvest') {
      onOpenHarvestPanel(selectedEntity.id, isHarvestRepairFocus ? 'score' : undefined);
      return;
    }

    const completed = onCompletePlantTask(selectedEntity.id, actionTask.id);
    if (completed) {
      setRepairIntent(null);
      setFocusCue({
        label: '任务已完成，Garden Score 已刷新',
        area: 'tasks',
        createdAt: Date.now()
      });
    }
  };

  const handleResolveCalendarReminder = (reminderId: string) => {
    const taskId = getReminderTaskId(reminderId);
    let completedCount = 0;

    if (taskId) {
      const targetEntityId = getReminderEntityId(reminderId);
      const targetTasks = gardenTaskPressure.filter(task => (
        task.task.id === taskId
          && (!targetEntityId || task.id === targetEntityId)
      ));

      targetTasks.forEach(task => {
        if (onCompletePlantTask(task.id, task.task.id, { note: `Calendar: ${task.task.detail}` })) {
          completedCount += 1;
        }
      });
    }

    setResolvedWeatherReminderIds((current) => new Set([...current, reminderId]));
    setFocusCue({
      label: completedCount > 0 ? `已防护 ${completedCount} 个作物，Garden Score 已刷新` : '提醒已处理，Garden Score 已刷新',
      area: 'calendar',
      createdAt: Date.now()
    });
  };

  const handlePreviewSafePlacement = () => {
    if (selectedEntity?.type !== 'plant') return;
    onPreviewSafePlacement(selectedEntity.id);
    setFocusCue({
      label: `${selectedEntity.plant.naming.zh} 的安全位置热力图`,
      area: 'planning',
      createdAt: Date.now()
    });
  };

  return (
    <aside className="absolute inset-x-3 bottom-3 z-20 max-h-[42vh] overflow-hidden rounded-lg border-2 border-amber-950/20 bg-[#fff8df]/95 text-sm shadow-[0_6px_0_rgba(120,72,24,0.16),0_16px_30px_rgba(61,40,20,0.18)] backdrop-blur md:inset-x-auto md:bottom-auto md:right-4 md:top-4 md:max-h-[calc(100vh-2rem)] md:w-72">
      <div className="max-h-[42vh] overflow-y-auto md:max-h-[calc(100vh-2rem)]">
      <div className="border-b-2 border-amber-900/10 bg-[#f4d58d] p-3 md:p-4">
        <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Inspector</div>
        <div className="mt-1 text-lg font-black text-amber-950">{selectedTitle}</div>
        <div className="mt-1 rounded-md bg-white/55 px-2 py-1 text-xs font-bold text-amber-800">{selectedMeta}</div>
        {focusCue && (
          <div className="mt-2 rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-[10px] font-black text-sky-900 shadow-[0_1px_0_rgba(14,116,144,0.12)]">
            已定位：{focusCue.label}
          </div>
        )}

        {selectedEntity?.type === 'plant' && selectedPlantAgronomy && (
          <div className="mt-3 hidden rounded-md border border-amber-900/10 bg-white/65 p-2 md:block">
            <div className="grid grid-cols-2 gap-1 text-[10px] font-black text-amber-900">
              <div>{selectedEntity.spanX}x{selectedEntity.spanY} 格</div>
              <div>{selectedPlantAgronomy.daysToMaturity} 天成熟</div>
              <div>{waterNeedLabel(selectedPlantAgronomy.waterNeed)}</div>
              <div>{rotationGroupLabel(selectedPlantAgronomy.rotationGroup)}</div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedPlantAgronomy.seasons.map(season => (
                <span key={season} className="rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-[10px] font-black text-green-800">
                  {seasonLabel(season)}
                </span>
              ))}
            </div>
          </div>
        )}

        {selectedEntity && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:overflow-visible md:pb-0">
            <button
              type="button"
              onClick={onFocusSelected}
              className="rounded-md border-2 border-green-900/15 bg-green-100 px-3 py-1.5 text-xs font-black text-green-900 shadow-[0_2px_0_rgba(22,101,52,0.12)] hover:bg-green-200"
            >
              聚焦
            </button>
            <button
              type="button"
              onClick={onRotateSelected}
              className="rounded-md border-2 border-amber-900/20 bg-white px-3 py-1.5 text-xs font-black text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.18)] hover:bg-amber-50"
            >
              旋转
            </button>
            <button
              type="button"
              onClick={onDeleteSelected}
              className="rounded-md border-2 border-red-900/20 bg-red-50 px-3 py-1.5 text-xs font-black text-red-800 shadow-[0_2px_0_rgba(127,29,29,0.12)] hover:bg-red-100"
            >
              删除
            </button>
          </div>
        )}
      </div>

      <div className="sticky top-0 z-10 grid grid-cols-3 gap-1 border-b-2 border-amber-900/10 bg-[#fff3c4] p-2">
        {tabItems.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`h-8 rounded-md border text-xs font-black shadow-[0_1px_0_rgba(120,72,24,0.1)] ${
              activeTab === tab.id
                ? 'border-amber-900/20 bg-[#f4d58d] text-amber-950'
                : 'border-amber-900/10 bg-white/70 text-amber-800 hover:bg-amber-50'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <span className={`ml-1 rounded-full border px-1.5 py-0.5 text-[9px] leading-none ${tabBadgeClassName(tab.tone)}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && !selectedEntity && (
        <>
          {selectedTileStatus && (
            <TileStatusPanel
              status={selectedTileStatus}
              rotationSuggestions={getTileRotationSuggestions(selectedTileStatus, plantingHistory)}
              onResolve={onResolveTileStatus}
              onResolveTask={onResolveTileTask}
              onSelectPlant={onSelectRecommendedPlant}
              highlight={focusCue?.area === 'tasks'}
            />
          )}

          <div className={`border-b-2 border-amber-900/10 p-4 ${focusCueClassName(focusCue?.area === 'tasks')}`}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Today Board</div>
              <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                {gardenTasks.length} 项
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <TaskCounter label="采收" value={taskSummary.harvestCount} tone="green" />
              <TaskCounter label="补水" value={taskSummary.waterCount} tone="blue" />
              <TaskCounter label="巡检" value={taskSummary.inspectCount} tone="amber" />
            </div>

            {gardenTasks.length > 0 ? (
              <div className="mt-3 space-y-2">
                {gardenTasks.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => onHoverTaskEntity(item.id)}
                    onMouseLeave={() => onHoverTaskEntity(null)}
                    onFocus={() => onHoverTaskEntity(item.id)}
                    onBlur={() => onHoverTaskEntity(null)}
                    onClick={() => onSelectEntity(item.id)}
                    className="block w-full rounded-md border border-amber-900/10 bg-white/70 p-2 text-left shadow-[0_2px_0_rgba(120,72,24,0.08)] hover:bg-amber-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-amber-950">{item.task.label} · {item.plantName}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${taskToneClassName(item.task.tone)}`}>
                        {item.stageLabel}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-amber-700">
                      <span>{item.position}</span>
                      <span>{item.daysRemaining === 0 ? '现在处理' : `${item.daysRemaining} 天`}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-md bg-white/60 p-2 text-xs leading-5 text-amber-800">放置植物后，这里会自动生成今日任务。</p>
            )}
          </div>

          <ActivityPanel
            records={filteredActivities}
            filter={activityFilter}
            canUsePlantFilter={false}
            exportName={activityExportName}
            onFilterChange={setActivityFilter}
            highlight={focusCue?.area === 'activity'}
          />
        </>
      )}

      {activeTab === 'harvest' && (
        <>
          <SeasonSnapshotPanel
            snapshot={seasonSnapshot}
            planYear={planYear}
            planSeason={planSeason}
            onAction={handleSnapshotAction}
            onReasonAction={handleScoreReasonAction}
            highlight={focusCue?.area === 'harvest'}
          />

          {selectedEntity?.type === 'plant' && (
            <div className="border-b-2 border-amber-900/10 p-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Plant Records</div>
                <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                  {selectedPlantHarvests.length + selectedPlantActivities.length} 条
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenHarvestPanel(selectedEntity.id)}
                className="mt-3 w-full rounded-md border-2 border-green-900/15 bg-green-100 px-3 py-1.5 text-xs font-black text-green-900 shadow-[0_2px_0_rgba(22,101,52,0.12)] hover:bg-green-200"
              >
                记录采收
              </button>
              <button
                type="button"
                onClick={() => onOpenActivityPanel(selectedEntity.id)}
                className="mt-2 w-full rounded-md border-2 border-amber-900/15 bg-white px-3 py-1.5 text-xs font-black text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.12)] hover:bg-amber-50"
              >
                记录操作
              </button>
              {selectedPlantHarvests.length > 0 || selectedPlantActivities.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {selectedPlantHarvests.map(record => (
                    <div key={record.id} className="rounded-md border border-green-900/10 bg-green-50/80 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-black text-green-950">采收 · {record.plantName}</div>
                        <div className="text-[10px] font-black text-green-800">{formatHarvestAmount(record)}</div>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-bold text-green-800">
                        <span>{formatHarvestDate(record.harvestedAt)}</span>
                        <span>{harvestModeLabel(record)}</span>
                      </div>
                      {record.note && <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-green-800">{record.note}</div>}
                    </div>
                  ))}
                  {selectedPlantActivities.map(record => (
                    <div key={record.id} className="rounded-md border border-amber-900/10 bg-white/70 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-black text-amber-950">{record.taskLabel}</div>
                      <div className="text-[10px] font-black text-amber-700">{formatHarvestDate(record.completedAt)}</div>
                    </div>
                    {record.note && <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-amber-800">{record.note}</div>}
                  </div>
                ))}
                </div>
              ) : (
                <p className="mt-3 rounded-md bg-white/60 p-2 text-xs leading-5 text-amber-800">这个植物还没有采收或操作记录。</p>
              )}
            </div>
          )}

          <div className={`border-b-2 border-amber-900/10 p-4 ${focusCueClassName(focusCue?.area === 'harvest')}`}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Harvest</div>
              <div className="flex items-center gap-1">
                <span className="rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-800">
                  {filteredHarvests.length} 条
                </span>
                <button
                  type="button"
                  disabled={filteredHarvests.length === 0}
                  onClick={() => exportHarvestCsv(filteredHarvests, harvestExportName)}
                  className="rounded-md border border-amber-900/15 bg-white px-2 py-0.5 text-[10px] font-black text-amber-900 hover:bg-amber-50 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  CSV
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1">
              {[
                { id: 'season' as const, label: '本季' },
                { id: 'plant' as const, label: '当前植物', disabled: selectedEntity?.type !== 'plant' },
                { id: 'all' as const, label: '全部' }
              ].map(filter => (
                <button
                  key={filter.id}
                  type="button"
                  disabled={filter.disabled}
                  onClick={() => setHarvestFilter(filter.id)}
                  className={`h-7 rounded-md border text-[10px] font-black shadow-[0_1px_0_rgba(120,72,24,0.1)] disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${
                    harvestFilter === filter.id
                      ? 'border-green-900/15 bg-green-100 text-green-900'
                      : 'border-amber-900/10 bg-white/75 text-amber-800 hover:bg-amber-50'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-md border border-green-900/10 bg-green-50 p-2 text-green-800">
                <div className="text-lg font-black leading-none">{filteredHarvestSummary.weightTotal}</div>
                <div className="mt-1 text-[10px] font-black">重量</div>
              </div>
              <div className="rounded-md border border-amber-900/10 bg-amber-50 p-2 text-amber-800">
                <div className="text-lg font-black leading-none">{filteredHarvestSummary.countTotal}</div>
                <div className="mt-1 text-[10px] font-black">件数</div>
              </div>
            </div>

            {filteredHarvests.length > 0 ? (
              <div className="mt-3 space-y-2">
                {filteredHarvestByPlant.length > 0 && (
                  <div className="rounded-md border border-green-900/10 bg-green-50/80 p-2">
                    <div className="text-[10px] font-black uppercase tracking-wider text-green-800">By Plant</div>
                    <div className="mt-2 space-y-1.5">
                      {filteredHarvestByPlant.slice(0, 4).map(item => (
                        <div key={item.plantId} className="flex items-center justify-between gap-2 text-[11px] font-black text-green-950">
                          <span>{item.plantName}</span>
                          <span className="text-right text-green-800">{item.count} 次 / {item.amounts}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {filteredHarvests.slice(0, 4).map(record => (
                  <div key={record.id} className="rounded-md border border-amber-900/10 bg-white/70 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-black text-amber-950">{record.plantName}</div>
                      <div className="text-[10px] font-black text-green-800">{formatHarvestAmount(record)}</div>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-amber-700">
                      <span>{formatHarvestDate(record.harvestedAt)}</span>
                      <span>{harvestModeLabel(record)}</span>
                    </div>
                    {record.note && <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-amber-800">{record.note}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-md bg-white/60 p-2 text-xs leading-5 text-amber-800">完成采收后，这里会显示本季收获。</p>
            )}
          </div>

          <div className={`border-b-2 border-amber-900/10 p-4 ${focusCueClassName(focusCue?.area === 'calendar')}`}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Calendar</div>
              <div className="flex gap-1">
                <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700">
                  Mock
                </span>
                <span className="rounded-full border border-sky-300 bg-sky-100 px-2 py-0.5 text-[10px] font-black text-sky-800">
                  {calendarReminders.length} 条
                </span>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {calendarReminders.map(reminder => (
                <div key={reminder.id} className={`rounded-md border p-2 ${calendarToneClassName(reminder.tone)}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-black">{reminder.label}</div>
                    {isActionableCalendarReminder(reminder.id) && (
                      <button
                        type="button"
                        onClick={() => handleResolveCalendarReminder(reminder.id)}
                        className="h-6 shrink-0 rounded-md border border-sky-400 bg-sky-100 px-2 text-[10px] font-black text-sky-950 shadow-[0_1px_0_rgba(14,116,144,0.12)] hover:bg-sky-200"
                      >
                        标记已防护
                      </button>
                    )}
                  </div>
                  <div className="mt-1 text-[10px] font-bold leading-4">{reminder.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'planning' && (
        <>
          {selectedEntity?.type === 'plant' && selectedPlantAgronomy && (
            <div className={`border-b-2 border-amber-900/10 p-4 ${focusCueClassName(focusCue?.area === 'planning')}`}>
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Plant Plan</div>
                <span className="rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-800">
                  {rotationGroupLabel(selectedPlantAgronomy.rotationGroup)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-green-900/10 bg-green-50/80 p-2 text-green-900">
                  <div className="text-[10px] font-black uppercase">Companions</div>
                  <div className="mt-1 font-black">{companionNames.length > 0 ? companionNames.join('、') : '暂无'}</div>
                </div>
                <div className="rounded-md border border-red-900/10 bg-red-50/80 p-2 text-red-900">
                  <div className="text-[10px] font-black uppercase">Conflicts</div>
                  <div className="mt-1 font-black">{enemyNames.length > 0 ? enemyNames.join('、') : '暂无'}</div>
                </div>
              </div>
              <div className="mt-2 rounded-md border border-amber-900/10 bg-white/70 p-2 text-[11px] font-bold leading-5 text-amber-800">
                {familyLabel(selectedPlantAgronomy.family)} · {sunRequirementLabel(selectedPlantAgronomy.sunRequirement)} · Zone {selectedPlantAgronomy.hardinessZones[0]}-{selectedPlantAgronomy.hardinessZones[1]}
              </div>
              {isRuleRepairFocus && (
                <div className="mt-2 rounded-md border border-sky-300 bg-sky-50 p-2 text-[10px] font-black text-sky-900">
                  <div>修复这项评分问题：查看低冲突位置，再拖动或重新放置作物。</div>
                  <button
                    type="button"
                    onClick={handlePreviewSafePlacement}
                    className="mt-2 h-7 w-full rounded-md border border-sky-400 bg-sky-100 px-2 text-[10px] font-black text-sky-950 shadow-[0_1px_0_rgba(14,116,144,0.12)] hover:bg-sky-200"
                  >
                    查看安全位置
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="border-b-2 border-amber-900/10 p-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Timeline</div>
              <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                {timelineItems.length} 项
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {timelineItems.map(item => (
                <div key={item.id} className="grid grid-cols-[16px_1fr] gap-2">
                  <div className="flex flex-col items-center">
                    <span className={`mt-1 h-3 w-3 rounded-full border-2 ${timelineDotClassName(item.tone)}`} />
                    <span className="mt-1 h-full w-px bg-amber-900/15" />
                  </div>
                  <div className="rounded-md border border-amber-900/10 bg-white/70 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-black text-amber-950">{item.label}</div>
                      <div className="text-[10px] font-black uppercase text-amber-700">{item.kind}</div>
                    </div>
                    <div className="mt-1 text-[10px] font-bold leading-4 text-amber-700">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'tasks' && growthStatus && (
        <>
          <div className={`border-b-2 border-amber-900/10 p-4 ${focusCueClassName(focusCue?.area === 'tasks')}`}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Growth</div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${growthStageClassName(growthStatus.stage)}`}>
                {growthStatus.stageLabel}
              </span>
            </div>
            <div className="mt-3 overflow-hidden rounded-full border-2 border-amber-950/15 bg-amber-100 shadow-inner">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-lime-500 via-green-500 to-emerald-600"
                style={{ width: `${Math.min(100, growthStatus.progressPercent)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-black text-amber-900">
              <span>已种植 {growthStatus.ageDays} 天</span>
              <span>{growthStatus.harvestReady ? '成熟完成' : `剩余 ${growthStatus.daysRemaining} 天`}</span>
            </div>
            <LifecycleStrip
              stage={growthStatus.stage}
              progressPercent={growthStatus.progressPercent}
              daysToMaturity={growthStatus.daysToMaturity}
            />
            <div className="mt-3 rounded-md border border-amber-900/10 bg-white/70 p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-black text-amber-950">今日任务 · {selectedActionTask?.label || growthStatus.nextTask.label}</div>
                <div className="text-[10px] font-black text-amber-700">{growthStatus.waterLabel}</div>
              </div>
              <div className="mt-1 text-xs leading-5 text-amber-800">{selectedActionTask?.detail || growthStatus.nextTask.detail}</div>
              {isTaskRepairFocus && (
                <div className="mt-2 rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-[10px] font-black text-sky-900">
                  修复这项评分问题：完成后任务压力会重新计算。
                </div>
              )}
              {isHarvestRepairFocus && (
                <div className="mt-2 rounded-md border border-green-300 bg-green-50 px-2 py-1 text-[10px] font-black text-green-900">
                  修复这项采收窗口：记录产量后，地块会进入待整理状态。
                </div>
              )}
              {!selectedTaskDone && selectedActionTask && (
                <button
                  type="button"
                  onClick={handleCompleteSelectedTask}
                  className={`mt-3 flex w-full items-center justify-center gap-2 rounded-md border-2 px-3 py-2.5 text-sm font-black shadow-[0_3px_0_rgba(22,101,52,0.14)] ${primaryActionClassName(selectedActionTask.id, isTaskRepairFocus || isHarvestRepairFocus)}`}
                >
                  <span className="text-base leading-none">{primaryActionIcon(selectedActionTask.id)}</span>
                  <span>{primaryActionLabel(selectedActionTask.id, isTaskRepairFocus, isHarvestRepairFocus)}</span>
                </button>
              )}
            </div>
          </div>
          <ActivityPanel
            records={filteredActivities}
            filter={activityFilter}
            canUsePlantFilter={selectedEntity?.type === 'plant'}
            exportName={activityExportName}
            onFilterChange={setActivityFilter}
            highlight={focusCue?.area === 'activity'}
          />
        </>
      )}

      {activeTab === 'planning' && (
        <>
          <div className="border-b-2 border-amber-900/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Rules</div>
                {ruleResult && <div className="mt-0.5 text-[10px] font-black text-amber-700">{ruleLayerLabel}图层</div>}
              </div>
              {ruleResult && (
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${recommendationClassName(ruleResult)}`}>
                  {recommendationLabel(ruleResult)}
                </span>
              )}
            </div>

            {ruleTitle && (
              <div className="mt-2 rounded-md border border-amber-900/10 bg-amber-50/80 px-2 py-1 text-[11px] font-black text-amber-900">
                已锁定 · {ruleTitle}
              </div>
            )}

            {!ruleResult ? (
              <p className="mt-2 rounded-md bg-white/60 p-2 text-xs leading-5 text-amber-800">选择植物后悬停到网格，查看伴生、相克和轮作反馈。</p>
            ) : ruleResult.details.length > 0 ? (
              <>
                {typeof ruleResult.score === 'number' && (
                  <div className="mt-2 rounded-md border border-amber-900/10 bg-white/70 p-2">
                    <div className="flex items-center justify-between text-[11px] font-black text-amber-900">
                      <span>{ruleScoreLabel}</span>
                      <span>{ruleResult.score}/100</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-amber-100">
                      <div className={`h-full rounded-full ${scoreBarClassName(ruleResult)}`} style={{ width: `${ruleResult.score}%` }} />
                    </div>
                  </div>
                )}
                <ul className="mt-2 space-y-2">
                  {ruleResult.details.map((detail, index) => (
                    <li key={`${detail}-${index}`} className="rounded-md border border-amber-900/10 bg-white/70 p-2 text-xs leading-5 text-amber-950">
                      {detail}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 rounded-md bg-white/60 p-2 text-xs leading-5 text-amber-800">当前位置没有明显伴生、相克或轮作提醒。</p>
            )}
          </div>

          {rotationSuggestions.length > 0 && (
            <div className="border-b-2 border-amber-900/10 p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Next Season</div>
              <div className="mt-2 space-y-2">
                {rotationSuggestions.map(suggestion => (
                  <div key={suggestion.group} className="rounded-md border border-green-900/10 bg-green-50/80 p-2 text-xs leading-5 text-green-900">
                    <div className="font-black">{suggestion.label}</div>
                    {suggestion.examples.length > 0 && <div className="text-green-700">{suggestion.examples.join('、')}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </aside>
  );
}

function getEntityTitle(entity: GardenEntity) {
  if (entity.type === 'plant') {
    return entity.plant.naming.zh;
  }

  if ('tileId' in entity) {
    return tiles.find(tile => tile.id === entity.tileId)?.name || entity.tileId;
  }

  return entity.type;
}

function statusLabel(status: SynergyResult['status']) {
  if (status === 'good') return '伴生';
  if (status === 'bad') return '冲突';
  return '中性';
}

function statusClassName(status: SynergyResult['status']) {
  if (status === 'good') return 'border-green-300 bg-green-100 text-green-800';
  if (status === 'bad') return 'border-red-300 bg-red-100 text-red-800';
  return 'border-amber-300 bg-amber-100 text-amber-800';
}

function recommendationLabel(result: SynergyResult) {
  if (result.recommendation === 'excellent') return '很适合';
  if (result.recommendation === 'ok') return '适合';
  if (result.recommendation === 'caution') return '谨慎';
  if (result.recommendation === 'bad') return '不推荐';
  return statusLabel(result.status);
}

function recommendationClassName(result: SynergyResult) {
  if (result.recommendation === 'excellent') return 'border-green-300 bg-green-100 text-green-800';
  if (result.recommendation === 'ok') return 'border-lime-300 bg-lime-100 text-lime-800';
  if (result.recommendation === 'caution') return 'border-amber-300 bg-amber-100 text-amber-800';
  if (result.recommendation === 'bad') return 'border-red-300 bg-red-100 text-red-800';
  return statusClassName(result.status);
}

function scoreBarClassName(result: SynergyResult) {
  if (result.recommendation === 'bad') return 'bg-red-500';
  if (result.recommendation === 'caution') return 'bg-amber-500';
  if (result.recommendation === 'excellent') return 'bg-green-500';
  return 'bg-lime-500';
}

function familyLabel(family: string) {
  const labels: Record<string, string> = {
    nightshade: '茄科',
    brassica: '十字花科',
    legume: '豆科',
    allium: '葱属',
    cucurbit: '葫芦科',
    aster: '菊科',
    apiaceae: '伞形科',
    lamiaceae: '唇形科',
    leafy: '叶菜类',
    root: '根菜类',
    flower: '花卉',
    fruit: '果物',
    other: '其他科属'
  };
  return labels[family] || family;
}

function rotationGroupLabel(group: string) {
  const labels: Record<string, string> = {
    fruiting: '果菜轮作组',
    leafy: '叶菜轮作组',
    root: '根菜轮作组',
    legume: '豆科轮作组',
    flower: '花卉轮作组',
    perennial: '多年生轮作组',
    other: '通用轮作组'
  };
  return labels[group] || group;
}

function waterNeedLabel(waterNeed: string) {
  if (waterNeed === 'high') return '高需水';
  if (waterNeed === 'low') return '低需水';
  return '中等需水';
}

function sunRequirementLabel(sunRequirement: string) {
  if (sunRequirement === 'partial_sun') return '半日照';
  if (sunRequirement === 'shade') return '耐阴';
  return '全日照';
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

function growthStageClassName(stage: NonNullable<ReturnType<typeof getPlantGrowthStatus>>['stage']) {
  if (stage === 'harvest') return 'border-green-300 bg-green-100 text-green-800';
  if (stage === 'mature') return 'border-yellow-300 bg-yellow-100 text-yellow-800';
  if (stage === 'growing') return 'border-lime-300 bg-lime-100 text-lime-800';
  return 'border-sky-300 bg-sky-100 text-sky-800';
}

function tileStatusToneLabel(tone: TileStatusInfo['tone']) {
  if (tone === 'green') return '空闲';
  if (tone === 'blue') return '水分';
  return '修整';
}

function tileStatusBadgeClassName(tone: TileStatusInfo['tone']) {
  if (tone === 'green') return 'border-green-300 bg-green-100 text-green-800';
  if (tone === 'blue') return 'border-sky-300 bg-sky-100 text-sky-800';
  return 'border-amber-300 bg-amber-100 text-amber-800';
}

function tileStatusPanelClassName(tone: TileStatusInfo['tone']) {
  if (tone === 'green') return 'border-green-900/10 bg-green-50 text-green-900';
  if (tone === 'blue') return 'border-sky-900/10 bg-sky-50 text-sky-900';
  return 'border-amber-900/10 bg-amber-50 text-amber-900';
}

function taskToneClassName(tone: 'blue' | 'green' | 'amber') {
  if (tone === 'green') return 'border-green-300 bg-green-100 text-green-800';
  if (tone === 'blue') return 'border-sky-300 bg-sky-100 text-sky-800';
  return 'border-amber-300 bg-amber-100 text-amber-800';
}

function TaskCounter({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'green' | 'amber' }) {
  return (
    <div className={`rounded-md border p-2 text-center ${taskCounterClassName(tone)}`}>
      <div className="text-lg font-black leading-none">{value}</div>
      <div className="mt-1 text-[10px] font-black">{label}</div>
    </div>
  );
}

function SeasonSnapshotPanel({
  snapshot,
  planYear,
  planSeason,
  onAction,
  onReasonAction,
  highlight
}: {
  snapshot: {
    plantCount: number;
    speciesCount: number;
    harvestReadyCount: number;
    harvestCount: number;
    activityCount: number;
    score: number;
    scoreReasons: GardenScoreReason[];
    actions: Array<{ id: SnapshotActionId; label: string; tone: 'green' | 'amber' | 'red' }>;
    topActivity: string;
    latestRecord: { label: string; at: number; tone: 'green' | 'amber' } | null;
  };
  planYear: number;
  planSeason: PlanSeason;
  onAction: (actionId: SnapshotActionId) => void;
  onReasonAction: (reason: GardenScoreReason) => void;
  highlight?: boolean;
}) {
  const scoreTone = gardenScoreTone(snapshot.score);

  return (
    <div className={`border-b-2 border-amber-900/10 p-4 ${focusCueClassName(highlight)}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Season Snapshot</div>
          <div className="mt-0.5 text-xs font-black text-amber-950">{planYear} · {seasonLabel(planSeason)}</div>
        </div>
        <span className="rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-800">
          {snapshot.harvestReadyCount > 0 ? `${snapshot.harvestReadyCount} 待采收` : '生长期'}
        </span>
      </div>

      <div className={`mt-3 rounded-md border p-2 ${gardenScorePanelClassName(scoreTone)}`}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider">Garden Score</div>
            <div className="mt-1 text-xs font-black">{gardenScoreLabel(snapshot.score)}</div>
          </div>
          <div className="text-2xl font-black leading-none">{snapshot.score}</div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
          <div className={`h-full rounded-full ${gardenScoreBarClassName(scoreTone)}`} style={{ width: `${snapshot.score}%` }} />
        </div>
        <div className="mt-2 space-y-1.5">
          {snapshot.scoreReasons.map(reason => (
            <button
              key={reason.label}
              type="button"
              onClick={() => onReasonAction(reason)}
              className={`block w-full rounded-md border px-2 py-1 text-left text-[10px] font-black shadow-[0_1px_0_rgba(120,72,24,0.08)] ${scoreReasonClassName(reason.tone)}`}
            >
              {reason.label}
            </button>
          ))}
        </div>
        {snapshot.actions.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {snapshot.actions.map(action => (
              <button
                key={action.id}
                type="button"
                onClick={() => onAction(action.id)}
                className={`h-7 rounded-md border px-2 text-[10px] font-black shadow-[0_1px_0_rgba(120,72,24,0.1)] ${scoreActionClassName(action.tone)}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <SnapshotMetric label="作物" value={snapshot.plantCount} tone="green" />
        <SnapshotMetric label="品种" value={snapshot.speciesCount} tone="amber" />
        <SnapshotMetric label="采收" value={snapshot.harvestCount} tone="blue" />
      </div>

      <div className="mt-3 grid grid-cols-[1fr_1.1fr] gap-2">
        <div className="rounded-md border border-amber-900/10 bg-white/70 p-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Ops</div>
          <div className="mt-1 flex items-end justify-between gap-2">
            <span className="text-lg font-black leading-none text-amber-950">{snapshot.activityCount}</span>
            <span className="text-right text-[10px] font-black text-amber-700">{snapshot.topActivity}</span>
          </div>
        </div>
        <div className={`rounded-md border p-2 ${snapshot.latestRecord?.tone === 'green' ? 'border-green-900/10 bg-green-50 text-green-900' : 'border-amber-900/10 bg-amber-50 text-amber-900'}`}>
          <div className="text-[10px] font-black uppercase tracking-wider">Latest</div>
          {snapshot.latestRecord ? (
            <>
              <div className="mt-1 truncate text-xs font-black">{snapshot.latestRecord.label}</div>
              <div className="mt-1 text-[10px] font-bold">{formatHarvestDate(snapshot.latestRecord.at)}</div>
            </>
          ) : (
            <div className="mt-1 text-xs font-black">暂无记录</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SnapshotMetric({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'green' | 'amber' }) {
  return (
    <div className={`rounded-md border p-2 text-center ${snapshotMetricClassName(tone)}`}>
      <div className="text-lg font-black leading-none">{value}</div>
      <div className="mt-1 text-[10px] font-black">{label}</div>
    </div>
  );
}

function LifecycleStrip({
  stage,
  progressPercent,
  daysToMaturity
}: {
  stage: GrowthStageId;
  progressPercent: number;
  daysToMaturity: number;
}) {
  const stages: Array<{ id: GrowthStageId; label: string; threshold: number }> = [
    { id: 'seed', label: '萌芽', threshold: 0 },
    { id: 'seedling', label: '幼苗', threshold: 15 },
    { id: 'growing', label: '生长', threshold: 35 },
    { id: 'mature', label: '成熟', threshold: 75 },
    { id: 'harvest', label: '采收', threshold: 100 }
  ];
  const activeIndex = stages.findIndex(item => item.id === stage);

  return (
    <div className="mt-3 rounded-md border border-amber-900/10 bg-amber-50/70 p-2">
      <div className="mb-2 flex items-center justify-between text-[10px] font-black text-amber-800">
        <span>Lifecycle</span>
        <span>{Math.min(140, progressPercent)}% · {daysToMaturity} 天成熟</span>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {stages.map((item, index) => {
          const isDone = index < activeIndex || progressPercent >= item.threshold;
          const isActive = item.id === stage;
          const dayMark = Math.round(daysToMaturity * (item.threshold / 100));
          return (
            <div key={item.id} className="min-w-0">
              <div className={`h-1.5 rounded-full ${isActive ? 'bg-amber-500' : isDone ? 'bg-green-500' : 'bg-amber-200'}`} />
              <div className={`mt-1 truncate text-center text-[9px] font-black ${isActive ? 'text-amber-950' : isDone ? 'text-green-800' : 'text-amber-600'}`}>
                {item.label}
              </div>
              <div className="text-center text-[8px] font-bold text-amber-600">
                {item.threshold === 0 ? 'D0' : `D${dayMark}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TileStatusPanel({
  status,
  rotationSuggestions,
  onResolve,
  onResolveTask,
  onSelectPlant,
  highlight
}: {
  status: TileStatusInfo;
  rotationSuggestions: Array<{ group: string; label: string; examples: Array<{ id: string; name: string }>; reason: string }>;
  onResolve: (status: TileStatusInfo) => void;
  onResolveTask: (status: TileStatusInfo) => void;
  onSelectPlant: (plantId: string) => void;
  highlight?: boolean;
}) {
  const tileAction = getTilePrimaryAction(status);
  return (
    <div className={`border-b-2 border-amber-900/10 p-4 ${focusCueClassName(highlight)}`}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Tile Status</div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${tileStatusBadgeClassName(status.tone)}`}>
          {status.gridX},{status.gridY}
        </span>
      </div>
      <div className={`mt-3 rounded-md border p-2 ${tileStatusPanelClassName(status.tone)}`}>
        <div className="text-xs font-black">{status.label}</div>
        <div className="mt-1 text-[10px] font-bold leading-4">{status.detail}</div>
      </div>
      <div className="mt-2 rounded-md border border-amber-900/10 bg-white/70 p-2 text-[10px] font-bold leading-4 text-amber-800">
        {status.recommendation}
      </div>
      {(status.kind === 'idle' || status.kind === 'cleanup') && rotationSuggestions.length > 0 && (
        <div className="mt-3 rounded-md border border-green-900/10 bg-green-50/80 p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-green-800">Next Crop</div>
            {status.kind === 'idle' && (
              <span className="rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-800">
                可规划
              </span>
            )}
          </div>
          {status.kind === 'cleanup' ? (
            <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-black leading-4 text-amber-900">
              先标记已整理，再选择下一季作物，系统会打开轮作热力图。
            </div>
          ) : (
            <div className="mt-2 rounded-md border border-green-300 bg-white/70 px-2 py-1 text-[10px] font-black leading-4 text-green-900">
              选择推荐作物后，将进入放置模式并显示轮作安全区域。
            </div>
          )}
          <div className="mt-2 space-y-2">
            {rotationSuggestions.map(suggestion => (
              <div key={suggestion.group} className="rounded-md border border-green-900/10 bg-white/70 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-black text-green-950">{suggestion.label}</div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {suggestion.examples.map(example => (
                      <button
                        key={example.id}
                        type="button"
                        onClick={() => onSelectPlant(example.id)}
                        className="rounded border border-green-900/10 bg-green-100 px-1.5 py-0.5 text-[10px] font-black text-green-800 hover:bg-green-200"
                      >
                        {example.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-1 text-[10px] font-bold leading-4 text-green-800">{suggestion.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tileAction && (
        <button
          type="button"
          onClick={() => status.kind === 'cleanup' ? onResolve(status) : onResolveTask(status)}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-md border-2 px-3 py-2.5 text-sm font-black shadow-[0_3px_0_rgba(22,101,52,0.14)] ${tileAction.className}`}
        >
          <span className="text-base leading-none">{tileAction.icon}</span>
          <span>{tileAction.label}</span>
        </button>
      )}
    </div>
  );
}

function ActivityPanel({
  records,
  filter,
  canUsePlantFilter,
  exportName,
  onFilterChange,
  highlight
}: {
  records: ActivityRecord[];
  filter: ActivityFilter;
  canUsePlantFilter: boolean;
  exportName: string;
  onFilterChange: (filter: ActivityFilter) => void;
  highlight?: boolean;
}) {
  return (
    <div className={`border-b-2 border-amber-900/10 p-4 ${focusCueClassName(highlight)}`}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">Activity</div>
        <div className="flex items-center gap-1">
          <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
            {records.length} 条
          </span>
          <button
            type="button"
            disabled={records.length === 0}
            onClick={() => exportActivityCsv(records, exportName)}
            className="rounded-md border border-amber-900/15 bg-white px-2 py-0.5 text-[10px] font-black text-amber-900 hover:bg-amber-50 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            CSV
          </button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1">
        {[
          { id: 'season' as const, label: '本季' },
          { id: 'plant' as const, label: '当前植物', disabled: !canUsePlantFilter },
          { id: 'all' as const, label: '全部' }
        ].map(item => (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            onClick={() => onFilterChange(item.id)}
            className={`h-7 rounded-md border text-[10px] font-black shadow-[0_1px_0_rgba(120,72,24,0.1)] disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${
              filter === item.id
                ? 'border-amber-900/20 bg-amber-100 text-amber-950'
                : 'border-amber-900/10 bg-white/75 text-amber-800 hover:bg-amber-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {records.length > 0 ? (
        <div className="mt-3 space-y-2">
          {records.slice(0, 4).map(record => (
            <div key={record.id} className="rounded-md border border-amber-900/10 bg-white/70 p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-black text-amber-950">{record.taskLabel} · {record.plantName}</div>
                <div className="text-[10px] font-black text-amber-700">{record.originX},{record.originY}</div>
              </div>
              <div className="mt-1 text-[10px] font-bold text-amber-700">{formatHarvestDate(record.completedAt)}</div>
              {record.note && <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-amber-800">{record.note}</div>}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md bg-white/60 p-2 text-xs leading-5 text-amber-800">完成补水、覆盖、排水或巡检后，这里会记录操作。</p>
      )}
    </div>
  );
}

function taskCounterClassName(tone: 'blue' | 'green' | 'amber') {
  if (tone === 'green') return 'border-green-900/10 bg-green-50 text-green-800';
  if (tone === 'blue') return 'border-sky-900/10 bg-sky-50 text-sky-800';
  return 'border-amber-900/10 bg-amber-50 text-amber-800';
}

function snapshotMetricClassName(tone: 'blue' | 'green' | 'amber') {
  if (tone === 'green') return 'border-green-900/10 bg-green-50 text-green-800';
  if (tone === 'blue') return 'border-sky-900/10 bg-sky-50 text-sky-800';
  return 'border-amber-900/10 bg-amber-50 text-amber-800';
}

function tabBadgeClassName(tone: 'neutral' | 'warning' | 'success') {
  if (tone === 'warning') return 'border-amber-300 bg-amber-100 text-amber-800';
  if (tone === 'success') return 'border-green-300 bg-green-100 text-green-800';
  return 'border-slate-300 bg-slate-100 text-slate-700';
}

function calendarToneClassName(tone: 'blue' | 'green' | 'amber') {
  if (tone === 'green') return 'border-green-900/10 bg-green-50 text-green-900';
  if (tone === 'blue') return 'border-sky-900/10 bg-sky-50 text-sky-900';
  return 'border-amber-900/10 bg-amber-50 text-amber-900';
}

function timelineDotClassName(tone: 'blue' | 'green' | 'amber') {
  if (tone === 'green') return 'border-green-700 bg-green-300';
  if (tone === 'blue') return 'border-sky-700 bg-sky-300';
  return 'border-amber-700 bg-amber-300';
}

function summarizeHarvests(records: HarvestRecord[]) {
  const weightTotal = records
    .filter(record => record.unit === 'lb' || record.unit === 'kg')
    .reduce((sum, record) => sum + record.quantity, 0);
  const countTotal = records
    .filter(record => record.unit === 'count' || record.unit === 'bunch')
    .reduce((sum, record) => sum + record.quantity, 0);

  return {
    weightTotal: formatCompactNumber(weightTotal),
    countTotal: formatCompactNumber(countTotal)
  };
}

function summarizeHarvestsByPlant(records: HarvestRecord[]) {
  const groups = new Map<string, {
    plantId: string;
    plantName: string;
    count: number;
    latestAt: number;
    totals: Record<HarvestRecord['unit'], number>;
  }>();

  records.forEach(record => {
    const current = groups.get(record.plantId) || {
      plantId: record.plantId,
      plantName: record.plantName,
      count: 0,
      latestAt: 0,
      totals: { count: 0, bunch: 0, lb: 0, kg: 0 }
    };
    current.count += 1;
    current.latestAt = Math.max(current.latestAt, record.harvestedAt);
    current.totals[record.unit] += record.quantity;
    groups.set(record.plantId, current);
  });

  return Array.from(groups.values())
    .sort((a, b) => b.latestAt - a.latestAt)
    .map(group => ({
      plantId: group.plantId,
      plantName: group.plantName,
      count: group.count,
      amounts: formatHarvestTotals(group.totals)
    }));
}

function getGardenScore(
  plantCount: number,
  taskCount: number,
  harvestReadyCount: number,
  reminderCount: number,
  harvestCount: number,
  activityCount: number
) {
  if (plantCount === 0) return 0;

  const taskPressure = Math.min(30, taskCount * 4);
  const harvestOpportunity = Math.min(10, harvestReadyCount * 5);
  const climatePressure = Math.min(18, reminderCount * 3);
  const activityCoverage = Math.min(18, activityCount * 3);
  const harvestMomentum = Math.min(12, harvestCount * 4);
  const diversityBonus = Math.min(10, plantCount);
  const score = 68 - taskPressure - climatePressure + activityCoverage + harvestMomentum + harvestOpportunity + diversityBonus;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getGardenScoreReasons(
  plantEntities: PlantEntity[],
  gardenTasks: ReturnType<typeof getGardenTaskBoard>,
  reminders: ReturnType<typeof getGardenCalendarReminders>,
  harvestReadyPlants: PlantEntity[],
  harvestCount: number,
  activityCount: number
) : GardenScoreReason[] {
  const plantCount = plantEntities.length;
  const taskCount = gardenTasks.length;
  const reminderCount = reminders.length;
  const harvestReadyCount = harvestReadyPlants.length;

  if (plantCount === 0) {
    return [{ label: '还没有放置作物', tone: 'amber' as const, actionId: 'planning', focusArea: 'planning', focusLabel: '规划入口' }];
  }

  const reasons: GardenScoreReason[] = [];
  const firstTask = gardenTasks[0];
  const harvestReadyPlant = harvestReadyPlants[0];
  const targetedReminder = reminders.find(reminder => getReminderEntityId(reminder.id));
  const conflictEntity = getFirstRuleConflictEntity(plantEntities);

  if (taskCount >= 6) {
    reasons.push({ label: `任务积压 ${taskCount} 项，优先处理今日任务`, tone: 'red', actionId: 'first-task', entityId: firstTask?.id, focusArea: 'tasks', focusLabel: firstTask ? `${firstTask.plantName} 的今日任务` : '今日任务' });
  } else if (taskCount >= 3) {
    reasons.push({ label: `今日有 ${taskCount} 项任务需要跟进`, tone: 'amber', actionId: 'first-task', entityId: firstTask?.id, focusArea: 'tasks', focusLabel: firstTask ? `${firstTask.plantName} 的今日任务` : '今日任务' });
  }

  if (conflictEntity) {
    reasons.push({ label: `${conflictEntity.plant.naming.zh} 周边存在伴生冲突`, tone: 'red', actionId: 'rule', entityId: conflictEntity.id, focusArea: 'planning', focusLabel: `${conflictEntity.plant.naming.zh} 的伴生冲突` });
  }

  if (harvestReadyCount > 0) {
    reasons.push({ label: `${harvestReadyCount} 个作物接近采收窗口`, tone: 'green', actionId: 'harvest', entityId: harvestReadyPlant?.id, focusArea: 'harvest', focusLabel: harvestReadyPlant ? `${harvestReadyPlant.plant.naming.zh} 的采收窗口` : '采收窗口' });
  }

  if (reminderCount >= 4) {
    reasons.push({ label: `天气与日历提醒 ${reminderCount} 条，注意防护`, tone: 'amber', actionId: 'calendar', entityId: targetedReminder ? getReminderEntityId(targetedReminder.id) : firstTask?.id, focusArea: 'calendar', focusLabel: '天气与日历提醒' });
  }

  if (activityCount > 0) {
    reasons.push({ label: `本季已有 ${activityCount} 次养护操作`, tone: 'green', actionId: 'activity', focusArea: 'activity', focusLabel: '本季养护记录' });
  } else {
    reasons.push({ label: '本季还没有养护记录', tone: 'amber', actionId: 'tasks', entityId: firstTask?.id, focusArea: 'tasks', focusLabel: '今日养护任务' });
  }

  if (harvestCount > 0) {
    reasons.push({ label: `本季已有 ${harvestCount} 次采收`, tone: 'green', actionId: 'harvest', focusArea: 'harvest', focusLabel: '本季采收记录' });
  }

  return reasons.slice(0, 3);
}

function getReminderEntityId(reminderId: string) {
  const [, entityId] = reminderId.match(/^(?:season|water)-(.+)$/) || [];
  return entityId;
}

function getReminderTaskId(reminderId: string): 'cover' | 'water' | 'drainage' | null {
  if (reminderId === 'mock-cold-snap' || reminderId === 'first-frost' || reminderId === 'last-frost') return 'cover';
  if (reminderId === 'mock-heat' || reminderId === 'mock-dry' || reminderId.startsWith('water-')) return 'water';
  if (reminderId === 'mock-rain') return 'drainage';
  return null;
}

function isActionableCalendarReminder(reminderId: string) {
  return Boolean(getReminderTaskId(reminderId));
}

function getFirstRuleConflictEntity(plantEntities: PlantEntity[]) {
  return plantEntities.find(entity => (
    plantEntities.some(other => (
      other.id !== entity.id
        && arePlantsNear(entity, other)
        && getCompanionRule(entity.plantId, other.plantId)?.effect === 'enemy'
    ))
  ));
}

function arePlantsNear(source: PlantEntity, target: PlantEntity) {
  return !(
    source.originX + source.spanX + 1 < target.originX
      || source.originX - 1 > target.originX + target.spanX
      || source.originY + source.spanY + 1 < target.originY
      || source.originY - 1 > target.originY + target.spanY
  );
}

function getGardenScoreActions(
  plantCount: number,
  gardenTasks: ReturnType<typeof getGardenTaskBoard>,
  reminderCount: number,
  harvestReadyCount: number,
  harvestCount: number,
  activityCount: number
) {
  if (plantCount === 0) {
    return [{ id: 'planning' as const, label: '查看规划', tone: 'amber' as const }];
  }

  const actions: Array<{ id: SnapshotActionId; label: string; tone: 'green' | 'amber' | 'red' }> = [];

  if (gardenTasks.length > 0) {
    actions.push({
      id: 'first-task',
      label: gardenTasks.length >= 5 ? '处理首个任务' : '查看今日任务',
      tone: gardenTasks.length >= 5 ? 'red' : 'amber'
    });
  }

  if (reminderCount > 0) {
    actions.push({ id: 'calendar', label: '查看提醒', tone: reminderCount >= 4 ? 'amber' : 'green' });
  }

  if (harvestReadyCount > 0 || harvestCount > 0) {
    actions.push({ id: 'harvest', label: harvestReadyCount > 0 ? '查看采收' : '采收记录', tone: 'green' });
  }

  if (activityCount > 0) {
    actions.push({ id: 'activity', label: '查看养护', tone: 'green' });
  } else {
    actions.push({ id: 'tasks', label: '开始养护', tone: 'amber' });
  }

  return actions.slice(0, 4);
}

function gardenScoreTone(score: number) {
  if (score >= 82) return 'strong';
  if (score >= 62) return 'steady';
  if (score >= 42) return 'watch';
  return 'risk';
}

function gardenScoreLabel(score: number) {
  if (score >= 82) return '状态很好';
  if (score >= 62) return '稳定推进';
  if (score >= 42) return '需要关注';
  if (score > 0) return '压力偏高';
  return '等待种植';
}

function gardenScorePanelClassName(tone: ReturnType<typeof gardenScoreTone>) {
  if (tone === 'strong') return 'border-green-900/10 bg-green-50 text-green-900';
  if (tone === 'steady') return 'border-lime-900/10 bg-lime-50 text-lime-900';
  if (tone === 'watch') return 'border-amber-900/10 bg-amber-50 text-amber-900';
  return 'border-red-900/10 bg-red-50 text-red-900';
}

function gardenScoreBarClassName(tone: ReturnType<typeof gardenScoreTone>) {
  if (tone === 'strong') return 'bg-green-500';
  if (tone === 'steady') return 'bg-lime-500';
  if (tone === 'watch') return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreReasonClassName(tone: 'green' | 'amber' | 'red') {
  if (tone === 'green') return 'border-green-900/10 bg-white/65 text-green-900';
  if (tone === 'red') return 'border-red-900/10 bg-white/65 text-red-900';
  return 'border-amber-900/10 bg-white/65 text-amber-900';
}

function scoreActionClassName(tone: 'green' | 'amber' | 'red') {
  if (tone === 'green') return 'border-green-900/15 bg-green-100 text-green-900 hover:bg-green-200';
  if (tone === 'red') return 'border-red-900/15 bg-red-100 text-red-900 hover:bg-red-200';
  return 'border-amber-900/15 bg-amber-100 text-amber-950 hover:bg-amber-200';
}

function focusCueClassName(active?: boolean) {
  return active
    ? 'bg-sky-50/70 shadow-[inset_3px_0_0_rgba(14,165,233,0.75),0_0_0_1px_rgba(125,211,252,0.8)]'
    : '';
}

function primaryActionLabel(taskId: NonNullable<ReturnType<typeof getPlantGrowthStatus>>['nextTask']['id'], isTaskRepairFocus: boolean, isHarvestRepairFocus: boolean) {
  if (taskId === 'harvest') return isHarvestRepairFocus ? '记录采收并刷新 Score' : '记录采收';
  if (isTaskRepairFocus) return '完成并刷新 Score';
  if (taskId === 'water') return '浇水';
  if (taskId === 'cover') return '覆盖保温';
  if (taskId === 'drainage') return '处理排水';
  if (taskId === 'inspect') return '巡检';
  if (taskId === 'protect') return '护苗';
  if (taskId === 'maintain') return '施肥 / 维护';
  return '完成操作';
}

function primaryActionIcon(taskId: NonNullable<ReturnType<typeof getPlantGrowthStatus>>['nextTask']['id']) {
  if (taskId === 'harvest') return '收';
  if (taskId === 'water') return '~';
  if (taskId === 'cover') return '^';
  if (taskId === 'drainage') return 'D';
  if (taskId === 'inspect') return '!';
  if (taskId === 'protect') return '+';
  if (taskId === 'maintain') return '*';
  return '✓';
}

function primaryActionClassName(taskId: NonNullable<ReturnType<typeof getPlantGrowthStatus>>['nextTask']['id'], isRepairFocus: boolean) {
  if (isRepairFocus) return 'border-sky-500 bg-sky-100 text-sky-950 hover:bg-sky-200';
  if (taskId === 'harvest') return 'border-green-700 bg-green-600 text-white hover:bg-green-700';
  if (taskId === 'water' || taskId === 'drainage') return 'border-sky-700 bg-sky-600 text-white hover:bg-sky-700';
  if (taskId === 'cover' || taskId === 'protect') return 'border-amber-700 bg-amber-500 text-amber-950 hover:bg-amber-400';
  return 'border-green-900/20 bg-green-100 text-green-900 hover:bg-green-200';
}

function getTilePrimaryAction(status: TileStatusInfo) {
  if (status.kind === 'cleanup') {
    return {
      icon: '*',
      label: '整理地块',
      className: 'border-amber-700 bg-amber-500 text-amber-950 hover:bg-amber-400'
    };
  }
  if (status.kind === 'water') {
    return {
      icon: '~',
      label: '浇水',
      className: 'border-sky-700 bg-sky-600 text-white hover:bg-sky-700'
    };
  }
  if (status.kind === 'drainage') {
    return {
      icon: 'D',
      label: '处理排水',
      className: 'border-sky-700 bg-sky-600 text-white hover:bg-sky-700'
    };
  }
  if (status.kind === 'cover') {
    return {
      icon: '^',
      label: '覆盖保护',
      className: 'border-amber-700 bg-amber-500 text-amber-950 hover:bg-amber-400'
    };
  }
  return null;
}

function getTopActivityLabel(records: ActivityRecord[]) {
  if (records.length === 0) return '暂无操作';

  const counts = new Map<string, number>();
  records.forEach(record => {
    counts.set(record.taskLabel, (counts.get(record.taskLabel) || 0) + 1);
  });

  const [label, count] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  return `${label} ${count} 次`;
}

function getLatestSeasonRecord(harvests: HarvestRecord[], activities: ActivityRecord[]) {
  const latestHarvest = harvests
    .slice()
    .sort((a, b) => b.harvestedAt - a.harvestedAt)[0];
  const latestActivity = activities
    .slice()
    .sort((a, b) => b.completedAt - a.completedAt)[0];

  if (!latestHarvest && !latestActivity) return null;
  if (latestHarvest && (!latestActivity || latestHarvest.harvestedAt >= latestActivity.completedAt)) {
    return {
      label: `采收 · ${latestHarvest.plantName}`,
      at: latestHarvest.harvestedAt,
      tone: 'green' as const
    };
  }

  return {
    label: `${latestActivity.taskLabel} · ${latestActivity.plantName}`,
    at: latestActivity.completedAt,
    tone: 'amber' as const
  };
}

function getTileRotationSuggestions(status: TileStatusInfo, plantingHistory: Record<string, PlantingRecord[]>) {
  if (status.kind !== 'idle' && status.kind !== 'cleanup') return [];

  const records = plantingHistory[`${status.gridX},${status.gridY}`] || [];
  const latest = records
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  const groups = latest
    ? rotationAdviceGroups(latest.rotationGroup)
    : ['legume', 'leafy'];

  return groups.slice(0, 2).map(group => ({
    group,
    label: rotationGroupShortLabel(group),
    examples: Array.from(plantMap.values())
      .filter(candidate => getPlantAgronomy(candidate.id).rotationGroup === group)
      .slice(0, 3)
      .map(candidate => ({ id: candidate.id, name: candidate.naming.zh })),
    reason: latest
      ? `上一轮种过${latest.plantName}，建议换成${rotationGroupShortLabel(group)}类。`
      : `${rotationGroupShortLabel(group)}类通常适合作为空地的安全起步选择。`
  }));
}

function rotationAdviceGroups(group: string) {
  const advice: Record<string, string[]> = {
    legume: ['leafy', 'fruiting'],
    leafy: ['root', 'legume'],
    root: ['fruiting', 'legume'],
    fruiting: ['legume', 'leafy'],
    flower: ['leafy', 'root'],
    perennial: ['leafy', 'legume'],
    other: ['legume', 'leafy']
  };
  return advice[group] || advice.other;
}

function rotationGroupShortLabel(group: string) {
  const labels: Record<string, string> = {
    fruiting: '果菜',
    leafy: '叶菜',
    root: '根菜',
    legume: '豆科',
    flower: '花卉',
    perennial: '多年生',
    other: '通用'
  };
  return labels[group] || group;
}

function formatHarvestTotals(totals: Record<HarvestRecord['unit'], number>) {
  const unitLabels: Record<HarvestRecord['unit'], string> = {
    count: '个',
    bunch: '把',
    lb: '磅',
    kg: '千克'
  };
  return (Object.keys(unitLabels) as HarvestRecord['unit'][])
    .filter(unit => totals[unit] > 0)
    .map(unit => `${formatCompactNumber(totals[unit])} ${unitLabels[unit]}`)
    .join(' · ') || '0';
}

function formatHarvestAmount(record: HarvestRecord) {
  const unitLabels: Record<HarvestRecord['unit'], string> = {
    count: '个',
    bunch: '把',
    lb: '磅',
    kg: '千克'
  };
  return `${formatCompactNumber(record.quantity)} ${unitLabels[record.unit]}`;
}

function harvestModeLabel(record: HarvestRecord) {
  return record.removedAfterHarvest === false ? '仅记录采收' : '采收并移除';
}

function exportHarvestCsv(records: HarvestRecord[], filename: string) {
  const headers = ['date', 'plant', 'quantity', 'unit', 'year', 'season', 'position', 'mode', 'note'];
  const rows = records.map(record => [
    new Date(record.harvestedAt).toISOString(),
    record.plantName,
    String(record.quantity),
    harvestUnitLabel(record.unit),
    String(record.year),
    seasonLabel(record.season),
    `${record.originX},${record.originY}`,
    harvestModeLabel(record),
    record.note
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(escapeCsvCell).join(','))
    .join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getHarvestExportName(filter: HarvestFilter, planYear: number, planSeason: PlanSeason, selectedEntity: GardenEntity | null) {
  if (filter === 'plant' && selectedEntity?.type === 'plant') {
    return `harvest-plant-${selectedEntity.plantId}.csv`;
  }
  if (filter === 'all') return 'harvest-all.csv';
  return `harvest-season-${planYear}-${planSeason}.csv`;
}

function exportActivityCsv(records: ActivityRecord[], filename: string) {
  const headers = ['date', 'plant', 'action', 'year', 'season', 'position', 'note'];
  const rows = records.map(record => [
    new Date(record.completedAt).toISOString(),
    record.plantName,
    record.taskLabel,
    String(record.year),
    seasonLabel(record.season),
    `${record.originX},${record.originY}`,
    record.note
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(escapeCsvCell).join(','))
    .join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getActivityExportName(filter: ActivityFilter, planYear: number, planSeason: PlanSeason, selectedEntity: GardenEntity | null) {
  if (filter === 'plant' && selectedEntity?.type === 'plant') {
    return `activity-plant-${selectedEntity.plantId}.csv`;
  }
  if (filter === 'all') return 'activity-all.csv';
  return `activity-season-${planYear}-${planSeason}.csv`;
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function harvestUnitLabel(unit: HarvestRecord['unit']) {
  const unitLabels: Record<HarvestRecord['unit'], string> = {
    count: '个',
    bunch: '把',
    lb: '磅',
    kg: '千克'
  };
  return unitLabels[unit];
}

function formatHarvestDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function formatCompactNumber(value: number) {
  if (!Number.isFinite(value)) return '0';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}
