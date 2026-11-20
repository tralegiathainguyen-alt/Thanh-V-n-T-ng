import React from 'react';
import { REALM_LADDER, SPIRIT_ROOT_META } from '../data/constants';
import {
  ELEMENT_ARTS_META,
  NATAL_ARTIFACTS,
  NATAL_ARTIFACT_LIST,
  QUALITY_RANKS,
  SPIRIT_ROOT_COMBAT_BONUS,
  getArtUpgradeCost,
  getArtifactEnhanceCost,
  getArtifactRefineCost,
  getArtifactStats,
  getCurrentPillToxicity,
  getDiscipleGrowth,
  getMaxPillToxicity,
  getSpiritRootUpgradeCost,
  getTamPhapBonus,
  getTayTuyPillInfo,
  getThanThongBonus,
  getTuViPillInfo,
} from '../data/discipleGrowth';
import { Disciple, GameState, NatalArtifactType } from '../types/game';
import { formatNum } from '../utils/gameLogic';
import { ResourceIcon, SpiritRootSeal } from './ElementIcons';
import { Award, BookOpen, FlaskConical, Hammer, Sparkles, ShieldAlert } from 'lucide-react';

export type DiscipleDetailTab = 'overview' | 'root' | 'arts' | 'artifact' | 'alchemy' | 'quality';

export type DiscipleGrowthAction =
  | { type: 'upgrade_root' }
  | { type: 'upgrade_art'; kind: 'tamPhap' | 'thanThong' }
  | { type: 'select_artifact'; artifactType: NatalArtifactType }
  | { type: 'enhance_artifact' }
  | { type: 'refine_artifact' }
  | { type: 'consume_tuvi_pill' }
  | { type: 'consume_taytuy_pill'; statKey: 'atk' | 'hp' | 'def' }
  | { type: 'ascend_quality' };

interface DiscipleUpgradePanelsProps {
  tab: Exclude<DiscipleDetailTab, 'overview'>;
  disciple: Disciple;
  state: GameState;
  onAction: (action: DiscipleGrowthAction) => void;
}

export const DiscipleUpgradePanels: React.FC<DiscipleUpgradePanelsProps> = ({
  tab,
  disciple,
  state,
  onAction,
}) => {
  const growth = getDiscipleGrowth(disciple);
  const tangKinhLvl = state.buildings.tang_kinh_cac.level;
  const forgeLvl = state.buildings.luyen_khi_cac.level;
  const duocDienLvl = state.buildings.duoc_dien.level;
  const luyenDanLvl = state.buildings.luyen_dan_phong.level;

  // ==========================================================================
  // 1. LINH CĂN & NGŨ HÀNH
  // ==========================================================================
  if (tab === 'root') {
    const curMeta = SPIRIT_ROOT_META[disciple.spiritRoot] || SPIRIT_ROOT_META.tu_linh_can;
    const curCombat = SPIRIT_ROOT_COMBAT_BONUS[disciple.spiritRoot] || SPIRIT_ROOT_COMBAT_BONUS.tu_linh_can;
    const upg = getSpiritRootUpgradeCost(disciple.spiritRoot);
    const nextMeta = upg ? SPIRIT_ROOT_META[upg.nextGrade] : null;
    const nextCombat = upg ? SPIRIT_ROOT_COMBAT_BONUS[upg.nextGrade] : null;
    const canUpgrade = Boolean(
      upg &&
        state.resources.linhThach >= upg.linhThach &&
        state.resources.linhKhi >= upg.linhKhi &&
        state.resources.tinhHoaBoss >= upg.tinhHoaBoss,
    );

    return (
      <div className="space-y-3">
        <div className="p-3.5 rounded-xl bg-[#EFE6D2] border border-[#D4C39F]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#B4690E]" />
              <h4 className="font-bold text-sm text-[#1E3331]">Linh Căn & Khuếch Đại Ngũ Hành</h4>
            </div>
            <SpiritRootSeal grade={disciple.spiritRoot} />
          </div>
          <p className="text-xs text-[#544A3C] mb-3">{curMeta.description}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-[#FAF5E8] border border-[#DFCFAF]">
              <div className="text-[10px] text-[#6B5F4E]">Combo Bạo Kích</div>
              <div className="font-mono font-bold text-[#B91C1C]">+{curCombat.comboCritBonus}%</div>
            </div>
            <div className="p-2 rounded-lg bg-[#FAF5E8] border border-[#DFCFAF]">
              <div className="text-[10px] text-[#6B5F4E]">Xuyên Giáp Combo</div>
              <div className="font-mono font-bold text-[#7E22CE]">+{curCombat.armorPenBonus}%</div>
            </div>
            <div className="p-2 rounded-lg bg-[#FAF5E8] border border-[#DFCFAF]">
              <div className="text-[10px] text-[#6B5F4E]">Giảm MP Tuyệt Kỹ</div>
              <div className="font-mono font-bold text-[#1D5E8C]">-{curCombat.ultMpDiscount} MP</div>
            </div>
            <div className="p-2 rounded-lg bg-[#FAF5E8] border border-[#DFCFAF]">
              <div className="text-[10px] text-[#6B5F4E]">Khuếch Đại Tương Sinh</div>
              <div className="font-mono font-bold text-[#1E6B47]">+{curCombat.comboDmgBonus}%</div>
            </div>
          </div>
        </div>

        {upg && nextMeta && nextCombat ? (
          <div className="p-3.5 rounded-xl bg-[#FAF5E8] border-2 border-[#C9A45C]">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-xs font-bold text-[#1E3331]">
                Thăng cấp lên: <span style={{ color: nextMeta.color }}>{nextMeta.name}</span> ({nextMeta.tierLabel})
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EFE6D2] text-[#6B5F4E]">
                Tốc độ tu luyện x{nextMeta.qiSpeedMult}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono text-[#1E6B47] mb-3">
              <span>Bạo Combo: +{curCombat.comboCritBonus}% → +{nextCombat.comboCritBonus}%</span>
              <span>Xuyên Giáp: +{curCombat.armorPenBonus}% → +{nextCombat.armorPenBonus}%</span>
              <span>Giảm MP: -{curCombat.ultMpDiscount} → -{nextCombat.ultMpDiscount}</span>
              <span>ST Tương Sinh: +{curCombat.comboDmgBonus}% → +{nextCombat.comboDmgBonus}%</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                <span className={state.resources.linhThach >= upg.linhThach ? 'text-[#24211C]' : 'text-[#B91C1C]'}>
                  <ResourceIcon resource="linhThach" size="xs" /> {formatNum(upg.linhThach)}
                </span>
                <span className={state.resources.linhKhi >= upg.linhKhi ? 'text-[#24211C]' : 'text-[#B91C1C]'}>
                  <ResourceIcon resource="linhKhi" size="xs" /> {formatNum(upg.linhKhi)}
                </span>
                <span className={state.resources.tinhHoaBoss >= upg.tinhHoaBoss ? 'text-[#24211C]' : 'text-[#B91C1C]'}>
                  Tinh Hoa Boss: {upg.tinhHoaBoss} ({state.resources.tinhHoaBoss})
                </span>
              </div>
              <button
                disabled={!canUpgrade}
                onClick={() => onAction({ type: 'upgrade_root' })}
                className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                  canUpgrade
                    ? 'bg-[#B4690E] text-white hover:bg-[#99570B]'
                    : 'bg-[#D5C9B0] text-[#7D7362] cursor-not-allowed'
                }`}
              >
                Tẩy Luyện Linh Căn
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[#FEF3C7] border border-[#D97706] text-xs font-bold text-[#92400E]">
            ✦ Đệ tử đã đạt đỉnh phong Hỗn Độn Linh Căn — khuếch đại cực hạn Tương Sinh & Combo Liên Hoàn!
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // 2. CÔNG PHÁP & THẦN THÔNG (Tầng 1 → Tầng 10)
  // ==========================================================================
  if (tab === 'arts') {
    const names = ELEMENT_ARTS_META[disciple.element];
    const tamLvl = growth.cultivationArts.tamPhapLevel;
    const thanLvl = growth.cultivationArts.thanThongLevel;
    const tamBonus = getTamPhapBonus(tamLvl);
    const thanBonus = getThanThongBonus(thanLvl);
    const tamCost = getArtUpgradeCost(tamLvl, tangKinhLvl);
    const thanCost = getArtUpgradeCost(thanLvl, tangKinhLvl);
    const canUpTam =
      tamLvl < 10 &&
      state.resources.linhKhi >= tamCost.linhKhi &&
      state.resources.linhThach >= tamCost.linhThach;
    const canUpThan =
      thanLvl < 10 &&
      state.resources.linhKhi >= thanCost.linhKhi &&
      state.resources.linhThach >= thanCost.linhThach;

    return (
      <div className="space-y-3">
        <div className="text-[11px] text-[#5E5343] flex items-center justify-between">
          <span className="inline-flex items-center gap-1 font-semibold">
            <BookOpen className="w-3.5 h-3.5 text-[#1E6B47]" /> Kết nối Tàng Kinh Các (Cấp {tangKinhLvl})
          </span>
          <span className="font-mono text-[#1E6B47]">Giảm {Math.min(35, (tangKinhLvl - 1) * 4)}% tiêu hao tu luyện</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Tâm Pháp (Bị động) */}
          <div className="p-3.5 rounded-xl bg-[#EFE6D2] border border-[#D4C39F] flex flex-col justify-between gap-2.5">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#1E3B38] text-[#F4D993]">
                  Tâm Pháp · Bị Động
                </span>
                <span className="text-xs font-mono font-bold text-[#1E3B38]">Tầng {tamLvl}/10</span>
              </div>
              <div className="font-bold text-sm text-[#1E3331] mb-2">{names.tamPhapName}</div>
              <div className="space-y-1 text-xs text-[#4C4335]">
                <div>• Tốc Độ (SPD): <strong className="text-[#1D5E8C]">+{tamBonus.spdBonus}</strong></div>
                <div>• Hồi Linh Lực/lượt: <strong className="text-[#1D5E8C]">+{tamBonus.mpRegenPerTurn} MP</strong></div>
                <div>• Tỷ lệ Phản Kích: <strong className="text-[#B4690E]">{tamBonus.counterChance}%</strong></div>
                <div className="pt-1 flex flex-wrap gap-1 text-[10px]">
                  <span className={`px-1.5 py-0.5 rounded ${tamLvl >= 4 ? 'bg-[#DCFCE7] text-[#166534] font-bold' : 'bg-[#E2D8C0] text-[#7D7362]'}`}>
                    T4: +10% Thủ
                  </span>
                  <span className={`px-1.5 py-0.5 rounded ${tamLvl >= 7 ? 'bg-[#DCFCE7] text-[#166534] font-bold' : 'bg-[#E2D8C0] text-[#7D7362]'}`}>
                    T7: +10% Phản Kích
                  </span>
                  <span className={`px-1.5 py-0.5 rounded ${tamLvl >= 10 ? 'bg-[#FEF3C7] text-[#92400E] font-bold' : 'bg-[#E2D8C0] text-[#7D7362]'}`}>
                    T10: +10 MP/lượt
                  </span>
                </div>
              </div>
            </div>

            {tamLvl < 10 ? (
              <div className="pt-2 border-t border-[#D4C39F] flex items-center justify-between gap-2">
                <div className="text-[11px] font-mono space-x-2">
                  <span>LK {formatNum(tamCost.linhKhi)}</span>
                  <span>LT {formatNum(tamCost.linhThach)}</span>
                </div>
                <button
                  disabled={!canUpTam}
                  onClick={() => onAction({ type: 'upgrade_art', kind: 'tamPhap' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    canUpTam ? 'bg-[#1E3B38] text-[#F9E6B3] hover:bg-[#274D49]' : 'bg-[#D5C9B0] text-[#7D7362] cursor-not-allowed'
                  }`}
                >
                  Đột Phá Tầng {tamLvl + 1}
                </button>
              </div>
            ) : (
              <div className="text-xs font-bold text-[#1E6B47]">✓ Tâm Pháp Đại Viên Mãn</div>
            )}
          </div>

          {/* Thần Thông (Chủ động) */}
          <div className="p-3.5 rounded-xl bg-[#EFE6D2] border border-[#D4C39F] flex flex-col justify-between gap-2.5">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#991B1B] text-[#FEE2E2]">
                  Thần Thông · Chủ Động
                </span>
                <span className="text-xs font-mono font-bold text-[#991B1B]">Tầng {thanLvl}/10</span>
              </div>
              <div className="font-bold text-sm text-[#1E3331] mb-2">{names.thanThongName}</div>
              <div className="space-y-1 text-xs text-[#4C4335]">
                <div>• Uy lực kỹ năng: <strong className="text-[#B91C1C]">+{thanBonus.skillDmgPct}%</strong></div>
                <div>• Phá Giáp: <strong className="text-[#7E22CE]">{thanBonus.armorBreakPct}%</strong></div>
                <div>• Hiệu ứng phụ: <strong className="text-[#B4690E]">
                  {thanBonus.multiStrikeChance > 0
                    ? `Đánh Lan + Liên Kích ${thanBonus.multiStrikeChance}%`
                    : thanBonus.splashTargetPct > 0
                      ? `Đánh Lan ${thanBonus.splashTargetPct}% ST`
                      : 'Chưa mở khóa'}
                </strong></div>
                <div className="pt-1 flex flex-wrap gap-1 text-[10px]">
                  <span className={`px-1.5 py-0.5 rounded ${thanLvl >= 3 ? 'bg-[#DCFCE7] text-[#166534] font-bold' : 'bg-[#E2D8C0] text-[#7D7362]'}`}>
                    T3: Phá Giáp 15%
                  </span>
                  <span className={`px-1.5 py-0.5 rounded ${thanLvl >= 6 ? 'bg-[#DCFCE7] text-[#166534] font-bold' : 'bg-[#E2D8C0] text-[#7D7362]'}`}>
                    T6: Đánh Lan +1 địch
                  </span>
                  <span className={`px-1.5 py-0.5 rounded ${thanLvl >= 9 ? 'bg-[#FEF3C7] text-[#92400E] font-bold' : 'bg-[#E2D8C0] text-[#7D7362]'}`}>
                    T9: Liên Kích 28%
                  </span>
                </div>
              </div>
            </div>

            {thanLvl < 10 ? (
              <div className="pt-2 border-t border-[#D4C39F] flex items-center justify-between gap-2">
                <div className="text-[11px] font-mono space-x-2">
                  <span>LK {formatNum(thanCost.linhKhi)}</span>
                  <span>LT {formatNum(thanCost.linhThach)}</span>
                </div>
                <button
                  disabled={!canUpThan}
                  onClick={() => onAction({ type: 'upgrade_art', kind: 'thanThong' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    canUpThan ? 'bg-[#991B1B] text-white hover:bg-[#7F1D1D]' : 'bg-[#D5C9B0] text-[#7D7362] cursor-not-allowed'
                  }`}
                >
                  Đột Phá Tầng {thanLvl + 1}
                </button>
              </div>
            ) : (
              <div className="text-xs font-bold text-[#1E6B47]">✓ Thần Thông Đại Viên Mãn</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // 3. PHÁP BẢO & LUYỆN KHÍ (Kết nối Luyện Khí Các — Lò Rèn tông môn)
  // ==========================================================================
  if (tab === 'artifact') {
    const art = growth.natalArtifact;
    const meta = NATAL_ARTIFACTS[art.type];
    const stats = getArtifactStats(art, forgeLvl);
    const enhCost = getArtifactEnhanceCost(art.enhanceLevel, forgeLvl);
    const refCost = getArtifactRefineCost(art.refineLevel);
    const canEnh =
      art.enhanceLevel < 20 &&
      state.resources.huyenThiet >= enhCost.huyenThiet &&
      state.resources.cuongHoaThach >= enhCost.cuongHoaThach &&
      state.resources.linhThach >= enhCost.linhThach;
    const canRef =
      art.refineLevel < 5 &&
      forgeLvl >= refCost.requiredForgeLevel &&
      state.resources.huyenThiet >= refCost.huyenThiet &&
      state.resources.tinhHoaBoss >= refCost.tinhHoaBoss &&
      state.resources.linhThach >= refCost.linhThach;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[11px] text-[#5E5343]">
          <span className="inline-flex items-center gap-1 font-semibold">
            <Hammer className="w-3.5 h-3.5 text-[#B4690E]" /> Lò Rèn Luyện Khí Các (Cấp {forgeLvl})
          </span>
          <span className="font-mono text-[#B4690E]">Khuếch đại chỉ số Pháp Bảo +{Math.max(0, (forgeLvl - 1) * 8)}%</span>
        </div>

        {/* Select / Forge Bản Mệnh Pháp Bảo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {NATAL_ARTIFACT_LIST.map((item) => {
            const active = art.type === item.type;
            return (
              <button
                key={item.type}
                onClick={() => onAction({ type: 'select_artifact', artifactType: item.type })}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-[#1E3B38] text-[#F9EED2] border-[#C9A45C]'
                    : 'bg-[#FAF5E8] text-[#3B3328] border-[#D9CCB0] hover:border-[#B4690E]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className="text-base">{item.glyph}</span>
                  <span className="truncate">{item.name.replace('Bản Mệnh ', '').replace('Huyền Hỏa ', '').replace('Càn Khôn ', '').replace('Thanh Vân Tiên ', '')}</span>
                </div>
                <div className={`text-[10px] mt-0.5 ${active ? 'text-[#C8DFD4]' : 'text-[#6B5F4E]'}`}>
                  {item.role}
                </div>
              </button>
            );
          })}
        </div>

        {/* Current Artifact Summary + 2 Upgrade Layers */}
        <div className="p-3.5 rounded-xl bg-[#EFE6D2] border border-[#D4C39F] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-bold text-sm text-[#1E3331]">
                {meta.glyph} {meta.name} <span className="font-mono text-[#B4690E]">+{art.enhanceLevel}</span> · Tế Luyện Tầng {art.refineLevel}/5
              </div>
              <div className="text-[11px] text-[#544A3C]">{meta.refineDesc}</div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#1E3B38]">
              <span>Công +{formatNum(stats.atk)}</span>
              <span>·</span>
              <span>Máu +{formatNum(stats.hp)}</span>
              <span>·</span>
              <span>Thủ +{formatNum(stats.def)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {/* Layer 1: Cường Hóa */}
            <div className="p-2.5 rounded-lg bg-[#FAF5E8] border border-[#DFCFAF] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#1E3331]">
                <span>1. Cường Hóa Cơ Bản</span>
                <span className="font-mono text-[#B4690E]">+{art.enhanceLevel}/20</span>
              </div>
              {art.enhanceLevel < 20 ? (
                <>
                  <div className="text-[11px] font-mono text-[#544A3C] flex flex-wrap gap-2">
                    <span>Huyền Thiết: {formatNum(enhCost.huyenThiet)}</span>
                    <span>Cường Hóa Thạch: {enhCost.cuongHoaThach}</span>
                    <span>LT: {formatNum(enhCost.linhThach)}</span>
                  </div>
                  <button
                    disabled={!canEnh}
                    onClick={() => onAction({ type: 'enhance_artifact' })}
                    className={`w-full py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      canEnh ? 'bg-[#B4690E] text-white hover:bg-[#99570B]' : 'bg-[#D5C9B0] text-[#7D7362] cursor-not-allowed'
                    }`}
                  >
                    Cường Hóa lên +{art.enhanceLevel + 1}
                  </button>
                </>
              ) : (
                <div className="text-xs font-bold text-[#1E6B47]">✓ Đã đạt Cường Hóa tối đa +20</div>
              )}
            </div>

            {/* Layer 2: Tế Luyện */}
            <div className="p-2.5 rounded-lg bg-[#FAF5E8] border border-[#DFCFAF] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#1E3331]">
                <span>2. Tế Luyện (Dòng Ẩn)</span>
                <span className="font-mono text-[#7E22CE]">Tầng {art.refineLevel}/5</span>
              </div>
              {art.refineLevel < 5 ? (
                <>
                  <div className="text-[11px] font-mono text-[#544A3C] flex flex-wrap gap-2">
                    <span className={forgeLvl >= refCost.requiredForgeLevel ? 'text-[#1E6B47]' : 'text-[#B91C1C]'}>
                      Yêu cầu Lò Rèn Lv.{refCost.requiredForgeLevel}
                    </span>
                    <span>Huyền Thiết: {formatNum(refCost.huyenThiet)}</span>
                    <span>Tinh Hoa: {refCost.tinhHoaBoss}</span>
                  </div>
                  <button
                    disabled={!canRef}
                    onClick={() => onAction({ type: 'refine_artifact' })}
                    className={`w-full py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      canRef ? 'bg-[#7E22CE] text-white hover:bg-[#6B21A8]' : 'bg-[#D5C9B0] text-[#7D7362] cursor-not-allowed'
                    }`}
                  >
                    Tế Luyện lên Tầng {art.refineLevel + 1}
                  </button>
                </>
              ) : (
                <div className="text-xs font-bold text-[#7E22CE]">✓ Pháp Bảo đã Tế Luyện tối đa!</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // 4. LUYỆN ĐAN & TẨY TỦY (Kết nối Vườn Dược Thảo — có Đan Độc)
  // ==========================================================================
  if (tab === 'alchemy') {
    const curTox = getCurrentPillToxicity(disciple);
    const maxTox = getMaxPillToxicity(disciple.realmIndex);
    const toxFull = curTox >= maxTox;
    const tuVi = getTuViPillInfo(disciple, duocDienLvl, luyenDanLvl);
    const canTuVi =
      disciple.qi < disciple.maxQi &&
      state.resources.linhThao >= tuVi.linhThao &&
      state.resources.linhThach >= tuVi.linhThach;
    const realmName = REALM_LADDER[disciple.realmIndex]?.fullName || 'Luyện Khí';

    const tayTuyList: Array<{ key: 'atk' | 'hp' | 'def'; label: string; pillName: string; color: string }> = [
      { key: 'atk', label: 'Công Kích', pillName: 'Long Hổ Tẩy Tủy Đan', color: '#B91C1C' },
      { key: 'hp', label: 'Sinh Lực', pillName: 'Cửu Chuyển Sinh Mệnh Đan', color: '#15803D' },
      { key: 'def', label: 'Phòng Thủ', pillName: 'Kim Cang Hộ Thể Đan', color: '#B4690E' },
    ];

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5E5343]">
          <span className="inline-flex items-center gap-1 font-semibold">
            <FlaskConical className="w-3.5 h-3.5 text-[#1E6B47]" /> Dược Điền Lv.{duocDienLvl} · Luyện Đan Phòng Lv.{luyenDanLvl}
          </span>
          <span className="font-mono">
            Linh Thảo hiện có: <strong className="text-[#1E6B47]">{formatNum(state.resources.linhThao)}</strong>
          </span>
        </div>

        {/* Tu Vi Đan */}
        <div className="p-3 rounded-xl bg-[#EFE6D2] border border-[#D4C39F] flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-bold text-xs text-[#1E3331]">
              Tu Vi Đan (Tăng nhanh kinh nghiệm cảnh giới — không sinh Đan Độc)
            </div>
            <div className="text-[11px] text-[#544A3C]">
              Mỗi viên tăng ngay <strong className="text-[#1D5E8C]">+{formatNum(tuVi.qiGain)} Linh Khí</strong> · Tiêu hao: {formatNum(tuVi.linhThao)} Linh Thảo, {formatNum(tuVi.linhThach)} LT
            </div>
          </div>
          <button
            disabled={!canTuVi}
            onClick={() => onAction({ type: 'consume_tuvi_pill' })}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer ${
              canTuVi ? 'bg-[#1D5E8C] text-white hover:bg-[#174A6E]' : 'bg-[#D5C9B0] text-[#7D7362] cursor-not-allowed'
            }`}
          >
            {disciple.qi >= disciple.maxQi ? 'Tu Vi Đã Đầy' : 'Luyện & Uống Tu Vi Đan'}
          </button>
        </div>

        {/* Thuộc Tính Đan (Tẩy Tủy) + Thanh Đan Độc */}
        <div className="p-3.5 rounded-xl bg-[#FAF5E8] border border-[#C9A45C] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold text-xs text-[#1E3331]">
              Thuộc Tính Đan (Tẩy Tủy vĩnh viễn) — Cảnh giới: {realmName}
            </div>
            <div className={`text-xs font-mono font-bold inline-flex items-center gap-1 ${toxFull ? 'text-[#B91C1C]' : 'text-[#1E6B47]'}`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              Đan Độc: {curTox}/{maxTox} viên
            </div>
          </div>

          <div className="h-2 rounded-full bg-[#E3D8BE] overflow-hidden">
            <div
              className={`h-full transition-all ${toxFull ? 'bg-[#DC2626]' : 'bg-[#16A34A]'}`}
              style={{ width: `${Math.min(100, (curTox / maxTox) * 100)}%` }}
            />
          </div>

          {toxFull && (
            <div className="text-[11px] text-[#B91C1C] font-semibold">
              ⚠ Đan Độc đã đạt giới hạn ở cảnh giới hiện tại! Hãy Đột Phá lên cảnh giới mới để tẩy sạch Đan Độc và uống thêm.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {tayTuyList.map((item) => {
              const info = getTayTuyPillInfo(item.key, disciple, duocDienLvl);
              const totalBonus = growth.alchemy.tayTuyCounts[item.key] || 0;
              const canEat =
                !toxFull &&
                state.resources.linhThao >= info.linhThao &&
                state.resources.linhThach >= info.linhThach;
              return (
                <div key={item.key} className="p-2.5 rounded-lg bg-[#EFE6D2] border border-[#D4C39F] space-y-1.5">
                  <div className="font-bold text-xs" style={{ color: item.color }}>
                    {item.pillName}
                  </div>
                  <div className="text-[11px] text-[#4C4335]">
                    +{formatNum(info.gain)} {item.label} vĩnh viễn
                  </div>
                  <div className="text-[10px] font-mono text-[#6B5F4E]">
                    Đã tích lũy: +{formatNum(totalBonus)} · Thảo {formatNum(info.linhThao)} · LT {formatNum(info.linhThach)}
                  </div>
                  <button
                    disabled={!canEat}
                    onClick={() => onAction({ type: 'consume_taytuy_pill', statKey: item.key })}
                    className={`w-full py-1.5 rounded text-xs font-bold cursor-pointer ${
                      canEat ? 'bg-[#1E3B38] text-[#F9E6B3] hover:bg-[#274D49]' : 'bg-[#D5C9B0] text-[#7D7362] cursor-not-allowed'
                    }`}
                  >
                    Luyện & Uống
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // 5. THIÊN PHÚ & THĂNG PHẨM (Phàm → Linh → Địa → Thiên → Tiên)
  // ==========================================================================
  const curRank = growth.qualityRank;
  const nextMeta = QUALITY_RANKS[curRank + 1];
  const cost = nextMeta?.upgradeCost;
  const canAscend = Boolean(
    cost &&
      state.alliance.contribution >= cost.contribution &&
      state.resources.linhThach >= cost.linhThach &&
      state.resources.tinhHoaBoss >= cost.tinhHoaBoss,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-bold text-[#1E3331]">
          <Award className="w-4 h-4 text-[#B45309]" /> Thăng Phẩm & Mở Khóa Thiên Phú Độc Quyền
        </span>
        <span className="font-mono text-[#7E22CE] font-bold">
          Cống Hiến Tông Môn: {formatNum(state.alliance.contribution)}
        </span>
      </div>

      {/* 5 Quality Milestones */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5">
        {QUALITY_RANKS.map((q) => {
          const unlocked = curRank >= q.rank;
          return (
            <div
              key={q.rank}
              className={`p-2 rounded-lg border text-left ${
                unlocked
                  ? 'border-[#C9A45C] bg-[#FAF5E8]'
                  : 'border-[#DDD2BA] bg-[#EFE6D2]/60 opacity-65'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold" style={{ color: q.color }}>
                <span>{q.name}</span>
                <span>{unlocked ? '✓' : '🔒'}</span>
              </div>
              <div className="text-[11px] font-bold text-[#1E3331] mt-1">{q.talentName}</div>
              <div className="text-[10px] text-[#544A3C] leading-snug mt-0.5">{q.talentDesc}</div>
            </div>
          );
        })}
      </div>

      {nextMeta && cost ? (
        <div className="p-3.5 rounded-xl bg-[#FAF5E8] border-2 border-[#C9A45C] flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-[#1E3331]">
              Thăng Phẩm lên <span style={{ color: nextMeta.color }}>{nextMeta.name}</span> — Mở khóa [{nextMeta.talentName}]
            </div>
            <div className="text-[11px] font-mono text-[#544A3C] mt-1 flex flex-wrap gap-3">
              <span className={state.alliance.contribution >= cost.contribution ? 'text-[#1E6B47]' : 'text-[#B91C1C]'}>
                Cống Hiến: {formatNum(cost.contribution)} ({formatNum(state.alliance.contribution)})
              </span>
              <span className={state.resources.linhThach >= cost.linhThach ? 'text-[#24211C]' : 'text-[#B91C1C]'}>
                Linh Thạch: {formatNum(cost.linhThach)}
              </span>
              <span className={state.resources.tinhHoaBoss >= cost.tinhHoaBoss ? 'text-[#24211C]' : 'text-[#B91C1C]'}>
                Tinh Hoa Boss: {cost.tinhHoaBoss}
              </span>
            </div>
          </div>
          <button
            disabled={!canAscend}
            onClick={() => onAction({ type: 'ascend_quality' })}
            className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
              canAscend ? 'bg-[#B45309] text-white hover:bg-[#92400E]' : 'bg-[#D5C9B0] text-[#7D7362] cursor-not-allowed'
            }`}
          >
            Thăng Phẩm {nextMeta.name}
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-[#FEF3C7] border border-[#D97706] text-xs font-bold text-[#92400E]">
          ✦ Đệ tử đã đạt đỉnh phong Tiên Phẩm — kích hoạt đầy đủ Kiếm Tâm (50 MP đầu trận) & Bất Hoại Kim Thân (miễn tử 1 lần)!
        </div>
      )}
    </div>
  );
};
