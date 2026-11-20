import React, { useEffect, useState } from 'react';
import {
  CHARACTER_PART_ASSETS,
  OUTFIT_PRESETS,
  PaperDollCombatExpression,
  PaperDollConfig,
} from '../data/characterPaperDoll';
import { getVfxRingPreset } from '../data/vfxRings';
import { CharacterAuraVFX } from './CharacterAuraVFX';

export type PaperDollMotionState = 'idle' | 'run' | 'attack' | 'hit';

export interface ChibiPaperDollProps {
  config: PaperDollConfig;
  motionState?: PaperDollMotionState;
  facingLeft?: boolean;
  facingBack?: boolean;
  /** Size in pixels (square canvas anchored at bottom center) */
  size?: number;
  /** Optional smooth run stride tilt in degrees (-5..5) */
  tiltDeg?: number;
  /** Optional smooth run bounce in px (0..8) */
  bouncePx?: number;
  /** Optional squash/stretch factors during run */
  squashX?: number;
  squashY?: number;
  /** Show footRing & aura layers (default true) */
  showVfx?: boolean;
  className?: string;
}

export const ChibiPaperDoll: React.FC<ChibiPaperDollProps> = ({
  config,
  motionState = 'idle',
  facingLeft = false,
  facingBack = false,
  size = 112,
  tiltDeg = 0,
  bouncePx = 0,
  squashX = 1,
  squashY = 1,
  showVfx = true,
  className = '',
}) => {
  // Automatic natural blink every 3–5 seconds (120ms close)
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    let alive = true;
    let t1 = 0;
    let t2 = 0;
    const scheduleBlink = () => {
      const delay = 3000 + Math.random() * 2000;
      t1 = window.setTimeout(() => {
        if (!alive) return;
        setIsBlinking(true);
        t2 = window.setTimeout(() => {
          if (!alive) return;
          setIsBlinking(false);
          scheduleBlink();
        }, 120);
      }, delay);
    };
    scheduleBlink();
    return () => {
      alive = false;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  const outfitMeta = OUTFIT_PRESETS.find((o) => o.id === config.outfit) || OUTFIT_PRESETS[0];
  const ringPreset = showVfx && config.footRingId > 0 ? getVfxRingPreset(config.footRingId) : null;

  const activeExpr: PaperDollCombatExpression =
    motionState === 'attack'
      ? 'quyet_tam'
      : motionState === 'hit'
        ? 'hoang_hot'
        : config.expression;

  const bodyPng = facingBack
    ? CHARACTER_PART_ASSETS.body[config.gender].back
    : CHARACTER_PART_ASSETS.body[config.gender].front;
  const genderOutfits = CHARACTER_PART_ASSETS.outfits[config.gender] || {};
  const outfitPng = facingBack
    ? genderOutfits[config.outfit]?.back
    : genderOutfits[config.outfit]?.front;
  const backHairPng = CHARACTER_PART_ASSETS.backHair[config.gender][config.hairStyle];
  const frontHairPng = facingBack
    ? CHARACTER_PART_ASSETS.backViewHair[config.gender] || CHARACTER_PART_ASSETS.frontHair[config.gender][config.hairStyle]
    : CHARACTER_PART_ASSETS.frontHair[config.gender][config.hairStyle];
  const facePng = CHARACTER_PART_ASSETS.faces[config.gender]?.[activeExpr];
  const weaponKey = config.weapon && config.weapon !== 'none' ? config.weapon : null;
  const weaponPng = weaponKey ? CHARACTER_PART_ASSETS.weapons[weaponKey] : undefined;

  const getHairPngFilter = (hex: string): string | undefined => {
    switch (hex) {
      case '#DCE5F0':
        return 'grayscale(1) brightness(1.95) contrast(0.92)';
      case '#E3B24C':
        return 'sepia(1) saturate(2.6) hue-rotate(8deg) brightness(1.45)';
      case '#C84332':
        return 'sepia(1) saturate(3.2) hue-rotate(-32deg) brightness(1.12)';
      case '#3B82C4':
        return 'sepia(1) saturate(2.8) hue-rotate(175deg) brightness(1.15)';
      case '#2B8A6E':
        return 'sepia(1) saturate(2.6) hue-rotate(115deg) brightness(1.12)';
      case '#8B5CF6':
        return 'sepia(1) saturate(3.0) hue-rotate(225deg) brightness(1.18)';
      case '#EC7FA9':
        return 'sepia(1) saturate(2.4) hue-rotate(295deg) brightness(1.42)';
      default:
        return undefined;
    }
  };
  const hairFilter = getHairPngFilter(config.hairColor);
  const outfitFilter =
    config.outfit === 'luyen_dan' ? 'hue-rotate(-38deg) saturate(1.85) brightness(0.88)' : undefined;

  const isRunning = motionState === 'run';
  const isIdle = motionState === 'idle';
  const shadowScale = Math.max(0.75, 1 - bouncePx * 0.025);
  const capeSwayDeg = isRunning ? (facingLeft ? 9 : -9) + Math.sin(bouncePx * 0.9) * 5 : 0;

  return (
    <div
      className={`relative select-none pointer-events-none ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        transformOrigin: 'bottom center',
      }}
    >
      {/* LAYER 1: Ground Shadow (tightly anchored at feet, shrinks slightly on stride bounce) */}
      <div
        className="absolute left-1/2 bottom-[3%] -translate-x-1/2 rounded-full bg-black/42 blur-[2px] transition-transform duration-75"
        style={{
          width: `${Math.round(size * 0.54)}px`,
          height: `${Math.round(size * 0.14)}px`,
          transform: `scale(${shadowScale.toFixed(3)})`,
        }}
      />

      {/* LAYER 2: Foot Magic Ring (existing transparent PNG from vfx_rings, 2.5D flattened) */}
      {ringPreset && (
        <div
          className="absolute left-1/2 bottom-[-4%] -translate-x-1/2"
          style={{
            width: `${Math.round(size * 0.95)}px`,
            height: `${Math.round(size * 0.95)}px`,
            transform: 'scaleY(0.42)',
            transformOrigin: 'center center',
            opacity: 0.88,
          }}
        >
          <img
            src={ringPreset.transparentUrl}
            alt=""
            draggable={false}
            className="w-full h-full object-contain animate-[spin_14s_linear_infinite]"
          />
        </div>
      )}

      {/* CHARACTER BODY RIG (anchored bottom-center; applies flip, tilt, bounce, squash/stretch & idle breathe) */}
      <div
        className={`absolute inset-0 ${
          isIdle ? 'animate-chibi-breathe' : ''
        } ${motionState === 'hit' ? 'animate-combat-shake' : ''}`}
        style={{
          transformOrigin: 'bottom center',
          transform: `translateY(${-bouncePx.toFixed(1)}px) rotate(${tiltDeg.toFixed(2)}deg) scale(${(
            (facingLeft ? -1 : 1) * squashX
          ).toFixed(3)}, ${squashY.toFixed(3)})`,
        }}
      >
        {bodyPng ? (
          /* REAL PNG PAPER DOLL STACK (256x320 unified alignment) */
          <div className="absolute inset-0">
            {!facingBack && backHairPng && (
              <img
                src={backHairPng}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain transition-transform duration-150"
                style={{
                  transformOrigin: '50% 42%',
                  transform: `rotate(${(capeSwayDeg * 0.45).toFixed(1)}deg)`,
                  filter: hairFilter,
                }}
              />
            )}
            <img
              src={bodyPng}
              alt=""
              draggable={false}
              className="absolute inset-0 w-full h-full object-contain"
            />
            {outfitPng && (
              <img
                src={outfitPng}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain"
                style={{ filter: outfitFilter }}
              />
            )}
            {!facingBack && facePng && (
              <img
                src={facePng}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain"
                style={{
                  transformOrigin: '52% 30%',
                  transform: isBlinking ? 'scaleY(0.95)' : 'scaleY(1)',
                  filter: isBlinking ? 'brightness(0.97)' : undefined,
                  transition: 'transform 60ms ease-in-out',
                }}
              />
            )}
            {frontHairPng && (
              <img
                src={frontHairPng}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain"
                style={{ filter: hairFilter }}
              />
            )}
            {weaponPng && (
              <img
                src={weaponPng}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain"
                style={{
                  transform:
                    motionState === 'attack'
                      ? 'translate(8px, -6px) rotate(14deg)'
                      : 'translateY(0px)',
                  transition: 'transform 150ms ease-out',
                }}
              />
            )}
          </div>
        ) : (
          <>
        {/* LAYER 3: Back Hair & Flowing Cape (lags slightly when running) */}
        <div
          className="absolute inset-0 transition-transform duration-150"
          style={{
            transformOrigin: '50% 42%',
            transform: `rotate(${capeSwayDeg.toFixed(1)}deg)`,
          }}
        >
          {backHairPng ? (
            <img
              src={backHairPng}
              alt=""
              draggable={false}
              className="w-full h-full object-contain"
            />
          ) : (
            <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible">
              {/* Flowing cape / robe tail */}
              <path
                d="M42 68 Q34 94 26 106 Q60 112 94 106 Q86 94 78 68 Z"
                fill={outfitMeta.cape}
                stroke="#1E1B18"
                strokeWidth="2"
              />
              {/* Back Hair silhouette */}
              {config.gender === 'female' ? (
                config.hairStyle === 0 ? (
                  <path
                    d="M32 38 Q26 70 30 94 Q60 100 90 94 Q94 70 88 38 Z"
                    fill={config.hairColor}
                    stroke="#1C1917"
                    strokeWidth="2.2"
                  />
                ) : config.hairStyle === 1 ? (
                  <>
                    <ellipse cx="30" cy="60" rx="9" ry="24" fill={config.hairColor} stroke="#1C1917" strokeWidth="2" />
                    <ellipse cx="90" cy="60" rx="9" ry="24" fill={config.hairColor} stroke="#1C1917" strokeWidth="2" />
                    <circle cx="60" cy="40" r="27" fill={config.hairColor} stroke="#1C1917" strokeWidth="2.2" />
                  </>
                ) : config.hairStyle === 2 ? (
                  <>
                    <circle cx="34" cy="24" r="11" fill={config.hairColor} stroke="#1C1917" strokeWidth="2" />
                    <circle cx="86" cy="24" r="11" fill={config.hairColor} stroke="#1C1917" strokeWidth="2" />
                    <path d="M34 42 Q32 76 38 88 Q60 94 82 88 Q88 76 86 42 Z" fill={config.hairColor} stroke="#1C1917" strokeWidth="2" />
                  </>
                ) : (
                  <path
                    d="M32 36 Q24 58 28 76 Q60 84 92 76 Q96 58 88 36 Z"
                    fill={config.hairColor}
                    stroke="#1C1917"
                    strokeWidth="2.2"
                  />
                )
              ) : config.hairStyle === 1 ? (
                /* Male high ponytail */
                <>
                  <path d="M52 14 Q74 6 88 34 Q82 54 74 44 Q72 24 56 22 Z" fill={config.hairColor} stroke="#1C1917" strokeWidth="2" />
                  <circle cx="60" cy="40" r="26" fill={config.hairColor} stroke="#1C1917" strokeWidth="2.2" />
                </>
              ) : (
                <path
                  d="M34 38 Q30 62 36 74 Q60 80 84 74 Q90 62 86 38 Z"
                  fill={config.hairColor}
                  stroke="#1C1917"
                  strokeWidth="2.2"
                />
              )}
            </svg>
          )}
        </div>

        {/* LAYER 4: Base Chibi Body (Male / Female proportions) */}
        <div className="absolute inset-0">
          {bodyPng ? (
            <img src={bodyPng} alt="" draggable={false} className="w-full h-full object-contain" />
          ) : (
            <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible">
              {/* Feet / Boots */}
              <ellipse cx="48" cy="109" rx="7.5" ry="5" fill="#2A2420" stroke="#181412" strokeWidth="1.8" />
              <ellipse cx="72" cy="109" rx="7.5" ry="5" fill="#2A2420" stroke="#181412" strokeWidth="1.8" />
              {/* Torso base */}
              <path
                d={
                  config.gender === 'female'
                    ? 'M45 68 Q40 88 38 104 Q60 109 82 104 Q80 88 75 68 Z'
                    : 'M42 67 Q39 88 41 104 Q60 108 79 104 Q81 88 78 67 Z'
                }
                fill="#FCE3CF"
                stroke="#1E1B18"
                strokeWidth="2"
              />
              {/* Head */}
              <ellipse
                cx="60"
                cy="44"
                rx={config.gender === 'female' ? 23.5 : 24.5}
                ry="22.5"
                fill="#FFE6D3"
                stroke="#2C221D"
                strokeWidth="2.2"
              />
              {/* Ears */}
              <circle cx="36" cy="46" r="4" fill="#FFE0C8" stroke="#2C221D" strokeWidth="1.6" />
              <circle cx="84" cy="46" r="4" fill="#FFE0C8" stroke="#2C221D" strokeWidth="1.6" />
            </svg>
          )}
        </div>

        {/* LAYER 5: Outfit (4 starter Xianxia robes) */}
        <div className="absolute inset-0">
          {outfitPng ? (
            <img src={outfitPng} alt="" draggable={false} className="w-full h-full object-contain" />
          ) : (
            <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible">
              {/* Sleeves */}
              <path
                d="M44 70 L28 84 Q32 92 40 88 L46 78 Z"
                fill={outfitMeta.primary}
                stroke="#1E1B18"
                strokeWidth="2"
              />
              <path
                d="M76 70 L92 84 Q88 92 80 88 L74 78 Z"
                fill={outfitMeta.primary}
                stroke="#1E1B18"
                strokeWidth="2"
              />
              {/* Main Robe */}
              <path
                d={
                  config.gender === 'female'
                    ? 'M44 67 Q37 88 34 105 Q60 111 86 105 Q83 88 76 67 Z'
                    : 'M42 66 Q38 88 39 105 Q60 109 81 105 Q82 88 78 66 Z'
                }
                fill={outfitMeta.primary}
                stroke="#1E1B18"
                strokeWidth="2.1"
              />
              {/* Cross-collar lapel */}
              {!facingBack && (
                <>
                  <path d="M48 66 L62 84 L55 86 L44 70 Z" fill={outfitMeta.secondary} stroke="#1E1B18" strokeWidth="1.4" />
                  <path d="M72 66 L58 84 L65 86 L76 70 Z" fill={outfitMeta.secondary} stroke="#1E1B18" strokeWidth="1.4" />
                </>
              )}
              {/* Waist Sash & Gold Trim */}
              <rect x="41" y="81" width="38" height="6.5" rx="2.5" fill={outfitMeta.secondary} stroke="#1E1B18" strokeWidth="1.5" />
              <circle cx="60" cy="84.2" r="3.6" fill={outfitMeta.trim} stroke="#1E1B18" strokeWidth="1.3" />
              {/* Center hanging ribbon */}
              <path d="M57 88 L55 106 L60 103 L65 106 L63 88 Z" fill={outfitMeta.trim} stroke="#1E1B18" strokeWidth="1.2" />
              {/* Outfit-specific crest */}
              {config.outfit === 'dao_si' && !facingBack && (
                <circle cx="60" cy="75" r="3.5" fill="#1E1B18" stroke={outfitMeta.trim} strokeWidth="1.2" />
              )}
              {config.outfit === 'kiem_khach' && (
                <path d="M78 58 L98 36 L101 39 L81 61 Z" fill="#CBD5E1" stroke="#1E293B" strokeWidth="1.4" />
              )}
            </svg>
          )}
        </div>

        {/* LAYER 6: Face & Reactive Expressions (hidden when facingBack; auto-blinks every 3-5s) */}
        {!facingBack && (
          <div className="absolute inset-0">
            {facePng ? (
              <img src={facePng} alt="" draggable={false} className="w-full h-full object-contain" />
            ) : (
              <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible">
                {/* Rosy cheeks */}
                <ellipse cx="44" cy="52" rx="4.2" ry="2.2" fill="#FB7185" opacity="0.38" />
                <ellipse cx="76" cy="52" rx="4.2" ry="2.2" fill="#FB7185" opacity="0.38" />

                {/* Eyes group with 120ms automatic blink */}
                <g
                  style={{
                    transformOrigin: '60px 46px',
                    transform: isBlinking ? 'scaleY(0.12)' : 'scaleY(1)',
                    transition: 'transform 60ms ease-in-out',
                  }}
                >
                  {activeExpr === 'vui_ve' && (
                    <>
                      <ellipse cx="49" cy="46" rx="4.2" ry="4.8" fill="#1E1B18" />
                      <ellipse cx="71" cy="46" rx="4.2" ry="4.8" fill="#1E1B18" />
                      <circle cx="47.5" cy="44" r="1.5" fill="#FFFFFF" />
                      <circle cx="69.5" cy="44" r="1.5" fill="#FFFFFF" />
                    </>
                  )}
                  {activeExpr === 'lanh_lung' && (
                    <>
                      <path d="M44 45 L54 46 L53 49 L45 48 Z" fill="#1E1B18" />
                      <path d="M76 45 L66 46 L67 49 L75 48 Z" fill="#1E1B18" />
                      <circle cx="48" cy="46.5" r="1.1" fill="#FFFFFF" />
                      <circle cx="71" cy="46.5" r="1.1" fill="#FFFFFF" />
                    </>
                  )}
                  {activeExpr === 'tinh_nghich' && (
                    <>
                      <ellipse cx="49" cy="46" rx="4.2" ry="4.8" fill="#1E1B18" />
                      <circle cx="47.5" cy="44" r="1.5" fill="#FFFFFF" />
                      <path d="M66 46 Q71 42 76 46" fill="none" stroke="#1E1B18" strokeWidth="2.4" strokeLinecap="round" />
                    </>
                  )}
                  {(activeExpr === 'nghiem_nghi' || activeExpr === 'quyet_tam') && (
                    <>
                      <ellipse cx="49" cy="47" rx="4" ry="4.2" fill="#1E1B18" />
                      <ellipse cx="71" cy="47" rx="4" ry="4.2" fill="#1E1B18" />
                      <circle cx="48" cy="45.5" r="1.4" fill="#FEF08A" />
                      <circle cx="70" cy="45.5" r="1.4" fill="#FEF08A" />
                      <path d="M43 40 L54 43" stroke="#1E1B18" strokeWidth="2.2" strokeLinecap="round" />
                      <path d="M77 40 L66 43" stroke="#1E1B18" strokeWidth="2.2" strokeLinecap="round" />
                    </>
                  )}
                  {activeExpr === 'ngay_tho' && (
                    <>
                      <ellipse cx="49" cy="46" rx="4.8" ry="5.5" fill="#1E1B18" />
                      <ellipse cx="71" cy="46" rx="4.8" ry="5.5" fill="#1E1B18" />
                      <circle cx="47.2" cy="43.8" r="1.9" fill="#FFFFFF" />
                      <circle cx="69.2" cy="43.8" r="1.9" fill="#FFFFFF" />
                      <circle cx="50.5" cy="48.2" r="0.9" fill="#FFFFFF" />
                      <circle cx="72.5" cy="48.2" r="0.9" fill="#FFFFFF" />
                    </>
                  )}
                  {activeExpr === 'hoang_hot' && (
                    <>
                      <path d="M44 43 L54 47 L44 50" fill="none" stroke="#1E1B18" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M76 43 L66 47 L76 50" fill="none" stroke="#1E1B18" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </>
                  )}
                </g>

                {/* Mouth */}
                {activeExpr === 'vui_ve' && (
                  <path d="M55 55 Q60 60 65 55" fill="none" stroke="#8C3B32" strokeWidth="2" strokeLinecap="round" />
                )}
                {activeExpr === 'lanh_lung' && (
                  <path d="M56 56 L64 56" stroke="#6E3B32" strokeWidth="1.9" strokeLinecap="round" />
                )}
                {activeExpr === 'tinh_nghich' && (
                  <path d="M55 55 Q60 61 66 54" fill="none" stroke="#8C3B32" strokeWidth="2.1" strokeLinecap="round" />
                )}
                {activeExpr === 'nghiem_nghi' && (
                  <path d="M56 57 Q60 54 64 57" fill="none" stroke="#6E3B32" strokeWidth="2" strokeLinecap="round" />
                )}
                {activeExpr === 'ngay_tho' && (
                  <circle cx="60" cy="56.5" r="2.2" fill="#D9777F" />
                )}
                {activeExpr === 'quyet_tam' && (
                  <path d="M54 55 Q60 61 66 55 Z" fill="#991B1B" stroke="#450A0A" strokeWidth="1.2" />
                )}
                {activeExpr === 'hoang_hot' && (
                  <ellipse cx="60" cy="56.5" rx="3.4" ry="4" fill="#991B1B" stroke="#450A0A" strokeWidth="1.2" />
                )}
              </svg>
            )}
          </div>
        )}

        {/* LAYER 7: Front Hair / Bangs (4 styles per gender, tinted with hairColor; covers head in back view) */}
        <div className="absolute inset-0">
          {frontHairPng ? (
            <img src={frontHairPng} alt="" draggable={false} className="w-full h-full object-contain" />
          ) : (
            <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible">
              {facingBack ? (
                /* Back-of-head hair crown covering nape */
                <>
                  <circle cx="60" cy="43" r="25" fill={config.hairColor} stroke="#1C1917" strokeWidth="2.2" />
                  <path d="M44 30 Q60 22 76 30" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2.2" strokeLinecap="round" />
                </>
              ) : (
                <>
                  {/* Hair crown */}
                  <path
                    d="M34 42 Q34 18 60 17 Q86 18 86 42 Q76 31 60 32 Q44 31 34 42 Z"
                    fill={config.hairColor}
                    stroke="#1C1917"
                    strokeWidth="2.1"
                  />
                  {/* Bangs variations (0..3) */}
                  {config.hairStyle === 0 && (
                    <path
                      d="M37 36 L44 45 L49 35 L58 46 L64 35 L73 45 L83 36 Q72 24 60 24 Q48 24 37 36 Z"
                      fill={config.hairColor}
                      stroke="#1C1917"
                      strokeWidth="1.8"
                    />
                  )}
                  {config.hairStyle === 1 && (
                    <path
                      d="M36 38 Q48 28 60 44 Q72 28 84 38 Q75 23 60 23 Q45 23 36 38 Z"
                      fill={config.hairColor}
                      stroke="#1C1917"
                      strokeWidth="1.8"
                    />
                  )}
                  {config.hairStyle === 2 && (
                    <>
                      <path
                        d="M37 37 Q60 43 83 37 Q76 23 60 23 Q44 23 37 37 Z"
                        fill={config.hairColor}
                        stroke="#1C1917"
                        strokeWidth="1.8"
                      />
                      {/* Topknot / Jade hairpin */}
                      <circle cx="60" cy="14" r="6.5" fill={config.hairColor} stroke="#1C1917" strokeWidth="1.8" />
                      <line x1="48" y1="14" x2="72" y2="14" stroke="#F0C45A" strokeWidth="2.4" strokeLinecap="round" />
                    </>
                  )}
                  {config.hairStyle === 3 && (
                    <path
                      d="M35 42 Q42 26 60 25 Q78 26 85 42 L76 34 L66 43 L54 34 L43 43 Z"
                      fill={config.hairColor}
                      stroke="#1C1917"
                      strokeWidth="1.8"
                    />
                  )}
                  {/* Soft specular hair highlight */}
                  <path
                    d="M45 26 Q60 21 75 26"
                    fill="none"
                    stroke="rgba(255,255,255,0.32)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </>
              )}
            </svg>
          )}
        </div>
          </>
        )}
      </div>

      {/* LAYER 8: Body Aura VFX (existing transparent vfx_auras, subtly offset so face stays crisp) */}
      {showVfx && config.auraId > 0 && (
        <div
          className="pointer-events-none absolute left-1/2 bottom-[8%] -translate-x-1/2"
          style={{ opacity: 0.78 }}
        >
          <CharacterAuraVFX
            auraId={config.auraId}
            characterHeight={Math.round(size * 0.68)}
            intensity={0.85}
            showParticles={false}
          >
            <div style={{ width: `${Math.round(size * 0.62)}px`, height: `${Math.round(size * 0.68)}px` }} />
          </CharacterAuraVFX>
        </div>
      )}
    </div>
  );
};
