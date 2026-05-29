import { getGardenCalendarReminders } from './calendar';
import { getGardenTaskBoard } from './growth';
import type { ActivityRecord, ClimateProfile, GardenEntity, HarvestRecord, PlanSeason } from './types';

export interface TimelineItem {
  id: string;
  label: string;
  detail: string;
  kind: 'task' | 'weather' | 'harvest' | 'activity';
  tone: 'blue' | 'green' | 'amber';
  sortValue: number;
}

export function getSeasonTimeline(
  entities: Record<string, GardenEntity>,
  harvestRecords: HarvestRecord[],
  activityRecords: ActivityRecord[],
  climateProfile: ClimateProfile,
  planYear: number,
  planSeason: PlanSeason
): TimelineItem[] {
  const tasks = getGardenTaskBoard(entities, climateProfile, planSeason).slice(0, 3).map((task, index) => ({
    id: `task-${task.id}-${task.task.id}`,
    label: `待办 · ${task.task.label}`,
    detail: `${task.plantName} · ${task.position}`,
    kind: 'task' as const,
    tone: task.task.tone,
    sortValue: 1000 - index
  }));

  const reminders = getGardenCalendarReminders(entities, climateProfile, planYear, planSeason).slice(0, 2).map((reminder, index) => ({
    id: `weather-${reminder.id}`,
    label: reminder.label,
    detail: reminder.detail,
    kind: 'weather' as const,
    tone: reminder.tone,
    sortValue: 800 - index
  }));

  const harvests = harvestRecords
    .filter(record => record.year === planYear && record.season === planSeason)
    .slice(0, 2)
    .map(record => ({
      id: `harvest-${record.id}`,
      label: `采收 · ${record.plantName}`,
      detail: `${formatAmount(record.quantity, record.unit)} · ${record.originX},${record.originY}`,
      kind: 'harvest' as const,
      tone: 'green' as const,
      sortValue: record.harvestedAt
    }));

  const activities = activityRecords
    .filter(record => record.year === planYear && record.season === planSeason)
    .slice(0, 2)
    .map(record => ({
      id: `activity-${record.id}`,
      label: `${record.taskLabel} · ${record.plantName}`,
      detail: `${formatDate(record.completedAt)} · ${record.originX},${record.originY}`,
      kind: 'activity' as const,
      tone: 'amber' as const,
      sortValue: record.completedAt
    }));

  return [...tasks, ...reminders, ...harvests, ...activities]
    .sort((a, b) => b.sortValue - a.sortValue)
    .slice(0, 7);
}

function formatAmount(quantity: number, unit: HarvestRecord['unit']) {
  const labels: Record<HarvestRecord['unit'], string> = {
    count: '个',
    bunch: '把',
    lb: '磅',
    kg: '千克'
  };
  return `${quantity}${labels[unit]}`;
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}
