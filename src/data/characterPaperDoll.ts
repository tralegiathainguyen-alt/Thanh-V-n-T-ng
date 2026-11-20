export type PaperDollGender = 'male' | 'female';
export type PaperDollOutfitId = 'ngoai_mon' | 'kiem_khach' | 'dao_si' | 'luyen_dan';
export type PaperDollExpressionId =
  | 'vui_ve'
  | 'lanh_lung'
  | 'tinh_nghich'
  | 'nghiem_nghi'
  | 'ngay_tho';
export type PaperDollCombatExpression = PaperDollExpressionId | 'quyet_tam' | 'hoang_hot';

export interface PaperDollConfig {
  gender: PaperDollGender;
  hairStyle: number; // 0..3
  hairColor: string;
  expression: PaperDollExpressionId;
  outfit: PaperDollOutfitId;
  footRingId: number; // 0 = off, 1..16 from vfx_rings
  auraId: number; // 0 = off, 1..16 from vfx_auras
}

/**
 * Drop real transparent PNG URLs here later to automatically override
 * any procedural SVG part of ChibiPaperDoll without changing component code.
 */
export const CHARACTER_PART_ASSETS: {
  body: Record<PaperDollGender, { front?: string; back?: string }>;
  outfits: Record<PaperDollOutfitId, { front?: string; back?: string }>;
  backHair: Record<PaperDollGender, (string | undefined)[]>;
  frontHair: Record<PaperDollGender, (string | undefined)[]>;
  faces: Partial<Record<PaperDollCombatExpression, string>>;
} = {
  body: {
    male: {},
    female: {},
  },
  outfits: {
    ngoai_mon: {},
    kiem_khach: {},
    dao_si: {},
    luyen_dan: {},
  },
  backHair: {
    male: [undefined, undefined, undefined, undefined],
    female: [undefined, undefined, undefined, undefined],
  },
  frontHair: {
    male: [undefined, undefined, undefined, undefined],
    female: [undefined, undefined, undefined, undefined],
  },
  faces: {},
};

export const HAIR_COLOR_PRESETS: Array<{ id: string; hex: string; name: string }> = [
  { id: 'ink', hex: '#232830', name: 'Mực Đen' },
  { id: 'silver', hex: '#DCE5F0', name: 'Bạch Ngân' },
  { id: 'gold', hex: '#E3B24C', name: 'Kim Hoàng' },
  { id: 'crimson', hex: '#C84332', name: 'Chu Sa' },
  { id: 'azure', hex: '#3B82C4', name: 'Lam Băng' },
  { id: 'jade', hex: '#2B8A6E', name: 'Lục Bích' },
  { id: 'violet', hex: '#8B5CF6', name: 'Tử Hà' },
  { id: 'sakura', hex: '#EC7FA9', name: 'Đào Phấn' },
];

export const OUTFIT_PRESETS: Array<{
  id: PaperDollOutfitId;
  name: string;
  icon: string;
  primary: string;
  secondary: string;
  trim: string;
  cape: string;
}> = [
  {
    id: 'ngoai_mon',
    name: 'Ngoại Môn',
    icon: '🥋',
    primary: '#E8F3F1',
    secondary: '#2A6F68',
    trim: '#D4A84B',
    cape: '#3C8C84',
  },
  {
    id: 'kiem_khach',
    name: 'Kiếm Khách',
    icon: '⚔',
    primary: '#1F3044',
    secondary: '#385A7C',
    trim: '#F0C45A',
    cape: '#162436',
  },
  {
    id: 'dao_si',
    name: 'Đạo Sĩ',
    icon: '☯',
    primary: '#F3EBD8',
    secondary: '#3D5B4E',
    trim: '#C9963B',
    cape: '#2D4A3E',
  },
  {
    id: 'luyen_dan',
    name: 'Luyện Đan',
    icon: '🔥',
    primary: '#7D2828',
    secondary: '#B8452E',
    trim: '#F5C451',
    cape: '#5C1B1B',
  },
];

export const EXPRESSION_PRESETS: Array<{
  id: PaperDollExpressionId;
  name: string;
  icon: string;
}> = [
  { id: 'vui_ve', name: 'Vui vẻ', icon: '😊' },
  { id: 'lanh_lung', name: 'Lạnh lùng', icon: '😑' },
  { id: 'tinh_nghich', name: 'Tinh nghịch', icon: '😜' },
  { id: 'nghiem_nghi', name: 'Nghiêm nghị', icon: '😠' },
  { id: 'ngay_tho', name: 'Ngây thơ', icon: '🥺' },
];

export const DEFAULT_PAPER_DOLL_CONFIG: PaperDollConfig = {
  gender: 'male',
  hairStyle: 0,
  hairColor: '#232830',
  expression: 'vui_ve',
  outfit: 'kiem_khach',
  footRingId: 6,
  auraId: 6,
};

const STORAGE_KEY = 'tvtt_paper_doll_v1';
export const PAPER_DOLL_CHANGED_EVENT = 'tvtt:paper-doll-changed';

export function loadPaperDollConfig(): PaperDollConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_PAPER_DOLL_CONFIG };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PAPER_DOLL_CONFIG };
    const parsed = JSON.parse(raw) as Partial<PaperDollConfig>;
    return {
      ...DEFAULT_PAPER_DOLL_CONFIG,
      ...parsed,
      hairStyle: Math.max(0, Math.min(3, Number(parsed.hairStyle ?? 0))),
    };
  } catch {
    return { ...DEFAULT_PAPER_DOLL_CONFIG };
  }
}

export function savePaperDollConfig(cfg: PaperDollConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // Ignore storage errors
  }
  window.dispatchEvent(new CustomEvent(PAPER_DOLL_CHANGED_EVENT, { detail: cfg }));
}
