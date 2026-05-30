import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { inferClimateProfileFromZip } from './climate';
import type { ClimateProfile, GardenPlan, GardenPlanSummary, MockWeatherScenario, PlanSeason } from './usePlannerStore';

interface GardenSettingsPanelProps {
  planId: string;
  planName: string;
  gridWidth: number;
  gridHeight: number;
  cellSizeFeet: number;
  planYear: number;
  planSeason: PlanSeason;
  climateProfile: ClimateProfile;
  planSummaries: GardenPlanSummary[];
  hasUnsavedChanges: boolean;
  lastSavedAt: number | null;
  canUndo: boolean;
  canRedo: boolean;
  onRename: (name: string) => void;
  onSetPlanTime: (year: number, season: PlanSeason) => void;
  onUpdateClimateProfile: (profile: ClimateProfile) => void;
  onResize: (width: number, height: number, cellSizeFeet: number) => boolean;
  onCreatePlan: () => void;
  onDuplicatePlan: () => void;
  onSwitchPlan: (planId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onLoad: () => void;
  onExportPlan: () => GardenPlan;
  onImportPlan: (plan: GardenPlan) => boolean;
}

export function GardenSettingsPanel({
  planId,
  planName,
  gridWidth,
  gridHeight,
  cellSizeFeet,
  planYear,
  planSeason,
  climateProfile,
  planSummaries,
  hasUnsavedChanges,
  lastSavedAt,
  canUndo,
  canRedo,
  onRename,
  onSetPlanTime,
  onUpdateClimateProfile,
  onResize,
  onCreatePlan,
  onDuplicatePlan,
  onSwitchPlan,
  onUndo,
  onRedo,
  onSave,
  onLoad,
  onExportPlan,
  onImportPlan
}: GardenSettingsPanelProps) {
  const [draftName, setDraftName] = useState(planName);
  const [draftWidth, setDraftWidth] = useState(gridWidth);
  const [draftHeight, setDraftHeight] = useState(gridHeight);
  const [draftCellSize, setDraftCellSize] = useState(cellSizeFeet);
  const [draftYear, setDraftYear] = useState(planYear);
  const [draftSeason, setDraftSeason] = useState<PlanSeason>(planSeason);
  const [draftClimate, setDraftClimate] = useState(climateProfile);
  const [error, setError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [climateMessage, setClimateMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraftName(planName);
    setDraftWidth(gridWidth);
    setDraftHeight(gridHeight);
    setDraftCellSize(cellSizeFeet);
    setDraftYear(planYear);
    setDraftSeason(planSeason);
    setDraftClimate(climateProfile);
    setError(null);
    setClimateMessage(null);
  }, [planName, gridWidth, gridHeight, cellSizeFeet, planYear, planSeason, climateProfile]);

  const area = useMemo(() => {
    return Math.round(gridWidth * gridHeight * cellSizeFeet * cellSizeFeet * 10) / 10;
  }, [gridWidth, gridHeight, cellSizeFeet]);

  const savedText = hasUnsavedChanges
    ? '自动保存中'
    : lastSavedAt
      ? `已保存 ${new Date(lastSavedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
      : '尚未保存';

  const applySettings = () => {
    onRename(draftName);
    onSetPlanTime(draftYear, draftSeason);
    onUpdateClimateProfile(draftClimate);
    const ok = onResize(draftWidth, draftHeight, draftCellSize);
    setError(ok ? null : '当前有对象会超出新尺寸，先移动或删除它们。');
  };

  const exportPlan = () => {
    const plan = onExportPlan();
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${sanitizeFileName(plan.name)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importPlan = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as GardenPlan;
      const ok = onImportPlan(parsed);
      setImportMessage(ok ? '已导入为新方案' : '导入失败：文件格式不匹配');
    } catch {
      setImportMessage('导入失败：无法读取 JSON');
    }
  };

  const inferClimate = () => {
    const inferred = inferClimateProfileFromZip(draftClimate.zipCode);
    if (!inferred) {
      setClimateMessage('暂未匹配该 ZIP，请手动填写。');
      return;
    }

    setDraftClimate(inferred.profile);
    onUpdateClimateProfile(inferred.profile);
    setClimateMessage(`已使用 ${inferred.source} 近似资料`);
  };

  const updateMockScenario = (scenario: MockWeatherScenario) => {
    const nextClimate = { ...draftClimate, mockWeatherScenario: scenario };
    setDraftClimate(nextClimate);
    onUpdateClimateProfile(nextClimate);
  };

  return (
    <section className="m-4 rounded-lg border-2 border-amber-900/20 bg-[#fff8df] p-3 shadow-[0_3px_0_rgba(120,72,24,0.18)]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Farm Ledger</div>
          <h3 className="text-sm font-black text-amber-950">方案与季节</h3>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${hasUnsavedChanges ? 'border-amber-300 bg-amber-100 text-amber-800' : 'border-green-300 bg-green-50 text-green-800'}`}>
          {savedText}
        </span>
      </div>

      <label className="block mt-3 text-xs text-amber-800">
        当前方案
        <select
          value={planId}
          onChange={(event) => onSwitchPlan(event.target.value)}
          className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 shadow-inner"
        >
          {planSummaries.map(plan => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs text-amber-800">
          年份
          <input
            type="number"
            min={2000}
            max={2100}
            value={draftYear}
            onChange={(event) => setDraftYear(Number(event.target.value))}
            onBlur={applySettings}
            className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 shadow-inner"
          />
        </label>
        <label className="text-xs text-amber-800">
          季节
          <select
            value={draftSeason}
            onChange={(event) => {
              const season = event.target.value as PlanSeason;
              setDraftSeason(season);
              onSetPlanTime(draftYear, season);
            }}
            className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 shadow-inner"
          >
            <option value="spring">春季</option>
            <option value="summer">夏季</option>
            <option value="fall">秋季</option>
            <option value="winter">冬季</option>
          </select>
        </label>
      </div>

      <label className="block mt-3 text-xs text-amber-800">
        名称
        <input
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={applySettings}
          className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 shadow-inner"
        />
      </label>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <label className="text-xs text-amber-800">
          宽
          <input
            type="number"
            min={1}
            max={64}
            value={draftWidth}
            onChange={(event) => setDraftWidth(Number(event.target.value))}
            onBlur={applySettings}
            className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 shadow-inner"
          />
        </label>
        <label className="text-xs text-amber-800">
          高
          <input
            type="number"
            min={1}
            max={64}
            value={draftHeight}
            onChange={(event) => setDraftHeight(Number(event.target.value))}
            onBlur={applySettings}
            className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 shadow-inner"
          />
        </label>
        <label className="text-xs text-amber-800">
          ft/格
          <input
            type="number"
            min={0.25}
            max={20}
            step={0.25}
            value={draftCellSize}
            onChange={(event) => setDraftCellSize(Number(event.target.value))}
            onBlur={applySettings}
            className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 shadow-inner"
          />
        </label>
      </div>

      <div className="mt-2 rounded-md bg-amber-100/70 px-2 py-1 text-xs font-bold text-amber-800">总面积约 {area} 平方英尺</div>
      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}

      <div className="mt-3 rounded-md border border-amber-900/10 bg-white/55 p-2">
        <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">Climate</div>
        <div className="mt-2 grid grid-cols-[1fr_88px] gap-2">
          <label className="text-xs text-amber-800">
            ZIP
            <input
              value={draftClimate.zipCode}
              onChange={(event) => setDraftClimate(current => ({ ...current, zipCode: event.target.value }))}
              onBlur={applySettings}
              className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 shadow-inner"
              placeholder="97205"
            />
          </label>
          <button
            type="button"
            onClick={inferClimate}
            className="mt-5 rounded-md border-2 border-green-900/15 bg-green-100 px-2 py-1.5 text-xs font-black text-green-900 shadow-[0_2px_0_rgba(22,101,52,0.12)] hover:bg-green-200"
          >
            推断
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs text-amber-800">
            耐寒区
            <input
              value={draftClimate.hardinessZone}
              onChange={(event) => setDraftClimate(current => ({ ...current, hardinessZone: event.target.value }))}
              onBlur={applySettings}
              className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 shadow-inner"
              placeholder="7a"
            />
          </label>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs text-amber-800">
            末霜
            <input
              value={draftClimate.lastFrostDate}
              onChange={(event) => setDraftClimate(current => ({ ...current, lastFrostDate: event.target.value }))}
              onBlur={applySettings}
              className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 shadow-inner"
              placeholder="04-15"
            />
          </label>
          <label className="text-xs text-amber-800">
            初霜
            <input
              value={draftClimate.firstFrostDate}
              onChange={(event) => setDraftClimate(current => ({ ...current, firstFrostDate: event.target.value }))}
              onBlur={applySettings}
              className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 shadow-inner"
              placeholder="10-15"
            />
          </label>
        </div>
        <label className="mt-2 block text-xs text-amber-800">
          Mock 天气
          <select
            value={draftClimate.mockWeatherScenario || 'auto'}
            onChange={(event) => updateMockScenario(event.target.value as MockWeatherScenario)}
            className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 shadow-inner"
          >
            <option value="auto">自动场景</option>
            <option value="cold_snap">寒潮</option>
            <option value="heat">高温</option>
            <option value="rain">降雨</option>
            <option value="dry">干旱</option>
          </select>
        </label>
        {climateMessage && <div className="mt-2 text-xs font-bold text-amber-700">{climateMessage}</div>}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <button onClick={onCreatePlan} className="rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-xs font-bold text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.14)] hover:bg-amber-50">
          新建
        </button>
        <button onClick={onDuplicatePlan} className="rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-xs font-bold text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.14)] hover:bg-amber-50">
          复制
        </button>
        <button onClick={onLoad} className="rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-xs font-bold text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.14)] hover:bg-amber-50">
          读取
        </button>
        <button onClick={onSave} className="rounded-md border-2 border-green-800/20 bg-green-50 px-2 py-1.5 text-xs font-bold text-green-800 shadow-[0_2px_0_rgba(22,101,52,0.12)] hover:bg-green-100">
          保存
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-xs font-bold text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.14)] disabled:opacity-40 hover:bg-amber-50"
        >
          撤销
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-xs font-bold text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.14)] disabled:opacity-40 hover:bg-amber-50"
        >
          重做
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button onClick={exportPlan} className="rounded-md border-2 border-sky-900/20 bg-sky-50 px-2 py-1.5 text-xs font-bold text-sky-900 shadow-[0_2px_0_rgba(12,74,110,0.12)] hover:bg-sky-100">
          导出 JSON
        </button>
        <label className="cursor-pointer rounded-md border-2 border-sky-900/20 bg-white px-2 py-1.5 text-center text-xs font-bold text-sky-900 shadow-[0_2px_0_rgba(12,74,110,0.12)] hover:bg-sky-50">
          导入 JSON
          <input type="file" accept="application/json,.json" onChange={importPlan} className="hidden" />
        </label>
      </div>
      {importMessage && <div className="mt-2 text-xs text-amber-700">{importMessage}</div>}
    </section>
  );
}

function sanitizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'garden-plan';
}
