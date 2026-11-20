import React, { useMemo, useState } from 'react';
import {
  ELEMENT_META,
  EQUIPMENT_SETS,
  EQUIPMENT_SLOTS,
  EQUIPMENT_TIERS,
  GEM_NAMES,
  RARITY_META,
  REALM_LADDER,
  VIP_FASHIONS,
} from '../data/constants';
import { ElementType, EquipmentItem, EquipmentSlot, GameState, Rarity } from '../types/game';
import {
  computeDiscipleStats,
  formatNum,
  getEquipmentPower,
  getEquipmentPrimaryValue,
} from '../utils/gameLogic';
import {
  DisciplePortrait,
  ElementSeal,
  EquipmentSlotIcon,
  GemSprite,
  LegendarySetSprite,
  RarityFrameBox,
  RealmBadge,
  ResourceIcon,
  ScrollModalShell,
  gemTierToRarity,
} from './ElementIcons';
import { ArrowUp, Crown, Gem, Layers, ShieldCheck, Sparkles, Trash2, Zap } from 'lucide-react';

interface EquipmentModalProps {
  state: GameState;
  initialDiscipleId?: string | null;
  onClose: () => void;
  onEquipItem: (discipleId: string, itemId: string) => void;
  onUnequipSlot: (discipleId: string, slot: EquipmentSlot) => void;
  onQuickEquipBest: (discipleId: string) => void;
  onQuickEquipSet: (discipleId: string, preferredSetId?: string) => void;
  onEnhanceItem: (itemId: string) => void;
  onAscendItem: (itemId: string) => void;
  onSocketGem: (itemId: string, socketIdx: number, gemId: string) => void;
  onUnsocketGem: (itemId: string, socketIdx: number) => void;
  onMergeGems: (element: string, tier: number) => void;
  onSellItem: (itemId: string) => void;
}

const STAT_LABEL: Record<string, string> = {
  atk: 'Công Kích',
  hp: 'Sinh Lực',
  def: 'Phòng Thủ',
  spd: 'Tốc Độ',
  crit: 'Bạo Kích',
};

export function EquipmentModal({
  state,
  initialDiscipleId,
  onClose,
  onEquipItem,
  onUnequipSlot,
  onQuickEquipBest,
  onQuickEquipSet,
  onEnhanceItem,
  onAscendItem,
  onSocketGem,
  onUnsocketGem,
  onMergeGems,
  onSellItem,
}: EquipmentModalProps) {
  const [discipleId, setDiscipleId] = useState<string>(initialDiscipleId || state.disciples[0]?.id || '');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [slotFilter, setSlotFilter] = useState<EquipmentSlot | 'all'>('all');
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all');
  const [rightTab, setRightTab] = useState<'bag' | 'upgrade' | 'gems'>('bag');
  const [chosenSetId, setChosenSetId] = useState<string>('auto');

  const disciple = state.disciples.find((d) => d.id === discipleId) || state.disciples[0];
  const stats = disciple
    ? computeDiscipleStats(disciple, state.inventory, state.alliance, state.buildings.tang_kinh_cac.level)
    : null;

  const selectedItem: EquipmentItem | undefined = state.inventory.find((i) => i.id === selectedItemId);

  const leftSlots = EQUIPMENT_SLOTS.filter((s) => s.column === 'left');
  const rightSlots = EQUIPMENT_SLOTS.filter((s) => s.column === 'right');

  const filteredBag = useMemo(() => {
    return state.inventory
      .filter((item) => {
        if (slotFilter !== 'all' && item.slot !== slotFilter) return false;
        if (rarityFilter !== 'all' && item.rarity !== rarityFilter) return false;
        return true;
      })
      .sort((a, b) => getEquipmentPower(b) - getEquipmentPower(a));
  }, [state.inventory, slotFilter, rarityFilter]);

  // Distinct sets available for the currently selected disciple (unequipped or worn by this disciple)
  const availableSets = useMemo(() => {
    if (!disciple) return [];
    const map = new Map<string, Set<EquipmentSlot>>();
    state.inventory.forEach((item) => {
      if (!item.setId) return;
      if (item.equippedBy && item.equippedBy !== disciple.id) return;
      const slots = map.get(item.setId) || new Set<EquipmentSlot>();
      slots.add(item.slot);
      map.set(item.setId, slots);
    });
    return Array.from(map.entries())
      .map(([setId, slots]) => ({
        setId,
        name: EQUIPMENT_SETS[setId]?.name || setId,
        count: slots.size,
      }))
      .sort((a, b) => b.count - a.count);
  }, [state.inventory, disciple]);

  // Group gems for 3-to-1 synthesis
  const gemGroups = useMemo(() => {
    const map = new Map<string, { element: string; tier: number; count: number; sampleName: string; statVal: number }>();
    for (const g of state.gems) {
      const k = `${g.element}_${g.tier}`;
      const existing = map.get(k);
      if (existing) existing.count += 1;
      else map.set(k, { element: g.element, tier: g.tier, count: 1, sampleName: g.name, statVal: g.statValue });
    }
    return Array.from(map.values()).sort((a, b) => b.tier - a.tier);
  }, [state.gems]);

  const renderSlotButton = (slotMeta: (typeof EQUIPMENT_SLOTS)[number]) => {
    const eqId = disciple?.equipped[slotMeta.slot];
    const eq = eqId ? state.inventory.find((i) => i.id === eqId) : undefined;
    const rm = eq ? RARITY_META[eq.rarity] : null;
    const isSel = eq && eq.id === selectedItemId;

    return (
      <button
        key={slotMeta.slot}
        onClick={() => {
          if (eq) {
            setSelectedItemId(eq.id);
            setRightTab('upgrade');
          } else {
            setSlotFilter(slotMeta.slot);
            setRightTab('bag');
          }
        }}
        className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
          isSel ? 'ring-2 ring-[#1E3B38]' : ''
        }`}
        style={{
          backgroundColor: rm ? rm.bg : '#EFE7D4',
          borderColor: rm ? rm.border : '#D2C1A0',
        }}
      >
        <RarityFrameBox rarity={eq?.rarity || null} size="md" enhanceLevel={eq?.enhanceLevel}>
          <EquipmentSlotIcon slot={slotMeta.slot} className="w-8 h-8" empty={!eq} />
        </RarityFrameBox>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold truncate" style={{ color: rm ? rm.color : '#5C5244' }}>
              {eq ? eq.name : slotMeta.shortLabel}
            </span>
            {eq && eq.enhanceLevel > 0 && (
              <span className="text-[10px] font-mono font-bold text-[#B4690E]">+{eq.enhanceLevel}</span>
            )}
          </div>
          <div className="text-[10px] text-[#6E6250] truncate">
            {eq
              ? `${STAT_LABEL[eq.primaryStatKey]} +${formatNum(getEquipmentPrimaryValue(eq))} · ${eq.sockets.filter(Boolean).length}/${eq.sockets.length} ngọc`
              : 'Trống · Nhấp để trang bị'}
          </div>
        </div>
      </button>
    );
  };

  const enhanceCostStone = selectedItem ? Math.round(160 * Math.pow(1.26, selectedItem.enhanceLevel)) : 0;
  const enhanceCostMat = selectedItem ? 2 + selectedItem.enhanceLevel : 0;
  const canEnhance =
    selectedItem &&
    selectedItem.enhanceLevel < 20 &&
    state.resources.linhThach >= enhanceCostStone &&
    state.resources.cuongHoaThach >= enhanceCostMat;

  const currentTierIdx = selectedItem ? EQUIPMENT_TIERS.findIndex((t) => t.id === selectedItem.tier) : 0;
  const currentTierDef = EQUIPMENT_TIERS[currentTierIdx] || EQUIPMENT_TIERS[0];
  const nextTierDef = EQUIPMENT_TIERS[currentTierIdx + 1];
  const canAscend =
    selectedItem &&
    nextTierDef &&
    state.resources.huyenThiet >= currentTierDef.ascendCostIron &&
    state.resources.tinhHoaBoss >= currentTierDef.ascendCostEssence &&
    state.resources.linhThach >= currentTierDef.ascendCostStone;

  return (
    <ScrollModalShell
      title="Cổ Bảo & 12 Ô Trang Bị Toàn Diện"
      subtitle="Cường hóa · Khảm Ngọc Ngũ Hành · Nâng Bậc Thần Khí · Kích hoạt Bộ Trang Bị Huyền Thoại"
      onClose={onClose}
      maxWidth="max-w-6xl"
      headerRight={
        <div className="hidden md:flex items-center gap-3 text-xs font-mono text-[#F5D88F]">
          <span className="inline-flex items-center gap-1">
            <ResourceIcon resource="cuongHoaThach" size="xs" />
            <span>Cường Hóa Thạch: {state.resources.cuongHoaThach}</span>
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <ResourceIcon resource="tinhHoaBoss" size="xs" />
            <span>Tinh Hoa Boss: {state.resources.tinhHoaBoss}</span>
          </span>
          <span>·</span>
          <span>Ngọc: {state.gems.length}</span>
        </div>
      }
    >
      {/* Disciple Switcher Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 border-b border-[#D5C5A3]">
        <span className="text-xs font-semibold text-[#5E5343] whitespace-nowrap">Chọn Đệ Tử:</span>
        {state.disciples.map((d) => {
          const active = d.id === disciple?.id;
          return (
            <button
              key={d.id}
              onClick={() => setDiscipleId(d.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                active ? 'bg-[#1E3B38] text-[#F9E6B3]' : 'bg-[#EAE1CD] text-[#3F372B] hover:bg-[#DFD2B5]'
              }`}
            >
              <ElementSeal element={d.element} size="xs" />
              <span>{d.name}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT: 12-Slot Character Paper-Doll (7 cols) */}
        {disciple && stats && (
          <div className="xl:col-span-7 space-y-3">
            {/* Quick-Equip Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#EAE1CD] border border-[#D4C39F]">
              <button
                onClick={() => onQuickEquipBest(disciple.id)}
                className="px-3.5 py-2 rounded-lg bg-[#1E3B38] hover:bg-[#29504C] text-[#F9E6B3] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Zap className="w-3.5 h-3.5 text-[#F5D687]" />
                Mặc Nhanh Tốt Nhất
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {availableSets.length > 0 && (
                  <select
                    value={chosenSetId}
                    onChange={(e) => setChosenSetId(e.target.value)}
                    className="px-2.5 py-2 rounded-lg bg-[#FAF6EC] border border-[#CBB993] text-xs font-medium text-[#3B3328] max-w-[205px]"
                  >
                    <option value="auto">Tự chọn Bộ mạnh nhất ({availableSets.length})</option>
                    {availableSets.map((s) => (
                      <option key={s.setId} value={s.setId}>
                        {s.name} ({s.count}/4 món)
                      </option>
                    ))}
                  </select>
                )}
                <button
                  disabled={availableSets.length === 0}
                  onClick={() =>
                    onQuickEquipSet(disciple.id, chosenSetId === 'auto' ? undefined : chosenSetId)
                  }
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    availableSets.length > 0
                      ? 'bg-[#8A5A0F] hover:bg-[#A66D14] text-[#FFF6DF] cursor-pointer'
                      : 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  Mặc Nhanh Cùng Bộ
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-11 gap-2.5 items-stretch">
              {/* Left 6 Equipment Slots */}
              <div className="sm:col-span-4 space-y-2">{leftSlots.map(renderSlotButton)}</div>

              {/* Center Character Silhouette & Stats */}
              <div className="sm:col-span-3 rounded-xl bg-gradient-to-b from-[#1D3532] to-[#132422] border-2 border-[#C9A45C] p-3 text-[#F6EBD0] flex flex-col justify-between">
                <div className="text-center space-y-1.5">
                  {(() => {
                    const f = disciple.fashionId ? VIP_FASHIONS[disciple.fashionId] : null;
                    return (
                      <>
                        <DisciplePortrait
                          discipleId={disciple.id}
                          name={disciple.name}
                          glyph={disciple.avatarGlyph}
                          element={disciple.element}
                          realmIndex={disciple.realmIndex}
                          spiritRoot={disciple.spiritRoot}
                          fashionId={disciple.fashionId}
                          size="xl"
                          fullBody
                          className="mx-auto"
                        />
                        <div className="font-bold text-sm truncate">{disciple.name}</div>
                        <div className="text-[11px] text-[#BBD2C7] inline-flex items-center justify-center gap-1">
                          <RealmBadge realmIndex={disciple.realmIndex} size="xs" />
                          <span>{REALM_LADDER[disciple.realmIndex]?.fullName}</span>
                        </div>
                        {f && <div className="text-[10px] font-bold text-[#FDE047]">{f.titleBadge}</div>}
                      </>
                    );
                  })()}
                  <div className="text-base font-mono font-bold text-[#F5D687] pt-1">
                    {formatNum(stats.power)}
                    <span className="block text-[10px] font-sans font-normal text-[#B3C8BE]">Thực Lực Cá Nhân</span>
                  </div>
                </div>

                <div className="space-y-1 text-[11px] font-mono tabular-nums pt-3 border-t border-[#C9A45C]/30 mt-3">
                  <div className="flex justify-between">
                    <span className="font-sans text-[#B4C9BF]">Sinh Lực</span>
                    <span>{formatNum(stats.hp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-[#B4C9BF]">Công Kích</span>
                    <span className="text-[#FCA5A5]">{formatNum(stats.atk)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-[#B4C9BF]">Phòng Thủ</span>
                    <span>{formatNum(stats.def)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-[#B4C9BF]">Tốc Độ</span>
                    <span className="text-[#93C5FD]">{stats.spd}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-[#B4C9BF]">Bạo Kích</span>
                    <span className="text-[#FDE047]">{stats.crit}%</span>
                  </div>
                </div>

                {/* Active Set Bonuses */}
                {stats.activeSets.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#C9A45C]/30 text-[10px] space-y-1.5">
                    {stats.activeSets.map((s) => (
                      <div key={s.setId} className="text-[#F4D585] flex items-center gap-1.5">
                        <LegendarySetSprite setId={s.setId} className="w-6 h-6" />
                        <span className="truncate">
                          {s.name} ({s.count}/4)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right 6 Equipment Slots */}
              <div className="sm:col-span-4 space-y-2">{rightSlots.map(renderSlotButton)}</div>
            </div>
          </div>
        )}

        {/* RIGHT: Bag / Upgrade & Socket / Gem Synthesis (5 cols) */}
        <div className="xl:col-span-5 flex flex-col rounded-xl bg-[#F5EFE0] border border-[#D4C39F] overflow-hidden">
          <div className="flex border-b border-[#D4C39F] bg-[#EAE1CD]">
            {[
              { id: 'bag', label: `Túi Đồ (${state.inventory.length})` },
              { id: 'upgrade', label: 'Cường Hóa / Khảm' },
              { id: 'gems', label: `Linh Ngọc (${state.gems.length})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setRightTab(t.id as 'bag' | 'upgrade' | 'gems')}
                className={`flex-1 py-2.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  rightTab === t.id
                    ? 'bg-[#1E3B38] text-[#F9E6B3]'
                    : 'text-[#4C4335] hover:bg-[#DFD2B5]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-3.5 flex-1 overflow-y-auto max-h-[54vh]">
            {rightTab === 'bag' && (
              <div className="space-y-3">
                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  <select
                    value={slotFilter}
                    onChange={(e) => setSlotFilter(e.target.value as EquipmentSlot | 'all')}
                    className="px-2.5 py-1.5 rounded-lg bg-[#FAF6EC] border border-[#CBB993] text-xs font-medium"
                  >
                    <option value="all">Tất cả 12 vị trí</option>
                    {EQUIPMENT_SLOTS.map((s) => (
                      <option key={s.slot} value={s.slot}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={rarityFilter}
                    onChange={(e) => setRarityFilter(e.target.value as Rarity | 'all')}
                    className="px-2.5 py-1.5 rounded-lg bg-[#FAF6EC] border border-[#CBB993] text-xs font-medium"
                  >
                    <option value="all">Mọi phẩm chất</option>
                    {(Object.keys(RARITY_META) as Rarity[]).map((r) => (
                      <option key={r} value={r}>
                        {RARITY_META[r].name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Inventory Items */}
                <div className="space-y-2">
                  {filteredBag.length === 0 && (
                    <div className="text-center py-8 text-xs text-[#736755]">
                      Không có trang bị phù hợp. Hãy vào Bí Cảnh hoặc Săn Boss Huyền Thoại!
                    </div>
                  )}
                  {filteredBag.map((item) => {
                    const rm = RARITY_META[item.rarity];
                    const tierDef = EQUIPMENT_TIERS.find((t) => t.id === item.tier);
                    const isEquippedHere = item.equippedBy === disciple?.id;
                    const wearer = item.equippedBy ? state.disciples.find((d) => d.id === item.equippedBy) : null;

                    return (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg border space-y-2"
                        style={{ backgroundColor: rm.bg, borderColor: rm.border }}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <RarityFrameBox rarity={item.rarity} size="md" enhanceLevel={item.enhanceLevel}>
                              <EquipmentSlotIcon slot={item.slot} className="w-8 h-8" />
                            </RarityFrameBox>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs" style={{ color: rm.color }}>
                                  [{rm.name}] {item.name}
                                </span>
                                {item.enhanceLevel > 0 && (
                                  <span className="text-[11px] font-mono font-bold text-[#B4690E]">+{item.enhanceLevel}</span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#5B5142]">
                                {tierDef?.name} · {STAT_LABEL[item.primaryStatKey]} +{formatNum(getEquipmentPrimaryValue(item))} · Lực chiến{' '}
                                <strong className="font-mono">{formatNum(getEquipmentPower(item))}</strong>
                              </div>
                              {item.setId && (
                                <div className="text-[10px] font-semibold text-[#8A5A0F]">
                                  {EQUIPMENT_SETS[item.setId]?.name}
                                </div>
                              )}
                            </div>
                          </div>
                          {wearer && (
                            <span className="text-[10px] font-semibold text-[#1E3B38] shrink-0">
                              {wearer.name.split(' ').slice(-1)[0]}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          {disciple && (
                            <button
                              onClick={() =>
                                isEquippedHere
                                  ? onUnequipSlot(disciple.id, item.slot)
                                  : onEquipItem(disciple.id, item.id)
                              }
                              className="px-2.5 py-1 rounded bg-[#1E3B38] hover:bg-[#2B534F] text-[#F9E6B3] text-[11px] font-semibold cursor-pointer"
                            >
                              {isEquippedHere ? 'Tháo ra' : 'Trang bị'}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedItemId(item.id);
                              setRightTab('upgrade');
                            }}
                            className="px-2.5 py-1 rounded bg-[#D4A24C] hover:bg-[#E2B45E] text-[#1D150A] text-[11px] font-semibold cursor-pointer"
                          >
                            Nâng Cấp / Khảm
                          </button>
                          {!item.equippedBy && (
                            <button
                              onClick={() => onSellItem(item.id)}
                              title={`Bán nhận ${rm.sellPrice} Linh Thạch`}
                              className="ml-auto px-2 py-1 rounded bg-[#EAE0CC] hover:bg-[#F3D4D1] text-[#8E2B23] text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              {formatNum(rm.sellPrice)}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {rightTab === 'upgrade' && (
              <div className="space-y-3">
                {!selectedItem ? (
                  <div className="text-center py-10 text-xs text-[#6B5F4C]">
                    Nhấp vào một ô trang bị đang mặc bên trái hoặc chọn từ Túi Đồ để Cường Hóa, Khảm Ngọc và Nâng Bậc.
                  </div>
                ) : (
                  <>
                    {/* Item Header */}
                    <div
                      className="p-3 rounded-lg border space-y-2"
                      style={{
                        backgroundColor: RARITY_META[selectedItem.rarity].bg,
                        borderColor: RARITY_META[selectedItem.rarity].border,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <RarityFrameBox
                          rarity={selectedItem.rarity}
                          size="lg"
                          enhanceLevel={selectedItem.enhanceLevel}
                        >
                          <EquipmentSlotIcon slot={selectedItem.slot} className="w-11 h-11" />
                        </RarityFrameBox>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="font-bold text-sm truncate"
                              style={{ color: RARITY_META[selectedItem.rarity].color }}
                            >
                              {selectedItem.name} {selectedItem.enhanceLevel > 0 ? `+${selectedItem.enhanceLevel}` : ''}
                            </span>
                            <span className="text-xs font-semibold text-[#5E5343] shrink-0">{currentTierDef.name}</span>
                          </div>
                          <div className="text-xs font-mono font-bold text-[#1E3331]">
                            Chính: {STAT_LABEL[selectedItem.primaryStatKey]} +{formatNum(getEquipmentPrimaryValue(selectedItem))}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1 pt-1 text-[11px] text-[#4C4335]">
                        {selectedItem.subStats.map((s, idx) => (
                          <div key={idx}>
                            · {s.label}: <strong className="font-mono">+{s.value}{s.isPercent ? '%' : ''}</strong>
                          </div>
                        ))}
                      </div>
                      {selectedItem.setId && EQUIPMENT_SETS[selectedItem.setId] && (
                        <div className="pt-2 mt-1.5 border-t border-black/10 text-[11px] text-[#8A5A0F] flex items-center gap-2">
                          <LegendarySetSprite setId={selectedItem.setId} className="w-10 h-10" />
                          <div className="min-w-0">
                            <strong>{EQUIPMENT_SETS[selectedItem.setId].name}:</strong> (2) {EQUIPMENT_SETS[selectedItem.setId].twoPieceDesc} · (4){' '}
                            {EQUIPMENT_SETS[selectedItem.setId].fourPieceDesc}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 1. Cường Hóa (+0 -> +20) */}
                    <div className="p-3 rounded-lg bg-[#EAE1CD] border border-[#D4C39F] space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-[#1E3331]">
                        <span className="flex items-center gap-1.5">
                          <ArrowUp className="w-3.5 h-3.5 text-[#B4690E]" /> Cường Hóa Trang Bị (+{selectedItem.enhanceLevel}/20)
                        </span>
                        <span className="text-[#257A52]">+11% chỉ số chính/cấp</span>
                      </div>
                      {selectedItem.enhanceLevel < 20 ? (
                        <>
                          <div className="text-[11px] font-mono flex gap-3">
                            <span>Linh Thạch: {formatNum(enhanceCostStone)}</span>
                            <span>Cường Hóa Thạch: {enhanceCostMat}</span>
                          </div>
                          <button
                            disabled={!canEnhance}
                            onClick={() => onEnhanceItem(selectedItem.id)}
                            className={`w-full py-2 rounded-lg text-xs font-bold ${
                              canEnhance
                                ? 'bg-[#1E3B38] hover:bg-[#2B534F] text-[#F9E6B3] cursor-pointer'
                                : 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                            }`}
                          >
                            Cường Hóa lên +{selectedItem.enhanceLevel + 1}
                          </button>
                        </>
                      ) : (
                        <div className="text-xs font-bold text-[#B4690E]">Đã đạt Cường Hóa Tối Đa +20!</div>
                      )}
                    </div>

                    {/* 2. Nâng Bậc (Tier Ascension) */}
                    <div className="p-3 rounded-lg bg-[#EAE1CD] border border-[#D4C39F] space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-[#1E3331]">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#7B4EA3]" /> Nâng Bậc Pháp Bảo
                        </span>
                        <span>
                          {currentTierDef.name} {nextTierDef ? `→ ${nextTierDef.name}` : '(Tối Đa)'}
                        </span>
                      </div>
                      {nextTierDef ? (
                        <>
                          <div className="text-[11px] font-mono flex flex-wrap gap-3">
                            <span>Huyền Thiết: {currentTierDef.ascendCostIron}</span>
                            <span>Tinh Hoa Boss: {currentTierDef.ascendCostEssence}</span>
                            <span>Linh Thạch: {formatNum(currentTierDef.ascendCostStone)}</span>
                          </div>
                          <button
                            disabled={!canAscend}
                            onClick={() => onAscendItem(selectedItem.id)}
                            className={`w-full py-2 rounded-lg text-xs font-bold ${
                              canAscend
                                ? 'bg-[#7B4EA3] hover:bg-[#693E8E] text-white cursor-pointer'
                                : 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                            }`}
                          >
                            Nâng Bậc lên {nextTierDef.name} (+35% Sức Mạnh & Thêm Dòng Ẩn)
                          </button>
                        </>
                      ) : (
                        <div className="text-xs font-bold text-[#B92B27]">Đã đạt phẩm cấp tối thượng Thần Khí!</div>
                      )}
                    </div>

                    {/* 3. Khảm Ngọc (Sockets) */}
                    <div className="p-3 rounded-lg bg-[#EAE1CD] border border-[#D4C39F] space-y-2">
                      <div className="text-xs font-bold text-[#1E3331] flex items-center gap-1.5">
                        <Gem className="w-3.5 h-3.5 text-[#1D5E8C]" /> Khảm Linh Ngọc ({selectedItem.sockets.length} Lỗ)
                      </div>
                      <div className="space-y-2">
                        {selectedItem.sockets.map((gem, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded bg-[#FAF6EC] border border-[#D5C5A3] flex items-center justify-between gap-2 text-xs"
                          >
                            {gem ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <RarityFrameBox rarity={gemTierToRarity(gem.tier)} size="sm">
                                    <GemSprite element={gem.element} tier={gem.tier} className="w-7 h-7" />
                                  </RarityFrameBox>
                                  <div>
                                    <div className="font-semibold">{gem.name}</div>
                                    <div className="text-[10px] text-[#257A52] font-mono">
                                      +{gem.statValue} {GEM_NAMES[gem.element].statLabel}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => onUnsocketGem(selectedItem.id, idx)}
                                  className="px-2 py-1 rounded bg-[#EAE0CC] hover:bg-[#F3D4D1] text-[#8E2B23] text-[11px] font-semibold cursor-pointer"
                                >
                                  Gỡ
                                </button>
                              </>
                            ) : (
                              <div className="w-full flex items-center justify-between gap-2">
                                <span className="text-[#7A6F5D]">Lỗ #{idx + 1} trống</span>
                                {state.gems.length > 0 ? (
                                  <select
                                    defaultValue=""
                                    onChange={(e) => {
                                      if (e.target.value) onSocketGem(selectedItem.id, idx, e.target.value);
                                    }}
                                    className="px-2 py-1 rounded bg-[#1E3B38] text-[#F9E6B3] text-[11px] font-semibold cursor-pointer max-w-[180px]"
                                  >
                                    <option value="">+ Chọn Ngọc Khảm</option>
                                    {state.gems.map((g) => (
                                      <option key={g.id} value={g.id}>
                                        {g.name} (+{g.statValue})
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-[10px] text-[#9A8E7A]">Hết ngọc trong túi</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {rightTab === 'gems' && (
              <div className="space-y-3">
                <div className="p-2.5 rounded-lg bg-[#EAE1CD] text-xs text-[#4C4335] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#257A52] shrink-0" />
                  Ghép <strong>3 Linh Ngọc cùng hệ & cùng bậc</strong> thành 1 viên Bậc cao hơn (+75% chỉ số)!
                </div>

                {gemGroups.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#6B5F4C]">
                    Chưa có Linh Ngọc. Hãy chinh phục Bí Cảnh hoặc mua tại Chợ Giao Dịch!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {gemGroups.map((g) => {
                      const canMerge = g.count >= 3 && g.tier < 5;
                      return (
                        <div
                          key={`${g.element}_${g.tier}`}
                          className="p-2.5 rounded-lg bg-[#FAF6EC] border border-[#D4C39F] flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <RarityFrameBox rarity={gemTierToRarity(g.tier)} size="sm">
                              <GemSprite element={g.element as ElementType} tier={g.tier} className="w-7 h-7" />
                            </RarityFrameBox>
                            <div>
                              <div className="font-bold text-[#1E3331]">
                                {g.sampleName} <span className="font-mono text-[#8A5A0F]">x{g.count}</span>
                              </div>
                              <div className="text-[11px] text-[#257A52] font-mono">
                                +{g.statVal} {GEM_NAMES[g.element as keyof typeof GEM_NAMES].statLabel}
                              </div>
                            </div>
                          </div>
                          <button
                            disabled={!canMerge}
                            onClick={() => onMergeGems(g.element, g.tier)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                              canMerge
                                ? 'bg-[#8A5A0F] hover:bg-[#A66D14] text-[#FFF6DF] cursor-pointer'
                                : 'bg-[#D6CCB8] text-[#7D7362] cursor-not-allowed'
                            }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            Hợp Thành
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ScrollModalShell>
  );
}
