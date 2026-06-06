import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { inferChinaClimateProfile, inferClimateProfileFromZip } from './climate';
import { plants } from './plants';
import { getClimateCalibrationStatus } from './plantingWindow';
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
  }, [planName, gridWidth, gridHeight, cellSizeFeet, planYear, planSeason, climateProfile]);

  const area = useMemo(() => {
    return Math.round(gridWidth * gridHeight * cellSizeFeet * cellSizeFeet * 10) / 10;
  }, [gridWidth, gridHeight, cellSizeFeet]);
  const calibrationStatus = useMemo(() => getClimateCalibrationStatus(draftClimate), [draftClimate]);

  const savedText = hasUnsavedChanges
    ? '自动保存中'
    : lastSavedAt
      ? `已保存 ${new Date(lastSavedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
      : '尚未保存';

  const applySettings = () => {
    const climateChanged = !isSameClimate(draftClimate, climateProfile) || draftYear !== planYear || draftSeason !== planSeason;
    onRename(draftName);
    onSetPlanTime(draftYear, draftSeason);
    onUpdateClimateProfile(draftClimate);
    const ok = onResize(draftWidth, draftHeight, draftCellSize);
    setError(ok ? null : '当前有对象会超出新尺寸，先移动或删除它们。');
    if (climateChanged) {
      setClimateMessage(getCalibrationMessage(draftClimate));
    }
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
      setImportMessage('导入失败：无法读取方案文件');
    }
  };

  const inferClimate = () => {
    const inferred = draftClimate.province && draftClimate.city
      ? inferChinaClimateProfile(draftClimate.province, draftClimate.city, draftClimate.district || '')
      : inferClimateProfileFromZip(draftClimate.zipCode);
    if (!inferred) {
      setClimateMessage('暂未匹配该地区，请手动填写。');
      return;
    }

    setDraftClimate(inferred.profile);
    onUpdateClimateProfile(inferred.profile);
    setClimateMessage(`已使用 ${inferred.source} 近似资料，并刷新推荐`);
  };

  const updateMockScenario = (scenario: MockWeatherScenario) => {
    const nextClimate = { ...draftClimate, mockWeatherScenario: scenario };
    setDraftClimate(nextClimate);
    onUpdateClimateProfile(nextClimate);
    setClimateMessage(getCalibrationMessage(nextClimate));
  };

  return (
    <section className="m-4 rounded-lg border-2 border-amber-900/20 bg-[#fff8df] p-3 shadow-[0_3px_0_rgba(120,72,24,0.18)]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">方案设置</div>
          <h3 className="text-sm font-black text-amber-950">方案与季节</h3>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${hasUnsavedChanges ? 'border-amber-300 bg-amber-100 text-amber-800' : 'border-green-300 bg-green-50 text-green-800'}`}>
          {savedText}
        </span>
      </div>

      <div className={`mt-3 rounded-md border p-2 ${
        planName === 'Demo Scenario'
          ? 'border-amber-300 bg-amber-50 text-amber-900'
          : 'border-green-300 bg-green-50 text-green-900'
      }`}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-black uppercase tracking-wider">
            {planName === 'Demo Scenario' ? '参考菜园' : '正式方案'}
          </div>
          <span className="rounded-full border border-current/20 bg-white/65 px-2 py-0.5 text-[10px] font-black">
            {planName === 'Demo Scenario' ? '快速上手' : '正式规划'}
          </span>
        </div>
        <div className="mt-1 text-[10px] font-bold leading-4">
          {planName === 'Demo Scenario'
            ? '这是一个参考菜园，内含预置作物、养护任务和布局示范，适合快速熟悉功能。'
            : '当前方案为正式规划，尺寸、气候、植物选择和后续调整会保存在你的方案列表里。'}
        </div>
      </div>

      <div className="mt-3 rounded-md border border-amber-900/10 bg-white/55 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">菜园方案</div>
          <span className="rounded-full border border-amber-900/10 bg-white/70 px-2 py-0.5 text-[10px] font-black text-amber-800">
            {planSummaries.length} 个
          </span>
        </div>
        <div className="mt-2 max-h-[28dvh] space-y-1 overflow-y-auto pr-1 md:max-h-36">
          {planSummaries.map(plan => {
            const isActive = plan.id === planId;
            const isDemoPlan = plan.name === 'Demo Scenario';
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => onSwitchPlan(plan.id)}
                className={`w-full rounded-md border px-2 py-1.5 text-left shadow-[0_1px_0_rgba(120,72,24,0.08)] ${
                  isActive
                    ? 'border-green-300 bg-green-50 text-green-900'
                    : isDemoPlan
                      ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                      : 'border-amber-900/10 bg-white/80 text-amber-900 hover:bg-amber-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-black">{isDemoPlan ? '参考菜园' : plan.name}</span>
                  <span className="shrink-0 rounded-full border border-current/20 bg-white/65 px-1.5 py-0.5 text-[9px] font-black">
                    {isDemoPlan ? '参考' : isActive ? '当前' : '正式'}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] font-bold opacity-75">
                  <span>{plan.width}x{plan.height} 格</span>
                  <span>{formatPlanUpdatedAt(plan.updatedAt)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

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
        <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">地区气候</div>
        <div className="mt-2 grid grid-cols-[1fr_88px] gap-2">
          <label className="text-xs text-amber-800">
            省 / 直辖市
            <input
              value={draftClimate.province || ''}
              onChange={(event) => setDraftClimate(current => ({ ...current, province: event.target.value }))}
              onBlur={applySettings}
              className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 shadow-inner"
              placeholder="浙江"
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
            城市
            <input
              value={draftClimate.city || ''}
              onChange={(event) => setDraftClimate(current => ({ ...current, city: event.target.value }))}
              onBlur={applySettings}
              className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 shadow-inner"
              placeholder="杭州"
            />
          </label>
          <label className="text-xs text-amber-800">
            区县 / 片区
            <input
              value={draftClimate.district || ''}
              onChange={(event) => setDraftClimate(current => ({ ...current, district: event.target.value }))}
              onBlur={applySettings}
              className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 shadow-inner"
              placeholder="余杭 / 朝阳"
            />
          </label>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs text-amber-800">
            气候分区
            <input
              value={draftClimate.climateLabel || draftClimate.hardinessZone}
              onChange={(event) => setDraftClimate(current => ({ ...current, climateLabel: event.target.value }))}
              onBlur={applySettings}
              className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 shadow-inner"
              placeholder="华东"
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
          天气参考情景
          <select
            value={draftClimate.mockWeatherScenario || 'auto'}
            onChange={(event) => updateMockScenario(event.target.value as MockWeatherScenario)}
            className="mt-1 w-full rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-sm font-bold text-amber-950 shadow-inner"
          >
            <option value="auto">按季节节奏参考</option>
            <option value="cold_snap">偏冷参考</option>
            <option value="heat">偏热参考</option>
            <option value="rain">偏湿参考</option>
            <option value="dry">偏干参考</option>
          </select>
        </label>
        {climateMessage && (
          <div className="mt-2 rounded-md border border-green-300 bg-green-50 px-2 py-1 text-xs font-black text-green-800">
            {climateMessage}
          </div>
        )}
        <div className={`mt-2 rounded-md border px-2 py-1 text-[10px] font-black leading-4 ${
          calibrationStatus.level === 'city_refined'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
            : calibrationStatus.level === 'regional'
              ? 'border-sky-300 bg-sky-50 text-sky-900'
              : 'border-slate-300 bg-slate-50 text-slate-700'
        }`}>
          {calibrationStatus.label}：{calibrationStatus.detail}
        </div>
        <div className="mt-2 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-bold leading-4 text-sky-900">
          地区、季节与霜冻日期会影响植物标签、智能推荐、时令提醒和菜园评分。
        </div>
      </div>

      <div className="mt-3 rounded-md border border-slate-200 bg-white/65 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-700">数据范围</div>
          <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700">
            Alpha
          </span>
        </div>
        <div className="mt-2 grid gap-1 text-[10px] font-bold leading-4 text-slate-700">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
            作物资料：已覆盖 {plants.length} 种常见家庭菜园作物，适合做选种、轮作和补种的第一轮判断。
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
            地区画像：当前按中国省市气候画像与霜冻日期推断，适合先做本地化规划，必要时可手动校准。
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
            精调覆盖：当前已对部分高频城市启用城市级窗口微调；未覆盖城市仍按区域画像推断。
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
            天气参考：当前使用季节参考情景辅助判断播种窗口和养护节奏，不等同于实时天气。
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
            推荐逻辑：综合伴生、轮作、季节窗口、地区修正和天气参考，给出当前更适合的落点建议。
          </div>
        </div>
        <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-black leading-4 text-amber-900">
          当前版本已经适合做后院菜园的规划、预演和体验测试；真正落地种植前，建议再结合你所在地区经验做最后确认。
        </div>
      </div>

      <div className="mt-3 rounded-md border border-green-900/10 bg-green-50/80 p-2">
        <div className="text-[10px] font-black uppercase tracking-wider text-green-800">Alpha 体验重点</div>
        <div className="mt-2 grid gap-1 text-[10px] font-bold leading-4 text-green-900">
          {[
            '先生成或打开一版菜园，感受画布、推荐和任务是否顺手',
            '点开番茄、黄瓜、生菜、空心菜、菜心，看看作物节奏是否容易读懂',
            '完成一次浇水、覆盖、排水或采收，确认任务与地块状态是否连贯',
            '点空地查看智能推荐，留意推荐理由、可信度和地区说明是否好理解',
            '如果你熟悉本地种植节奏，重点看窗口判断和提醒是否接近你的经验'
          ].map((item, index) => (
            <div key={item} className="flex items-center gap-2 rounded-md border border-green-200 bg-white/75 px-2 py-1">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-green-300 bg-green-100 text-[8px] font-black text-green-800">
                {index + 1}
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 rounded-md border border-green-200 bg-white/75 px-2 py-1 text-[10px] font-black leading-4 text-green-900">
          最有价值的反馈：哪里让你觉得“这个判断像真的”，哪里又让你觉得“不太像我当地的种法”。
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={onCreatePlan} className="rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-xs font-bold text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.14)] hover:bg-amber-50">
          新建菜园
        </button>
        <button onClick={onDuplicatePlan} className="rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-xs font-bold text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.14)] hover:bg-amber-50">
          复制方案
        </button>
        <button onClick={onLoad} className="rounded-md border-2 border-amber-900/20 bg-white px-2 py-1.5 text-xs font-bold text-amber-900 shadow-[0_2px_0_rgba(120,72,24,0.14)] hover:bg-amber-50">
          读取本地
        </button>
        <button onClick={onSave} className="rounded-md border-2 border-green-800/20 bg-green-50 px-2 py-1.5 text-xs font-bold text-green-800 shadow-[0_2px_0_rgba(22,101,52,0.12)] hover:bg-green-100">
          保存当前方案
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
          导出方案
        </button>
        <label className="cursor-pointer rounded-md border-2 border-sky-900/20 bg-white px-2 py-1.5 text-center text-xs font-bold text-sky-900 shadow-[0_2px_0_rgba(12,74,110,0.12)] hover:bg-sky-50">
          导入方案
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

function formatPlanUpdatedAt(updatedAt: number) {
  if (!updatedAt) return '未保存';
  return new Date(updatedAt).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function isSameClimate(a: ClimateProfile, b: ClimateProfile) {
  return (a.province || '') === (b.province || '')
    && (a.city || '') === (b.city || '')
    && (a.district || '') === (b.district || '')
    && (a.climateLabel || '') === (b.climateLabel || '')
    && a.zipCode === b.zipCode
    && a.hardinessZone === b.hardinessZone
    && a.lastFrostDate === b.lastFrostDate
    && a.firstFrostDate === b.firstFrostDate
    && (a.mockWeatherScenario || 'auto') === (b.mockWeatherScenario || 'auto');
}

function getCalibrationMessage(climate: ClimateProfile) {
  const locationLabel = climate.city
    ? `${climate.province || ''}${climate.city}${climate.district ? ` · ${climate.district}` : ''}`
    : climate.zipCode || '本地';
  return `已按 ${locationLabel} / ${climate.climateLabel || climate.hardinessZone || '地区未设定'} / 末霜 ${formatMonthDay(climate.lastFrostDate)} / 初霜 ${formatMonthDay(climate.firstFrostDate)} 刷新推荐`;
}

function formatMonthDay(monthDay: string) {
  if (!monthDay) return '未设定';
  const [month, day] = monthDay.split('-');
  return month && day ? `${Number(month)}/${Number(day)}` : monthDay;
}
