export type VfxRingGroup = 'smoke_water' | 'cosmic_orbit' | 'rune_circle' | 'lightning_fire';

export interface VfxRingPreset {
  id: number; // 1..16
  code: string; // ring_01..ring_16
  name: string;
  realmLabel: string;
  rowTitle: string;
  group: VfxRingGroup;
  primaryColor: string;
  secondaryColor: string;
  glowRgba: string;
  transparentUrl: string;
  additiveUrl: string;
  defaultSpeed: number;
  defaultBloom: number;
  defaultUvDistortion: number;
  defaultParticleDensity: number;
}

export const VFX_GROUP_LABELS: Record<VfxRingGroup, { title: string; subtitle: string; badge: string }> = {
  smoke_water: {
    title: 'Hàng 1 · Luyện Khí → Trúc Cơ',
    subtitle: 'Linh khí mờ nhạt tăng tiến thành vòng tròn xanh · Xoay chậm + UV sóng nước',
    badge: 'smoke_water',
  },
  cosmic_orbit: {
    title: 'Hàng 2 · Kim Đan → Nguyên Anh',
    subtitle: 'Hào quang vàng kim sắc sảo chuyển sang khí tím/hồng huyền ảo · Quỹ đạo tinh quang',
    badge: 'cosmic_orbit',
  },
  rune_circle: {
    title: 'Hàng 3 · Hóa Thần · Luyện Hư · Hợp Thể',
    subtitle: 'Tinh tú đa tầng, trận pháp cổ tự, năng lượng giao thoa · 2 lớp xoay ngược + nhịp thở',
    badge: 'rune_circle',
  },
  lightning_fire: {
    title: 'Hàng 4 · Đại Thừa → Độ Kiếp Viên Mãn',
    subtitle: 'Trận pháp chí tôn, bão sét lôi kiếp tới vòng ngũ sắc viên mãn · Giật góc + tia lửa',
    badge: 'lightning_fire',
  },
};

function makePreset(
  id: number,
  name: string,
  realmLabel: string,
  group: VfxRingGroup,
  primaryColor: string,
  secondaryColor: string,
  glowRgba: string,
  defaults?: { speed?: number; bloom?: number; uv?: number; particles?: number },
): VfxRingPreset {
  const code = `ring_${String(id).padStart(2, '0')}`;
  return {
    id,
    code,
    name,
    realmLabel,
    rowTitle: VFX_GROUP_LABELS[group].title,
    group,
    primaryColor,
    secondaryColor,
    glowRgba,
    transparentUrl: `./assets/vfx_rings/transparent/${code}.png`,
    additiveUrl: `./assets/vfx_rings/additive/${code}.png`,
    defaultSpeed: defaults?.speed ?? (group === 'smoke_water' ? 0.55 : group === 'cosmic_orbit' ? 0.95 : group === 'rune_circle' ? 0.45 : 1.35),
    defaultBloom: defaults?.bloom ?? (group === 'smoke_water' ? 1.55 : group === 'cosmic_orbit' ? 1.9 : group === 'rune_circle' ? 1.85 : 2.25),
    defaultUvDistortion: defaults?.uv ?? (group === 'smoke_water' ? 1.25 : group === 'cosmic_orbit' ? 0.45 : group === 'rune_circle' ? 0.35 : 0.9),
    defaultParticleDensity: defaults?.particles ?? (group === 'smoke_water' ? 0.75 : group === 'cosmic_orbit' ? 1.35 : group === 'rune_circle' ? 1.0 : 1.55),
  };
}

export const VFX_RING_PRESETS: VfxRingPreset[] = [
  // Hàng 1: Luyện Khí -> Trúc Cơ (smoke_water)
  makePreset(1, 'Sơ Khai Linh Vụ', 'Luyện Khí Sơ Kỳ', 'smoke_water', '#7DD3FC', '#E0F2FE', 'rgba(125, 211, 252, 0.38)'),
  makePreset(2, 'Thanh Linh Viên Hoàn', 'Luyện Khí Hậu Kỳ', 'smoke_water', '#38BDF8', '#BAE6FD', 'rgba(56, 189, 248, 0.44)'),
  makePreset(3, 'Thương Lam Linh Tuyền', 'Trúc Cơ Sơ–Trung Kỳ', 'smoke_water', '#2563EB', '#7DD3FC', 'rgba(37, 99, 235, 0.50)'),
  makePreset(4, 'Trúc Cơ Viên Mãn Quang', 'Trúc Cơ Viên Mãn', 'smoke_water', '#0EA5E9', '#E0F2FE', 'rgba(14, 165, 233, 0.56)'),

  // Hàng 2: Kim Đan -> Nguyên Anh (cosmic_orbit)
  makePreset(5, 'Kim Đan Sơ Thành', 'Kim Đan Sơ–Trung Kỳ', 'cosmic_orbit', '#F59E0B', '#FEF08A', 'rgba(245, 158, 11, 0.56)'),
  makePreset(6, 'Cửu Chuyển Kim Tuyền', 'Kim Đan Viên Mãn', 'cosmic_orbit', '#FACC15', '#FFFBEB', 'rgba(250, 204, 21, 0.62)'),
  makePreset(7, 'Tinh Quỹ Nguyên Anh', 'Nguyên Anh Sơ–Trung Kỳ', 'cosmic_orbit', '#818CF8', '#38BDF8', 'rgba(129, 140, 248, 0.58)'),
  makePreset(8, 'Tử Hà Nguyên Anh', 'Nguyên Anh Viên Mãn', 'cosmic_orbit', '#D946EF', '#F5D0FE', 'rgba(217, 70, 239, 0.62)'),

  // Hàng 3: Hóa Thần, Luyện Hư, Hợp Thể (rune_circle)
  makePreset(9, 'Tinh Hải Hóa Thần', 'Hóa Thần Sơ–Trung Kỳ', 'rune_circle', '#6366F1', '#BAE6FD', 'rgba(99, 102, 241, 0.60)'),
  makePreset(10, 'Thái Cổ Phù Ấn', 'Hóa Thần Viên Mãn', 'rune_circle', '#A78BFA', '#E2E8F0', 'rgba(167, 139, 250, 0.58)'),
  makePreset(11, 'Hư Không Giao Thoa', 'Luyện Hư Kỳ', 'rune_circle', '#C084FC', '#FDE047', 'rgba(192, 132, 252, 0.62)'),
  makePreset(12, 'Hợp Thể Liên Hoa Trận', 'Hợp Thể Kỳ', 'rune_circle', '#A855F7', '#F0ABFC', 'rgba(168, 85, 247, 0.65)'),

  // Hàng 4: Đại Thừa -> Độ Kiếp (lightning_fire)
  makePreset(13, 'Chí Tôn Hoàng Kim Trận', 'Đại Thừa Sơ–Trung Kỳ', 'lightning_fire', '#F59E0B', '#FEF08A', 'rgba(245, 158, 11, 0.72)'),
  makePreset(14, 'Cửu Tiêu Kim Lôi', 'Đại Thừa Viên Mãn', 'lightning_fire', '#FBBF24', '#FFFBEB', 'rgba(251, 191, 36, 0.75)'),
  makePreset(15, 'Xích Viêm Thiên Kiếp', 'Độ Kiếp Sơ–Trung Kỳ', 'lightning_fire', '#EF4444', '#FDE047', 'rgba(239, 68, 68, 0.76)'),
  makePreset(16, 'Độ Kiếp Ngũ Sắc Viên Mãn', 'Độ Kiếp Viên Mãn', 'lightning_fire', '#F59E0B', '#67E8F9', 'rgba(250, 204, 21, 0.82)'),
];

export function getVfxRingPreset(ringId: number): VfxRingPreset {
  const clamped = Math.max(1, Math.min(16, Math.round(ringId)));
  return VFX_RING_PRESETS[clamped - 1];
}

/**
 * Maps 27 cultivation stages (realmIndex 0..26, 9 major realms x 3 sub-stages)
 * smoothly onto the 16 VFX magic rings across the 4 tiers:
 *  - Row 1 (1..4):  Luyện Khí (0..2) -> Trúc Cơ (3..5)
 *  - Row 2 (5..8):  Kim Đan (6..8) -> Nguyên Anh (9..11)
 *  - Row 3 (9..12): Hóa Thần (12..14), Luyện Hư (15..17), Hợp Thể (18..20)
 *  - Row 4 (13..16): Đại Thừa (21..23) -> Độ Kiếp (24..26)
 */
const REALM_TO_RING_TABLE: number[] = [
  // Luyện Khí (0,1,2)
  1, 1, 2,
  // Trúc Cơ (3,4,5)
  3, 3, 4,
  // Kim Đan (6,7,8)
  5, 5, 6,
  // Nguyên Anh (9,10,11)
  7, 7, 8,
  // Hóa Thần (12,13,14)
  9, 9, 10,
  // Luyện Hư (15,16,17)
  11, 11, 11,
  // Hợp Thể (18,19,20)
  12, 12, 12,
  // Đại Thừa (21,22,23)
  13, 13, 14,
  // Độ Kiếp (24,25,26)
  15, 15, 16,
];

export function getVfxRingIndexForRealm(realmIndex?: number): number {
  if (realmIndex === undefined || realmIndex < 0) return 1;
  const idx = Math.min(REALM_TO_RING_TABLE.length - 1, Math.floor(realmIndex));
  return REALM_TO_RING_TABLE[idx];
}
