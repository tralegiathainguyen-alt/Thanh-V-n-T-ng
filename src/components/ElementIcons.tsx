import React, { useEffect, useState } from 'react';
import {
  ELEMENT_META,
  EQUIPMENT_SETS,
  RARITY_META,
  REALM_LADDER,
  SPIRIT_ROOT_META,
  VIP_FASHIONS,
} from '../data/constants';
import {
  BuildingId,
  ElementType,
  EquipmentSlot,
  Rarity,
  SpiritRootGrade,
  VipFashionId,
} from '../types/game';
import { getVfxRingIndexForRealm, getVfxRingPreset, VfxRingGroup } from '../data/vfxRings';
import { X } from 'lucide-react';

export type ResourceSpriteKey =
  | 'linhThach'
  | 'tienNgoc'
  | 'linhThao'
  | 'huyenThiet'
  | 'linhKhi'
  | 'cuongHoaThach'
  | 'dotPhaDan'
  | 'tinhHoaBoss'
  | 'stamina';

export const BUILDING_SPRITE_URLS: Record<BuildingId, string> = {
  chinh_dien: './assets/sprites/buildings/chinh_dien.png',
  tu_linh_tran: './assets/sprites/buildings/tu_linh_tran.png',
  duoc_dien: './assets/sprites/buildings/duoc_dien.png',
  luyen_dan_phong: './assets/sprites/buildings/luyen_dan_phong.png',
  luyen_khi_cac: './assets/sprites/buildings/luyen_khi_cac.png',
  tang_kinh_cac: './assets/sprites/buildings/tang_kinh_cac.png',
  truyen_tong_tran: './assets/sprites/buildings/truyen_tong_tran.png',
};

export const RESOURCE_SPRITE_URLS: Record<ResourceSpriteKey, string> = {
  linhThach: './assets/sprites/resources/linhThach.png',
  tienNgoc: './assets/sprites/resources/tienNgoc.png',
  linhThao: './assets/sprites/resources/linhThao.png',
  huyenThiet: './assets/sprites/resources/huyenThiet.png',
  linhKhi: './assets/sprites/resources/linhKhi.png',
  cuongHoaThach: './assets/sprites/resources/cuongHoaThach.png',
  dotPhaDan: './assets/sprites/resources/dotPhaDan.png',
  tinhHoaBoss: './assets/sprites/resources/tinhHoaBoss.png',
  stamina: './assets/sprites/resources/stamina.png',
};

export type DiscipleGender = 'male' | 'female';

export interface CharacterSheetConfig {
  url: string;
  portraitUrl: string;
  attackCol: number;
  jumpCols: [number, number, number]; // [takeoff, midair, landing] columns in Row 3
  trailPrimary: string;
  trailCore: string;
  particleColor: string;
}

const ARCHETYPE_SHEETS = {
  kim_nam: {
    url: './assets/sprites/characters/diep_thanh_van_sheet.png',
    portraitUrl: './assets/sprites/characters/diep_thanh_van.png',
    attackCol: 2,
    jumpCols: [0, 1, 3] as [number, number, number],
    trailPrimary: '#F59E0B',
    trailCore: '#FEF08A',
    particleColor: '#FDE047',
  },
  kim_nu: {
    url: './assets/sprites/characters/kim_nu_sheet.png',
    portraitUrl: './assets/sprites/characters/kim_nu.png',
    attackCol: 2,
    jumpCols: [0, 1, 3] as [number, number, number],
    trailPrimary: '#EAB308',
    trailCore: '#FEF9C3',
    particleColor: '#FDE047',
  },
  thuy_nam: {
    url: './assets/sprites/characters/thuy_nam_sheet.png',
    portraitUrl: './assets/sprites/characters/thuy_nam.png',
    attackCol: 2,
    jumpCols: [0, 1, 3] as [number, number, number],
    trailPrimary: '#0EA5E9',
    trailCore: '#E0F2FE',
    particleColor: '#7DD3FC',
  },
  thuy_nu: {
    url: './assets/sprites/characters/to_bang_tam_sheet.png',
    portraitUrl: './assets/sprites/characters/to_bang_tam.png',
    attackCol: 2,
    jumpCols: [0, 1, 3] as [number, number, number],
    trailPrimary: '#38BDF8',
    trailCore: '#E0F2FE',
    particleColor: '#7DD3FC',
  },
  moc_nam: {
    url: './assets/sprites/characters/moc_nam_sheet.png',
    portraitUrl: './assets/sprites/characters/moc_nam.png',
    attackCol: 2,
    jumpCols: [0, 1, 3] as [number, number, number],
    trailPrimary: '#16A34A',
    trailCore: '#BBF7D0',
    particleColor: '#4ADE80',
  },
  moc_nu: {
    url: './assets/sprites/characters/lam_thanh_dao_sheet.png',
    portraitUrl: './assets/sprites/characters/lam_thanh_dao.png',
    attackCol: 2,
    jumpCols: [0, 1, 3] as [number, number, number],
    trailPrimary: '#22C55E',
    trailCore: '#BBF7D0',
    particleColor: '#4ADE80',
  },
  hoa_nam: {
    url: './assets/sprites/characters/tieu_xich_viem_sheet.png',
    portraitUrl: './assets/sprites/characters/tieu_xich_viem.png',
    attackCol: 1,
    jumpCols: [0, 2, 3] as [number, number, number],
    trailPrimary: '#EF4444',
    trailCore: '#FDE047',
    particleColor: '#FB923C',
  },
  hoa_nu: {
    url: './assets/sprites/characters/hoa_nu_sheet.png',
    portraitUrl: './assets/sprites/characters/hoa_nu.png',
    attackCol: 2,
    jumpCols: [0, 1, 3] as [number, number, number],
    trailPrimary: '#F97316',
    trailCore: '#FEF08A',
    particleColor: '#FB923C',
  },
  tho_nam: {
    url: './assets/sprites/characters/tho_nam_sheet.png',
    portraitUrl: './assets/sprites/characters/tho_nam.png',
    attackCol: 2,
    jumpCols: [0, 1, 3] as [number, number, number],
    trailPrimary: '#D97706',
    trailCore: '#FDE68A',
    particleColor: '#F59E0B',
  },
  tho_nu: {
    url: './assets/sprites/characters/tho_nu_sheet.png',
    portraitUrl: './assets/sprites/characters/tho_nu.png',
    attackCol: 2,
    jumpCols: [0, 1, 3] as [number, number, number],
    trailPrimary: '#CA8A04',
    trailCore: '#FEF3C7',
    particleColor: '#EAB308',
  },
} satisfies Record<string, CharacterSheetConfig>;

type ArchetypeKey = keyof typeof ARCHETYPE_SHEETS;

export const CHARACTER_SPRITE_SHEETS: Record<string, CharacterSheetConfig> = {
  'Diệp Thanh Vân': ARCHETYPE_SHEETS.kim_nam,
  'Tô Băng Tâm': ARCHETYPE_SHEETS.thuy_nu,
  'Lâm Thanh Dao': ARCHETYPE_SHEETS.moc_nu,
  'Tiêu Xích Viêm': ARCHETYPE_SHEETS.hoa_nam,
};

const ELEMENT_GENDER_ARCHETYPE: Record<ElementType, Record<DiscipleGender, ArchetypeKey>> = {
  Kim: { male: 'kim_nam', female: 'kim_nu' },
  Moc: { male: 'moc_nam', female: 'moc_nu' },
  Thuy: { male: 'thuy_nam', female: 'thuy_nu' },
  Hoa: { male: 'hoa_nam', female: 'hoa_nu' },
  Tho: { male: 'tho_nam', female: 'tho_nu' },
};

const FEMALE_NAME_HINTS = [
  'Hàn Nguyệt',
  'Tử Huyên',
  'Linh Nhi',
  'Huyền Cơ',
  'Băng Tâm',
  'Ngọc Thư',
  'Dao Quang',
  'Thanh Dao',
  'Nguyệt',
  'Tuyết',
  'Liên',
  'Nhi',
  'Huyên',
  'Ngọc',
  'Băng',
  'Dao',
  'Oanh',
  'Lan',
  'Hương',
  'Tiên Tử',
  'Nữ',
];

export function inferDiscipleGender(name?: string | null): DiscipleGender {
  if (!name) return 'male';
  if (name === 'Diệp Thanh Vân' || name === 'Tiêu Xích Viêm') return 'male';
  if (name === 'Tô Băng Tâm' || name === 'Lâm Thanh Dao') return 'female';
  const normalized = name.toLowerCase();
  for (const hint of FEMALE_NAME_HINTS) {
    if (normalized.includes(hint.toLowerCase())) return 'female';
  }
  return 'male';
}

const STORY_HERO_NAMES = new Set([
  'Diệp Thanh Vân',
  'Tô Băng Tâm',
  'Lâm Thanh Dao',
  'Tiêu Xích Viêm',
]);

// Curated subtle robe tint variants per element (keeps skin tones natural while giving each recruited disciple a distinct palette)
const ELEMENT_ROBE_VARIANTS: Record<ElementType, string[]> = {
  Hoa: [
    'saturate(1.12) brightness(1.03)',
    'hue-rotate(-11deg) saturate(1.18) brightness(0.91) contrast(1.05)', // Đỏ sẫm Huyết Viêm
    'hue-rotate(16deg) saturate(1.15) brightness(1.04)', // Cam hoàng kim
    'hue-rotate(-5deg) saturate(0.95) brightness(0.94)', // Chu sa thẫm
    'hue-rotate(10deg) saturate(1.08) brightness(1.06)', // Xích kim rạng
  ],
  Kim: [
    'brightness(1.02)',
    'hue-rotate(-8deg) saturate(1.22) brightness(1.02)', // Hoàng kim rực
    'hue-rotate(14deg) saturate(0.84) brightness(1.04)', // Bạch ngân hàn thiết
    'hue-rotate(-14deg) saturate(1.10) brightness(0.93)', // Cổ đồng trầm
    'hue-rotate(6deg) saturate(1.12) brightness(1.05)', // Lưu kim sáng
  ],
  Moc: [
    'saturate(1.05)',
    'hue-rotate(14deg) saturate(1.16) brightness(0.93)', // Lục bảo đậm
    'hue-rotate(-14deg) saturate(1.12) brightness(1.04)', // Xuân diệp tươi
    'hue-rotate(22deg) saturate(0.96) brightness(1.02)', // Bích ngọc thanh
    'hue-rotate(-7deg) saturate(0.92) brightness(0.95)', // Cổ tùng trầm
  ],
  Thuy: [
    'saturate(1.06)',
    'hue-rotate(-14deg) saturate(1.14) brightness(1.01)', // Bích thủy lam
    'hue-rotate(16deg) saturate(1.10) brightness(0.97)', // Tinh không tử lam
    'saturate(0.82) brightness(1.07)', // Tuyết sương thanh nhã
    'hue-rotate(8deg) saturate(1.18) brightness(0.94)', // Huyền hải thẫm
  ],
  Tho: [
    'saturate(1.04)',
    'hue-rotate(13deg) saturate(1.16) brightness(1.04)', // Hổ phách kim
    'hue-rotate(-11deg) saturate(1.14) brightness(0.92)', // Hoàng sa trầm
    'saturate(0.84) brightness(0.97) contrast(1.04)', // Cổ thạch ôn
    'hue-rotate(6deg) saturate(1.10) brightness(0.96)', // Thổ hoàng đậm
  ],
};

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function getDiscipleRobeFilter(
  discipleId?: string | null,
  name?: string | null,
  element?: ElementType,
): string {
  // Keep the 4 story starter heroes in their exact original palette
  if (name && STORY_HERO_NAMES.has(name)) return '';
  if (!element) return '';
  const seed = discipleId || name;
  if (!seed) return '';
  const variants = ELEMENT_ROBE_VARIANTS[element];
  return variants[hashSeed(seed) % variants.length];
}

export interface RealmAuraConfig {
  tier: number; // 0 = Luyện Khí .. 8 = Độ Kiếp
  vfxRingId: number; // 1..16
  vfxGroup: VfxRingGroup;
  primary: string;
  secondary: string;
  glowRgba: string;
  ringRadius: number;
  ringSpeed: number;
  dualRing: boolean;
  hasLightning: boolean;
  particleRate: number;
}

export function getRealmAuraConfig(
  realmIndex?: number,
  spiritRoot?: SpiritRootGrade,
): RealmAuraConfig | null {
  if (realmIndex === undefined) return null;
  const majorIdx = Math.max(0, Math.min(8, Math.floor(realmIndex / 3)));
  const ringId = getVfxRingIndexForRealm(realmIndex);
  const preset = getVfxRingPreset(ringId);
  const hasRootLightning = spiritRoot === 'bien_di_loi';

  return {
    tier: majorIdx,
    vfxRingId: ringId,
    vfxGroup: preset.group,
    primary: preset.primaryColor,
    secondary: preset.secondaryColor,
    glowRgba: preset.glowRgba,
    ringRadius: 17 + majorIdx * 2.1,
    ringSpeed: preset.defaultSpeed * 1.15,
    dualRing: majorIdx >= 2,
    hasLightning: hasRootLightning || ringId >= 14,
    particleRate: 3.5 + majorIdx * 1.7,
  };
}

export type TrailSpecialType = 'elemental' | 'lightning' | 'ice' | 'wind' | 'celestial';

export interface FlightTrailStyle {
  type: TrailSpecialType;
  primary: string;
  core: string;
  particleColor: string;
  widthMult: number;
}

export function getFlightTrailStyle(
  sheet: CharacterSheetConfig,
  spiritRoot?: SpiritRootGrade,
): FlightTrailStyle {
  if (spiritRoot === 'bien_di_loi') {
    return {
      type: 'lightning',
      primary: '#A855F7',
      core: '#F5D0FE',
      particleColor: '#C084FC',
      widthMult: 1.15,
    };
  }
  if (spiritRoot === 'bien_di_bang') {
    return {
      type: 'ice',
      primary: '#38BDF8',
      core: '#F0F9FF',
      particleColor: '#BAE6FD',
      widthMult: 1.12,
    };
  }
  if (spiritRoot === 'bien_di_phong') {
    return {
      type: 'wind',
      primary: '#10B981',
      core: '#ECFDF5',
      particleColor: '#6EE7B7',
      widthMult: 1.15,
    };
  }
  if (spiritRoot === 'thien_linh_can') {
    return {
      type: 'celestial',
      primary: sheet.trailPrimary,
      core: '#FFFBEB',
      particleColor: '#FDE047',
      widthMult: 1.22,
    };
  }
  return {
    type: 'elemental',
    primary: sheet.trailPrimary,
    core: sheet.trailCore,
    particleColor: sheet.particleColor,
    widthMult: 1.0,
  };
}

export function getDiscipleSheetConfig(
  name?: string | null,
  element?: ElementType,
): CharacterSheetConfig | null {
  if (name && CHARACTER_SPRITE_SHEETS[name]) {
    return CHARACTER_SPRITE_SHEETS[name];
  }
  if (element) {
    const gender = inferDiscipleGender(name);
    const key = ELEMENT_GENDER_ARCHETYPE[element][gender];
    return ARCHETYPE_SHEETS[key];
  }
  return null;
}

export function getDiscipleSheetUrl(name?: string | null, element?: ElementType): string | null {
  return getDiscipleSheetConfig(name, element)?.url || null;
}

export type SpriteAnimMode = 'idle' | 'walk' | 'fly' | 'attack';

export function AnimatedSpriteSheet({
  sheetUrl,
  mode = 'idle',
  attackCol = 2,
  className = 'w-full h-full',
  alt = '',
}: {
  sheetUrl: string;
  mode?: SpriteAnimMode;
  attackCol?: number;
  className?: string;
  alt?: string;
}) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (mode === 'attack') {
      setFrame(attackCol);
      return;
    }
    const fps = mode === 'idle' ? 4.5 : mode === 'walk' ? 8 : 9;
    const interval = window.setInterval(() => {
      setFrame((f) => (f + 1) % 4);
    }, Math.round(1000 / fps));
    return () => window.clearInterval(interval);
  }, [mode, attackCol]);

  const row = mode === 'idle' ? 0 : mode === 'walk' ? 1 : mode === 'fly' ? 2 : 3;
  const col = mode === 'attack' ? attackCol : frame;
  const posX = (col * 100) / 3;
  const posY = (row * 100) / 3;

  return (
    <div
      role="img"
      aria-label={alt}
      className={`select-none ${className}`}
      style={{
        backgroundImage: `url("${sheetUrl}")`,
        backgroundSize: '400% 400%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `${posX}% ${posY}%`,
      }}
    />
  );
}

export const RARITY_FRAME_URLS: Record<Rarity, string> = {
  thuong: './assets/aistudio/thuong_a06147f5.png',
  hiem: './assets/aistudio/hiem_081b3ea3.png',
  su_thi: './assets/aistudio/su_thi_10bd2fad.png',
  huyen_thoai: './assets/aistudio/huyen_thoai_0cee9eda.png',
  truyen_thuyet: './assets/aistudio/truyen_thuyet_384d01bf.png',
};

export function gemTierToRarity(tier: number): Rarity {
  if (tier >= 5) return 'truyen_thuyet';
  if (tier === 4) return 'huyen_thoai';
  if (tier === 3) return 'su_thi';
  if (tier === 2) return 'hiem';
  return 'thuong';
}

export function getDiscipleSpriteUrl(name?: string | null, element?: ElementType): string | null {
  return getDiscipleSheetConfig(name, element)?.portraitUrl || null;
}

export function RarityFrameBox({
  rarity,
  size = 'md',
  enhanceLevel,
  children,
  className = '',
}: {
  rarity?: Rarity | null;
  size?: 'sm' | 'md' | 'lg';
  enhanceLevel?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const dim = size === 'sm' ? 'w-9 h-9' : size === 'lg' ? 'w-14 h-14' : 'w-11 h-11';

  if (!rarity) {
    return (
      <div
        className={`relative ${dim} rounded-lg border border-dashed border-[#C7B693] bg-[#F6EFE0]/80 flex items-center justify-center shrink-0 text-[#8C7E68] ${className}`}
      >
        {children}
      </div>
    );
  }

  const rm = RARITY_META[rarity];
  const glowStyle =
    rarity === 'truyen_thuyet'
      ? 'drop-shadow-[0_0_6px_rgba(185,43,39,0.45)]'
      : rarity === 'huyen_thoai'
        ? 'drop-shadow-[0_0_5px_rgba(212,162,76,0.45)]'
        : '';

  return (
    <div
      className={`relative ${dim} flex items-center justify-center shrink-0 select-none ${glowStyle} ${className}`}
      style={{ color: rm.color }}
    >
      {/* Subtle parchment/rarity-tinted inner fill inside the transparent frame */}
      <div
        className="absolute inset-[3px] rounded-[7px]"
        style={{
          background: `radial-gradient(circle at 50% 35%, #FFFDF8 0%, ${rm.bg} 100%)`,
        }}
      />
      {/* Content (equipment slot icon, gem seal, or resource sprite) */}
      <div className="relative z-[1] flex items-center justify-center">{children}</div>
      {/* Authentic uploaded rarity frame PNG */}
      <img
        src={RARITY_FRAME_URLS[rarity]}
        alt={rm.name}
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 w-full h-full object-contain z-10"
      />
      {enhanceLevel !== undefined && enhanceLevel > 0 && (
        <span className="absolute bottom-[3px] right-[4px] z-20 px-1 rounded bg-[#1A1309]/85 text-[#FCE08B] text-[9px] leading-tight font-mono font-bold">
          +{enhanceLevel}
        </span>
      )}
    </div>
  );
}

export function ResourceIcon({
  resource,
  size = 'sm',
  className = '',
}: {
  resource: ResourceSpriteKey;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dim =
    size === 'xs'
      ? 'w-3.5 h-3.5'
      : size === 'sm'
        ? 'w-4 h-4'
        : size === 'lg'
          ? 'w-7 h-7'
          : 'w-5 h-5';
  return (
    <img
      src={RESOURCE_SPRITE_URLS[resource]}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`${dim} object-contain shrink-0 inline-block drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] ${className}`}
    />
  );
}

export function BuildingSprite({
  buildingId,
  className = 'w-12 h-12',
}: {
  buildingId: BuildingId;
  className?: string;
}) {
  return (
    <img
      src={BUILDING_SPRITE_URLS[buildingId]}
      alt={buildingId}
      draggable={false}
      className={`${className} object-contain shrink-0 drop-shadow-[0_4px_6px_rgba(0,0,0,0.28)]`}
    />
  );
}

export function DisciplePortrait({
  discipleId,
  name,
  glyph,
  element,
  realmIndex,
  spiritRoot,
  fashionId,
  size = 'md',
  borderColor,
  fullBody = false,
  animMode = 'idle',
  hideAura = false,
  className = '',
}: {
  discipleId?: string;
  name?: string;
  glyph: string;
  element: ElementType;
  realmIndex?: number;
  spiritRoot?: SpiritRootGrade;
  fashionId?: VipFashionId | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  borderColor?: string;
  fullBody?: boolean;
  animMode?: SpriteAnimMode;
  hideAura?: boolean;
  className?: string;
}) {
  const spriteUrl = getDiscipleSpriteUrl(name, element);
  const sheetConfig = getDiscipleSheetConfig(name, element);
  const fashion = fashionId ? VIP_FASHIONS[fashionId] : null;
  const robeFilter = getDiscipleRobeFilter(discipleId, name, element);
  const realmAura = getRealmAuraConfig(realmIndex, spiritRoot);
  const elColor = ELEMENT_META[element].color;

  if (fullBody && (sheetConfig || spriteUrl)) {
    const dim =
      size === 'sm'
        ? 'w-14 h-14'
        : size === 'lg'
          ? 'w-20 h-20'
          : size === 'xl'
            ? 'w-28 h-28'
            : 'w-16 h-16';
    const outerDropShadow = fashion
      ? `drop-shadow(0 0 10px ${fashion.glowColor}) drop-shadow(0 4px 5px rgba(0,0,0,0.45))`
      : realmAura
        ? `drop-shadow(0 0 ${6 + realmAura.tier}px ${realmAura.glowRgba}) drop-shadow(0 4px 5px rgba(0,0,0,0.45))`
        : 'drop-shadow(0 4px 5px rgba(0,0,0,0.45))';
    return (
      <div
        className={`relative ${dim} flex items-center justify-center shrink-0 ${className}`}
        style={{ filter: outerDropShadow }}
      >
        {fashion && (
          <div
            className="absolute inset-1 rounded-full opacity-45 blur-sm pointer-events-none"
            style={{ background: fashion.bgGradient }}
          />
        )}
        {!fashion && realmAura && !hideAura && (() => {
          const ringPreset = getVfxRingPreset(realmAura.vfxRingId);
          return (
            <div
              className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-[115%] aspect-square pointer-events-none z-0"
              style={{ transform: 'scaleY(0.38)' }}
            >
              <img
                src={ringPreset.transparentUrl}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="w-full h-full object-contain opacity-90 animate-spin"
                style={{
                  animationDuration: `${Math.max(4, Math.round(14 / Math.max(0.35, ringPreset.defaultSpeed)))}s`,
                  filter: `drop-shadow(0 0 6px ${realmAura.glowRgba})`,
                }}
              />
            </div>
          );
        })()}
        <div
          className="relative z-10 w-full h-full"
          style={robeFilter ? { filter: robeFilter } : undefined}
        >
          {sheetConfig ? (
            <AnimatedSpriteSheet
              sheetUrl={sheetConfig.url}
              mode={animMode}
              attackCol={sheetConfig.attackCol}
              alt={name || glyph}
              className="w-full h-full"
            />
          ) : (
            <img
              src={spriteUrl!}
              alt={name || glyph}
              draggable={false}
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </div>
    );
  }

  const circleDim =
    size === 'sm'
      ? 'w-10 h-10 text-base'
      : size === 'lg'
        ? 'w-14 h-14 text-2xl'
        : size === 'xl'
          ? 'w-20 h-20 text-3xl'
          : 'w-11 h-11 text-lg';

  return (
    <div
      className={`${circleDim} rounded-full flex items-center justify-center font-bold text-white border-2 shadow-md overflow-hidden shrink-0 ${className}`}
      style={{
        background: fashion ? fashion.bgGradient : spriteUrl ? `radial-gradient(circle at 50% 35%, #FAF3E0, ${elColor})` : elColor,
        borderColor: fashion ? fashion.ringColor : realmAura ? realmAura.primary : borderColor || '#D4B06A',
        boxShadow: fashion
          ? `0 0 14px ${fashion.glowColor}`
          : realmAura
            ? `0 0 ${6 + realmAura.tier}px ${realmAura.glowRgba}`
            : undefined,
        fontFamily: 'var(--font-display)',
      }}
    >
      {spriteUrl ? (
        <img
          src={spriteUrl}
          alt={name || glyph}
          draggable={false}
          style={robeFilter ? { filter: robeFilter } : undefined}
          className="w-full h-full object-cover object-top scale-110"
        />
      ) : (
        glyph
      )}
    </div>
  );
}

export const ELEMENT_SEAL_URLS: Record<ElementType, string> = {
  Kim: './assets/sprites/elements/Kim.png',
  Moc: './assets/sprites/elements/Moc.png',
  Thuy: './assets/sprites/elements/Thuy.png',
  Hoa: './assets/sprites/elements/Hoa.png',
  Tho: './assets/sprites/elements/Tho.png',
};

export function ElementSeal({
  element,
  size = 'md',
  showName = false,
}: {
  element: ElementType;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showName?: boolean;
}) {
  const meta = ELEMENT_META[element];
  const dims =
    size === 'xs'
      ? 'w-5 h-5'
      : size === 'sm'
        ? 'w-6 h-6'
        : size === 'lg'
          ? 'w-11 h-11'
          : 'w-7 h-7';

  return (
    <span className="inline-flex items-center gap-1.5 shrink-0">
      <img
        src={ELEMENT_SEAL_URLS[element]}
        alt={`Ấn ${meta.name}`}
        title={`Hệ ${meta.name} (${meta.roleHint})`}
        draggable={false}
        className={`${dims} object-contain shrink-0 select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]`}
      />
      {showName && (
        <span className="text-xs font-semibold whitespace-nowrap" style={{ color: meta.color }}>
          {meta.name}
        </span>
      )}
    </span>
  );
}

export function getGemSpriteUrl(element: ElementType, tier: number): string {
  const clamped = Math.min(5, Math.max(1, Math.round(tier)));
  return `./assets/sprites/gems/${element}_${clamped}.png`;
}

export function GemSprite({
  element,
  tier,
  className = 'w-7 h-7',
}: {
  element: ElementType;
  tier: number;
  className?: string;
}) {
  return (
    <img
      src={getGemSpriteUrl(element, tier)}
      alt={`Linh Ngọc ${ELEMENT_META[element].name} Bậc ${tier}`}
      draggable={false}
      className={`${className} object-contain shrink-0 select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]`}
    />
  );
}

export function SkillIcon({
  skillId,
  name,
  className = 'w-10 h-10',
}: {
  skillId: string;
  name?: string;
  className?: string;
}) {
  return (
    <img
      src={`./assets/sprites/skills/${skillId}.png`}
      alt={name || skillId}
      draggable={false}
      className={`${className} object-contain shrink-0 select-none drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]`}
    />
  );
}

export function RealmBadge({
  realmIndex,
  size = 'sm',
  className = '',
}: {
  realmIndex: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const majorIdx = Math.min(8, Math.max(0, Math.floor(realmIndex / 3)));
  const realmDef = REALM_LADDER[realmIndex];
  const dim =
    size === 'xs'
      ? 'w-5 h-5'
      : size === 'sm'
        ? 'w-7 h-7'
        : size === 'lg'
          ? 'w-12 h-12'
          : 'w-9 h-9';
  return (
    <img
      src={`./assets/sprites/realms/realm_${majorIdx}.png`}
      alt={realmDef?.majorName || `Cảnh giới ${majorIdx + 1}`}
      title={realmDef?.fullName}
      draggable={false}
      className={`${dim} object-contain shrink-0 select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.38)] ${className}`}
    />
  );
}

export function SpiritRootSeal({
  grade,
  size = 'sm',
  className = '',
}: {
  grade: SpiritRootGrade;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const meta = SPIRIT_ROOT_META[grade];
  const dim =
    size === 'xs'
      ? 'w-6 h-6'
      : size === 'sm'
        ? 'w-8 h-8'
        : size === 'lg'
          ? 'w-12 h-12'
          : 'w-10 h-10';
  const spriteKey = grade === 'hon_don_linh_can' ? 'thien_linh_can' : grade;
  return (
    <img
      src={`./assets/sprites/roots/${spriteKey}.png`}
      alt={meta?.name || grade}
      title={meta ? `${meta.name} (${meta.tierLabel})` : grade}
      draggable={false}
      style={
        grade === 'hon_don_linh_can'
          ? { filter: 'drop-shadow(0 0 6px #F59E0B) saturate(1.4) brightness(1.08)' }
          : undefined
      }
      className={`${dim} object-contain shrink-0 select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] ${className}`}
    />
  );
}

export function LegendarySetSprite({
  setId,
  className = 'w-11 h-11',
}: {
  setId: string;
  className?: string;
}) {
  const setDef = EQUIPMENT_SETS[setId];
  return (
    <img
      src={`./assets/sprites/sets/${setId}.png`}
      alt={setDef?.name || setId}
      title={setDef?.name}
      draggable={false}
      className={`${className} object-contain shrink-0 select-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.4)]`}
    />
  );
}

export function SpiritVeinSprite({
  veinId,
  name,
  className = 'w-16 h-16',
}: {
  veinId: string;
  name?: string;
  className?: string;
}) {
  return (
    <img
      src={`./assets/sprites/veins/${veinId}.png`}
      alt={name || veinId}
      draggable={false}
      className={`${className} object-contain shrink-0 select-none drop-shadow-[0_4px_7px_rgba(0,0,0,0.32)]`}
    />
  );
}

export function getEnemyUnitSpriteUrl(id: string): string | null {
  const bossMatch = id.match(/^(boss_(?:cuu_vi|huyen_vu|ma_long|kiem_ma|world_hon_don))/);
  if (bossMatch) return `./assets/sprites/bosses/${bossMatch[1]}.png`;
  if (/^boss_/.test(id)) return `./assets/sprites/bosses/boss_cuu_vi.png`;
  const monMatch = id.match(/^(e(?:1[0-5]|[1-9]))(?:\b|_)/);
  if (monMatch) return `./assets/sprites/monsters/${monMatch[1]}.png`;
  const guardMatch = id.match(/^(vg(?:10|[1-9]))(?:\b|_)/);
  if (guardMatch) return `./assets/sprites/guardians/${guardMatch[1]}.png`;
  return null;
}

export function EnemyUnitSprite({
  id,
  name,
  element,
  glyph,
  isBoss = false,
  className,
}: {
  id: string;
  name: string;
  element: ElementType;
  glyph?: string;
  isBoss?: boolean;
  className?: string;
}) {
  const spriteUrl = getEnemyUnitSpriteUrl(id);
  const elColor = ELEMENT_META[element].color;
  const fallbackDim = className || (isBoss ? 'w-20 h-20' : 'w-14 h-14');

  if (spriteUrl) {
    return (
      <div
        className={`relative ${fallbackDim} flex items-center justify-center shrink-0 select-none`}
        style={{
          filter: isBoss
            ? `drop-shadow(0 0 10px ${elColor}AA) drop-shadow(0 5px 7px rgba(0,0,0,0.55))`
            : `drop-shadow(0 3px 5px rgba(0,0,0,0.48))`,
        }}
      >
        <img
          src={spriteUrl}
          alt={name}
          draggable={false}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`${fallbackDim} rounded-full flex items-center justify-center font-bold text-white border-2 shrink-0`}
      style={{
        backgroundColor: elColor,
        borderColor: '#E08B84',
        fontFamily: 'var(--font-display)',
      }}
    >
      {glyph || ELEMENT_META[element].hanzi}
    </div>
  );
}

export const EQUIPMENT_SPRITE_URLS: Record<EquipmentSlot, string> = {
  non: './assets/sprites/equipment/non.png',
  giap_vai: './assets/sprites/equipment/giap_vai.png',
  giap_nguc: './assets/sprites/equipment/giap_nguc.png',
  giap_tay: './assets/sprites/equipment/giap_tay.png',
  gang_tay: './assets/sprites/equipment/gang_tay.png',
  dai_lung: './assets/sprites/equipment/dai_lung.png',
  quan: './assets/sprites/equipment/quan.png',
  giay: './assets/sprites/equipment/giay.png',
  vu_khi_chinh: './assets/sprites/equipment/vu_khi_chinh.png',
  vu_khi_phu: './assets/sprites/equipment/vu_khi_phu.png',
  day_chuyen: './assets/sprites/equipment/day_chuyen.png',
  nhan: './assets/sprites/equipment/nhan.png',
};

export function EquipmentSlotIcon({
  slot,
  className = 'w-8 h-8',
  empty = false,
}: {
  slot: EquipmentSlot;
  className?: string;
  empty?: boolean;
}) {
  return (
    <img
      src={EQUIPMENT_SPRITE_URLS[slot]}
      alt={slot}
      draggable={false}
      className={`${className} object-contain shrink-0 select-none ${
        empty
          ? 'opacity-35 grayscale contrast-75'
          : 'drop-shadow-[0_2px_3px_rgba(0,0,0,0.32)]'
      }`}
    />
  );
}

export function ScrollModalShell({
  title,
  subtitle,
  onClose,
  headerRight,
  children,
  maxWidth = 'max-w-5xl',
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-4 bg-[#0B1716]/75 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidth} max-h-[94%] flex flex-col scroll-parchment`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top ornate dark-jade scroll header seated neatly inside the scroll */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-[#1A312F] via-[#223F3C] to-[#1A312F] border-b-2 border-[#C9A45C] text-[#F7EFD8] rounded-t-md shrink-0">
          <div className="min-w-0">
            <h2
              className="text-base sm:text-2xl font-bold tracking-wide text-[#F6DF9F] truncate"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {title}
            </h2>
            {subtitle && <p className="text-[11px] sm:text-xs text-[#C7D7CE] truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {headerRight}
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-[#122422] border border-[#C9A45C]/60 text-[#F2D794] hover:bg-[#C84332] hover:text-white hover:border-[#F2D794] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Scroll body */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-5 text-[#24211C]">{children}</div>
      </div>
    </div>
  );
}

export function FiveElementDiagram() {
  return (
    <div className="rounded-lg bg-[#EFE7D4] border border-[#D4C3A1] p-3 text-xs text-[#3C352B]">
      <div className="font-semibold text-[#1E3331] mb-1.5">Quy Luật Ngũ Hành Chiến Đấu</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <span className="font-semibold text-[#257A52]">Tương Sinh (Combo Liên Hoàn):</span>{' '}
          Kim → Thủy → Mộc → Hỏa → Thổ → Kim. Đánh nối tiếp theo vòng tương sinh sẽ kích hoạt{' '}
          <strong className="text-[#B4690E]">Ngũ Hành Liên Hoàn (+25% đến +110% uy lực)</strong>!
        </div>
        <div>
          <span className="font-semibold text-[#C23B2B]">Tương Khắc (+35% Sát Thương):</span>{' '}
          Kim khắc Mộc · Mộc khắc Thổ · Thổ khắc Thủy · Thủy khắc Hỏa · Hỏa khắc Kim.
        </div>
      </div>
    </div>
  );
}
