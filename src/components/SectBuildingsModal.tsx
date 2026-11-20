import React, { useState } from 'react';
import { BUILDING_DEFS, ELEMENT_META } from '../data/constants';
import { BuildingId, GameState } from '../types/game';
import { formatNum, getBuildingProductionPerMin, getBuildingUpgradeCost } from '../utils/gameLogic';
import { BuildingSprite, ElementSeal, ResourceIcon, ScrollModalShell } from './ElementIcons';
import { ArrowUpCircle, Hammer, Sparkles, UserCheck } from 'lucide-react';

interface SectBuildingsModalProps {
  state: GameState;
  initialBuildingId?: BuildingId | null;
  onClose: () => void;
  onUpgradeBuilding: (id: BuildingId) => void;
  onHarvestAll: () => void;
  onAssignDisciple: (discipleId: string, buildingId: BuildingId | null) => void;
  onRefinePill: () => void;
  onForgeEquipment: () => void;
}

export function SectBuildingsModal({
  state,
  initialBuildingId,
  onClose,
  onUpgradeBuilding,
  onHarvestAll,
  onAssignDisciple,
  onRefinePill,
  onForgeEquipment,
}: SectBuildingsModalProps) {
  const [selectedId, setSelectedId] = useState<BuildingId>(initialBuildingId || 'chinh_dien');
  const [tab, setTab] = useState<'build' | 'craft'>('build');

  const buildingList = Object.keys(BUILDING_DEFS) as BuildingId[];
  const selectedDef = BUILDING_DEFS[selectedId];
  const selectedState = state.buildings[selectedId];
  const upgradeCost = getBuildingUpgradeCost(selectedId, selectedState.level);
  const prodPerMin = getBuildingProductionPerMin(state, selectedId);

  const canAffordUpgrade =
    state.resources.linhThach >= upgradeCost.linhThach &&
    state.resources.linhThao >= upgradeCost.linhThao &&
    state.resources.huyenThiet >= upgradeCost.huyenThiet &&
    (selectedId === 'chinh_dien' || selectedState.level < state.buildings.chinh_dien.level + 1);

  const assignedDisciples = state.disciples.filter((d) => d.assignedBuildingId === selectedId);
  const canRefinePill = state.resources.linhThao >= 90 && state.resources.linhThach >= 200;
  const canForgeGear = state.resources.huyenThiet >= 80 && state.resources.linhThach >= 380;

  return (
    <ScrollModalShell
      title="Xây Dựng Tông Môn & Quản Lý Tài Nguyên"
      subtitle="Nâng cấp kiến trúc, phân công đệ tử hợp ngũ hành và luyện đan rèn bảo"
      onClose={onClose}
      headerRight={
        <button
          onClick={onHarvestAll}
          className="px-3 py-1.5 rounded-lg bg-[#D4A24C] hover:bg-[#E5B864] text-[#1D150A] font-semibold text-xs cursor-pointer whitespace-nowrap"
        >
          Thu Hoạch Toàn Bộ
        </button>
      }
    >
      {/* Top Resource Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4 text-xs font-mono tabular-nums">
        <div className="px-2.5 py-2 rounded-lg bg-[#EAE1CD] border border-[#D4C39F] flex items-center gap-2">
          <ResourceIcon resource="linhThach" size="md" />
          <div>
            <div className="text-[11px] font-sans text-[#6B5F4C]">Linh Thạch</div>
            <div className="font-bold text-[#8A5A0F]">{formatNum(state.resources.linhThach)}</div>
          </div>
        </div>
        <div className="px-2.5 py-2 rounded-lg bg-[#EAE1CD] border border-[#D4C39F] flex items-center gap-2">
          <ResourceIcon resource="linhThao" size="md" />
          <div>
            <div className="text-[11px] font-sans text-[#6B5F4C]">Linh Thảo</div>
            <div className="font-bold text-[#257A52]">{formatNum(state.resources.linhThao)}</div>
          </div>
        </div>
        <div className="px-2.5 py-2 rounded-lg bg-[#EAE1CD] border border-[#D4C39F] flex items-center gap-2">
          <ResourceIcon resource="huyenThiet" size="md" />
          <div>
            <div className="text-[11px] font-sans text-[#6B5F4C]">Huyền Thiết</div>
            <div className="font-bold text-[#4B5563]">{formatNum(state.resources.huyenThiet)}</div>
          </div>
        </div>
        <div className="px-2.5 py-2 rounded-lg bg-[#EAE1CD] border border-[#D4C39F] flex items-center gap-2">
          <ResourceIcon resource="linhKhi" size="md" />
          <div>
            <div className="text-[11px] font-sans text-[#6B5F4C]">Linh Khí Trì</div>
            <div className="font-bold text-[#1D5E8C]">{formatNum(state.resources.linhKhi)}</div>
          </div>
        </div>
        <div className="px-2.5 py-2 rounded-lg bg-[#EAE1CD] border border-[#D4C39F] flex items-center gap-2">
          <ResourceIcon resource="dotPhaDan" size="md" />
          <div>
            <div className="text-[11px] font-sans text-[#6B5F4C]">Đột Phá Đan</div>
            <div className="font-bold text-[#7B4EA3]">{state.resources.dotPhaDan}</div>
          </div>
        </div>
        <div className="px-2.5 py-2 rounded-lg bg-[#EAE1CD] border border-[#D4C39F] flex items-center gap-2">
          <ResourceIcon resource="cuongHoaThach" size="md" />
          <div>
            <div className="text-[11px] font-sans text-[#6B5F4C]">Cường Hóa</div>
            <div className="font-bold text-[#B92B27]">{state.resources.cuongHoaThach}</div>
          </div>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex items-center gap-2 mb-4 border-b border-[#D5C5A3] pb-2">
        <button
          onClick={() => setTab('build')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            tab === 'build'
              ? 'bg-[#1E3B38] text-[#F8E4B0]'
              : 'bg-[#E8DFC9] text-[#4C4335] hover:bg-[#DDD1B4]'
          }`}
        >
          Kiến Trúc & Phân Công
        </button>
        <button
          onClick={() => setTab('craft')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            tab === 'craft'
              ? 'bg-[#1E3B38] text-[#F8E4B0]'
              : 'bg-[#E8DFC9] text-[#4C4335] hover:bg-[#DDD1B4]'
          }`}
        >
          Luyện Đan Lô & Rèn Pháp Bảo
        </button>
      </div>

      {tab === 'build' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Building List (5 cols) */}
          <div className="lg:col-span-5 space-y-2">
            {buildingList.map((bId) => {
              const def = BUILDING_DEFS[bId];
              const bState = state.buildings[bId];
              const rate = getBuildingProductionPerMin(state, bId);
              const isSel = selectedId === bId;
              const assignedCount = state.disciples.filter((d) => d.assignedBuildingId === bId).length;
              return (
                <button
                  key={bId}
                  onClick={() => setSelectedId(bId)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSel
                      ? 'bg-[#1E3B38] text-[#F9EED2] border-[#C9A45C]'
                      : 'bg-[#F5EFE0] hover:bg-[#ECE3CE] border-[#D7C6A5] text-[#24211C]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                        isSel ? 'bg-[#142826]' : 'bg-[#EAE1CD]'
                      }`}
                    >
                      <BuildingSprite buildingId={bId} className="w-10 h-10" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm truncate">{def.name}</span>
                        <span
                          className={`text-xs font-mono font-semibold ${
                            isSel ? 'text-[#F2D180]' : 'text-[#8A5A0F]'
                          }`}
                        >
                          Lv.{bState.level}
                        </span>
                      </div>
                      <div className={`text-[11px] mt-0.5 ${isSel ? 'text-[#C6DBD1]' : 'text-[#6B5F4C]'}`}>
                        {rate > 0 ? `+${rate} ${def.resourceLabel}` : def.resourceLabel}
                        {assignedCount > 0 ? ` · ${assignedCount} đệ tử trực` : ''}
                      </div>
                    </div>
                  </div>
                  <ElementSeal element={def.preferredElement} size="sm" />
                </button>
              );
            })}
          </div>

          {/* Selected Building Detail & Disciple Assignment (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 rounded-xl bg-[#F5EFE0] border border-[#D4C39F] space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gradient-to-b from-[#FAF3E0] to-[#E6D9BB] border border-[#D4C39F] flex items-center justify-center shrink-0 p-1 shadow-inner">
                    <BuildingSprite buildingId={selectedId} className="w-full h-full" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="text-xl font-bold text-[#1E3331]"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {selectedDef.name} · Cấp {selectedState.level}
                    </h3>
                    <p className="text-xs text-[#5E5444] mt-0.5">{selectedDef.description}</p>
                  </div>
                </div>
                <ElementSeal element={selectedDef.preferredElement} size="md" showName />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#DFD2B6] text-xs">
                <div>
                  <span className="text-[#6E6250]">Sản lượng hiện tại</span>
                  <div className="font-mono font-bold text-sm text-[#1E3B38] mt-0.5 flex items-center gap-1.5">
                    {selectedDef.resourceProduced && <ResourceIcon resource={selectedDef.resourceProduced} size="sm" />}
                    <span>
                      {prodPerMin > 0 ? `+${prodPerMin} ${selectedDef.resourceLabel}` : selectedDef.resourceLabel}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[#6E6250]">Hợp Ngũ Hành (+40% hiệu suất)</span>
                  <div className="font-semibold text-sm mt-0.5" style={{ color: ELEMENT_META[selectedDef.preferredElement].color }}>
                    Ưu tiên đệ tử hệ {ELEMENT_META[selectedDef.preferredElement].name}
                  </div>
                </div>
              </div>

              {/* Upgrade Section */}
              <div className="p-3 rounded-lg bg-[#EAE1CD] border border-[#D3C19C] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#3C3327]">Chi phí nâng lên Cấp {selectedState.level + 1}</span>
                  {selectedId !== 'chinh_dien' && selectedState.level >= state.buildings.chinh_dien.level + 1 && (
                    <span className="text-[#B92B27] font-semibold">Cần nâng Chính Điện trước</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
                  <span className={`inline-flex items-center gap-1 ${state.resources.linhThach >= upgradeCost.linhThach ? 'text-[#257A52]' : 'text-[#B92B27]'}`}>
                    <ResourceIcon resource="linhThach" size="xs" />
                    {formatNum(upgradeCost.linhThach)}
                  </span>
                  <span className={`inline-flex items-center gap-1 ${state.resources.linhThao >= upgradeCost.linhThao ? 'text-[#257A52]' : 'text-[#B92B27]'}`}>
                    <ResourceIcon resource="linhThao" size="xs" />
                    {formatNum(upgradeCost.linhThao)}
                  </span>
                  <span className={`inline-flex items-center gap-1 ${state.resources.huyenThiet >= upgradeCost.huyenThiet ? 'text-[#257A52]' : 'text-[#B92B27]'}`}>
                    <ResourceIcon resource="huyenThiet" size="xs" />
                    {formatNum(upgradeCost.huyenThiet)}
                  </span>
                </div>
                <button
                  disabled={!canAffordUpgrade}
                  onClick={() => onUpgradeBuilding(selectedId)}
                  className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                    canAffordUpgrade
                      ? 'bg-[#1E3B38] hover:bg-[#29504C] text-[#F9E6B3] cursor-pointer'
                      : 'bg-[#C9BEA8] text-[#6B6254] cursor-not-allowed'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  Nâng Cấp {selectedDef.shortName}
                </button>
              </div>
            </div>

            {/* Disciple Assignment */}
            <div className="p-4 rounded-xl bg-[#F5EFE0] border border-[#D4C39F] space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#1E3331] flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#257A52]" />
                  Phân Công Đệ Tử Trực ({assignedDisciples.length}/2)
                </h4>
                <span className="text-[11px] text-[#6E6250]">Đệ tử vẫn có thể xuất chiến bình thường</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {state.disciples.map((d) => {
                  const isHere = d.assignedBuildingId === selectedId;
                  const isMatch = d.element === selectedDef.preferredElement || d.secondaryElement === selectedDef.preferredElement;
                  const disabledAdd = !isHere && assignedDisciples.length >= 2;
                  return (
                    <div
                      key={d.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs ${
                        isHere ? 'bg-[#E3F1EA] border-[#5CA586]' : 'bg-[#FAF6EC] border-[#DFD2B6]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[#1E3331] truncate flex items-center gap-1.5">
                          <ElementSeal element={d.element} size="xs" />
                          <span>{d.name}</span>
                        </div>
                        <div className="text-[11px] text-[#6A5F4E]">
                          {isMatch ? 'Hợp Ngũ Hành (+40%)' : 'Hiệu suất chuẩn'}
                        </div>
                      </div>
                      <button
                        disabled={disabledAdd}
                        onClick={() => onAssignDisciple(d.id, isHere ? null : selectedId)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold shrink-0 cursor-pointer ${
                          isHere
                            ? 'bg-[#C84332] text-white hover:bg-[#A63324]'
                            : disabledAdd
                              ? 'bg-[#D6CCB8] text-[#7D7362] cursor-not-allowed'
                              : 'bg-[#1E3B38] text-[#F8E4B0] hover:bg-[#2B524E]'
                        }`}
                      >
                        {isHere ? 'Rút về' : 'Phân công'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Alchemy & Blacksmith Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Alchemy Furnace */}
          <div className="p-5 rounded-xl bg-[#F5EFE0] border border-[#D4C39F] space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-[#EAE1CD] border border-[#D4C39F] flex items-center justify-center p-1 shrink-0">
                <BuildingSprite buildingId="luyen_dan_phong" className="w-full h-full" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1E3331]" style={{ fontFamily: 'var(--font-display)' }}>
                  Luyện Đan Lô · Cấp {state.buildings.luyen_dan_phong.level}
                </h3>
                <p className="text-xs text-[#6B5F4C]">Luyện chế Đột Phá Đan (+15% xác suất đột phá mỗi viên)</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#EAE1CD] text-xs space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span>Công thức:</span>
                <strong className="font-mono inline-flex items-center gap-1">
                  <ResourceIcon resource="linhThao" size="xs" /> 90 +
                  <ResourceIcon resource="linhThach" size="xs" /> 200
                </strong>
                <span>→</span>
                <strong className="text-[#7B4EA3] inline-flex items-center gap-1">
                  <ResourceIcon resource="dotPhaDan" size="xs" />
                  +{1 + Math.floor(state.buildings.luyen_dan_phong.level / 3)} Đột Phá Đan
                </strong>
              </div>
              <div className="text-[#6B5F4C]">Nâng cấp Đan Lô lên cấp 3, 6 để tăng số lượng đan luyện mỗi mẻ.</div>
            </div>
            <button
              disabled={!canRefinePill}
              onClick={onRefinePill}
              className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 ${
                canRefinePill
                  ? 'bg-[#A63324] hover:bg-[#C23E2D] text-[#FFF4E0] cursor-pointer'
                  : 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Khai Lô Luyện Đột Phá Đan
            </button>
          </div>

          {/* Forge */}
          <div className="p-5 rounded-xl bg-[#F5EFE0] border border-[#D4C39F] space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-[#EAE1CD] border border-[#D4C39F] flex items-center justify-center p-1 shrink-0">
                <BuildingSprite buildingId="luyen_khi_cac" className="w-full h-full" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1E3331]" style={{ fontFamily: 'var(--font-display)' }}>
                  Luyện Khí Các · Cấp {state.buildings.luyen_khi_cac.level}
                </h3>
                <p className="text-xs text-[#6B5F4C]">Rèn ngẫu nhiên 1 món trong 12 ô trang bị (tỷ lệ ra Huyền Thoại!)</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#EAE1CD] text-xs space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span>Công thức:</span>
                <strong className="font-mono inline-flex items-center gap-1">
                  <ResourceIcon resource="huyenThiet" size="xs" /> 80 +
                  <ResourceIcon resource="linhThach" size="xs" /> 380
                </strong>
                <span>→</span>
                <strong className="text-[#B4690E]">1 Trang Bị Hiếm ~ Huyền Thoại</strong>
              </div>
              <div className="text-[#6B5F4C]">
                Cấp Luyện Khí Các càng cao, tỷ lệ rèn ra Sử Thi &amp; Huyền Thoại càng lớn.
              </div>
            </div>
            <button
              disabled={!canForgeGear}
              onClick={onForgeEquipment}
              className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 ${
                canForgeGear
                  ? 'bg-[#1E3B38] hover:bg-[#29514C] text-[#F9E6B3] cursor-pointer'
                  : 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
              }`}
            >
              <Hammer className="w-4 h-4" />
              Rèn Pháp Bảo Trang Bị
            </button>
          </div>
        </div>
      )}
    </ScrollModalShell>
  );
}
