export type VfxAuraMotion = 'flow_ribbon' | 'fire' | 'lightning' | 'ascend';

export interface VfxAuraPreset {
  id: number; // 1..16
  code: string; // aura_01..aura_16
  name: string;
  realmLabel: string;
  motion: VfxAuraMotion;
  primaryColor: string;
  secondaryColor: string;
  url: string;
  heightRatio: number; // 1.4 .. 1.7x character height
  backOpacity: number; // 0.85 .. 1.0
  frontOpacity: number; // 0.25 .. 0.40
}

function makeAura(
  id: number,
  name: string,
  realmLabel: string,
  motion: VfxAuraMotion,
  primaryColor: string,
  secondaryColor: string,
  opts?: { heightRatio?: number; backOpacity?: number; frontOpacity?: number },
): VfxAuraPreset {
  const code = `aura_${String(id).padStart(2, '0')}`;
  return {
    id,
    code,
    name,
    realmLabel,
    motion,
    primaryColor,
    secondaryColor,
    url: `./assets/vfx_auras/${code}.png`,
    heightRatio: opts?.heightRatio ?? (motion === 'ascend' ? 1.7 : motion === 'fire' ? 1.55 : 1.5),
    backOpacity: opts?.backOpacity ?? 0.92,
    frontOpacity: opts?.frontOpacity ?? 0.32,
  };
}

export const VFX_AURA_PRESETS: VfxAuraPreset[] = [
  makeAura(1, 'Bạch Vụ Linh Khí', 'Luyện Khí Sơ Kỳ', 'flow_ribbon', '#CBD5E1', '#F8FAFC', { heightRatio: 1.42, backOpacity: 0.9, frontOpacity: 0.28 }),
  makeAura(2, 'Thanh Thủy Lưu Ba', 'Luyện Khí Hậu Kỳ', 'flow_ribbon', '#38BDF8', '#BAE6FD', { heightRatio: 1.45 }),
  makeAura(3, 'Thương Lam Tuyền Khí', 'Trúc Cơ Sơ–Trung Kỳ', 'flow_ribbon', '#2563EB', '#7DD3FC', { heightRatio: 1.48 }),
  makeAura(4, 'Hàn Băng Lưu Vân', 'Trúc Cơ Viên Mãn', 'flow_ribbon', '#0EA5E9', '#E0F2FE', { heightRatio: 1.5 }),

  makeAura(5, 'Kim Ti Linh Khí', 'Kim Đan Sơ–Trung Kỳ', 'flow_ribbon', '#F59E0B', '#FEF08A', { heightRatio: 1.5 }),
  makeAura(6, 'Kim Quang Tinh Vũ', 'Kim Đan Viên Mãn', 'flow_ribbon', '#FACC15', '#FFFBEB', { heightRatio: 1.54, frontOpacity: 0.36 }),
  makeAura(7, 'Tử Hà Phiêu Lụa', 'Nguyên Anh Sơ–Trung Kỳ', 'flow_ribbon', '#E879F9', '#F5D0FE', { heightRatio: 1.52 }),
  makeAura(8, 'Huyền Tử Chân Nguyên', 'Nguyên Anh Viên Mãn', 'flow_ribbon', '#9333EA', '#E9D5FF', { heightRatio: 1.54 }),

  makeAura(9, 'Bích Ngọc Thanh Phong', 'Hóa Thần Sơ–Trung Kỳ', 'flow_ribbon', '#10B981', '#A7F3D0', { heightRatio: 1.54 }),
  makeAura(10, 'Tinh Tú Ngân Hà', 'Hóa Thần Viên Mãn', 'flow_ribbon', '#3B82F6', '#93C5FD', { heightRatio: 1.58, backOpacity: 0.96, frontOpacity: 0.34 }),
  makeAura(11, 'Huyết Sát Ma Khí', 'Luyện Hư Kỳ', 'flow_ribbon', '#B91C1C', '#FCA5A5', { heightRatio: 1.58, backOpacity: 0.96, frontOpacity: 0.3 }),
  makeAura(12, 'Tử Kim Tiên Lụa', 'Hợp Thể Kỳ', 'flow_ribbon', '#A855F7', '#FDE047', { heightRatio: 1.6, frontOpacity: 0.35 }),

  makeAura(13, 'Cửu U Chân Hỏa', 'Đại Thừa Sơ–Trung Kỳ', 'fire', '#F97316', '#FEF08A', { heightRatio: 1.58, backOpacity: 0.95, frontOpacity: 0.38 }),
  makeAura(14, 'Cửu Tiêu Kim Lôi', 'Đại Thừa Viên Mãn', 'lightning', '#FACC15', '#FFFBEB', { heightRatio: 1.56, backOpacity: 0.95, frontOpacity: 0.4 }),
  makeAura(15, 'Ngũ Sắc Tiên Lụa', 'Độ Kiếp Sơ–Trung Kỳ', 'flow_ribbon', '#F472B6', '#67E8F9', { heightRatio: 1.62, backOpacity: 0.94, frontOpacity: 0.36 }),
  makeAura(16, 'Phi Thăng Chí Tôn Quang', 'Độ Kiếp Viên Mãn', 'ascend', '#F59E0B', '#E879F9', { heightRatio: 1.7, backOpacity: 0.96, frontOpacity: 0.38 }),
];

export function getVfxAuraPreset(auraId: number): VfxAuraPreset {
  const clamped = Math.max(1, Math.min(16, Math.round(auraId)));
  return VFX_AURA_PRESETS[clamped - 1];
}

const REALM_TO_AURA_TABLE: number[] = [
  1, 1, 2, // Luyện Khí
  3, 3, 4, // Trúc Cơ
  5, 5, 6, // Kim Đan
  7, 7, 8, // Nguyên Anh
  9, 9, 10, // Hóa Thần
  11, 11, 11, // Luyện Hư
  12, 12, 12, // Hợp Thể
  13, 13, 14, // Đại Thừa
  15, 15, 16, // Độ Kiếp
];

export function getVfxAuraIndexForRealm(realmIndex?: number): number {
  if (realmIndex === undefined || realmIndex < 0) return 1;
  const idx = Math.min(REALM_TO_AURA_TABLE.length - 1, Math.floor(realmIndex));
  return REALM_TO_AURA_TABLE[idx];
}
