import React, { useState } from 'react';
import { EQUIPMENT_TIERS, RARITY_META } from '../data/constants';
import { CombatContext, GameState, MarketListing, SpiritVein } from '../types/game';
import { computeTotalSectPower, formatNum, getEquipmentPower } from '../utils/gameLogic';
import {
  ElementSeal,
  EnemyUnitSprite,
  EquipmentSlotIcon,
  GemSprite,
  RarityFrameBox,
  ResourceIcon,
  ScrollModalShell,
  SpiritVeinSprite,
} from './ElementIcons';
import { Coins, Flag, Handshake, MessageSquare, RefreshCw, Send, Shield, ShoppingBag, Swords } from 'lucide-react';

interface AllianceMarketModalProps {
  state: GameState;
  initialTab?: 'alliance' | 'veins' | 'market';
  onClose: () => void;
  onDonateAlliance: () => void;
  onUpgradeAllianceTech: (techKey: 'atkLevel' | 'qiLevel' | 'dropLevel') => void;
  onSendChat: (channel: 'bang_hoi' | 'the_gioi', text: string) => void;
  onChallengeVein: (ctx: CombatContext) => void;
  onClaimVeinTribute: () => void;
  onBuyListing: (listingId: string) => void;
  onListEquipmentForSale: (itemId: string, price: number) => void;
  onRefreshMarket: () => void;
}

export function AllianceMarketModal({
  state,
  initialTab = 'alliance',
  onClose,
  onDonateAlliance,
  onUpgradeAllianceTech,
  onSendChat,
  onChallengeVein,
  onClaimVeinTribute,
  onBuyListing,
  onListEquipmentForSale,
  onRefreshMarket,
}: AllianceMarketModalProps) {
  const [tab, setTab] = useState<'alliance' | 'veins' | 'market'>(initialTab);
  const [chatInput, setChatInput] = useState('');
  const [sellItemId, setSellItemId] = useState('');
  const [sellPrice, setSellPrice] = useState(1200);

  const myPower = computeTotalSectPower(state);
  const ownedVeins = state.spiritVeins.filter((v) => v.isOwnedByPlayer);
  const hourlyStone = ownedVeins.reduce((s, v) => s + v.linhThachPerHour, 0);
  const hourlyJade = ownedVeins.reduce((s, v) => s + v.tienNgocPerHour, 0);
  const unequippedGear = state.inventory.filter((i) => !i.equippedBy);
  const guildChats = state.chatMessages.filter((m) => m.channel === 'bang_hoi');

  const handleChallengeVein = (vein: SpiritVein) => {
    if (state.resources.stamina < 15) return;
    onChallengeVein({
      mode: 'vein',
      title: `Tranh Đoạt: ${vein.name}`,
      subtitle: `${vein.grade} · Đối thủ: ${vein.ownerAlliance}`,
      targetId: vein.id,
      enemies: vein.guardians,
      staminaCost: 15,
      veinDef: vein,
    });
  };

  const submitGuildChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat('bang_hoi', chatInput.trim());
    setChatInput('');
  };

  return (
    <ScrollModalShell
      title="Tiên Minh · Tranh Đoạt Linh Mạch & Chợ Tự Do"
      subtitle={`${state.alliance.name} (Cấp ${state.alliance.level}) · Cống hiến: ${formatNum(state.alliance.contribution)} · Linh Thạch: ${formatNum(state.resources.linhThach)}`}
      onClose={onClose}
      maxWidth="max-w-5xl"
    >
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-[#D4C39F] pb-2.5">
        <button
          onClick={() => setTab('alliance')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            tab === 'alliance' ? 'bg-[#1E3B38] text-[#F9E6B3]' : 'bg-[#EAE1CD] text-[#4C4335] hover:bg-[#DFD2B5]'
          }`}
        >
          <Handshake className="w-3.5 h-3.5" />
          Bang Hội & Giao Lưu
        </button>
        <button
          onClick={() => setTab('veins')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            tab === 'veins' ? 'bg-[#8F241D] text-[#FFF1E6]' : 'bg-[#EAE1CD] text-[#4C4335] hover:bg-[#DFD2B5]'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          Tranh Đoạt Linh Mạch ({ownedVeins.length}/{state.spiritVeins.length})
        </button>
        <button
          onClick={() => setTab('market')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            tab === 'market' ? 'bg-[#8A5A0F] text-[#FFF6DF]' : 'bg-[#EAE1CD] text-[#4C4335] hover:bg-[#DFD2B5]'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Chợ Giao Dịch Tự Do ({state.marketListings.length})
        </button>
      </div>

      {/* TAB 1: ALLIANCE HALL & CHAT */}
      {tab === 'alliance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Tech & Members (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 rounded-xl bg-[#F5EFE0] border border-[#D4C39F] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-[#1E3331]" style={{ fontFamily: 'var(--font-display)' }}>
                    {state.alliance.name} · Cấp {state.alliance.level}
                  </h3>
                  <p className="text-xs text-[#6B5F4C]">{state.alliance.notice}</p>
                </div>
                <button
                  disabled={state.resources.linhThach < 400}
                  onClick={onDonateAlliance}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                    state.resources.linhThach >= 400
                      ? 'bg-[#D4A24C] hover:bg-[#E4B45E] text-[#1D150A] cursor-pointer'
                      : 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  Cống Hiến (-400 LT · +200 ĐCH)
                </button>
              </div>

              {/* Alliance Tech Buffs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#DFD2B6]">
                {[
                  {
                    key: 'atkLevel' as const,
                    name: 'Chiến Trận Bí Thuật',
                    val: state.alliance.tech.atkLevel,
                    desc: `+${state.alliance.tech.atkLevel * 4}% Công kích toàn đội`,
                  },
                  {
                    key: 'qiLevel' as const,
                    name: 'Tụ Linh Đại Trận',
                    val: state.alliance.tech.qiLevel,
                    desc: `+${state.alliance.tech.qiLevel * 8}% Tốc độ Linh Khí`,
                  },
                  {
                    key: 'dropLevel' as const,
                    name: 'Khí Vận Tiên Minh',
                    val: state.alliance.tech.dropLevel,
                    desc: `+${state.alliance.tech.dropLevel * 10}% Thưởng Bí Cảnh`,
                  },
                ].map((tech) => {
                  const cost = 250 + tech.val * 180;
                  const canUp = state.alliance.contribution >= cost;
                  return (
                    <div key={tech.key} className="p-2.5 rounded-lg bg-[#EAE1CD] border border-[#D4C39F] flex flex-col justify-between space-y-2">
                      <div>
                        <div className="font-bold text-xs text-[#1E3331]">
                          {tech.name} <span className="font-mono text-[#8A5A0F]">Lv.{tech.val}</span>
                        </div>
                        <div className="text-[11px] text-[#257A52] mt-0.5">{tech.desc}</div>
                      </div>
                      <button
                        disabled={!canUp}
                        onClick={() => onUpgradeAllianceTech(tech.key)}
                        className={`w-full py-1.5 rounded text-[11px] font-bold ${
                          canUp
                            ? 'bg-[#1E3B38] hover:bg-[#2A514D] text-[#F9E6B3] cursor-pointer'
                            : 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                        }`}
                      >
                        Nâng ({cost} ĐCH)
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Member List */}
            <div className="p-4 rounded-xl bg-[#F5EFE0] border border-[#D4C39F] space-y-2">
              <div className="text-xs font-bold text-[#1E3331] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#1D5E8C]" /> Thành Viên Tiên Minh ({state.alliance.members.length})
              </div>
              <div className="space-y-1.5">
                {state.alliance.members.map((m) => (
                  <div
                    key={m.id}
                    className="px-3 py-2 rounded-lg bg-[#FAF6EC] border border-[#DFD2B6] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#1E3331]">{m.name}</span>
                      <span className="ml-2 text-[11px] text-[#8A5A0F] font-semibold">· {m.role}</span>
                      <span className="ml-2 text-[11px] text-[#6B5F4C]">· {m.realmLabel}</span>
                    </div>
                    <div className="font-mono font-bold text-[#1E3B38]">
                      {formatNum(m.id === 'm1' ? myPower : m.power)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Alliance Live Chat (5 cols) */}
          <div className="lg:col-span-5 rounded-xl bg-[#F5EFE0] border border-[#D4C39F] p-4 flex flex-col h-[420px]">
            <div className="text-sm font-bold text-[#1E3331] flex items-center gap-1.5 pb-2 border-b border-[#D5C5A3]">
              <MessageSquare className="w-4 h-4 text-[#257A52]" /> Kênh Giao Lưu Bang Hội
            </div>
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 text-xs">
              {guildChats.map((msg) => (
                <div key={msg.id} className="p-2.5 rounded-lg bg-[#FAF6EC] border border-[#DFD2B6]">
                  <div className="font-bold text-[#1E3B38]">{msg.sender}</div>
                  <div className="text-[#3D3529] mt-0.5">{msg.text}</div>
                </div>
              ))}
            </div>
            <form onSubmit={submitGuildChat} className="flex gap-2 pt-2 border-t border-[#D5C5A3]">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Nhắn tin giao lưu cùng đạo hữu..."
                className="flex-1 px-3 py-2 rounded-lg bg-[#FAF6EC] border border-[#CBB993] text-xs focus:outline-none focus:border-[#1E3B38]"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-lg bg-[#1E3B38] hover:bg-[#2A514D] text-[#F9E6B3] cursor-pointer"
                aria-label="Gửi tin"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: SPIRIT VEIN TERRITORY WAR */}
      {tab === 'veins' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#EAE1CD] border border-[#D4C39F] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-[#1E3331]">
                Sản Lượng Linh Mạch Đang Chiếm Giữ: +{formatNum(hourlyStone)} Linh Thạch/giờ · +{hourlyJade} Tiên Ngọc/giờ
              </div>
              <div className="text-[#6B5F4C]">
                Đánh bại thủ vệ bang phái đối địch để đoạt quyền khai thác Linh Mạch (cộng thẳng vào chế độ treo máy offline!).
              </div>
            </div>
            <button
              onClick={onClaimVeinTribute}
              className="px-3.5 py-2 rounded-lg bg-[#D4A24C] hover:bg-[#E4B45E] text-[#1D150A] font-bold cursor-pointer whitespace-nowrap"
            >
              Thu Cống Phẩm Ngay (+1 Giờ)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {state.spiritVeins.map((vein) => {
              const enoughStamina = state.resources.stamina >= 15;
              return (
                <div
                  key={vein.id}
                  className={`p-4 rounded-xl border-2 flex flex-col justify-between space-y-3 ${
                    vein.isOwnedByPlayer
                      ? 'bg-[#E8F4ED] border-[#4CA87B]'
                      : 'bg-[#F5EFE0] border-[#D4C39F]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <SpiritVeinSprite veinId={vein.id} name={vein.name} className="w-16 h-16" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <ElementSeal element={vein.element} size="xs" />
                            <div className="font-bold text-sm text-[#1E3331] truncate">{vein.name}</div>
                          </div>
                          <div className="text-[11px] font-semibold text-[#8A5A0F] mt-0.5">
                            {vein.grade} · Chủ sở hữu: {vein.ownerAlliance}
                          </div>
                          <div className="text-xs font-mono tabular-nums text-[#4C4335] mt-1">
                            <strong>+{formatNum(vein.linhThachPerHour)} LT/h</strong> ·{' '}
                            <strong className="text-[#15803D]">+{vein.tienNgocPerHour} Tiên Ngọc/h</strong>
                          </div>
                        </div>
                      </div>
                      {vein.isOwnedByPlayer && (
                        <span className="text-xs font-bold text-[#1F7A4D] shrink-0">Đã Chiếm</span>
                      )}
                    </div>

                    <div className="pt-1.5 border-t border-[#D4C39F]/70 space-y-1.5">
                      <div className="text-xs font-mono text-[#5B5142]">
                        Thủ vệ lực chiến:{' '}
                        <strong className={myPower >= vein.guardianPower ? 'text-[#257A52]' : 'text-[#B92B27]'}>
                          {formatNum(vein.guardianPower)}
                        </strong>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {vein.guardians.map((g) => (
                          <div
                            key={g.id}
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#EAE0C9]/85 border border-[#D4C39F]"
                          >
                            <EnemyUnitSprite
                              id={g.id}
                              name={g.name}
                              element={g.element}
                              glyph={g.glyph}
                              className="w-7 h-7"
                            />
                            <span className="text-[11px] font-semibold text-[#3C3327] whitespace-nowrap">
                              {g.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {!vein.isOwnedByPlayer && (
                    <button
                      disabled={!enoughStamina}
                      onClick={() => handleChallengeVein(vein)}
                      className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${
                        enoughStamina
                          ? 'bg-[#A62820] hover:bg-[#C2342A] text-[#FFF4E8] cursor-pointer'
                          : 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                      }`}
                    >
                      <Swords className="w-3.5 h-3.5" />
                      Phát Động Tranh Đoạt Linh Mạch (-15 TL)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: FREE TRADE MARKET */}
      {tab === 'market' && (
        <div className="space-y-4">
          {/* Player Sell Box */}
          <div className="p-3.5 rounded-xl bg-[#EAE1CD] border border-[#D4C39F] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-[#1E3331]">Ký Gửi Trang Bị Tự Do:</span>
              <select
                value={sellItemId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSellItemId(id);
                  const found = unequippedGear.find((g) => g.id === id);
                  if (found) setSellPrice(Math.round(RARITY_META[found.rarity].sellPrice * 1.8));
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#FAF6EC] border border-[#CBB993] text-xs max-w-[220px]"
              >
                <option value="">-- Chọn trang bị chưa mặc --</option>
                {unequippedGear.map((g) => (
                  <option key={g.id} value={g.id}>
                    [{RARITY_META[g.rarity].name}] {g.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={100}
                step={100}
                value={sellPrice}
                onChange={(e) => setSellPrice(Math.max(100, Number(e.target.value)))}
                className="w-24 px-2 py-1.5 rounded-lg bg-[#FAF6EC] border border-[#CBB993] font-mono text-xs"
              />
              <button
                disabled={!sellItemId}
                onClick={() => {
                  if (sellItemId) {
                    onListEquipmentForSale(sellItemId, sellPrice);
                    setSellItemId('');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                  sellItemId
                    ? 'bg-[#1E3B38] hover:bg-[#2A514D] text-[#F9E6B3] cursor-pointer'
                    : 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                }`}
              >
                Đăng Bán (Thu Ngay Linh Thạch)
              </button>
            </div>

            <button
              onClick={onRefreshMarket}
              className="px-3 py-1.5 rounded-lg bg-[#D4A24C] hover:bg-[#E4B45E] text-[#1D150A] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Làm Mới Phiên Chợ (100 LT)
            </button>
          </div>

          {/* Market Listings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {state.marketListings.map((listing: MarketListing) => {
              const rm = RARITY_META[listing.rarity];
              const canBuy = state.resources.linhThach >= listing.priceLinhThach && !listing.isPlayerListing;
              const tierName = listing.equipmentData
                ? EQUIPMENT_TIERS.find((t) => t.id === listing.equipmentData!.tier)?.name
                : null;

              return (
                <div
                  key={listing.id}
                  className="p-3 rounded-xl border flex items-center justify-between gap-3"
                  style={{ backgroundColor: rm.bg, borderColor: rm.border }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <RarityFrameBox
                      rarity={listing.rarity}
                      size="md"
                      enhanceLevel={listing.equipmentData?.enhanceLevel}
                    >
                      {listing.equipmentData ? (
                        <EquipmentSlotIcon slot={listing.equipmentData.slot} className="w-8 h-8" />
                      ) : listing.gemData ? (
                        <GemSprite element={listing.gemData.element} tier={listing.gemData.tier} className="w-8 h-8" />
                      ) : (
                        <ResourceIcon resource="dotPhaDan" size="md" />
                      )}
                    </RarityFrameBox>
                    <div className="min-w-0 space-y-0.5">
                      <div className="font-bold text-sm truncate" style={{ color: rm.color }}>
                        [{rm.name}] {listing.name}
                      </div>
                      <div className="text-[11px] text-[#5B5142]">
                        Người bán: <strong>{listing.sellerName}</strong>
                        {listing.equipmentData && (
                          <>
                            {' '}
                            · {tierName} · Lực chiến{' '}
                            <strong className="font-mono">{formatNum(getEquipmentPower(listing.equipmentData))}</strong>
                          </>
                        )}
                        {listing.gemData && <> · Chỉ số +{listing.gemData.statValue}</>}
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={!canBuy}
                    onClick={() => onBuyListing(listing.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-mono font-bold shrink-0 flex items-center gap-1 ${
                      canBuy
                        ? 'bg-[#1E3B38] hover:bg-[#2A514D] text-[#F9E6B3] cursor-pointer'
                        : 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                    }`}
                  >
                    <ResourceIcon resource="linhThach" size="xs" />
                    <span>{formatNum(listing.priceLinhThach)}</span>
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
