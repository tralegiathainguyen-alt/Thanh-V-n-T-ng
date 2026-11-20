import {
  Disciple,
  DiscipleAlchemyState,
  DiscipleCultivationArts,
  DiscipleNatalArtifact,
  DiscipleQualityRank,
  ElementType,
  NatalArtifactType,
  SpiritRootGrade,
} from '../types/game';

// ============================================================================
// 1. LINH CĂN & NGŨ HÀNH (Tối ưu đội hình chiến thuật)
// ============================================================================

export const SPIRIT_ROOT_UPGRADE_NEXT: Partial<Record<SpiritRootGrade, SpiritRootGrade>> = {
  ngu_hanh_tap: 'song_linh_can',
  tu_linh_can: 'song_linh_can',
  tam_linh_can: 'song_linh_can',
  song_linh_can: 'thien_linh_can',
  thien_linh_can: 'hon_don_linh_can',
  bien_di_loi: 'hon_don_linh_can',
  bien_di_bang: 'hon_don_linh_can',
  bien_di_phong: 'hon_don_linh_can',
};

export interface SpiritRootCombatBonus {
  /** Extra Crit % when triggering Ngũ Hành Tương Sinh / Combo Liên Hoàn */
  comboCritBonus: number;
  /** Extra Armor Penetration % on Tương Sinh / Combo Liên Hoàn */
  armorPenBonus: number;
  /** Flat MP cost reduction when casting Ultimate skill */
  ultMpDiscount: number;
  /** Extra % damage amplification on Tương Sinh / Combo Liên Hoàn */
  comboDmgBonus: number;
}

export const SPIRIT_ROOT_COMBAT_BONUS: Record<SpiritRootGrade, SpiritRootCombatBonus> = {
  ngu_hanh_tap: { comboCritBonus: 0, armorPenBonus: 0, ultMpDiscount: 0, comboDmgBonus: 0 },
  tu_linh_can: { comboCritBonus: 4, armorPenBonus: 4, ultMpDiscount: 0, comboDmgBonus: 5 },
  tam_linh_can: { comboCritBonus: 8, armorPenBonus: 8, ultMpDiscount: 4, comboDmgBonus: 10 },
  song_linh_can: { comboCritBonus: 14, armorPenBonus: 14, ultMpDiscount: 8, comboDmgBonus: 18 },
  thien_linh_can: { comboCritBonus: 22, armorPenBonus: 22, ultMpDiscount: 14, comboDmgBonus: 28 },
  bien_di_loi: { comboCritBonus: 28, armorPenBonus: 24, ultMpDiscount: 15, comboDmgBonus: 32 },
  bien_di_bang: { comboCritBonus: 24, armorPenBonus: 26, ultMpDiscount: 16, comboDmgBonus: 32 },
  bien_di_phong: { comboCritBonus: 25, armorPenBonus: 24, ultMpDiscount: 18, comboDmgBonus: 34 },
  hon_don_linh_can: { comboCritBonus: 35, armorPenBonus: 34, ultMpDiscount: 22, comboDmgBonus: 45 },
};

export function getSpiritRootUpgradeCost(current: SpiritRootGrade): {
  nextGrade: SpiritRootGrade;
  linhThach: number;
  linhKhi: number;
  tinhHoaBoss: number;
} | null {
  const nextGrade = SPIRIT_ROOT_UPGRADE_NEXT[current];
  if (!nextGrade) return null;
  if (nextGrade === 'song_linh_can') {
    return { nextGrade, linhThach: 2500, linhKhi: 1800, tinhHoaBoss: 3 };
  }
  if (nextGrade === 'thien_linh_can') {
    return { nextGrade, linhThach: 9500, linhKhi: 6800, tinhHoaBoss: 12 };
  }
  return { nextGrade, linhThach: 28000, linhKhi: 22000, tinhHoaBoss: 35 };
}

// ============================================================================
// 2. CÔNG PHÁP & THẦN THÔNG (Tầng 1 → Tầng 10)
// ============================================================================

export const ELEMENT_ARTS_META: Record<
  ElementType,
  { tamPhapName: string; thanThongName: string }
> = {
  Kim: { tamPhapName: 'Thanh Vân Kiếm Tâm Quyết', thanThongName: 'Vạn Kiếm Quy Tông Kinh' },
  Moc: { tamPhapName: 'Trường Sinh Thanh Mộc Quyết', thanThongName: 'Thiên Đằng Phược Yêu Pháp' },
  Thuy: { tamPhapName: 'Băng Tâm Huyền Thủy Kinh', thanThongName: 'Huyền Băng Thần Triều Quyết' },
  Hoa: { tamPhapName: 'Phần Thiên Chu Tước Quyết', thanThongName: 'Cửu Thiên Liệt Diễm Trận' },
  Tho: { tamPhapName: 'Hậu Thổ Bất Động Minh Vương', thanThongName: 'Thái Sơn Trấn Hải Ấn' },
};

export function getTamPhapBonus(level: number) {
  const lvl = Math.max(1, Math.min(10, level));
  return {
    spdBonus: (lvl - 1) * 5,
    mpRegenPerTurn: (lvl - 1) * 3 + (lvl >= 10 ? 10 : 0),
    counterChance: (lvl - 1) * 3 + (lvl >= 7 ? 10 : 0), // % chance to counter when hit
    defPctBonus: lvl >= 4 ? 10 + (lvl >= 10 ? 8 : 0) : 0,
  };
}

export function getThanThongBonus(level: number) {
  const lvl = Math.max(1, Math.min(10, level));
  return {
    skillDmgPct: (lvl - 1) * 8, // +8% skill multiplier per floor
    armorBreakPct: lvl >= 3 ? 15 + (lvl >= 8 ? 10 : 0) : 0, // Tầng 3: Phá Giáp
    splashTargetPct: lvl >= 6 ? 45 : 0, // Tầng 6: Đánh Lan thêm 1 mục tiêu phụ
    multiStrikeChance: lvl >= 9 ? 28 : 0, // Tầng 9: Tỷ lệ Liên Kích bồi thêm đòn
  };
}

export function getArtUpgradeCost(currentLevel: number, tangKinhLevel: number) {
  const discount = Math.max(0.65, 1 - (tangKinhLevel - 1) * 0.04);
  return {
    linhKhi: Math.round(900 * Math.pow(1.48, currentLevel - 1) * discount),
    linhThach: Math.round(700 * Math.pow(1.45, currentLevel - 1) * discount),
  };
}

// ============================================================================
// 3. PHÁP BẢO & LUYỆN KHÍ (Kết nối Luyện Khí Các — Lò Rèn tông môn)
// ============================================================================

export interface NatalArtifactMeta {
  type: NatalArtifactType;
  name: string;
  glyph: string;
  role: string;
  baseAtk: number;
  baseHp: number;
  baseDef: number;
  refineDesc: string;
}

export const NATAL_ARTIFACTS: Record<NatalArtifactType, NatalArtifactMeta> = {
  phi_kiem: {
    type: 'phi_kiem',
    name: 'Bản Mệnh Phi Kiếm',
    glyph: '⚔',
    role: 'Công Kích · Săn Boss',
    baseAtk: 140,
    baseHp: 320,
    baseDef: 35,
    refineDesc: 'Mỗi tầng Tế Luyện: +9% Sát Thương Boss & +5% Xuyên Giáp',
  },
  luyen_dan_dinh: {
    type: 'luyen_dan_dinh',
    name: 'Huyền Hỏa Luyện Đan Đỉnh',
    glyph: '⚱',
    role: 'Hút Máu · Bền Bỉ',
    baseAtk: 95,
    baseHp: 620,
    baseDef: 55,
    refineDesc: 'Mỗi tầng Tế Luyện: +5% Hút Máu khi gây sát thương & +4% Công',
  },
  ho_tam_kinh: {
    type: 'ho_tam_kinh',
    name: 'Càn Khôn Hộ Tâm Kính',
    glyph: '❂',
    role: 'Khiên Đầu Trận · Thủ',
    baseAtk: 65,
    baseHp: 780,
    baseDef: 95,
    refineDesc: 'Mỗi tầng Tế Luyện: +7% Khiên theo MaxHP đầu trận & +4% Phản Kích',
  },
  ngoc_boi: {
    type: 'ngoc_boi',
    name: 'Thanh Vân Tiên Ngọc Bội',
    glyph: '◈',
    role: 'Tốc Độ · Linh Lực',
    baseAtk: 105,
    baseHp: 460,
    baseDef: 50,
    refineDesc: 'Mỗi tầng Tế Luyện: +7 Linh Lực đầu trận & +6% Sát Thương Boss',
  },
};

export const NATAL_ARTIFACT_LIST: NatalArtifactMeta[] = [
  NATAL_ARTIFACTS.phi_kiem,
  NATAL_ARTIFACTS.luyen_dan_dinh,
  NATAL_ARTIFACTS.ho_tam_kinh,
  NATAL_ARTIFACTS.ngoc_boi,
];

export function getDefaultArtifactForElement(element: ElementType): NatalArtifactType {
  if (element === 'Kim' || element === 'Hoa') return 'phi_kiem';
  if (element === 'Tho') return 'ho_tam_kinh';
  if (element === 'Moc') return 'luyen_dan_dinh';
  return 'ngoc_boi';
}

export function getArtifactStats(artifact: DiscipleNatalArtifact, forgeLevel: number) {
  const meta = NATAL_ARTIFACTS[artifact.type] || NATAL_ARTIFACTS.phi_kiem;
  const forgeMult = 1 + Math.max(0, forgeLevel - 1) * 0.08;
  const enhMult = 1 + artifact.enhanceLevel * 0.24;
  const refMult = 1 + artifact.refineLevel * 0.16;
  const totalMult = forgeMult * enhMult * refMult;

  const r = artifact.refineLevel;
  return {
    atk: Math.round(meta.baseAtk * totalMult),
    hp: Math.round(meta.baseHp * totalMult),
    def: Math.round(meta.baseDef * totalMult),
    lifestealPct: artifact.type === 'luyen_dan_dinh' ? r * 5 : 0,
    startShieldPct: artifact.type === 'ho_tam_kinh' ? r * 7 : 0,
    bossDmgPct: artifact.type === 'phi_kiem' ? r * 9 : artifact.type === 'ngoc_boi' ? r * 6 : 0,
    armorPenPct: artifact.type === 'phi_kiem' ? r * 5 : 0,
    counterPct: artifact.type === 'ho_tam_kinh' ? r * 4 : 0,
    startMpBonus: artifact.type === 'ngoc_boi' ? r * 7 : 0,
  };
}

export function getArtifactEnhanceCost(enhanceLevel: number, forgeLevel: number) {
  const discount = Math.max(0.7, 1 - (forgeLevel - 1) * 0.03);
  return {
    huyenThiet: Math.round((35 + enhanceLevel * 24) * Math.pow(1.16, enhanceLevel) * discount),
    cuongHoaThach: 3 + enhanceLevel * 2,
    linhThach: Math.round(450 * Math.pow(1.25, enhanceLevel) * discount),
  };
}

export function getArtifactRefineCost(refineLevel: number) {
  return {
    requiredForgeLevel: Math.min(5, refineLevel + 1),
    huyenThiet: Math.round(140 * Math.pow(2.1, refineLevel)),
    tinhHoaBoss: 4 + refineLevel * 5,
    linhThach: Math.round(2400 * Math.pow(1.9, refineLevel)),
  };
}

// ============================================================================
// 4. LUYỆN ĐAN & TẨY TỦY (Kết nối Dược Điền & Luyện Đan Phòng — có Đan Độc)
// ============================================================================

export function getMaxPillToxicity(realmIndex: number): number {
  // Base 6 pills at Luyện Khí, +2 max pills per major realm tier
  return 6 + Math.floor(realmIndex / 3) * 2;
}

export function getCurrentPillToxicity(disciple: Disciple): number {
  const al = disciple.alchemy;
  if (!al) return 0;
  // Breaking through to a higher realm cleanses pill toxicity!
  if (al.pillToxicityRealmIdx < disciple.realmIndex) return 0;
  return al.pillToxicity;
}

export function getTuViPillInfo(disciple: Disciple, duocDienLevel: number, luyenDanLevel: number) {
  const yieldMult = 1 + (duocDienLevel - 1) * 0.1 + (luyenDanLevel - 1) * 0.08;
  const qiGain = Math.round(disciple.maxQi * 0.34 * yieldMult);
  return {
    linhThao: Math.max(30, Math.round(40 + disciple.realmIndex * 18)),
    linhThach: Math.max(180, Math.round(220 + disciple.realmIndex * 110)),
    qiGain,
  };
}

export function getTayTuyPillInfo(
  statKey: 'atk' | 'hp' | 'def',
  disciple: Disciple,
  duocDienLevel: number,
) {
  const gardenMult = 1 + (duocDienLevel - 1) * 0.1;
  const realmScale = 1 + disciple.realmIndex * 0.16;
  const gain =
    statKey === 'hp'
      ? Math.round(210 * realmScale * gardenMult)
      : statKey === 'atk'
        ? Math.round(36 * realmScale * gardenMult)
        : Math.round(22 * realmScale * gardenMult);
  return {
    linhThao: Math.max(45, Math.round(55 + disciple.realmIndex * 24)),
    linhThach: Math.max(260, Math.round(320 + disciple.realmIndex * 140)),
    gain,
  };
}

// ============================================================================
// 5. THIÊN PHÚ & THĂNG PHẨM (Phàm → Linh → Địa → Thiên → Tiên)
// ============================================================================

export interface QualityRankMeta {
  rank: DiscipleQualityRank;
  name: string;
  color: string;
  bgTint: string;
  statMult: number;
  talentName: string;
  talentDesc: string;
  upgradeCost?: {
    contribution: number;
    linhThach: number;
    tinhHoaBoss: number;
  };
}

export const QUALITY_RANKS: QualityRankMeta[] = [
  {
    rank: 0,
    name: 'Phàm Phẩm',
    color: '#6B7280',
    bgTint: '#F3F4F6',
    statMult: 1.0,
    talentName: 'Đạo Tâm Sơ Khai',
    talentDesc: 'Nền tảng tu đạo vững chắc, sẵn sàng thăng phẩm mở khóa Thiên Phú.',
  },
  {
    rank: 1,
    name: 'Linh Phẩm',
    color: '#15803D',
    bgTint: '#DCFCE7',
    statMult: 1.14,
    talentName: 'Tụ Linh Quyết',
    talentDesc: '+14% Toàn chỉ số cơ bản · Khởi đầu trận có thêm +20 Linh Lực.',
    upgradeCost: { contribution: 250, linhThach: 2500, tinhHoaBoss: 2 },
  },
  {
    rank: 2,
    name: 'Địa Phẩm',
    color: '#1D4ED8',
    bgTint: '#DBEAFE',
    statMult: 1.3,
    talentName: 'Ngũ Hành Quy Nguyên',
    talentDesc: '+30% Toàn chỉ số · +18% Sát thương khi kích hoạt Combo Liên Hoàn.',
    upgradeCost: { contribution: 650, linhThach: 8000, tinhHoaBoss: 8 },
  },
  {
    rank: 3,
    name: 'Thiên Phẩm',
    color: '#7E22CE',
    bgTint: '#F3E8FF',
    statMult: 1.5,
    talentName: 'Kiếm Tâm Thông Minh',
    talentDesc: '+50% Toàn chỉ số · Vào trận có sẵn 50 Linh Lực (tung Tuyệt Kỹ ngay hiệp 1!).',
    upgradeCost: { contribution: 1400, linhThach: 22000, tinhHoaBoss: 20 },
  },
  {
    rank: 4,
    name: 'Tiên Phẩm',
    color: '#B45309',
    bgTint: '#FEF3C7',
    statMult: 1.78,
    talentName: 'Bất Hoại Kim Thân',
    talentDesc: '+78% Toàn chỉ số · Miễn tử 1 lần/trận khi tụt về 1 HP & tự tạo Khiên 25% MaxHP!',
    upgradeCost: { contribution: 2800, linhThach: 55000, tinhHoaBoss: 45 },
  },
];

export function getQualityTalents(rank: DiscipleQualityRank) {
  return {
    statMult: QUALITY_RANKS[rank]?.statMult ?? 1.0,
    startMpMin: rank >= 3 ? 50 : rank >= 1 ? 20 : 0,
    comboDmgBonus: rank >= 2 ? 18 : 0,
    deathImmunity: rank >= 4,
  };
}

// ============================================================================
// SAFE NORMALIZER FOR EXISTING SAVES
// ============================================================================

export function getDiscipleGrowth(disciple: Disciple): {
  cultivationArts: DiscipleCultivationArts;
  natalArtifact: DiscipleNatalArtifact;
  alchemy: DiscipleAlchemyState;
  qualityRank: DiscipleQualityRank;
} {
  return {
    cultivationArts: disciple.cultivationArts || { tamPhapLevel: 1, thanThongLevel: 1 },
    natalArtifact: disciple.natalArtifact || {
      type: getDefaultArtifactForElement(disciple.element),
      enhanceLevel: 0,
      refineLevel: 0,
    },
    alchemy: disciple.alchemy || {
      tuViPillsUsed: 0,
      tayTuyCounts: { atk: 0, hp: 0, def: 0 },
      pillToxicity: 0,
      pillToxicityRealmIdx: disciple.realmIndex,
    },
    qualityRank: disciple.qualityRank ?? 0,
  };
}
