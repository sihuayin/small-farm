import { plants, tiles, type TileType } from './usePlannerStore';

interface PlannerStatusBarProps {
  plantCount: number;
  surfaceCount: number;
  activeToolId: string | null;
  activeTileId: TileType | null;
}

export function PlannerStatusBar({
  plantCount,
  surfaceCount,
  activeToolId,
  activeTileId
}: PlannerStatusBarProps) {
  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-4 rounded-lg border-2 border-amber-950/20 bg-[#fff8df]/95 px-4 py-3 text-sm shadow-[0_5px_0_rgba(120,72,24,0.16),0_14px_28px_rgba(61,40,20,0.16)] backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="text-xs font-black uppercase tracking-wider text-amber-700">Plants</span>
        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-lg font-black text-amber-950">{plantCount}</span>
      </div>
      <div className="h-7 w-px bg-amber-900/20" />
      <div className="flex items-center gap-2">
        <span className="text-xs font-black uppercase tracking-wider text-green-800">Tiles</span>
        <span className="rounded-md bg-green-100 px-2 py-0.5 text-lg font-black text-green-900">{surfaceCount}</span>
      </div>
      {activeToolId && (
        <div className="flex items-center gap-2 rounded-md border border-amber-900/10 bg-white/70 px-2 py-1 text-amber-900">
          <span>{plants.find(p => p.id === activeToolId)?.naming.emoji}</span>
          <span className="font-black">
            {plants.find(p => p.id === activeToolId)?.naming.zh}
          </span>
        </div>
      )}
      {activeTileId && (
        <div className="flex items-center gap-2 rounded-md border border-green-900/10 bg-white/70 px-2 py-1 text-green-900">
          <span>{tiles.find(t => t.id === activeTileId)?.emoji}</span>
          <span className="font-black">
            {tiles.find(t => t.id === activeTileId)?.name}
          </span>
        </div>
      )}
    </div>
  );
}
