export type VfxAuraMotion = 'flow_ribbon' | 'fire' | 'lightning' | 'ascend';

export interface VfxAuraPreset {
  id: number; // 1..16
  code: string; // aura_01..aura_16
  name: string;
  realmLabel: string;
  motion: VfxAuraMotion;
  primaryColor: string;
  secondaryColor: string;
  /** Seamless 1024x128 RGBA horizontal ribbon texture URL */
  ribbonUrl: string;
  /** Optional second intertwining ribbon (e.g. Độ Kiếp Viên Mãn gold + rainbow!) */
  secondaryRibbonUrl?: string;
  /** Legacy static preview URL (also points to ribbonUrl for gallery thumbnails) */
  url: string;
  heightRatio: number; // 1.4 .. 1.65x character height
  turns: number; // number of helical wraps around torso
  ribbonThickness: number; // visual thickness multiplier
  scrollSpeed: number; // UV flow speed along the 3D helix
}

function rUrl(n: number): string {
  return `./assets/vfx_ribbons/ribbon_${String(n).padStart(2, '0')}.png`;
}

function makeAura(
  id: number,
  name: string,
  realmLabel: string,
  motion: VfxAuraMotion,
  primaryColor: string,
  secondaryColor: string,
  ribbonNum: number,
  opts?: {
    secondaryRibbonNum?: number;
    turns?: number;
    thickness?: number;
    scrollSpeed?: number;
    heightRatio?: number;
  },
): VfxAuraPreset {
  const code = `aura_${String(id).padStart(2, '0')}`;
  const ribbonUrl = rUrl(ribbonNum);
  return {
    id,
    code,
    name,
    realmLabel,
    motion,
    primaryColor,
    secondaryColor,
    ribbonUrl,
    secondaryRibbonUrl: opts?.secondaryRibbonNum ? rUrl(opts.secondaryRibbonNum) : undefined,
    url: ribbonUrl,
    heightRatio: opts?.heightRatio ?? 1.48,
    turns: opts?.turns ?? 1.45,
    ribbonThickness: opts?.thickness ?? 1.0,
    scrollSpeed:
      opts?.scrollSpeed ??
      (motion === 'lightning' ? 1.45 : motion === 'fire' ? 1.15 : motion === 'ascend' ? 0.95 : 0.65),
  };
}

export const VFX_AURA_PRESETS: VfxAuraPreset[] = [
  makeAura(1, 'Bạch Vụ Ngân Ti', 'Luyện Khí Sơ Kỳ', 'flow_ribbon', '#CBD5E1', '#F8FAFC', 1, { turns: 1.25, thickness: 0.9, scrollSpeed: 0.5 }),
  makeAura(2, 'Thanh Thủy Lưu Ba', 'Luyện Khí Hậu Kỳ', 'flow_ribbon', '#38BDF8', '#BAE6FD', 2, { turns: 1.35, thickness: 0.95, scrollSpeed: 0.6 }),
  makeAura(3, 'Thương Lam Tuyền Khí', 'Trúc Cơ Sơ–Trung Kỳ', 'flow_ribbon', '#2563EB', '#7DD3FC', 2, { turns: 1.45, thickness: 1.0, scrollSpeed: 0.7 }),
  makeAura(4, 'Hàn Băng Tuyết Vũ', 'Trúc Cơ Viên Mãn', 'flow_ribbon', '#0EA5E9', '#E0F2FE', 3, { turns: 1.45, thickness: 1.05, scrollSpeed: 0.65 }),

  makeAura(5, 'Kim Ti Linh Khí', 'Kim Đan Sơ–Trung Kỳ', 'flow_ribbon', '#F59E0B', '#FEF08A', 4, { turns: 1.45, thickness: 1.05, scrollSpeed: 0.72 }),
  makeAura(6, 'Hoàng Kim Tiên Ti', 'Kim Đan Viên Mãn', 'flow_ribbon', '#FACC15', '#FFFBEB', 4, { turns: 1.55, thickness: 1.12, scrollSpeed: 0.8 }),
  makeAura(7, 'Tinh Hà Tử Khí', 'Nguyên Anh Sơ–Trung Kỳ', 'flow_ribbon', '#E879F9', '#F5D0FE', 8, { turns: 1.5, thickness: 1.1, scrollSpeed: 0.72 }),
  makeAura(8, 'Tử Tiêu Lôi Điện', 'Nguyên Anh Viên Mãn', 'lightning', '#A855F7', '#E9D5FF', 5, { turns: 1.45, thickness: 1.05, scrollSpeed: 1.35 }),

  makeAura(9, 'Thanh Mộc Đằng Diệp', 'Hóa Thần Sơ–Trung Kỳ', 'flow_ribbon', '#22C55E', '#BBF7D0', 7, { turns: 1.55, thickness: 1.08, scrollSpeed: 0.65 }),
  makeAura(10, 'Tinh Tú Ngân Hà', 'Hóa Thần Viên Mãn', 'flow_ribbon', '#C084FC', '#93C5FD', 8, { turns: 1.6, thickness: 1.15, scrollSpeed: 0.75 }),
  makeAura(11, 'Hắc Ám Ma Khí', 'Luyện Hư Kỳ', 'flow_ribbon', '#7E22CE', '#3B0764', 9, { turns: 1.55, thickness: 1.15, scrollSpeed: 0.85 }),
  makeAura(12, 'Tử Kim Lôi Khí', 'Hợp Thể Kỳ', 'lightning', '#A855F7', '#FDE047', 5, { secondaryRibbonNum: 4, turns: 1.5, thickness: 1.05, scrollSpeed: 1.2 }),

  makeAura(13, 'Xích Viêm Chân Hỏa', 'Đại Thừa Sơ–Trung Kỳ', 'fire', '#F97316', '#FEF08A', 6, { turns: 1.55, thickness: 1.15, scrollSpeed: 1.2 }),
  makeAura(14, 'Cửu Tiêu Kim Lôi', 'Đại Thừa Viên Mãn', 'lightning', '#FACC15', '#FFFBEB', 10, { turns: 1.5, thickness: 1.12, scrollSpeed: 1.5 }),
  makeAura(15, 'Ngũ Sắc Cầu Vồng', 'Độ Kiếp Sơ–Trung Kỳ', 'flow_ribbon', '#F472B6', '#67E8F9', 11, { turns: 1.55, thickness: 1.15, scrollSpeed: 0.88 }),
  makeAura(16, 'Chí Tôn Kim Quang Ngũ Sắc', 'Độ Kiếp Viên Mãn', 'ascend', '#F59E0B', '#E879F9', 12, { secondaryRibbonNum: 11, turns: 1.55, thickness: 1.12, scrollSpeed: 0.95, heightRatio: 1.55 }),
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
