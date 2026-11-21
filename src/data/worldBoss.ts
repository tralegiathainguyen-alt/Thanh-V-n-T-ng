import { BossDef, ElementType, EquipmentItem, Rarity, VipFashionId } from '../types/game';
import { createGem, generateEquipment } from '../utils/gameLogic';

export interface WorldBossScheduleSlot {
  index: number;
  label: string;
  hour: number;
  minute: number;
  durationMinutes: number;
  timeText: string;
}

/** 4 lần xuất hiện cố định mỗi ngày — mỗi đợt kéo dài 30 phút */
export const WORLD_BOSS_SCHEDULES: WorldBossScheduleSlot[] = [
  { index: 0, label: 'Đợt 1 · Thần Thì', hour: 9, minute: 0, durationMinutes: 30, timeText: '09:00 – 09:30' },
  { index: 1, label: 'Đợt 2 · Ngọ Thì', hour: 12, minute: 30, durationMinutes: 30, timeText: '12:30 – 13:00' },
  { index: 2, label: 'Đợt 3 · Dậu Thì', hour: 18, minute: 30, durationMinutes: 30, timeText: '18:30 – 19:00' },
  { index: 3, label: 'Đợt 4 · Hợi Thì', hour: 21, minute: 30, durationMinutes: 30, timeText: '21:30 – 22:00' },
];

export const WORLD_BOSS_MAX_HP = 500_000_000; // 500 Triệu HP toàn server
export const WORLD_BOSS_WAVE_CAP = 30_000_000; // Tối đa 6% HP Boss mỗi đợt xuất trận (chống 1-hit kill)
export const WORLD_BOSS_ATTACK_COOLDOWN_MS = 10_000;

export const WORLD_BOSS_DEF: BossDef = {
  id: 'boss_world_hon_don',
  name: 'Hỗn Độn Thiên Ma Long',
  title: 'Boss Thế Giới Toàn Server · Thái Cổ Diệt Thế Long Tôn (500 Triệu HP)',
  realmTier: 8,
  stageLabel: 'Toàn Server',
  arenaKey: 'boss_ma_long',
  element: 'Hoa',
  recommendedPower: 1_200_000,
  staminaCost: 0,
  hp: WORLD_BOSS_MAX_HP,
  atk: 12_500,
  def: 28_000,
  spd: 165,
  setId: 'thai_co_long_hoang',
  guaranteedMinRarity: 'truyen_thuyet',
  description:
    'Thái Cổ Ma Long 500 Triệu HP với 3 Giai Đoạn (Miễn Thương 45%→65%, Kháng Bạo 25%→35%, Giới Hạn ST 0.8% HP/đòn). Xuất hiện 4 lần/ngày (30 phút/đợt) để toàn server hợp lực tiêu diệt!',
  skills: [
    {
      id: 'wb_skill_1',
      name: 'Hỗn Độn Diệt Thế Lôi',
      element: 'Hoa',
      mpCost: 0,
      multiplier: 1.65,
      target: 'all',
      description: 'Giáng thiên lôi hỗn độn lên toàn bộ đội hình tiên môn.',
      comboBonusDesc: 'Gây sát thương diện rộng toàn đội.',
      vfxType: 'flame',
    },
    {
      id: 'wb_skill_2',
      name: 'Thái Cổ Long Tức',
      element: 'Kim',
      mpCost: 0,
      multiplier: 2.25,
      target: 'single',
      description: 'Phun chân hỏa long tức xuyên phá hộ thuẫn mục tiêu.',
      comboBonusDesc: 'Sát thương đơn mục tiêu cực mạnh.',
      vfxType: 'sword',
    },
  ],
};

export interface WorldBossRaider {
  id: string;
  name: string;
  realmLabel: string;
  power: number;
  damage: number;
  attacks: number;
  isPlayer?: boolean;
}

export interface WorldBossFeedItem {
  id: string;
  text: string;
  timeText: string;
  highlight?: boolean;
}

export interface WorldBossSessionState {
  sessionKey: string;
  slotLabel: string;
  startedAt: number;
  endsAt: number;
  maxHp: number;
  currentHp: number;
  slain: boolean;
  killerName: string | null;
  raiders: WorldBossRaider[];
  playerDamage: number;
  playerAttacks: number;
  lastPlayerAttackAt: number;
  rankRewardClaimed: boolean;
  killRewardClaimed: boolean;
  battleFeed: WorldBossFeedItem[];
}

export interface WorldBossRankTier {
  id: string;
  minRank: number;
  maxRank: number;
  label: string;
  badgeColor: string;
  tienNgoc: number;
  linhThach: number;
  cuongHoaThach: number;
  tinhHoaBoss: number;
  vipGearCount: number;
  vipGearRarity: Rarity;
  vipGearEnhance: number;
  vipGearLabel: string;
}

export const WORLD_BOSS_RANK_TIERS: WorldBossRankTier[] = [
  {
    id: 'top1',
    minRank: 1,
    maxRank: 1,
    label: 'Hạng 1 · Chí Tôn Sát Thương',
    badgeColor: '#FDE047',
    tienNgoc: 5000,
    linhThach: 500000,
    cuongHoaThach: 200,
    tinhHoaBoss: 80,
    vipGearCount: 2,
    vipGearRarity: 'truyen_thuyet',
    vipGearEnhance: 10,
    vipGearLabel: '2 Món Đồ VIP Truyền Thuyết (+10)',
  },
  {
    id: 'top2_3',
    minRank: 2,
    maxRank: 3,
    label: 'Hạng 2 – 3 · Tuyệt Thế Cường Giả',
    badgeColor: '#FB923C',
    tienNgoc: 3000,
    linhThach: 300000,
    cuongHoaThach: 120,
    tinhHoaBoss: 50,
    vipGearCount: 1,
    vipGearRarity: 'truyen_thuyet',
    vipGearEnhance: 8,
    vipGearLabel: '1 Món Đồ VIP Truyền Thuyết (+8)',
  },
  {
    id: 'top4_10',
    minRank: 4,
    maxRank: 10,
    label: 'Hạng 4 – 10 · Tiên Môn Hào Kiệt',
    badgeColor: '#C084FC',
    tienNgoc: 1500,
    linhThach: 150000,
    cuongHoaThach: 80,
    tinhHoaBoss: 30,
    vipGearCount: 1,
    vipGearRarity: 'huyen_thoai',
    vipGearEnhance: 6,
    vipGearLabel: '1 Món Đồ VIP Huyền Thoại (+6)',
  },
  {
    id: 'participant',
    minRank: 11,
    maxRank: 999,
    label: 'Tham Gia (Top 11+)',
    badgeColor: '#34D399',
    tienNgoc: 600,
    linhThach: 80000,
    cuongHoaThach: 40,
    tinhHoaBoss: 15,
    vipGearCount: 1,
    vipGearRarity: 'huyen_thoai',
    vipGearEnhance: 3,
    vipGearLabel: '1 Món Trang Bị Huyền Thoại (+3)',
  },
];

const SERVER_RAIDER_TEMPLATES: Omit<WorldBossRaider, 'damage' | 'attacks'>[] = [
  { id: 'srv_1', name: 'Cửu Tiêu Kiếm Tông', realmLabel: 'Độ Kiếp Viên Mãn', power: 1_920_000 },
  { id: 'srv_2', name: 'Thái Huyền Tiên Phủ', realmLabel: 'Độ Kiếp Hậu Kỳ', power: 1_650_000 },
  { id: 'srv_3', name: 'Huyết Nguyệt Ma Giáo', realmLabel: 'Đại Thừa Viên Mãn', power: 1_420_000 },
  { id: 'srv_4', name: 'Băng Tâm Tuyết Cung', realmLabel: 'Đại Thừa Hậu Kỳ', power: 1_240_000 },
  { id: 'srv_5', name: 'Vạn Phật Kim Tự', realmLabel: 'Đại Thừa Trung Kỳ', power: 1_050_000 },
  { id: 'srv_6', name: 'Lăng Tiêu Bảo Điện', realmLabel: 'Hợp Thể Viên Mãn', power: 880_000 },
  { id: 'srv_7', name: 'Thanh Long Thánh Địa', realmLabel: 'Hợp Thể Trung Kỳ', power: 740_000 },
  { id: 'srv_8', name: 'Huyền Thiên Đạo Viện', realmLabel: 'Luyện Hư Viên Mãn', power: 620_000 },
  { id: 'srv_9', name: 'Dược Vương Cốc', realmLabel: 'Luyện Hư Sơ Kỳ', power: 510_000 },
  { id: 'srv_10', name: 'U Minh Quỷ Tông', realmLabel: 'Hóa Thần Viên Mãn', power: 420_000 },
  { id: 'srv_11', name: 'Tử Hà Kiếm Phái', realmLabel: 'Hóa Thần Sơ Kỳ', power: 330_000 },
  { id: 'srv_12', name: 'Ngọc Hư Cung', realmLabel: 'Nguyên Anh Viên Mãn', power: 250_000 },
  { id: 'srv_13', name: 'Thiên Cơ Các', realmLabel: 'Nguyên Anh Trung Kỳ', power: 185_000 },
  { id: 'srv_14', name: 'Tụ Bảo Thương Minh', realmLabel: 'Kim Đan Viên Mãn', power: 120_000 },
];

const WB_STORAGE_KEY = 'tvtt_world_boss_session_v2';
const WB_CUSTOM_END_KEY = 'tvtt_world_boss_custom_end_v2';

export interface WorldBossWindowStatus {
  isActive: boolean;
  isCustomSummon: boolean;
  sessionKey: string;
  slotLabel: string;
  slotIndex: number;
  startedAt: number;
  endsAt: number;
  remainingSec: number;
  nextSpawnLabel: string;
  nextSpawnTimeText: string;
  nextSpawnInSec: number;
}

export function getCustomSummonEndMs(): number {
  try {
    const raw = localStorage.getItem(WB_CUSTOM_END_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

export function startCustomWorldBossWindow(nowMs = Date.now()): number {
  const endMs = nowMs + 30 * 60 * 1000;
  try {
    localStorage.setItem(WB_CUSTOM_END_KEY, String(endMs));
  } catch {
    // ignore
  }
  return endMs;
}

function dateStamp(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getWorldBossWindowStatus(nowMs = Date.now()): WorldBossWindowStatus {
  const now = new Date(nowMs);
  const stamp = dateStamp(now);

  // 1. Check the 4 scheduled 30-minute daily windows
  for (const slot of WORLD_BOSS_SCHEDULES) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), slot.hour, slot.minute, 0, 0).getTime();
    const end = start + slot.durationMinutes * 60 * 1000;
    if (nowMs >= start && nowMs < end) {
      return {
        isActive: true,
        isCustomSummon: false,
        sessionKey: `${stamp}-slot-${slot.index}`,
        slotLabel: `${slot.label} (${slot.timeText})`,
        slotIndex: slot.index,
        startedAt: start,
        endsAt: end,
        remainingSec: Math.max(0, Math.floor((end - nowMs) / 1000)),
        nextSpawnLabel: slot.label,
        nextSpawnTimeText: slot.timeText,
        nextSpawnInSec: 0,
      };
    }
  }

  // 2. Check if player triggered an emergency 30-min World Boss summon
  const customEnd = getCustomSummonEndMs();
  if (customEnd > nowMs) {
    const startedAt = customEnd - 30 * 60 * 1000;
    return {
      isActive: true,
      isCustomSummon: true,
      sessionKey: `custom-${Math.floor(startedAt / 60000)}`,
      slotLabel: 'Đợt Triệu Hồi Toàn Server (30 phút)',
      slotIndex: -1,
      startedAt,
      endsAt: customEnd,
      remainingSec: Math.max(0, Math.floor((customEnd - nowMs) / 1000)),
      nextSpawnLabel: 'Đợt Triệu Hồi',
      nextSpawnTimeText: 'Đang mở',
      nextSpawnInSec: 0,
    };
  }

  // 3. Find the next upcoming scheduled spawn window
  let bestSlot = WORLD_BOSS_SCHEDULES[0];
  let bestStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, bestSlot.hour, bestSlot.minute, 0, 0).getTime();

  for (const slot of WORLD_BOSS_SCHEDULES) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), slot.hour, slot.minute, 0, 0).getTime();
    if (start > nowMs && start < bestStart) {
      bestStart = start;
      bestSlot = slot;
    }
  }

  // Also check last finished session key so player can still view/claim rewards
  const lastSession = loadStoredWorldBossSession();
  return {
    isActive: false,
    isCustomSummon: false,
    sessionKey: lastSession?.sessionKey || `${stamp}-waiting`,
    slotLabel: lastSession?.slotLabel || bestSlot.label,
    slotIndex: bestSlot.index,
    startedAt: lastSession?.startedAt || 0,
    endsAt: lastSession?.endsAt || 0,
    remainingSec: 0,
    nextSpawnLabel: bestSlot.label,
    nextSpawnTimeText: bestSlot.timeText,
    nextSpawnInSec: Math.max(0, Math.floor((bestStart - nowMs) / 1000)),
  };
}

export function formatCountdown(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh > 0) {
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function nowTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export function loadStoredWorldBossSession(): WorldBossSessionState | null {
  try {
    const raw = localStorage.getItem(WB_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorldBossSessionState;
  } catch {
    return null;
  }
}

export function saveWorldBossSession(session: WorldBossSessionState): void {
  try {
    localStorage.setItem(WB_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function createFreshWorldBossSession(
  win: WorldBossWindowStatus,
  playerSectName: string,
  playerPower: number,
): WorldBossSessionState {
  // Seed realistic opening damage for 14 server sects scaled to 500M HP
  const elapsedSec = Math.max(0, Math.min(1800, Math.floor((Date.now() - win.startedAt) / 1000)));
  const elapsedFactor = Math.min(0.45, elapsedSec / 2200);

  let totalServerDmg = 0;
  const raiders: WorldBossRaider[] = SERVER_RAIDER_TEMPLATES.map((tpl, idx) => {
    const baseDmg = Math.round((8_500_000 - idx * 520_000) * (0.18 + elapsedFactor) * (0.85 + Math.random() * 0.3));
    const dmg = Math.max(250_000, baseDmg);
    totalServerDmg += dmg;
    return {
      ...tpl,
      damage: dmg,
      attacks: Math.max(1, Math.floor(elapsedSec / 65) + 1),
    };
  });

  raiders.push({
    id: 'player_sect',
    name: playerSectName,
    realmLabel: 'Tông Môn Của Bạn',
    power: playerPower,
    damage: 0,
    attacks: 0,
    isPlayer: true,
  });

  const currentHp = Math.max(Math.round(WORLD_BOSS_MAX_HP * 0.35), WORLD_BOSS_MAX_HP - totalServerDmg);
  const session: WorldBossSessionState = {
    sessionKey: win.sessionKey,
    slotLabel: win.slotLabel,
    startedAt: win.startedAt,
    endsAt: win.endsAt,
    maxHp: WORLD_BOSS_MAX_HP,
    currentHp,
    slain: false,
    killerName: null,
    raiders,
    playerDamage: 0,
    playerAttacks: 0,
    lastPlayerAttackAt: 0,
    rankRewardClaimed: false,
    killRewardClaimed: false,
    battleFeed: [
      {
        id: `feed_open_${Date.now()}`,
        text: `Hỗn Độn Thiên Ma Long (500 Triệu HP · 3 Giai Đoạn) đã giáng lâm (${win.slotLabel})! Toàn server đang tập kết tiêu diệt!`,
        timeText: nowTimeStr(),
        highlight: true,
      },
    ],
  };
  saveWorldBossSession(session);
  return session;
}

/** Advance simulated server raiders every 2s so boss HP & leaderboard move live */
export function tickServerRaiders(session: WorldBossSessionState): WorldBossSessionState {
  if (session.slain || session.currentHp <= 0) return session;
  const npcRaiders = session.raiders.filter((r) => !r.isPlayer);
  if (npcRaiders.length === 0) return session;

  // Pick 2 random server sects to strike this tick (calibrated for 500M HP pool)
  const strikers = [
    npcRaiders[Math.floor(Math.random() * npcRaiders.length)],
    npcRaiders[Math.floor(Math.random() * npcRaiders.length)],
  ];
  let totalTickDmg = 0;
  const dmgMap = new Map<string, number>();

  // Boss Phase DR slows server DPS in Phase 2 & 3 just like player DPS!
  const hpPct = (session.currentHp / session.maxHp) * 100;
  const phaseScale = hpPct > 65 ? 1.0 : hpPct > 30 ? 0.78 : 0.65;

  for (const s of strikers) {
    const hit = Math.round(Math.max(220_000, s.power * (0.55 + Math.random() * 0.45) * phaseScale));
    dmgMap.set(s.id, (dmgMap.get(s.id) || 0) + hit);
    totalTickDmg += hit;
  }

  // Keep boss at least at 5% HP if player hasn't attacked yet, or allow full kill once player participates!
  const minFloor = session.playerDamage > 0 ? 0 : Math.round(session.maxHp * 0.05);
  const nextHp = Math.max(minFloor, session.currentHp - totalTickDmg);
  const slain = nextHp <= 0;
  const leadStriker = strikers[0];

  const nextRaiders = session.raiders.map((r) => {
    const add = dmgMap.get(r.id);
    if (!add) return r;
    return { ...r, damage: r.damage + add, attacks: r.attacks + 1 };
  });

  const nextFeed: WorldBossFeedItem[] = [
    ...(slain
      ? [
          {
            id: `feed_kill_${Date.now()}`,
            text: `💥 TOÀN SERVER ĐÃ TIÊU DIỆT HỖN ĐỘN THIÊN MA LONG! Kết liễu bởi ${leadStriker.name}. Mau nhận Thời Trang VIP & Đồ VIP!`,
            timeText: nowTimeStr(),
            highlight: true,
          },
        ]
      : [
          {
            id: `feed_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            text: `${leadStriker.name} tung sát chiêu gây ${(dmgMap.get(leadStriker.id) || 0).toLocaleString('vi-VN')} sát thương!`,
            timeText: nowTimeStr(),
          },
        ]),
    ...session.battleFeed,
  ].slice(0, 18);

  const updated: WorldBossSessionState = {
    ...session,
    currentHp: nextHp,
    slain,
    killerName: slain ? leadStriker.name : session.killerName,
    raiders: nextRaiders,
    battleFeed: nextFeed,
  };
  saveWorldBossSession(updated);
  return updated;
}

export function recordPlayerWorldBossDamage(
  session: WorldBossSessionState,
  playerSectName: string,
  playerPower: number,
  damageDealt: number,
): { updated: WorldBossSessionState; dealtFinishingBlow: boolean } {
  const safeDmg = Math.max(50_000, Math.min(WORLD_BOSS_WAVE_CAP, Math.round(damageDealt)));
  const nextHp = Math.max(0, session.currentHp - safeDmg);
  const dealtFinishingBlow = !session.slain && nextHp <= 0;
  const slain = session.slain || nextHp <= 0;

  let foundPlayer = false;
  const nextRaiders = session.raiders.map((r) => {
    if (r.isPlayer) {
      foundPlayer = true;
      return {
        ...r,
        name: playerSectName,
        power: playerPower,
        damage: r.damage + safeDmg,
        attacks: r.attacks + 1,
      };
    }
    return r;
  });

  if (!foundPlayer) {
    nextRaiders.push({
      id: 'player_sect',
      name: playerSectName,
      realmLabel: 'Tông Môn Của Bạn',
      power: playerPower,
      damage: safeDmg,
      attacks: 1,
      isPlayer: true,
    });
  }

  const nextFeed: WorldBossFeedItem[] = [
    ...(dealtFinishingBlow
      ? [
          {
            id: `feed_pkill_${Date.now()}`,
            text: `🏆 ĐÒN KẾT LIỄU! [${playerSectName}] đã chém hạ Hỗn Độn Thiên Ma Long (+${safeDmg.toLocaleString('vi-VN')} ST)!`,
            timeText: nowTimeStr(),
            highlight: true,
          },
        ]
      : [
          {
            id: `feed_p_${Date.now()}`,
            text: `⚔ [${playerSectName}] vừa xuất trận gây ${safeDmg.toLocaleString('vi-VN')} sát thương lên Boss Thế Giới!`,
            timeText: nowTimeStr(),
            highlight: true,
          },
        ]),
    ...session.battleFeed,
  ].slice(0, 18);

  const updated: WorldBossSessionState = {
    ...session,
    currentHp: nextHp,
    slain,
    killerName: dealtFinishingBlow ? playerSectName : session.killerName,
    raiders: nextRaiders,
    playerDamage: session.playerDamage + safeDmg,
    playerAttacks: session.playerAttacks + 1,
    lastPlayerAttackAt: Date.now(),
    battleFeed: nextFeed,
  };
  saveWorldBossSession(updated);
  return { updated, dealtFinishingBlow };
}

export function getSortedRaiders(session: WorldBossSessionState): WorldBossRaider[] {
  return [...session.raiders].sort((a, b) => b.damage - a.damage);
}

export function getPlayerWorldBossRank(session: WorldBossSessionState): number | null {
  if (session.playerDamage <= 0) return null;
  const sorted = getSortedRaiders(session);
  const idx = sorted.findIndex((r) => r.isPlayer);
  return idx >= 0 ? idx + 1 : null;
}

export function getRankRewardTier(rank: number): WorldBossRankTier {
  return (
    WORLD_BOSS_RANK_TIERS.find((t) => rank >= t.minRank && rank <= t.maxRank) ||
    WORLD_BOSS_RANK_TIERS[WORLD_BOSS_RANK_TIERS.length - 1]
  );
}

const VIP_SET_POOL = ['thai_co_long_hoang', 'cuu_thien_kiem_de', 'thanh_lien_tien_ton', 'bat_hoai_kim_than'];
const VIP_ELEMENTS: ElementType[] = ['Kim', 'Moc', 'Thuy', 'Hoa', 'Tho'];

/** Create pre-enhanced, pre-socketed VIP equipment pieces for World Boss rewards */
export function generateWorldBossVipGear(count: number, rarity: Rarity, enhanceLevel: number, gemTier = 4): EquipmentItem[] {
  const items: EquipmentItem[] = [];
  for (let i = 0; i < count; i += 1) {
    const setId = VIP_SET_POOL[Math.floor(Math.random() * VIP_SET_POOL.length)];
    const eq = generateEquipment({
      rarity,
      tier: rarity === 'truyen_thuyet' ? 'than_khi' : 'tien_khi',
      setId,
    });
    const elem = VIP_ELEMENTS[Math.floor(Math.random() * VIP_ELEMENTS.length)];
    eq.enhanceLevel = enhanceLevel;
    eq.sockets = eq.sockets.map((_, idx) => (idx < 2 ? createGem(elem, gemTier) : null));
    items.push(eq);
  }
  return items;
}

/** Pick which VIP Fashion to unlock when claiming World Boss Kill Reward */
export function pickWorldBossVipFashionReward(unlocked: VipFashionId[]): VipFashionId | null {
  const priority: VipFashionId[] = [
    'hon_don_long_hoang',
    'hong_mong_de_ton',
    'thai_co_long_bao',
    'thanh_lien_tien_y',
  ];
  return priority.find((f) => !unlocked.includes(f)) || null;
}
