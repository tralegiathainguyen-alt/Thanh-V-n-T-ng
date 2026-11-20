export type PaperDollGender = 'male' | 'female';
export type PaperDollOutfitId = 'ngoai_mon' | 'kiem_khach' | 'dao_si' | 'luyen_dan' | 'vo_dao';
export type PaperDollWeaponId = 'none' | 'sword' | 'fan';
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
  weapon?: PaperDollWeaponId;
  footRingId: number; // 0 = off, 1..16 from vfx_rings
  auraId: number; // 0 = off, 1..16 from vfx_auras
}

const COMMON_BASE = './assets/paper_doll/common';
const MALE_BASE = './assets/paper_doll/male';
const FEMALE_BASE = './assets/paper_doll/female';

/**
 * Drop real transparent PNG URLs here to automatically override
 * any procedural SVG part of ChibiPaperDoll without changing component code.
 */
export const CHARACTER_PART_ASSETS: {
  commonPoses: {
    idle: string;
    run1: string;
    run2: string;
    backIdle: string;
    backRun1: string;
    backRun2: string;
    attack: string;
  };
  body: Record<PaperDollGender, { front?: string; back?: string }>;
  outfits: Record<PaperDollGender, Partial<Record<PaperDollOutfitId, { front?: string; back?: string }>>>;
  backHair: Record<PaperDollGender, (string | undefined)[]>;
  frontHair: Record<PaperDollGender, (string | undefined)[]>;
  backViewHair: Record<PaperDollGender, string | undefined>;
  faces: Record<PaperDollGender, Partial<Record<PaperDollCombatExpression, string>>>;
  weapons: Partial<Record<Exclude<PaperDollWeaponId, 'none'>, string>>;
} = {
  commonPoses: {
    idle: `${COMMON_BASE}/body_idle.png`,
    run1: `${COMMON_BASE}/body_run_1.png`,
    run2: `${COMMON_BASE}/body_run_2.png`,
    backIdle: `${COMMON_BASE}/body_back_idle.png`,
    backRun1: `${COMMON_BASE}/body_back_run_1.png`,
    backRun2: `${COMMON_BASE}/body_back_run_2.png`,
    attack: `${COMMON_BASE}/body_attack.png`,
  },
  body: {
    male: {
      front: `${MALE_BASE}/body_base.png`,
      back: `${COMMON_BASE}/body_back_idle.png`,
    },
    female: {
      front: `${COMMON_BASE}/body_idle.png`,
      back: `${COMMON_BASE}/body_back_idle.png`,
    },
  },
  outfits: {
    male: {
      ngoai_mon: { front: `${MALE_BASE}/outfit_ngoai_mon.png`, back: `${MALE_BASE}/outfit_ngoai_mon.png` },
      kiem_khach: { front: `${MALE_BASE}/outfit_kiem_khach.png`, back: `${MALE_BASE}/outfit_kiem_khach.png` },
      dao_si: { front: `${MALE_BASE}/outfit_dao_si.png`, back: `${MALE_BASE}/outfit_dao_si.png` },
      luyen_dan: { front: `${MALE_BASE}/outfit_dao_si.png`, back: `${MALE_BASE}/outfit_dao_si.png` },
    },
    female: {
      ngoai_mon: { front: `${FEMALE_BASE}/outfit_ngoai_mon.png`, back: `${FEMALE_BASE}/outfit_ngoai_mon.png` },
      kiem_khach: { front: `${FEMALE_BASE}/outfit_kiem_khach.png`, back: `${FEMALE_BASE}/outfit_kiem_khach.png` },
      dao_si: { front: `${FEMALE_BASE}/outfit_dao_si.png`, back: `${FEMALE_BASE}/outfit_dao_si.png` },
      luyen_dan: { front: `${FEMALE_BASE}/outfit_luyen_dan.png`, back: `${FEMALE_BASE}/outfit_luyen_dan.png` },
    },
  },
  backHair: {
    male: [undefined, `${MALE_BASE}/hair_1_back.png`, `${MALE_BASE}/hair_2_back.png`, `${MALE_BASE}/hair_1_back.png`],
    female: [
      `${FEMALE_BASE}/hair_0_back.png`,
      `${FEMALE_BASE}/hair_1_back.png`,
      `${FEMALE_BASE}/hair_0_back.png`,
      `${FEMALE_BASE}/hair_1_back.png`,
    ],
  },
  frontHair: {
    male: [
      `${MALE_BASE}/hair_0_front.png`,
      `${MALE_BASE}/hair_1_front.png`,
      `${MALE_BASE}/hair_2_front.png`,
      `${MALE_BASE}/hair_2_front.png`,
    ],
    female: [
      `${FEMALE_BASE}/hair_0_front.png`,
      `${FEMALE_BASE}/hair_1_front.png`,
      `${FEMALE_BASE}/hair_0_front.png`,
      `${FEMALE_BASE}/hair_1_front.png`,
    ],
  },
  backViewHair: {
    male: `${MALE_BASE}/hair_back.png`,
    female: `${FEMALE_BASE}/hair_back.png`,
  },
  faces: {
    male: {
      vui_ve: `${MALE_BASE}/face_vui_ve.png`,
      lanh_lung: `${MALE_BASE}/face_lanh_lung.png`,
      tinh_nghich: `${MALE_BASE}/face_vui_ve.png`,
      nghiem_nghi: `${MALE_BASE}/face_quyet_tam.png`,
      ngay_tho: `${MALE_BASE}/face_vui_ve.png`,
      quyet_tam: `${MALE_BASE}/face_quyet_tam.png`,
      hoang_hot: `${MALE_BASE}/face_hoang_hot.png`,
    },
    female: {
      vui_ve: `${FEMALE_BASE}/face_vui_ve.png`,
      lanh_lung: `${FEMALE_BASE}/face_lanh_lung.png`,
      tinh_nghich: `${FEMALE_BASE}/face_tinh_nghich.png`,
      nghiem_nghi: `${FEMALE_BASE}/face_lanh_lung.png`,
      ngay_tho: `${FEMALE_BASE}/face_ngay_tho.png`,
      quyet_tam: `${FEMALE_BASE}/face_lanh_lung.png`,
      hoang_hot: `${FEMALE_BASE}/face_ngay_tho.png`,
    },
  },
  weapons: {
    sword: `${MALE_BASE}/weapon_sword.png`,
    fan: `${MALE_BASE}/weapon_fan.png`,
  },
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
  {
    id: 'vo_dao',
    name: 'Võ Đạo',
    icon: '💨',
    primary: '#F4F4F5',
    secondary: '#94A3B8',
    trim: '#E3B24C',
    cape: '#CBD5E1',
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
  weapon: 'sword',
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
