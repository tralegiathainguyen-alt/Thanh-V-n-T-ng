import React, { useState } from 'react';
import { ELEMENT_META, REALM_LADDER, SPIRIT_ROOT_META, VIP_FASHIONS } from '../data/constants';
import { Disciple, GameState } from '../types/game';
import {
  calculateBreakthroughChance,
  computeDiscipleStats,
  formatNum,
} from '../utils/gameLogic';
import {
  DisciplePortrait,
  ElementSeal,
  RealmBadge,
  ResourceIcon,
  ScrollModalShell,
  SpiritRootSeal,
} from './ElementIcons';
import { Flame, RefreshCw, Sparkles, Swords, UserPlus, Zap } from 'lucide-react';
import { QUALITY_RANKS } from '../data/discipleGrowth';
import {
  DiscipleDetailTab,
  DiscipleGrowthAction,
  DiscipleUpgradePanels,
} from './DiscipleUpgradePanels';

interface DisciplesModalProps {
  state: GameState;
  onClose: () => void;
  onToggleFormation: (discipleId: string) => void;
  onInfuseQi: (discipleId: string) => void;
  onBreakthrough: (discipleId: string, pillsUsed: number) => { success: boolean; message: string };
  onRecruitDisciple: (candidateId: string) => void;
  onRefreshRecruits: (premium: boolean) => void;
  onOpenEquipmentFor: (discipleId: string) => void;
  onDiscipleGrowthAction: (discipleId: string, action: DiscipleGrowthAction) => void;
}

export function DisciplesModal({
  state,
  onClose,
  onToggleFormation,
  onInfuseQi,
  onBreakthrough,
  onRecruitDisciple,
  onRefreshRecruits,
  onOpenEquipmentFor,
  onDiscipleGrowthAction,
}: DisciplesModalProps) {
  const [tab, setTab] = useState<'roster' | 'recruit'>('roster');
  const [detailTab, setDetailTab] = useState<DiscipleDetailTab>('overview');
  const [selectedId, setSelectedId] = useState<string>(state.disciples[0]?.id || '');
  const [pillsToUse, setPillsToUse] = useState(1);
  const [tribulationMsg, setTribulationMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [flashing, setFlashing] = useState(false);

  const selected: Disciple | undefined = state.disciples.find((d) => d.id === selectedId) || state.disciples[0];
  const tangKinhLvl = state.buildings.tang_kinh_cac.level;
  const forgeLvl = state.buildings.luyen_khi_cac.level;
  const maxDisciples = 4 + state.buildings.chinh_dien.level * 2;
  const formationCount = state.disciples.filter((d) => d.inFormation).length;

  const handleAttemptBreakthrough = () => {
    if (!selected) return;
    const actualPills = Math.min(pillsToUse, state.resources.dotPhaDan);
    setFlashing(true);
    const res = onBreakthrough(selected.id, actualPills);
    setTribulationMsg({ success: res.success, text: res.message });
    setTimeout(() => setFlashing(false), 680);
  };

  const selectedStats = selected
    ? computeDiscipleStats(selected, state.inventory, state.alliance, tangKinhLvl, forgeLvl)
    : null;
  const selectedRealm = selected ? REALM_LADDER[selected.realmIndex] : REALM_LADDER[0];
  const nextRealm = selected ? REALM_LADDER[selected.realmIndex + 1] : undefined;
  const rootMeta = selected ? SPIRIT_ROOT_META[selected.spiritRoot] || SPIRIT_ROOT_META.tu_linh_can : SPIRIT_ROOT_META.tu_linh_can;
  const qualityMeta = QUALITY_RANKS[selected?.qualityRank ?? 0] || QUALITY_RANKS[0];
  const actualPills = Math.min(pillsToUse, state.resources.dotPhaDan);
  const breakChance = selected ? calculateBreakthroughChance(selected, actualPills) : 0;

  // Check active Tương Sinh pairs in current formation
  const formationList = state.disciples
    .filter((d) => d.inFormation)
    .sort((a, b) => a.formationOrder - b.formationOrder);

  return (
    <ScrollModalShell
      title="Đệ Tử Tông Môn · Linh Căn & Đột Phá Cảnh Giới"
      subtitle={`Tổng đệ tử: ${state.disciples.length}/${maxDisciples} · Đội hình xuất chiến: ${formationCount}/5`}
      onClose={onClose}
      headerRight={
        <div className="flex items-center gap-3 text-xs font-mono text-[#F4D993]">
          <span className="inline-flex items-center gap-1">
            <ResourceIcon resource="linhKhi" size="xs" /> {formatNum(state.resources.linhKhi)}
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <ResourceIcon resource="dotPhaDan" size="xs" /> {state.resources.dotPhaDan}
          </span>
        </div>
      }
    >
      {/* Flash overlay for Lightning Tribulation */}
      {flashing && (
        <div className="pointer-events-none fixed inset-0 z-50 animate-tribulation" />
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-[#D4C39F] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('roster')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              tab === 'roster' ? 'bg-[#1E3B38] text-[#F9E6B3]' : 'bg-[#E8DFC9] text-[#4C4335] hover:bg-[#DDD1B4]'
            }`}
          >
            Danh Sách & Đột Phá ({state.disciples.length})
          </button>
          <button
            onClick={() => setTab('recruit')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              tab === 'recruit' ? 'bg-[#1E3B38] text-[#F9E6B3]' : 'bg-[#E8DFC9] text-[#4C4335] hover:bg-[#DDD1B4]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Chiêu Mộ Đệ Tử
          </button>
        </div>

        {/* Formation Elemental Flow Preview */}
        <div className="flex items-center gap-1.5 text-xs text-[#4C4335]">
          <span className="font-semibold">Chuỗi đội hình:</span>
          {formationList.map((d, i) => (
            <React.Fragment key={d.id}>
              <ElementSeal element={d.element} size="xs" />
              {i < formationList.length - 1 && (
                <span
                  className={
                    ELEMENT_META[d.element].generates === formationList[i + 1].element
                      ? 'text-[#257A52] font-bold'
                      : 'text-[#9A8E7A]'
                  }
                >
                  {ELEMENT_META[d.element].generates === formationList[i + 1].element ? '→Sinh→' : '·'}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {tab === 'roster' && selected && selectedStats ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Disciple Roster List (5 cols) */}
          <div className="lg:col-span-5 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {state.disciples.map((d) => {
              const st = computeDiscipleStats(d, state.inventory, state.alliance, tangKinhLvl, forgeLvl);
              const rm = REALM_LADDER[d.realmIndex];
              const rt = SPIRIT_ROOT_META[d.spiritRoot] || SPIRIT_ROOT_META.tu_linh_can;
              const isSel = d.id === selected.id;
              const readyBreak = d.qi >= d.maxQi && d.realmIndex < REALM_LADDER.length - 1;
              const df = d.fashionId ? VIP_FASHIONS[d.fashionId] : null;
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    setSelectedId(d.id);
                    setTribulationMsg(null);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSel
                      ? 'bg-[#1E3B38] text-[#F9EED2] border-[#C9A45C]'
                      : 'bg-[#F5EFE0] hover:bg-[#ECE3CE] border-[#D7C6A5] text-[#24211C]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <DisciplePortrait
                      discipleId={d.id}
                      name={d.name}
                      glyph={d.avatarGlyph}
                      element={d.element}
                      realmIndex={d.realmIndex}
                      spiritRoot={d.spiritRoot}
                      fashionId={d.fashionId}
                      borderColor={readyBreak ? '#FDE047' : '#D4B06A'}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm truncate">{d.name}</span>
                        {d.inFormation && (
                          <span className={`text-[10px] font-bold ${isSel ? 'text-[#FDE047]' : 'text-[#257A52]'}`}>
                            [Xuất chiến]
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] truncate flex items-center gap-1 ${isSel ? 'text-[#C6DBD1]' : 'text-[#6B5F4C]'}`}>
                        <RealmBadge realmIndex={d.realmIndex} size="xs" />
                        <span className="truncate">{rm?.fullName} · {df ? df.titleBadge : rt.tierLabel}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-mono font-bold ${isSel ? 'text-[#F5D687]' : 'text-[#8A5A0F]'}`}>
                      {formatNum(st.power)}
                    </div>
                    {readyBreak && (
                      <div className="text-[10px] font-bold text-[#F59E0B]">Đủ Linh Khí ↑</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Disciple Inspector & Breakthrough Panel (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 rounded-xl bg-[#F5EFE0] border border-[#D4C39F] space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <DisciplePortrait
                    discipleId={selected.id}
                    name={selected.name}
                    glyph={selected.avatarGlyph}
                    element={selected.element}
                    realmIndex={selected.realmIndex}
                    spiritRoot={selected.spiritRoot}
                    fashionId={selected.fashionId}
                    borderColor="#C9A45C"
                    size="lg"
                    fullBody
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold text-[#1E3331]" style={{ fontFamily: 'var(--font-display)' }}>
                        {selected.name}
                      </h3>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                        style={{
                          color: qualityMeta.color,
                          backgroundColor: qualityMeta.bgTint,
                          borderColor: `${qualityMeta.color}66`,
                        }}
                      >
                        {qualityMeta.name}
                      </span>
                      <ElementSeal element={selected.element} size="sm" showName />
                      {selected.secondaryElement && <ElementSeal element={selected.secondaryElement} size="xs" />}
                    </div>
                    <div className="text-xs text-[#6B5F4C] flex items-center gap-1.5 flex-wrap mt-0.5">
                      <RealmBadge realmIndex={selected.realmIndex} size="xs" />
                      <span>{selected.title} ·</span>
                      <strong style={{ color: selectedRealm.color }}>{selectedRealm.fullName}</strong>
                      {selected.fashionId && VIP_FASHIONS[selected.fashionId] && (
                        <>
                          <span>·</span>
                          <strong className="text-[#8A5A0F]">{VIP_FASHIONS[selected.fashionId].name}</strong>
                        </>
                      )}
                    </div>
                    <div className="text-xs mt-1 flex items-center gap-1.5 flex-wrap">
                      <SpiritRootSeal grade={selected.spiritRoot} size="xs" />
                      <span>
                        <strong style={{ color: rootMeta.color }}>{rootMeta.name}</strong> ({rootMeta.tierLabel}) · Tốc độ tu luyện x
                        {rootMeta.qiSpeedMult}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenEquipmentFor(selected.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#EAE0CA] hover:bg-[#DFD1B4] border border-[#C7B38B] text-xs font-semibold text-[#2E261C] cursor-pointer"
                  >
                    Trang Bị (12 Ô)
                  </button>
                  <button
                    disabled={selected.isSectMaster && selected.inFormation}
                    onClick={() => onToggleFormation(selected.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      selected.inFormation
                        ? selected.isSectMaster
                          ? 'bg-[#D3C8B2] text-[#706758] cursor-not-allowed'
                          : 'bg-[#C84332] hover:bg-[#AA3426] text-white'
                        : 'bg-[#1E3B38] hover:bg-[#2A514D] text-[#F9E6B3]'
                    }`}
                  >
                    <Swords className="w-3.5 h-3.5" />
                    {selected.inFormation ? (selected.isSectMaster ? 'Chưởng Môn' : 'Rút khỏi đội') : 'Đưa vào đội'}
                  </button>
                </div>
              </div>

              {/* 6-Pillar Disciple Growth Sub-Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#DFD2B6]">
                {(
                  [
                    { id: 'overview', label: 'Đột Phá' },
                    { id: 'root', label: 'Linh Căn' },
                    { id: 'arts', label: 'Công Pháp' },
                    { id: 'artifact', label: 'Pháp Bảo' },
                    { id: 'alchemy', label: 'Luyện Đan' },
                    { id: 'quality', label: 'Thăng Phẩm' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDetailTab(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      detailTab === t.id
                        ? 'bg-[#1E3B38] text-[#F9E6B3] shadow-xs'
                        : 'bg-[#EAE0CA] text-[#4C4335] hover:bg-[#DFD1B4]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Aptitude & Combat Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs font-mono tabular-nums">
                <div className="p-2 rounded bg-[#ECE3CE]">
                  <div className="font-sans text-[11px] text-[#6B5F4C]">Chiến Lực</div>
                  <div className="font-bold text-sm text-[#8A5A0F]">{formatNum(selectedStats.power)}</div>
                </div>
                <div className="p-2 rounded bg-[#ECE3CE]">
                  <div className="font-sans text-[11px] text-[#6B5F4C]">Sinh Lực / Thủ</div>
                  <div className="font-bold text-[#1E3331]">
                    {formatNum(selectedStats.hp)} / {formatNum(selectedStats.def)}
                  </div>
                </div>
                <div className="p-2 rounded bg-[#ECE3CE]">
                  <div className="font-sans text-[11px] text-[#6B5F4C]">Công / Bạo Kích</div>
                  <div className="font-bold text-[#B92B27]">
                    {formatNum(selectedStats.atk)} / {selectedStats.crit}%
                  </div>
                </div>
                <div className="p-2 rounded bg-[#ECE3CE]">
                  <div className="font-sans text-[11px] text-[#6B5F4C]">Tốc Độ / Ngũ Hành</div>
                  <div className="font-bold text-[#1D5E8C]">
                    {selectedStats.spd} / +{selectedStats.elemBonus}%
                  </div>
                </div>
              </div>

              {/* Personal Aptitude (Tư Chất Cá Nhân) */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 rounded border border-[#DACBA8] bg-[#FAF6EC]">
                  <div className="text-[#6B5F4C]">Cốt Căn (HP/Độ Kiếp)</div>
                  <div className="font-mono font-bold text-[#1E3B38]">{selected.aptitude.cotCan} / 100</div>
                </div>
                <div className="p-2 rounded border border-[#DACBA8] bg-[#FAF6EC]">
                  <div className="text-[#6B5F4C]">Ngộ Tính (Công/Tu Vi)</div>
                  <div className="font-mono font-bold text-[#1D5E8C]">{selected.aptitude.ngoTinh} / 100</div>
                </div>
                <div className="p-2 rounded border border-[#DACBA8] bg-[#FAF6EC]">
                  <div className="text-[#6B5F4C]">Khí Vận (Bạo/May Mắn)</div>
                  <div className="font-mono font-bold text-[#B4690E]">{selected.aptitude.khiVan} / 100</div>
                </div>
              </div>
            </div>

            {/* Cultivation & Breakthrough Ritual Card OR 5-Pillar Upgrade Panels */}
            {detailTab === 'overview' ? (
            <div className="p-4 rounded-xl bg-[#EFE6D2] border-2 border-[#C9A45C] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-[#1E3331] flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
                  <Zap className="w-4 h-4 text-[#B4690E]" />
                  Tu Luyện & Đột Phá Cảnh Giới
                </h4>
                {nextRealm ? (
                  <span className="text-xs font-semibold text-[#1D5E8C] inline-flex items-center gap-1.5">
                    <span>Tiếp theo:</span>
                    <RealmBadge realmIndex={selected.realmIndex + 1} size="xs" />
                    <span>{nextRealm.fullName}</span>
                  </span>
                ) : (
                  <span className="text-xs font-bold text-[#B92B27]">Đã đạt Đỉnh Phong Phi Thăng!</span>
                )}
              </div>

              {/* Qi Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono tabular-nums">
                  <span>Tu Vi Linh Khí</span>
                  <span>
                    {formatNum(selected.qi)} / {formatNum(selected.maxQi)} (
                    {Math.min(100, Math.floor((selected.qi / selected.maxQi) * 100))}%)
                  </span>
                </div>
                <div className="h-3 rounded-full bg-[#D7C8AA] overflow-hidden border border-[#B8A27A]">
                  <div
                    className="h-full bg-gradient-to-r from-[#246B96] via-[#2D8A68] to-[#D4A24C] transition-all duration-300"
                    style={{ width: `${Math.min(100, (selected.qi / selected.maxQi) * 100)}%` }}
                  />
                </div>
              </div>

              {tribulationMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-semibold border ${
                    tribulationMsg.success
                      ? 'bg-[#E3F5EC] border-[#4CA87B] text-[#14532D]'
                      : 'bg-[#FCECEB] border-[#DC6B64] text-[#991B1B]'
                  }`}
                >
                  {tribulationMsg.text}
                </div>
              )}

              {selected.qi < selected.maxQi ? (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-[#5E5444]">
                    Truyền công từ Linh Khí Trì để nhanh chóng viên mãn cảnh giới hiện tại.
                  </div>
                  <button
                    disabled={state.resources.linhKhi < 50}
                    onClick={() => onInfuseQi(selected.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                      state.resources.linhKhi >= 50
                        ? 'bg-[#246B96] hover:bg-[#1E597D] text-white cursor-pointer'
                        : 'bg-[#C9BEA8] text-[#6B6254] cursor-not-allowed'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    Truyền Công Linh Khí
                  </button>
                </div>
              ) : nextRealm ? (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Dùng Đột Phá Đan (+15%/viên):</span>
                      {[0, 1, 2, 3].map((cnt) => (
                        <button
                          key={cnt}
                          onClick={() => setPillsToUse(cnt)}
                          className={`px-2.5 py-1 rounded border font-mono cursor-pointer ${
                            pillsToUse === cnt
                              ? 'bg-[#7B4EA3] text-white border-[#5B367C]'
                              : 'bg-[#F8F3E6] text-[#3B3328] border-[#CBB993]'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                    <div className="font-mono font-bold text-sm text-[#1E3B38]">
                      Tỷ lệ thành công: <span className="text-[#B4690E]">{breakChance}%</span>
                    </div>
                  </div>
                  <button
                    onClick={handleAttemptBreakthrough}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#8A5A0F] via-[#C68A28] to-[#8A5A0F] hover:brightness-110 text-[#FFF8E6] font-bold text-sm flex items-center justify-center gap-2 shadow cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    Khởi Động Độ Kiếp — Đột Phá {nextRealm.fullName}
                  </button>
                </div>
              ) : null}
            </div>
            ) : (
              <DiscipleUpgradePanels
                tab={detailTab}
                disciple={selected}
                state={state}
                onAction={(action) => onDiscipleGrowthAction(selected.id, action)}
              />
            )}
          </div>
        </div>
      ) : (
        /* Recruitment Hall */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#EAE1CD] border border-[#D4C39F]">
            <div className="text-xs text-[#4C4335]">
              <strong>Chiêu Hiền Đài:</strong> Tìm kiếm thiên tài có <strong>Thiên Linh Căn</strong> hoặc{' '}
              <strong className="text-[#7B4EA3]">Biến Dị Linh Căn (Lôi / Băng / Phong)</strong> để xây dựng đội hình Ngũ Hành Liên Hoàn!
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onRefreshRecruits(false)}
                disabled={state.resources.linhThach < 300}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                  state.resources.linhThach >= 300
                    ? 'bg-[#1E3B38] hover:bg-[#2A514D] text-[#F8E4B0] cursor-pointer'
                    : 'bg-[#C9BEA8] text-[#6B6254] cursor-not-allowed'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tìm Thường (300 Linh Thạch)
              </button>
              <button
                onClick={() => onRefreshRecruits(true)}
                disabled={state.resources.tienNgoc < 40}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                  state.resources.tienNgoc >= 40
                    ? 'bg-[#8A5A0F] hover:bg-[#A66E14] text-[#FFF6DF] cursor-pointer'
                    : 'bg-[#C9BEA8] text-[#6B6254] cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Tầm Tiên Cao Cấp (40 Tiên Ngọc)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {state.recruitPool.map((cand) => {
              const rt = SPIRIT_ROOT_META[cand.spiritRoot];
              const rm = REALM_LADDER[cand.realmIndex];
              const cost = cand.spiritRoot.startsWith('bien_di')
                ? 1500
                : cand.spiritRoot === 'thien_linh_can'
                  ? 1000
                  : 450;
              const canRecruit = state.disciples.length < maxDisciples && state.resources.linhThach >= cost;

              return (
                <div
                  key={cand.id}
                  className="p-4 rounded-xl bg-[#F5EFE0] border border-[#D4C39F] flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <DisciplePortrait
                          discipleId={cand.id}
                          name={cand.name}
                          glyph={cand.avatarGlyph}
                          element={cand.element}
                          realmIndex={cand.realmIndex}
                          spiritRoot={cand.spiritRoot}
                          borderColor={rt.color}
                          size="sm"
                          fullBody
                        />
                        <div>
                          <div className="font-bold text-sm text-[#1E3331]">{cand.name}</div>
                          <div className="text-[11px] text-[#6B5F4C]">{rm?.fullName}</div>
                        </div>
                      </div>
                      <ElementSeal element={cand.element} size="sm" />
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#EAE1CD] text-xs flex items-center gap-2.5">
                      <SpiritRootSeal grade={cand.spiritRoot} size="md" />
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold" style={{ color: rt.color }}>
                          {rt.name} ({rt.tierLabel})
                        </div>
                        <div className="text-[11px] text-[#5B5142]">{rt.description}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-mono">
                      <div className="p-1.5 rounded bg-[#FAF6EC] border border-[#DFD2B6]">
                        <div className="font-sans text-[10px] text-[#6E6250]">Cốt Căn</div>
                        <div className="font-bold">{cand.aptitude.cotCan}</div>
                      </div>
                      <div className="p-1.5 rounded bg-[#FAF6EC] border border-[#DFD2B6]">
                        <div className="font-sans text-[10px] text-[#6E6250]">Ngộ Tính</div>
                        <div className="font-bold">{cand.aptitude.ngoTinh}</div>
                      </div>
                      <div className="p-1.5 rounded bg-[#FAF6EC] border border-[#DFD2B6]">
                        <div className="font-sans text-[10px] text-[#6E6250]">Khí Vận</div>
                        <div className="font-bold">{cand.aptitude.khiVan}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={!canRecruit}
                    onClick={() => onRecruitDisciple(cand.id)}
                    className={`w-full py-2 rounded-lg text-xs font-bold ${
                      canRecruit
                        ? 'bg-[#1E3B38] hover:bg-[#2A514D] text-[#F9E6B3] cursor-pointer'
                        : 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                    }`}
                  >
                    {state.disciples.length >= maxDisciples
                      ? 'Đã đầy chỗ (Nâng Chính Điện)'
                      : `Thu Nhận (${formatNum(cost)} Linh Thạch)`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ScrollModalShell>
  );
}
