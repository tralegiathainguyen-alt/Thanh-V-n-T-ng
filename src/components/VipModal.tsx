import React, { useState } from 'react';
import {
  ELEMENT_META,
  EQUIPMENT_SETS,
  LEGENDARY_BOSSES,
  RARITY_META,
  RECHARGE_PACKS,
  STAMINA_PACKS,
  VIP_FASHIONS,
  VIP_LEVEL_THRESHOLDS,
  VIP_MILESTONE_REWARDS,
  VIP_SHOP_ITEMS,
} from '../data/constants';
import { GameState, VipFashionId } from '../types/game';
import { formatNum, getVipLevel } from '../utils/gameLogic';
import {
  DisciplePortrait,
  ElementSeal,
  EnemyUnitSprite,
  GemSprite,
  LegendarySetSprite,
  RarityFrameBox,
  ResourceIcon,
  ResourceSpriteKey,
  ScrollModalShell,
} from './ElementIcons';
import {
  ArrowUpCircle,
  BatteryCharging,
  Bot,
  CheckCircle2,
  CreditCard,
  Crosshair,
  Crown,
  Gem,
  Gift,
  Lock,
  Shirt,
  ShoppingBag,
  Sparkles,
  Swords,
  Zap,
} from 'lucide-react';

interface VipModalProps {
  state: GameState;
  totalPower: number;
  initialTab?: 'recharge' | 'shop' | 'auto' | 'fashion';
  onClose: () => void;
  onRechargePack: (packId: string) => void;
  onRedeemCardCode: (cardCode: string) => void;
  onClaimVipMilestone: (level: number) => void;
  onBuyStaminaPack: (packId: string) => void;
  onBuyVipShopItem: (itemId: string) => void;
  onToggleAutoDisciple: () => void;
  onToggleAutoSect: () => void;
  onToggleAutoGem: () => void;
  onToggleAutoWorld: () => void;
  onSelectAutoWorldBoss: (bossId: string) => void;
  onEquipFashion: (discipleId: string, fashionId: VipFashionId | null) => void;
}

export function VipModal({
  state,
  totalPower,
  initialTab = 'recharge',
  onClose,
  onRechargePack,
  onRedeemCardCode,
  onClaimVipMilestone,
  onBuyStaminaPack,
  onBuyVipShopItem,
  onToggleAutoDisciple,
  onToggleAutoSect,
  onToggleAutoGem,
  onToggleAutoWorld,
  onSelectAutoWorldBoss,
  onEquipFashion,
}: VipModalProps) {
  const [tab, setTab] = useState<'recharge' | 'shop' | 'auto' | 'fashion'>(initialTab);
  const [cardSerial, setCardSerial] = useState('');
  const [selectedDiscipleId, setSelectedDiscipleId] = useState<string>(state.disciples[0]?.id || '');

  const vipLevel = getVipLevel(state.vip.points);
  const isMaxVip = vipLevel >= 20;
  const currentThreshold = VIP_LEVEL_THRESHOLDS[vipLevel] || 0;
  const nextThreshold = isMaxVip ? VIP_LEVEL_THRESHOLDS[20] : VIP_LEVEL_THRESHOLDS[vipLevel + 1];
  const progressPct = isMaxVip
    ? 100
    : Math.min(100, Math.round(((state.vip.points - currentThreshold) / Math.max(1, nextThreshold - currentThreshold)) * 100));

  const unclaimedCount = VIP_MILESTONE_REWARDS.filter(
    (m) => vipLevel >= m.level && !state.vip.claimedMilestones.includes(m.level),
  ).length;

  const selectedDisciple = state.disciples.find((d) => d.id === selectedDiscipleId) || state.disciples[0];

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardSerial.trim()) return;
    onRedeemCardCode(cardSerial.trim());
    setCardSerial('');
  };

  return (
    <ScrollModalShell
      title="Điện Chí Tôn · Nạp Thẻ, Tiệm VIP & Đặc Quyền"
      subtitle={`Cấp VIP hiện tại: VIP ${vipLevel}${isMaxVip ? ' (MAX)' : ''} · Tiên Ngọc: ${formatNum(state.resources.tienNgoc)} · Thể Lực: ${state.resources.stamina}/${state.resources.maxStamina}`}
      onClose={onClose}
      maxWidth="max-w-5xl"
      headerRight={
        <div className="px-3 py-1 rounded-full bg-gradient-to-r from-[#A66E14] via-[#E5B85B] to-[#A66E14] text-[#1D1306] text-xs font-mono font-bold shadow whitespace-nowrap">
          VIP {vipLevel} {isMaxVip ? 'MAX' : `/ 20`}
        </div>
      }
    >
      {/* VIP Progress Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#19302E] via-[#213F3B] to-[#19302E] border-2 border-[#D4A24C] text-[#F8EED6] mb-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-full bg-gradient-to-b from-[#FCE694] to-[#B87D1D] text-[#261704] flex items-center justify-center font-bold shadow">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-bold text-[#FCE7A7]" style={{ fontFamily: 'var(--font-display)' }}>
                Đặc Quyền Tiên Tôn · VIP {vipLevel} {isMaxVip ? '(Đạt Đỉnh Tối Đa!)' : ''}
              </div>
              <div className="text-xs text-[#C1D8CE] font-mono tabular-nums">
                {isMaxVip
                  ? `Điểm VIP: ${formatNum(state.vip.points)} · Đã mở khóa toàn bộ đặc quyền VIP 1 → VIP 20`
                  : `Điểm VIP: ${formatNum(state.vip.points)} / ${formatNum(nextThreshold)} (Cần thêm ${formatNum(nextThreshold - state.vip.points)} điểm lên VIP ${vipLevel + 1})`}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <span className={vipLevel >= 5 ? 'text-[#6EE7B7]' : 'text-[#9FB5AA]'}>
              {vipLevel >= 5 ? '✓' : '○'} VIP 5 Auto Đệ Tử, Đồ & Cường Hóa
            </span>
            <span className="text-[#6B877E]">·</span>
            <span className={vipLevel >= 6 ? 'text-[#6EE7B7]' : 'text-[#9FB5AA]'}>
              {vipLevel >= 6 ? '✓' : '○'} VIP 6 Auto Công Việc
            </span>
            <span className="text-[#6B877E]">·</span>
            <span className={vipLevel >= 7 ? 'text-[#6EE7B7]' : 'text-[#9FB5AA]'}>
              {vipLevel >= 7 ? '✓' : '○'} VIP 7 Auto Nâng & Khảm Ngọc
            </span>
            <span className="text-[#6B877E]">·</span>
            <span className={vipLevel >= 10 ? 'text-[#6EE7B7]' : 'text-[#9FB5AA]'}>
              {vipLevel >= 10 ? '✓' : '○'} VIP 10 Auto Thế Giới
            </span>
            <span className="text-[#6B877E]">·</span>
            <span className={vipLevel >= 18 ? 'text-[#FDE047]' : 'text-[#9FB5AA]'}>
              {vipLevel >= 18 ? '✓' : '○'} VIP 18/19/20 Truyền Thuyết & Thời Trang
            </span>
          </div>
        </div>

        <div className="h-2.5 rounded-full bg-[#0E1E1D] overflow-hidden border border-[#C9A45C]/40">
          <div
            className="h-full bg-gradient-to-r from-[#D4A24C] via-[#FDE047] to-[#F59E0B] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-[#D4C39F] pb-2.5">
        <button
          onClick={() => setTab('recharge')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            tab === 'recharge' ? 'bg-[#8A5A0F] text-[#FFF6DF]' : 'bg-[#EAE1CD] text-[#4C4335] hover:bg-[#DFD2B5]'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Nạp Thẻ & Mốc VIP {unclaimedCount > 0 ? `(${unclaimedCount} quà)` : ''}
        </button>
        <button
          onClick={() => setTab('shop')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            tab === 'shop' ? 'bg-[#1E3B38] text-[#F9E6B3]' : 'bg-[#EAE1CD] text-[#4C4335] hover:bg-[#DFD2B5]'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Tiệm VIP & Mua Thể Lực
        </button>
        <button
          onClick={() => setTab('auto')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            tab === 'auto' ? 'bg-[#1E3B38] text-[#F9E6B3]' : 'bg-[#EAE1CD] text-[#4C4335] hover:bg-[#DFD2B5]'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          Tự Động Hóa (VIP 5·6·7·10)
        </button>
        <button
          onClick={() => setTab('fashion')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            tab === 'fashion' ? 'bg-[#7B4EA3] text-white' : 'bg-[#EAE1CD] text-[#4C4335] hover:bg-[#DFD2B5]'
          }`}
        >
          <Shirt className="w-3.5 h-3.5" />
          Thời Trang VIP ({state.vip.unlockedFashions.length}/3)
        </button>
      </div>

      {/* TAB 1: RECHARGE & MILESTONES */}
      {tab === 'recharge' && (
        <div className="space-y-5">
          {/* Card Code Top-Up Bar */}
          <form
            onSubmit={handleCardSubmit}
            className="p-3.5 rounded-xl bg-[#EAE1CD] border border-[#D4C39F] flex flex-wrap items-center justify-between gap-2.5"
          >
            <div className="text-xs text-[#3C3327]">
              <strong>Nạp Mã Thẻ Cào / Thẻ Tiên Ngọc:</strong> Nhập mã thẻ bất kỳ để nhận ngay{' '}
              <strong className="text-[#15803D]">+5.000 Tiên Ngọc</strong> &{' '}
              <strong className="text-[#8A5A0F]">+5.000 Điểm VIP</strong>.
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={cardSerial}
                onChange={(e) => setCardSerial(e.target.value)}
                placeholder="VD: THANHVAN-VIP2026"
                className="px-3 py-1.5 rounded-lg bg-[#FAF6EC] border border-[#CBB993] text-xs font-mono w-48 focus:outline-none focus:border-[#1E3B38]"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-[#1E3B38] hover:bg-[#2A514D] text-[#F9E6B3] text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                Nạp Mã Thẻ
              </button>
            </div>
          </form>

          {/* 6 Recharge Packs */}
          <div>
            <h3 className="text-sm font-bold text-[#1E3331] mb-2.5">Gói Nạp Thẻ Tiên Ngọc (Tặng x2 Tiên Ngọc Nạp Lần Đầu)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {RECHARGE_PACKS.map((pack) => {
                const isFirst = !state.vip.firstRechargeClaimedIds.includes(pack.id);
                return (
                  <div
                    key={pack.id}
                    className={`p-3.5 rounded-xl border-2 flex flex-col justify-between space-y-2.5 ${
                      pack.highlight
                        ? 'bg-gradient-to-b from-[#FCF5E1] to-[#F3E2BA] border-[#D4A24C]'
                        : 'bg-[#F5EFE0] border-[#D4C39F]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-[#1E3331]">{pack.name}</span>
                        {isFirst && (
                          <span className="text-[10px] font-bold text-[#B92B27]">x2 Lần Đầu!</span>
                        )}
                      </div>
                      <div className="text-base font-mono font-bold text-[#15803D] flex items-center gap-1.5">
                        <ResourceIcon resource="tienNgoc" size="sm" />
                        <span>+{formatNum(isFirst ? pack.tienNgoc * 2 : pack.tienNgoc)} Tiên Ngọc</span>
                      </div>
                      <div className="text-[11px] font-mono text-[#6B5F4C] flex items-center gap-1 flex-wrap">
                        <span>+{formatNum(pack.vipPoints)} Điểm VIP ·</span>
                        <ResourceIcon resource="linhThach" size="xs" />
                        <span>+{formatNum(pack.bonusLinhThach)} Linh Thạch</span>
                      </div>
                      {pack.highlight && (
                        <div className="text-[11px] font-bold text-[#9A5B0A] pt-0.5">{pack.highlight}</div>
                      )}
                    </div>
                    <button
                      onClick={() => onRechargePack(pack.id)}
                      className="w-full py-2 rounded-lg bg-[#8A5A0F] hover:bg-[#A66D14] text-[#FFF6DF] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Nạp Ngay · {pack.priceVnd}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* VIP Milestone Rewards (VIP 6, 10, 18, 19, 20 MAX) */}
          <div>
            <h3 className="text-sm font-bold text-[#1E3331] mb-2.5 flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-[#B92B27]" />
              Mốc Quà & Đặc Quyền VIP Trọng Điểm (VIP 5 · 6 · 7 · 10 · 18 · 19 · 20 MAX)
            </h3>
            <div className="space-y-2.5">
              {VIP_MILESTONE_REWARDS.map((m) => {
                const reached = vipLevel >= m.level;
                const claimed = state.vip.claimedMilestones.includes(m.level);
                const isMythicTier = m.level >= 18;
                return (
                  <div
                    key={m.level}
                    className={`p-3.5 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isMythicTier
                        ? 'bg-gradient-to-r from-[#FCEEEA] via-[#FCF4E3] to-[#FCEEEA] border-[#D4574E]'
                        : 'bg-[#F5EFE0] border-[#D4C39F]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-bold text-sm"
                          style={{ color: isMythicTier ? '#A62820' : '#1E3331' }}
                        >
                          {m.title}
                        </span>
                        <span className="text-[11px] font-mono text-[#6B5F4C]">
                          (Yêu cầu {formatNum(VIP_LEVEL_THRESHOLDS[m.level])} điểm VIP)
                        </span>
                      </div>
                      <p className="text-xs text-[#4C4335] leading-relaxed">{m.perkSummary}</p>
                    </div>

                    <button
                      disabled={!reached || claimed}
                      onClick={() => onClaimVipMilestone(m.level)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
                        claimed
                          ? 'bg-[#D6E8DD] text-[#1F6A44] cursor-default'
                          : reached
                            ? 'bg-[#B92B27] hover:bg-[#D03530] text-[#FFF6EA] cursor-pointer shadow'
                            : 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                      }`}
                    >
                      {claimed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã Nhận
                        </>
                      ) : reached ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5" /> Nhận Quà VIP {m.level}
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" /> Cần VIP {m.level}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VIP SHOP & STAMINA PURCHASE */}
      {tab === 'shop' && (
        <div className="space-y-5">
          {/* Stamina Purchase Row */}
          <div>
            <h3 className="text-sm font-bold text-[#1E3331] mb-2.5 flex items-center gap-1.5">
              <ResourceIcon resource="stamina" size="sm" />
              Mua Thể Lực Nhanh (Hiện có: {state.resources.stamina}/{state.resources.maxStamina})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {STAMINA_PACKS.map((sp) => {
                const canBuy = state.resources.tienNgoc >= sp.costTienNgoc;
                return (
                  <div
                    key={sp.id}
                    className="p-3.5 rounded-xl bg-[#E8F4ED] border border-[#6FB690] flex flex-col justify-between space-y-2.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <ResourceIcon resource="stamina" size="md" className="shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-sm text-[#154A33]">{sp.name}</div>
                        <div className="text-xs text-[#3C5C4B] mt-0.5">{sp.desc}</div>
                      </div>
                    </div>
                    <button
                      disabled={!canBuy}
                      onClick={() => onBuyStaminaPack(sp.id)}
                      className={`w-full py-2 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 ${
                        canBuy
                          ? 'bg-[#1E3B38] hover:bg-[#29504C] text-[#F9E6B3] cursor-pointer'
                          : 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                      }`}
                    >
                      <span>Mua ·</span>
                      <ResourceIcon resource="tienNgoc" size="xs" />
                      <span>{sp.costTienNgoc} Tiên Ngọc</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* VIP Exclusive Items */}
          <div>
            <h3 className="text-sm font-bold text-[#1E3331] mb-2.5 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-[#8A5A0F]" />
              Tiệm VIP Độc Quyền (Mua bằng Tiên Ngọc)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VIP_SHOP_ITEMS.map((item) => {
                const rm = RARITY_META[item.rarity];
                const unlocked = vipLevel >= item.minVip;
                const canBuy = unlocked && state.resources.tienNgoc >= item.costTienNgoc;
                const itemResourceIcon: ResourceSpriteKey | null =
                  item.rewardType === 'dot_pha_dan'
                    ? 'dotPhaDan'
                    : item.rewardType === 'cuong_hoa_thach'
                      ? 'cuongHoaThach'
                      : item.rewardType === 'tinh_hoa_boss'
                        ? 'tinhHoaBoss'
                        : item.rewardType === 'linh_khi'
                          ? 'linhKhi'
                          : null;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border flex items-center justify-between gap-3"
                    style={{ backgroundColor: rm.bg, borderColor: rm.border }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RarityFrameBox rarity={item.rarity} size="md">
                        {itemResourceIcon ? (
                          <ResourceIcon resource={itemResourceIcon} size="md" />
                        ) : item.rewardType === 'gem_t4' ? (
                          <GemSprite element="Kim" tier={4} className="w-8 h-8" />
                        ) : item.rewardType === 'mythic_set_box' ? (
                          <LegendarySetSprite setId="cuu_thien_kiem_de" className="w-9 h-9" />
                        ) : item.rewardType === 'legend_set_box' ? (
                          <LegendarySetSprite setId="thai_co_long_hoang" className="w-9 h-9" />
                        ) : (
                          <Sparkles className="w-5 h-5" />
                        )}
                      </RarityFrameBox>
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold text-sm truncate" style={{ color: rm.color }}>
                          {item.name}
                        </div>
                        <div className="text-[11px] text-[#5B5142]">{item.desc}</div>
                        <div className="text-[11px] font-semibold text-[#8A5A0F]">
                          Yêu cầu: VIP {item.minVip}+
                        </div>
                      </div>
                    </div>
                    <button
                      disabled={!canBuy}
                      onClick={() => onBuyVipShopItem(item.id)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold shrink-0 whitespace-nowrap flex items-center gap-1 ${
                        canBuy
                          ? 'bg-[#1E3B38] hover:bg-[#29504C] text-[#F9E6B3] cursor-pointer'
                          : 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                      }`}
                    >
                      {unlocked ? (
                        <>
                          <ResourceIcon resource="tienNgoc" size="xs" />
                          <span>{item.costTienNgoc}</span>
                        </>
                      ) : (
                        `VIP ${item.minVip}`
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VIP 5, VIP 6, VIP 7 & VIP 10 AUTOMATION */}
      {tab === 'auto' && (
        <div className="space-y-4">
          {/* VIP 5 Auto Disciple Upgrade & Best Gear */}
          <div className="p-4 rounded-xl bg-[#F5EFE0] border-2 border-[#D4C39F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-[#1D5E8C]" />
                <h3 className="text-base font-bold text-[#1E3331]">
                  VIP 5 · Auto Đệ Tử, Mặc Đồ, Cường Hóa & Nâng Bậc Trang Bị
                </h3>
              </div>
              <p className="text-xs text-[#544A3C] leading-relaxed">
                Tự động kiểm tra mỗi 3.5 giây: hễ đệ tử tích đủ Linh Khí sẽ tự khởi động Độ Kiếp đột phá cảnh giới (tự dùng Đột Phá Đan tối ưu nếu có), đồng thời tự động mặc những trang bị có chiến lực cao nhất cho toàn bộ đệ tử (ưu tiên đội hình xuất chiến). Ngoài ra tự động Cường Hóa trang bị đang mặc (tối đa 6 lần/chu kỳ, ưu tiên món cấp thấp nhất, tới +20) và tự Nâng Bậc phẩm cấp trang bị khi đủ Huyền Thiết, Tinh Hoa Boss & Linh Thạch.
              </p>
            </div>
            <button
              disabled={vipLevel < 5}
              onClick={onToggleAutoDisciple}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold shrink-0 whitespace-nowrap ${
                vipLevel < 5
                  ? 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                  : state.vip.autoDiscipleEnabled
                    ? 'bg-[#1D5E8C] hover:bg-[#164A6E] text-white cursor-pointer'
                    : 'bg-[#1E3B38] hover:bg-[#2A514D] text-[#F9E6B3] cursor-pointer'
              }`}
            >
              {vipLevel < 5
                ? 'Khóa (Cần VIP 5)'
                : state.vip.autoDiscipleEnabled
                  ? 'Đang Auto Đệ Tử · Tắt'
                  : 'Bật Auto Đệ Tử & Đồ'}
            </button>
          </div>

          {/* VIP 6 Auto Sect */}
          <div className="p-4 rounded-xl bg-[#F5EFE0] border-2 border-[#D4C39F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#257A52]" />
                <h3 className="text-base font-bold text-[#1E3331]">
                  VIP 6 · Tự Động Hóa Toàn Bộ Công Việc Tông Môn
                </h3>
              </div>
              <p className="text-xs text-[#544A3C] leading-relaxed">
                Tự động vận hành mỗi 4 giây: thu hoạch toàn bộ 7 công trình, tự truyền Linh Khí cho đệ tử chưa viên mãn, tự khai lô luyện Đột Phá Đan khi dư Linh Thảo, tự nhận Nhiệm Vụ hoàn thành và tự thu cống phẩm Linh Mạch.
              </p>
            </div>
            <button
              disabled={vipLevel < 6}
              onClick={onToggleAutoSect}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold shrink-0 whitespace-nowrap ${
                vipLevel < 6
                  ? 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                  : state.vip.autoSectEnabled
                    ? 'bg-[#257A52] hover:bg-[#1E6342] text-white cursor-pointer'
                    : 'bg-[#1E3B38] hover:bg-[#2A514D] text-[#F9E6B3] cursor-pointer'
              }`}
            >
              {vipLevel < 6
                ? 'Khóa (Cần VIP 6)'
                : state.vip.autoSectEnabled
                  ? 'Đang Chạy Tự Động · Tắt'
                  : 'Bật Tự Động Công Việc'}
            </button>
          </div>

          {/* VIP 7 Auto Gem Upgrade & Socketing */}
          <div className="p-4 rounded-xl bg-[#F5EFE0] border-2 border-[#D4C39F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Gem className="w-5 h-5 text-[#7B4EA3]" />
                <h3 className="text-base font-bold text-[#1E3331]">
                  VIP 7 · Auto Tự Nâng Ngọc & Khảm Ngọc Vào Trang Bị
                </h3>
              </div>
              <p className="text-xs text-[#544A3C] leading-relaxed">
                Tự động kiểm tra mỗi 4 giây: hợp nhất 3 viên Linh Ngọc cùng Hệ &amp; cùng Bậc thành Linh Ngọc bậc cao hơn (Bậc 1 → Bậc 5), đồng thời tự khảm ngọc mạnh nhất vào các ô trống hoặc thay thế ngọc bậc thấp hơn trên trang bị đang mặc!
              </p>
            </div>
            <button
              disabled={vipLevel < 7}
              onClick={onToggleAutoGem}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold shrink-0 whitespace-nowrap ${
                vipLevel < 7
                  ? 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                  : state.vip.autoGemEnabled
                    ? 'bg-[#7B4EA3] hover:bg-[#633C86] text-white cursor-pointer'
                    : 'bg-[#1E3B38] hover:bg-[#2A514D] text-[#F9E6B3] cursor-pointer'
              }`}
            >
              {vipLevel < 7
                ? 'Khóa (Cần VIP 7)'
                : state.vip.autoGemEnabled
                  ? 'Đang Auto Ngọc · Tắt'
                  : 'Bật Auto Nâng & Khảm Ngọc'}
            </button>
          </div>

          {/* Live VIP 5 & VIP 7 Activity Log */}
          {vipLevel >= 5 && (
            <div className="p-3 rounded-lg bg-[#1A2F2D] text-[#E6F1EC] border border-[#C9A45C]/45">
              <div className="text-xs font-bold text-[#6EE7B7] mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Nhật Ký Auto Đệ Tử &amp; Linh Ngọc (VIP 5 · VIP 7)
              </div>
              {state.vip.autoActivityLogs.length === 0 ? (
                <div className="text-[11px] text-[#9EB8AD]">
                  Chưa có hoạt động mới. Khi đệ tử đủ Linh Khí, có trang bị mạnh hơn hoặc đủ 3 ngọc cùng bậc, hệ thống sẽ tự động xử lý và ghi tại đây.
                </div>
              ) : (
                <div className="space-y-1 max-h-28 overflow-y-auto text-[11px]">
                  {state.vip.autoActivityLogs.map((log, i) => (
                    <div key={i} className={i === 0 ? 'text-[#A7F3D0] font-semibold' : 'opacity-80'}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIP 10 Auto World + Boss Selector */}
          <div className="p-4 rounded-xl bg-[#F5EFE0] border-2 border-[#C9A45C] space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-[#B92B27]" />
                  <h3 className="text-base font-bold text-[#1E3331]">
                    VIP 10 · Tự Động Hóa Đánh Thế Giới (Chọn Boss Đánh)
                  </h3>
                </div>
                <p className="text-xs text-[#544A3C] leading-relaxed">
                  Tự động xuất chiến mỗi 5 giây (giảm 50% Thể Lực tiêu hao), tự nhặt trang bị Bộ, Linh Ngọc, Tinh Hoa Boss và Linh Thạch. Có thể chọn đích danh Boss Huyền Thoại muốn cày bộ trang bị!
                </p>
              </div>
              <button
                disabled={vipLevel < 10}
                onClick={onToggleAutoWorld}
                className={`px-5 py-2.5 rounded-lg text-xs font-bold shrink-0 whitespace-nowrap ${
                  vipLevel < 10
                    ? 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                    : state.vip.autoWorldEnabled
                      ? 'bg-[#B92B27] hover:bg-[#991F1B] text-white cursor-pointer'
                      : 'bg-[#8A5A0F] hover:bg-[#A66D14] text-[#FFF6DF] cursor-pointer'
                }`}
              >
                {vipLevel < 10
                  ? 'Khóa (Cần VIP 10)'
                  : state.vip.autoWorldEnabled
                    ? 'Đang Tự Đánh Thế Giới · Tắt'
                    : 'Bật Auto Đánh Thế Giới'}
              </button>
            </div>

            {/* Target Mode & Boss Picker */}
            <div className="p-3 rounded-lg bg-[#EAE1CD] border border-[#D4C39F] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-[#1E3331] flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-[#B92B27]" />
                  Chọn Mục Tiêu / Chọn Boss Auto Đánh:
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    disabled={vipLevel < 10}
                    onClick={() => onSelectAutoWorldBoss('auto')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                      vipLevel < 10
                        ? 'opacity-60 cursor-not-allowed bg-[#DDD3BD] border-[#C6B695] text-[#6B6152]'
                        : state.vip.autoWorldBossId === 'auto'
                          ? 'bg-[#1E3B38] text-[#F9E6B3] border-[#1E3B38] cursor-pointer'
                          : 'bg-[#FAF6EC] text-[#3C3327] border-[#CBB993] hover:bg-[#F2E9D5] cursor-pointer'
                    }`}
                  >
                    Tự Động (Bí Cảnh + Boss)
                  </button>
                  <button
                    disabled={vipLevel < 10}
                    onClick={() => onSelectAutoWorldBoss('realm_only')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                      vipLevel < 10
                        ? 'opacity-60 cursor-not-allowed bg-[#DDD3BD] border-[#C6B695] text-[#6B6152]'
                        : state.vip.autoWorldBossId === 'realm_only'
                          ? 'bg-[#1E3B38] text-[#F9E6B3] border-[#1E3B38] cursor-pointer'
                          : 'bg-[#FAF6EC] text-[#3C3327] border-[#CBB993] hover:bg-[#F2E9D5] cursor-pointer'
                    }`}
                  >
                    Chỉ Quét Bí Cảnh
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {LEGENDARY_BOSSES.map((boss) => {
                  const selected = state.vip.autoWorldBossId === boss.id;
                  const minRequired = Math.round(boss.recommendedPower * 0.68);
                  const enoughPower = totalPower >= minRequired;
                  const dropSetName = EQUIPMENT_SETS[boss.setId]?.name || boss.setId;
                  const discountedStamina = Math.max(5, Math.floor(boss.staminaCost * 0.5));
                  return (
                    <button
                      key={boss.id}
                      disabled={vipLevel < 10}
                      onClick={() => onSelectAutoWorldBoss(boss.id)}
                      className={`text-left p-2.5 rounded-lg border-2 transition-all flex items-center justify-between gap-2 ${
                        vipLevel < 10
                          ? 'opacity-60 cursor-not-allowed bg-[#EFE7D4] border-[#D3C4A3]'
                          : selected
                            ? 'bg-[#FFF5EC] border-[#B92B27] shadow-sm cursor-pointer'
                            : 'bg-[#FAF6EC] border-[#D7C6A5] hover:border-[#B8924C] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <EnemyUnitSprite
                          id={boss.id}
                          name={boss.name}
                          element={boss.element}
                          isBoss
                          className="w-12 h-12"
                        />
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <ElementSeal element={boss.element} size="xs" />
                            <span className="font-bold text-xs text-[#1E3331] truncate">{boss.name}</span>
                          </div>
                          <div className="text-[10px] text-[#6B5F4C] truncate">
                            Rơi: <strong className="text-[#8A5A0F]">{dropSetName}</strong> · -{discountedStamina} TL/trận
                          </div>
                          <div className="text-[10px] font-mono">
                            <span className={enoughPower ? 'text-[#15803D] font-bold' : 'text-[#B92B27] font-bold'}>
                              {enoughPower
                                ? `Đủ lực đánh (≥${formatNum(minRequired)})`
                                : `Cần lực ≥${formatNum(minRequired)}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          selected ? 'bg-[#B92B27] text-white' : 'bg-[#E5DAC2] text-[#5B5142]'
                        }`}
                      >
                        {selected ? 'Đang Chọn' : 'Chọn Boss'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Auto-World Battle Log */}
            <div className="p-3 rounded-lg bg-[#162928] text-[#E6F1EC] border border-[#C9A45C]/50">
              <div className="text-xs font-bold text-[#F5D687] mb-1.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Nhật Ký Tự Động Đánh Thế Giới
              </div>
              {state.vip.autoWorldLogs.length === 0 ? (
                <div className="text-[11px] text-[#9EB8AD]">
                  {vipLevel >= 10
                    ? 'Hãy bật Auto Đánh Thế Giới và chọn Boss mục tiêu để bắt đầu chinh phạt!'
                    : 'Đạt VIP 10 để mở khóa tính năng Tự Động Đánh Thế Giới & Chọn Boss.'}
                </div>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto text-[11px]">
                  {state.vip.autoWorldLogs.map((log, i) => (
                    <div key={i} className={i === 0 ? 'text-[#FCE7A7] font-semibold' : 'opacity-80'}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: VIP 18/19/20 DISCIPLE FASHIONS */}
      {tab === 'fashion' && (
        <div className="space-y-4">
          {/* Disciple Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#D4C39F]">
            <span className="text-xs font-semibold text-[#5E5343] whitespace-nowrap">Chọn Đệ Tử mặc Thời Trang:</span>
            {state.disciples.map((d) => {
              const active = d.id === selectedDisciple?.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDiscipleId(d.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    active ? 'bg-[#1E3B38] text-[#F9E6B3]' : 'bg-[#EAE1CD] text-[#3F372B] hover:bg-[#DFD2B5]'
                  }`}
                >
                  <ElementSeal element={d.element} size="xs" />
                  <span>{d.name}</span>
                  {d.fashionId && <Crown className="w-3 h-3 text-[#F59E0B]" />}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(VIP_FASHIONS) as VipFashionId[]).map((fId) => {
              const fashion = VIP_FASHIONS[fId];
              const unlocked = state.vip.unlockedFashions.includes(fId);
              const isWorn = selectedDisciple?.fashionId === fId;
              return (
                <div
                  key={fId}
                  className="p-4 rounded-xl bg-[#F5EFE0] border-2 flex flex-col justify-between space-y-3"
                  style={{ borderColor: unlocked ? fashion.ringColor : '#D4C39F' }}
                >
                  <div className="space-y-2.5 text-center">
                    {/* Fashion Aura Avatar Preview */}
                    <DisciplePortrait
                      discipleId={selectedDisciple?.id}
                      name={selectedDisciple?.name}
                      glyph={selectedDisciple?.avatarGlyph || ELEMENT_META.Kim.hanzi}
                      element={selectedDisciple?.element || 'Kim'}
                      realmIndex={selectedDisciple?.realmIndex}
                      spiritRoot={selectedDisciple?.spiritRoot}
                      fashionId={fId}
                      size="xl"
                      fullBody
                      className="mx-auto"
                    />
                    <div>
                      <div className="font-bold text-sm text-[#1E3331]">{fashion.name}</div>
                      <div className="text-[11px] font-bold text-[#8A5A0F]">{fashion.titleBadge}</div>
                    </div>
                    <p className="text-xs text-[#5B5142]">{fashion.description}</p>
                    <div className="p-2.5 rounded-lg bg-[#EAE1CD] text-[11px] font-mono text-left space-y-0.5 text-[#1E3331]">
                      <div>· Công Kích: +{fashion.bonuses.atkPct}%</div>
                      <div>· Sinh Lực: +{fashion.bonuses.hpPct}%</div>
                      <div>· Phòng Thủ: +{fashion.bonuses.defPct}%</div>
                      <div>· Tốc Độ: +{fashion.bonuses.spd} · Bạo Kích: +{fashion.bonuses.crit}%</div>
                    </div>
                  </div>

                  {selectedDisciple && (
                    <button
                      disabled={!unlocked}
                      onClick={() => onEquipFashion(selectedDisciple.id, isWorn ? null : fId)}
                      className={`w-full py-2 rounded-lg text-xs font-bold ${
                        !unlocked
                          ? 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                          : isWorn
                            ? 'bg-[#C84332] hover:bg-[#A63324] text-white cursor-pointer'
                            : 'bg-[#1E3B38] hover:bg-[#2A514D] text-[#F9E6B3] cursor-pointer'
                      }`}
                    >
                      {!unlocked
                        ? `Nhận tại Quà Mốc VIP ${fashion.vipReq}`
                        : isWorn
                          ? 'Tháo Thời Trang'
                          : `Mặc cho ${selectedDisciple.name.split(' ').slice(-1)[0]}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ScrollModalShell>
  );
}
