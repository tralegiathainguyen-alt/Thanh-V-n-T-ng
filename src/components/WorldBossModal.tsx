import React, { useEffect, useState } from 'react';
import {
  WORLD_BOSS_ATTACK_COOLDOWN_MS,
  WORLD_BOSS_DEF,
  WORLD_BOSS_RANK_TIERS,
  WORLD_BOSS_SCHEDULES,
  WorldBossRankTier,
  WorldBossSessionState,
  WorldBossWindowStatus,
  formatCountdown,
  getPlayerWorldBossRank,
  getRankRewardTier,
  getSortedRaiders,
} from '../data/worldBoss';
import { VIP_FASHIONS } from '../data/constants';
import { GameState } from '../types/game';
import { formatNum } from '../utils/gameLogic';
import { ScrollModalShell } from './ElementIcons';
import { Clock, Crown, Flame, Gift, Shield, Sparkles, Swords, Trophy, Users } from 'lucide-react';

interface WorldBossModalProps {
  state: GameState;
  winStatus: WorldBossWindowStatus;
  session: WorldBossSessionState;
  onClose: () => void;
  onAttackBoss: () => void;
  onSummonNow: () => void;
  onClaimRankReward: (rank: number, tier: WorldBossRankTier) => void;
  onClaimKillReward: () => void;
}

export const WorldBossModal: React.FC<WorldBossModalProps> = ({
  state,
  winStatus,
  session,
  onClose,
  onAttackBoss,
  onSummonNow,
  onClaimRankReward,
  onClaimKillReward,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const sortedRaiders = getSortedRaiders(session);
  const playerRank = getPlayerWorldBossRank(session);
  const currentTier = playerRank ? getRankRewardTier(playerRank) : null;
  const hpPct = Math.max(0, Math.min(100, (session.currentHp / session.maxHp) * 100));

  const cooldownRemMs = Math.max(0, session.lastPlayerAttackAt + WORLD_BOSS_ATTACK_COOLDOWN_MS - nowMs);
  const cooldownSec = Math.ceil(cooldownRemMs / 1000);

  const canAttack = winStatus.isActive && !session.slain && cooldownRemMs <= 0;
  const canClaimRank =
    session.playerDamage > 0 &&
    !session.rankRewardClaimed &&
    (session.slain || !winStatus.isActive);
  const canClaimKill =
    session.slain && session.playerDamage > 0 && !session.killRewardClaimed;

  const bossVipFashion = VIP_FASHIONS.hon_don_long_hoang;
  const alreadyOwnsBossFashion = state.vip.unlockedFashions.includes('hon_don_long_hoang');

  return (
    <ScrollModalShell
      title="Boss Thế Giới Toàn Server · Hỗn Độn Thiên Ma Long"
      subtitle="Xuất hiện 4 lần/ngày (30 phút/đợt) · Xếp Hạng Sát Thương & Quà Tiêu Diệt Thời Trang VIP + Đồ VIP"
      onClose={onClose}
      maxWidth="max-w-5xl"
    >
      <div className="space-y-4">
        {/* TOP HERO BOSS ARENA BANNER */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-[#C9A45C] bg-gradient-to-br from-[#160B24] via-[#2B0F1A] to-[#121C24] p-4 text-[#F8EED6] shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Boss Sprite */}
            <div className="md:col-span-4 flex flex-col items-center">
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center">
                <div
                  className="absolute inset-2 rounded-full blur-2xl opacity-60 pointer-events-none"
                  style={{
                    background: session.slain
                      ? 'radial-gradient(circle, rgba(250,204,21,0.55), transparent 70%)'
                      : 'radial-gradient(circle, rgba(168,85,247,0.7), rgba(239,68,68,0.45), transparent 72%)',
                  }}
                />
                <img
                  src="./assets/sprites/bosses/boss_world_hon_don.png"
                  alt={WORLD_BOSS_DEF.name}
                  className={`relative z-10 w-full h-full object-contain drop-shadow-[0_0_22px_rgba(250,204,21,0.45)] ${
                    session.slain ? 'grayscale opacity-75' : 'animate-pulse'
                  }`}
                  style={{ animationDuration: '3.2s' }}
                />
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-black/50 border border-[#C9A45C]/60 text-[#FDE047]">
                <Users className="w-3.5 h-3.5 text-[#34D399]" />
                <span>{session.raiders.length} Tông Môn đang hợp lực</span>
              </div>
            </div>

            {/* Boss Info + Global HP + 4 Daily Schedules + CTA */}
            <div className="md:col-span-8 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black text-[#FDE047] tracking-wide">
                      {WORLD_BOSS_DEF.name}
                    </h3>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#7F1D1D] border border-[#FCA5A5]/60 text-[#FEE2E2]">
                      BOSS TOÀN SERVER
                    </span>
                  </div>
                  <p className="text-xs text-[#D6C7A9] mt-0.5">{WORLD_BOSS_DEF.title}</p>
                </div>

                {/* Live Timer Badge */}
                {winStatus.isActive && !session.slain ? (
                  <div className="px-3 py-1.5 rounded-xl bg-[#991B1B]/90 border border-[#FDE047] text-right shadow-md">
                    <div className="text-[10px] uppercase font-bold text-[#FEF08A] flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 animate-bounce" /> ĐANG XUẤT HIỆN
                    </div>
                    <div className="text-sm font-black font-mono text-white">
                      Còn {formatCountdown(winStatus.remainingSec)}
                    </div>
                  </div>
                ) : session.slain ? (
                  <div className="px-3 py-1.5 rounded-xl bg-[#14532D]/90 border border-[#4ADE80] text-right">
                    <div className="text-[10px] uppercase font-bold text-[#86EFAC] flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5" /> ĐÃ BỊ TIÊU DIỆT
                    </div>
                    <div className="text-xs font-bold text-white">
                      Kết liễu: {session.killerName || 'Toàn Server'}
                    </div>
                  </div>
                ) : (
                  <div className="px-3 py-1.5 rounded-xl bg-[#1E293B]/90 border border-[#94A3B8]/60 text-right">
                    <div className="text-[10px] uppercase font-bold text-[#CBD5E1] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> SẮP XUẤT HIỆN
                    </div>
                    <div className="text-sm font-black font-mono text-[#FDE047]">
                      {formatCountdown(winStatus.nextSpawnInSec)}
                    </div>
                  </div>
                )}
              </div>

              {/* Global Server HP Bar with 3 Phase Markers (65% & 30%) */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-mono">
                  <span className="font-bold text-[#FCA5A5]">
                    Sinh Lực Boss Toàn Server
                  </span>
                  <span className="font-bold text-[#FEF08A]">
                    {session.currentHp.toLocaleString('vi-VN')} / {session.maxHp.toLocaleString('vi-VN')} ({hpPct.toFixed(1)}%)
                  </span>
                </div>
                <div className="relative h-4 w-full rounded-full bg-black/60 border border-[#C9A45C]/70 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${hpPct}%`,
                      background:
                        hpPct > 65
                          ? 'linear-gradient(90deg, #991B1B 0%, #DC2626 50%, #F97316 85%, #FDE047 100%)'
                          : hpPct > 30
                            ? 'linear-gradient(90deg, #581C87 0%, #9333EA 50%, #F97316 100%)'
                            : 'linear-gradient(90deg, #450A0A 0%, #DC2626 55%, #F43F5E 100%)',
                    }}
                  />
                  {/* Phase threshold notches at 30% and 65% */}
                  <div className="absolute top-0 bottom-0 left-[30%] w-0.5 bg-white/70 pointer-events-none" title="Ngưỡng Giai Đoạn 3 (30% HP)" />
                  <div className="absolute top-0 bottom-0 left-[65%] w-0.5 bg-white/70 pointer-events-none" title="Ngưỡng Giai Đoạn 2 (65% HP)" />
                </div>
                {/* Boss Combat Mechanics Specs Bar */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span
                    className="px-2 py-0.5 rounded-full font-black text-white"
                    style={{
                      backgroundColor: hpPct > 65 ? '#D97706' : hpPct > 30 ? '#9333EA' : '#DC2626',
                    }}
                  >
                    {hpPct > 65
                      ? 'GĐ 1 · Thái Cổ Uy Áp'
                      : hpPct > 30
                        ? 'GĐ 2 · Hỗn Độn Long Lân'
                        : 'GĐ 3 · Diệt Thế Cuồng Nộ'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/40 border border-white/15 text-[#FCA5A5] font-mono">
                    Miễn Thương {hpPct > 65 ? '45%' : hpPct > 30 ? '58%' : '65%'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/40 border border-white/15 text-[#DDD6FE] font-mono">
                    Kháng Bạo {hpPct > 65 ? '25%' : hpPct > 30 ? '30%' : '35%'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/40 border border-white/15 text-[#FDE68A] font-mono">
                    Không Giới Hạn ST · Long Uy Hộ Thể
                  </span>
                </div>
              </div>

              {/* 4 Daily Spawn Windows */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {WORLD_BOSS_SCHEDULES.map((slot) => {
                  const isCurrentSlot = winStatus.isActive && !winStatus.isCustomSummon && winStatus.slotIndex === slot.index;
                  return (
                    <div
                      key={slot.index}
                      className={`px-2 py-1.5 rounded-lg border text-center transition-all ${
                        isCurrentSlot
                          ? 'bg-[#7F1D1D]/90 border-[#FDE047] text-[#FEF08A] shadow'
                          : 'bg-black/35 border-white/15 text-[#CBD5E1]'
                      }`}
                    >
                      <div className="text-[10px] font-bold">{slot.label}</div>
                      <div className="text-[11px] font-mono font-bold text-white">{slot.timeText}</div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {winStatus.isActive && !session.slain ? (
                  <button
                    type="button"
                    disabled={!canAttack}
                    onClick={onAttackBoss}
                    className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 border transition-all ${
                      canAttack
                        ? 'bg-gradient-to-r from-[#B91C1C] via-[#D97706] to-[#B45309] hover:brightness-110 text-[#FFFBEB] border-[#FDE047] shadow-lg cursor-pointer'
                        : 'bg-[#334155] text-[#94A3B8] border-white/15 cursor-not-allowed'
                    }`}
                  >
                    <Swords className="w-4 h-4" />
                    {cooldownSec > 0
                      ? `Hồi Chiêu Xuất Trận (${cooldownSec}s)...`
                      : 'Xuất Trận Đánh Boss Toàn Server (0 Thể Lực)'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSummonNow}
                    className="flex-1 min-w-[220px] py-2.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-[#6D28D9] via-[#B91C1C] to-[#D97706] hover:brightness-110 text-[#FFFBEB] border border-[#FDE047] shadow-lg cursor-pointer"
                  >
                    <Flame className="w-4 h-4" />
                    {session.slain
                      ? 'Triệu Hồi Đợt Boss Thế Giới Mới (30 phút)'
                      : 'Triệu Hồi Khẩn Cấp · Mở Đợt Boss 30p Ngay'}
                  </button>
                )}

                <div className="px-3 py-2 rounded-xl bg-black/40 border border-[#C9A45C]/45 text-xs">
                  <div className="text-[10px] text-[#CBD5E1]">Sát thương của bạn</div>
                  <div className="font-mono font-black text-[#FDE047]">
                    {session.playerDamage > 0
                      ? `${session.playerDamage.toLocaleString('vi-VN')} (Hạng #${playerRank})`
                      : 'Chưa tham gia'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM 2-COLUMN: LIVE DAMAGE RANKING + VIP REWARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT: LIVE DAMAGE LEADERBOARD + SERVER BATTLE FEED */}
          <div className="lg:col-span-6 space-y-3">
            <div className="rounded-xl bg-[#F5EDD9] border border-[#C9A45C] p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-[#351F09] flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-[#B45309]" />
                  Bảng Xếp Hạng Sát Thương Toàn Server
                </h4>
                <span className="text-[11px] font-semibold text-[#6B5A3E]">
                  Cập nhật trực tiếp
                </span>
              </div>

              <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
                {sortedRaiders.map((raider, idx) => {
                  const rank = idx + 1;
                  const medal =
                    rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                  return (
                    <div
                      key={raider.id}
                      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs border ${
                        raider.isPlayer
                          ? 'bg-[#FEF3C7] border-[#D97706] font-bold text-[#78350F] shadow-sm'
                          : rank <= 3
                            ? 'bg-[#EFE4C8] border-[#D4B97E] text-[#351F09]'
                            : 'bg-[#FAF5E8] border-[#E4D7BA] text-[#4B3D2A]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 text-center font-black shrink-0">{medal}</span>
                        <div className="min-w-0">
                          <div className="truncate font-bold">
                            {raider.name}
                            {raider.isPlayer && (
                              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-[#B45309] text-white">
                                BẠN
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#7A684C]">{raider.realmLabel}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-black text-[#991B1B]">
                          {formatNum(raider.damage)} ST
                        </div>
                        <div className="text-[10px] text-[#7A684C]">{raider.attacks} lượt</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Server Battle Feed */}
            <div className="rounded-xl bg-[#162726] border border-[#3E6964] p-3 text-[#E2F1EC]">
              <div className="text-[11px] font-bold text-[#8BE5C2] mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Chiến Báo Toàn Server
              </div>
              <div className="space-y-1 max-h-[115px] overflow-y-auto text-[11px]">
                {session.battleFeed.map((f) => (
                  <div
                    key={f.id}
                    className={`flex items-start gap-2 ${
                      f.highlight ? 'text-[#FDE047] font-semibold' : 'text-[#C2DDD4]'
                    }`}
                  >
                    <span className="font-mono text-[10px] text-[#7AA89B] shrink-0">[{f.timeText}]</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: KILL REWARD (VIP FASHION + VIP GEAR) & DAMAGE RANKING REWARDS */}
          <div className="lg:col-span-6 space-y-3">
            {/* 1. World Boss Kill Reward: VIP Fashion + VIP Gear */}
            <div className="rounded-xl border-2 border-[#C084FC] bg-gradient-to-br from-[#2E1065] via-[#4C1D95] to-[#7F1D1D] p-3.5 text-[#FAF5FF] shadow-lg">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-[#FDE047] flex items-center gap-1">
                    <Crown className="w-4 h-4" /> Quà Tiêu Diệt Boss Toàn Server (VIP)
                  </div>
                  <p className="text-[11px] text-[#E9D5FF] mt-0.5">
                    Mọi đạo hữu có tham gia gây sát thương khi Boss bị hạ gục đều được nhận!
                  </p>
                </div>
                {session.killRewardClaimed && (
                  <span className="px-2 py-0.5 rounded-full bg-[#15803D] text-[10px] font-bold text-white shrink-0">
                    ✓ Đã Nhận
                  </span>
                )}
              </div>

              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-black/35 border border-[#FACC15]/60">
                  <div className="font-black text-[#FDE047] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Thời Trang VIP Độc Quyền
                  </div>
                  <div className="font-bold text-white mt-0.5">{bossVipFashion.name}</div>
                  <div className="text-[10px] text-[#E9D5FF] mt-0.5">
                    +{bossVipFashion.bonuses.atkPct}% Công · +{bossVipFashion.bonuses.hpPct}% HP · +
                    {bossVipFashion.bonuses.defPct}% Thủ · +{bossVipFashion.bonuses.crit}% Bạo
                  </div>
                  {alreadyOwnsBossFashion && (
                    <div className="text-[10px] text-[#86EFAC] mt-0.5">
                      (Đã sở hữu — tự động đổi Thời Trang VIP chưa có hoặc +1.500 Tiên Ngọc)
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-black/35 border border-[#FB923C]/60">
                  <div className="font-black text-[#FDBA74] flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> Đồ VIP Thần Khí Cực Phẩm
                  </div>
                  <div className="font-bold text-white mt-0.5">
                    2 Món Truyền Thuyết Thần Khí (+12)
                  </div>
                  <div className="text-[10px] text-[#FED7AA] mt-0.5">
                    Khảm sẵn 2 Linh Ngọc Cấp 5 · +2.000 Tiên Ngọc · +50 Tinh Hoa Boss
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!canClaimKill}
                onClick={onClaimKillReward}
                className={`mt-3 w-full py-2 px-3 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
                  canClaimKill
                    ? 'bg-gradient-to-r from-[#FACC15] to-[#F97316] hover:brightness-110 text-[#1F1004] shadow-md cursor-pointer'
                    : 'bg-black/35 text-[#C4B5FD]/70 border border-white/15 cursor-not-allowed'
                }`}
              >
                <Gift className="w-4 h-4" />
                {session.killRewardClaimed
                  ? 'Đã Nhận Quà Tiêu Diệt Boss Đợt Này'
                  : !session.slain
                    ? 'Cần Toàn Server Tiêu Diệt Boss Để Mở Rương VIP'
                    : session.playerDamage <= 0
                      ? 'Cần Tham Gia Đánh Boss Để Nhận Quà'
                      : 'Nhận Ngay Thời Trang VIP + 2 Món Đồ VIP (+12)!'}
              </button>
            </div>

            {/* 2. Damage Ranking Rewards */}
            <div className="rounded-xl bg-[#F5EDD9] border border-[#C9A45C] p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-[#351F09] flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-[#B45309]" />
                  Thưởng Xếp Hạng Sát Thương
                </h4>
                {currentTier && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] border border-[#D97706] text-[#92400E]">
                    Mốc hiện tại: Hạng #{playerRank}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {WORLD_BOSS_RANK_TIERS.map((tier) => {
                  const isMine = currentTier?.id === tier.id;
                  return (
                    <div
                      key={tier.id}
                      className={`p-2 rounded-lg border text-xs ${
                        isMine
                          ? 'bg-[#FEF3C7] border-[#D97706] shadow-sm'
                          : 'bg-[#FAF5E8] border-[#E4D7BA]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-[#351F09]">{tier.label}</span>
                        <span className="text-[10px] font-bold text-[#991B1B]">
                          {tier.vipGearLabel}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#5C4E3A] font-mono">
                        +{formatNum(tier.tienNgoc)} Tiên Ngọc · +{formatNum(tier.linhThach)} Linh Thạch · +
                        {tier.cuongHoaThach} Đá CH · +{tier.tinhHoaBoss} Tinh Hoa Boss
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={!canClaimRank || !playerRank || !currentTier}
                onClick={() => {
                  if (playerRank && currentTier) onClaimRankReward(playerRank, currentTier);
                }}
                className={`mt-2.5 w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  canClaimRank && playerRank && currentTier
                    ? 'bg-[#1E3B38] hover:bg-[#284E4A] text-[#FDE047] border border-[#C9A45C] cursor-pointer shadow'
                    : 'bg-[#DDD3BD] text-[#7D6E55] cursor-not-allowed'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                {session.rankRewardClaimed
                  ? 'Đã Nhận Thưởng Xếp Hạng Đợt Này'
                  : session.playerDamage <= 0
                    ? 'Tham Gia Đánh Boss Để Vào BXH Sát Thương'
                    : !session.slain && winStatus.isActive
                      ? 'Mở Nhận Khi Boss Bị Hạ Hoặc Hết 30 Phút'
                      : `Nhận Thưởng Hạng #${playerRank} (${currentTier?.vipGearLabel})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ScrollModalShell>
  );
};
