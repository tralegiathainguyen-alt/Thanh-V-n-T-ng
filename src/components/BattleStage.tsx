import React from 'react';
import { ELEMENT_META } from '../data/constants';
import { ElementType, SkillDef, SpiritRootGrade } from '../types/game';
import { formatNum, getElementRelation } from '../utils/gameLogic';
import { getVfxRingIndexForRealm, getVfxRingPreset } from '../data/vfxRings';
import { getVfxAuraIndexForRealm } from '../data/vfxAuras';
import { CharacterAuraVFX } from './CharacterAuraVFX';
import { DisciplePortrait, ElementSeal, EnemyUnitSprite, SkillIcon } from './ElementIcons';
import { ChevronDown, Shield } from 'lucide-react';

/**
 * Sprite & Arena asset checklist for BattleStage:
 * - Boss Arena Backgrounds:
 *   - boss_kiem_ma:  ./assets/arenas/arena_boss_kiem_ma.jpg  (Kiếm Trủng Hoang Cổ)
 *   - boss_cuu_vi:   ./assets/arenas/arena_boss_cuu_vi.jpg   (Xích Viêm Thanh Hồ Điện)
 *   - boss_huyen_vu: ./assets/arenas/arena_boss_huyen_vu.jpg (Bắc Hải Huyền Vũ Đảo)
 *   - boss_ma_long:  ./assets/arenas/arena_boss_ma_long.jpg  (Xích Diễm Long Uyên Đài)
 * - Allies (4x4 animated chibi sheets): ./assets/sprites/characters/*_sheet.png
 * - Bosses / Monsters / Guardians: ./assets/sprites/{bosses,monsters,guardians}/*.png
 * - Transparent VFX ground rings: ./assets/vfx_rings/transparent/ring_01.png .. ring_16.png
 * - Seamless 3D helical body ribbons: ./assets/vfx_ribbons/ribbon_01.png .. ribbon_12.png
 */

export interface StageCombatUnit {
  id: string;
  name: string;
  isAlly: boolean;
  element: ElementType;
  glyph: string;
  realmLabel: string;
  realmIndex?: number;
  spiritRoot?: SpiritRootGrade;
  maxHp: number;
  hp: number;
  shield: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
  critDmg: number;
  elemBonus: number;
  isBoss?: boolean;
  skills: SkillDef[];
}

export interface StageFloatingText {
  id: number;
  unitId: string;
  text: string;
  subText?: string;
  color: string;
  isCrit?: boolean;
}

export interface StageImpactVfx {
  id: number;
  casterId: string;
  targetIds: string[];
  element: ElementType;
  vfxType: SkillDef['vfxType'];
  targetType: SkillDef['target'];
  isAoE: boolean;
}

export interface StageActionAnim {
  casterId: string;
  phase: 'callout' | 'move' | 'impact' | 'return';
  skillName: string;
  skillId: string;
  element: ElementType;
  isCombo: boolean;
  comboChain: number;
  dashTo?: { x: number; y: number } | null;
  leapY?: number;
}

export interface FormationCoord {
  x: number; // % left
  y: number; // % top
}

const BOSS_ARENA_BG: Record<string, string> = {
  boss_kiem_ma: './assets/arenas/arena_boss_kiem_ma.jpg',
  boss_cuu_vi: './assets/arenas/arena_boss_cuu_vi.jpg',
  boss_huyen_vu: './assets/arenas/arena_boss_huyen_vu.jpg',
  boss_ma_long: './assets/arenas/arena_boss_ma_long.jpg',
};

function resolveArenaBackdrop(mode: 'realm' | 'boss' | 'vein', bossId?: string): string {
  if (mode === 'boss' && bossId && BOSS_ARENA_BG[bossId]) {
    return BOSS_ARENA_BG[bossId];
  }
  if (mode === 'realm') {
    return './assets/arenas/arena_boss_kiem_ma.jpg';
  }
  return './assets/aistudio/1_80f8120e.png';
}

// 2.5D Curved Formation (2 front row, 3 back row) — coordinates represent FEET position squarely on the stone floor!
const ALLY_SLOTS: FormationCoord[] = [
  { x: 39, y: 65 }, // Front top
  { x: 41, y: 78 }, // Front bottom
  { x: 28, y: 61 }, // Back top
  { x: 25, y: 72 }, // Back mid
  { x: 30, y: 83 }, // Back bottom
];

// 2.5D Curved Formation (2 front row, 3 back row) for Enemies (right side of stone floor)
const ENEMY_SLOTS: FormationCoord[] = [
  { x: 61, y: 65 }, // Front top
  { x: 59, y: 78 }, // Front bottom
  { x: 72, y: 61 }, // Back top
  { x: 75, y: 72 }, // Back mid
  { x: 70, y: 83 }, // Back bottom
];

const SINGLE_BOSS_SLOT: FormationCoord = { x: 68, y: 75 };

export function getUnitHomeCoord(unit: StageCombatUnit, indexInTeam: number, teamSize: number): FormationCoord {
  if (unit.isAlly) {
    if (teamSize === 1) return { x: 34, y: 73 };
    if (teamSize === 2) return indexInTeam === 0 ? { x: 35, y: 65 } : { x: 36, y: 79 };
    if (teamSize === 3) {
      const map3 = [
        { x: 40, y: 72 },
        { x: 27, y: 64 },
        { x: 29, y: 80 },
      ];
      return map3[indexInTeam] || ALLY_SLOTS[indexInTeam % ALLY_SLOTS.length];
    }
    return ALLY_SLOTS[indexInTeam % ALLY_SLOTS.length];
  }

  if (teamSize === 1) return SINGLE_BOSS_SLOT;
  if (teamSize === 2) return indexInTeam === 0 ? { x: 65, y: 65 } : { x: 64, y: 79 };
  if (teamSize === 3) {
    const map3 = [
      { x: 60, y: 72 },
      { x: 73, y: 64 },
      { x: 71, y: 80 },
    ];
    return map3[indexInTeam] || ENEMY_SLOTS[indexInTeam % ENEMY_SLOTS.length];
  }
  return ENEMY_SLOTS[indexInTeam % ENEMY_SLOTS.length];
}

const ELEMENT_RING_ID: Record<ElementType, number> = {
  Kim: 6,
  Moc: 4,
  Thuy: 3,
  Hoa: 15,
  Tho: 13,
};

interface BattleStageProps {
  mode: 'realm' | 'boss' | 'vein';
  bossId?: string;
  allies: StageCombatUnit[];
  enemies: StageCombatUnit[];
  activeUnitId?: string;
  activeUnitElement?: ElementType;
  activeUnitIsAlly?: boolean;
  selectedTargetId: string;
  nextComboElement: ElementType | null;
  actionAnim: StageActionAnim | null;
  hitUnitIds: string[];
  impactVfx: StageImpactVfx | null;
  floatingTexts: StageFloatingText[];
  screenShake: boolean;
  fastMode: boolean;
  onSelectTarget: (enemyId: string) => void;
}

export const BattleStage: React.FC<BattleStageProps> = ({
  mode,
  bossId,
  allies,
  enemies,
  activeUnitId,
  activeUnitElement,
  activeUnitIsAlly,
  selectedTargetId,
  nextComboElement,
  actionAnim,
  hitUnitIds,
  impactVfx,
  floatingTexts,
  screenShake,
  fastMode,
  onSelectTarget,
}) => {
  const arenaBgUrl = resolveArenaBackdrop(mode, bossId);

  const allPositioned = [
    ...allies.map((u, i) => ({ unit: u, idx: i, home: getUnitHomeCoord(u, i, allies.length) })),
    ...enemies.map((u, i) => ({ unit: u, idx: i, home: getUnitHomeCoord(u, i, enemies.length) })),
  ];

  // Live coordinate map (used by Skill Beam VFX overlay)
  const coordById = new Map<string, FormationCoord>();
  for (const p of allPositioned) {
    const isActing = actionAnim?.casterId === p.unit.id;
    coordById.set(p.unit.id, {
      x: isActing && actionAnim?.dashTo ? actionAnim.dashTo.x : p.home.x,
      y: isActing && actionAnim?.dashTo ? actionAnim.dashTo.y : p.home.y,
    });
  }

  const moveDurClass = fastMode ? 'duration-150' : 'duration-250';
  const casterCoord = impactVfx ? coordById.get(impactVfx.casterId) : null;

  return (
    <div
      className={`relative flex-1 w-full overflow-hidden select-none ${
        screenShake ? 'animate-combat-shake' : ''
      }`}
    >
      {/* Dedicated Per-Boss 2.5D Xianxia Arena Backdrop */}
      <img
        src={arenaBgUrl}
        alt="Lôi Đài Chiến Đấu"
        draggable={false}
        className="pointer-events-none absolute inset-0 w-full h-full object-cover object-center"
      />
      {/* Subtle outer edge vignette only — keeps arena courtyard bright & crystal clear */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 72% at 50% 58%, transparent 35%, rgba(8,14,16,0.34) 85%, rgba(6,10,12,0.58) 100%)',
        }}
      />

      {/* Non-blocking Skill Callout Ribbon at Upper-Center */}
      {actionAnim && (actionAnim.phase === 'callout' || actionAnim.phase === 'move' || actionAnim.phase === 'impact') && (
        <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-[950] flex flex-col items-center">
          <div
            className="flex items-center gap-2.5 px-4 py-1.5 rounded-full border-2 shadow-2xl backdrop-blur-xs"
            style={{
              backgroundColor: 'rgba(14, 28, 27, 0.88)',
              borderColor: ELEMENT_META[actionAnim.element].border,
              boxShadow: `0 0 28px ${ELEMENT_META[actionAnim.element].color}99`,
            }}
          >
            <SkillIcon skillId={actionAnim.skillId} name={actionAnim.skillName} className="w-7 h-7" />
            <span
              className="text-base sm:text-lg font-bold tracking-wide text-[#FFF4CE]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {actionAnim.skillName}
            </span>
            {actionAnim.isCombo && (
              <span className="px-2 py-0.5 rounded-full bg-[#F59E0B] text-[#1D1204] text-[11px] font-extrabold uppercase tracking-wider">
                Liên Hoàn x{actionAnim.comboChain}!
              </span>
            )}
          </div>
        </div>
      )}

      {/* Full-Stage Elemental Skill Projectile / Beam SVG Overlay */}
      {impactVfx && casterCoord && (
        <svg
          key={`beam_${impactVfx.id}`}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 w-full h-full z-[880]"
        >
          <defs>
            <filter id="skillGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="0.9" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {impactVfx.targetIds.map((tId, tIdx) => {
            const tc = coordById.get(tId);
            if (!tc || tId === impactVfx.casterId) return null;
            const elemColor = ELEMENT_META[impactVfx.element].color;
            const midX = (casterCoord.x + tc.x) * 0.5;
            const midY = Math.min(casterCoord.y, tc.y) - (impactVfx.isAoE ? 14 : 6) - (tIdx % 2) * 3;
            return (
              <g key={tId} filter="url(#skillGlow)">
                <path
                  d={`M ${casterCoord.x} ${casterCoord.y - 4} Q ${midX} ${midY} ${tc.x} ${tc.y - 4}`}
                  fill="none"
                  stroke={elemColor}
                  strokeWidth={impactVfx.isAoE ? '1.2' : '0.9'}
                  strokeLinecap="round"
                  className="animate-skill-beam"
                />
                <path
                  d={`M ${casterCoord.x} ${casterCoord.y - 4} Q ${midX} ${midY} ${tc.x} ${tc.y - 4}`}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="0.4"
                  strokeLinecap="round"
                  className="animate-skill-beam"
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* 2.5D Units Layer (Depth-sorted by Y-coordinate!) */}
      <div className="relative w-full h-full max-w-[1260px] mx-auto">
        {allPositioned.map(({ unit: u, idx, home }) => {
          const dead = u.hp <= 0;
          const isTurn = activeUnitId === u.id && !dead;
          const isActing = actionAnim?.casterId === u.id;
          const isHit = hitUnitIds.includes(u.id);
          const isSelected = !u.isAlly && selectedTargetId === u.id && !dead;
          const isNextCombo = u.isAlly && nextComboElement === u.element && !dead;
          const isGiantBoss = !u.isAlly && enemies.length === 1 && u.isBoss;
          const elemMeta = ELEMENT_META[u.element];

          const curX = isActing && actionAnim?.dashTo ? actionAnim.dashTo.x : home.x;
          const curY = isActing && actionAnim?.dashTo ? actionAnim.dashTo.y : home.y;
          const leapY = isActing && actionAnim?.leapY ? actionAnim.leapY : 0;

          const zIndex = Math.round(curY * 10) + (isActing ? 450 : 0) + (isHit ? 80 : 0);

          const hpPct = Math.max(0, Math.min(100, (u.hp / Math.max(1, u.maxHp)) * 100));
          const mpPct = Math.max(0, Math.min(100, (u.mp / Math.max(1, u.maxMp)) * 100));
          const shieldPct = Math.max(0, Math.min(100, (u.shield / Math.max(1, u.maxHp)) * 100));

          const relToActive =
            !u.isAlly && activeUnitIsAlly && activeUnitElement
              ? getElementRelation(activeUnitElement, u.element)
              : 'neutral';

          const unitFloats = floatingTexts.filter((f) => f.unitId === u.id);
          const hasImpactHere = Boolean(impactVfx && impactVfx.targetIds.includes(u.id));
          const impactRingPreset = impactVfx ? getVfxRingPreset(ELEMENT_RING_ID[impactVfx.element]) : null;
          const allyGroundRing =
            u.isAlly && u.realmIndex !== undefined
              ? getVfxRingPreset(getVfxRingIndexForRealm(u.realmIndex))
              : null;

          const knockbackX = isHit ? (u.isAlly ? -16 : 16) : 0;
          // Subtle 2.5D perspective depth scaling (units further back on floor are slightly smaller)
          const depthScale = isGiantBoss
            ? 1.0
            : Math.max(0.88, Math.min(1.08, 0.88 + ((curY - 58) / 26) * 0.18));

          return (
            <div
              key={u.id}
              onClick={() => {
                if (!u.isAlly && !dead) onSelectTarget(u.id);
              }}
              style={{
                left: `${curX}%`,
                top: `${curY}%`,
                zIndex,
                transform: `translate(-50%, -92%) translate(${knockbackX}px, ${leapY}px) scale(${depthScale.toFixed(3)})`,
                transformOrigin: 'bottom center',
              }}
              className={`absolute flex flex-col items-center transition-[left,top,transform,opacity] ${moveDurClass} ease-out ${
                dead
                  ? 'opacity-0 scale-75 translate-y-4 pointer-events-none duration-500'
                  : !u.isAlly
                    ? 'cursor-pointer group'
                    : ''
              }`}
            >
              {/* Red Target Lock Arrow above selected enemy */}
              {isSelected && (
                <div className="pointer-events-none -mb-1 flex flex-col items-center animate-bounce z-30">
                  <span className="px-1.5 py-0.5 rounded bg-[#B91C1C]/92 border border-[#FCA5A5] text-[9px] font-bold text-white shadow">
                    MỤC TIÊU
                    {relToActive === 'counter' ? ' · KHẮC +35%' : relToActive === 'resisted' ? ' · -20%' : ''}
                  </span>
                  <ChevronDown className="w-5 h-5 text-[#EF4444] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] -mt-1" />
                </div>
              )}

              {/* Compact Overhead Unit Name + HP / Shield / MP Widget */}
              <div className="pointer-events-none mb-1 flex flex-col items-center z-20">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#101E1D]/85 border border-[#D4B06A]/50 shadow text-[10px] font-bold text-[#FAF2DE] whitespace-nowrap">
                  <ElementSeal element={u.element} size="xs" />
                  <span className="max-w-[100px] truncate">{u.name}</span>
                  {isNextCombo && (
                    <span className="w-2 h-2 rounded-full bg-[#FDE047] animate-ping" title="Sẵn sàng Liên Hoàn!" />
                  )}
                </div>

                <div className={`mt-0.5 ${isGiantBoss ? 'w-36' : 'w-20 sm:w-24'} space-y-0.5`}>
                  <div className="relative h-2 rounded-full bg-[#091212]/90 border border-black/70 overflow-hidden shadow">
                    <div
                      className={`h-full transition-all duration-300 ${
                        u.isAlly
                          ? 'bg-gradient-to-r from-[#16A34A] to-[#4ADE80]'
                          : 'bg-gradient-to-r from-[#B91C1C] to-[#F87171]'
                      }`}
                      style={{ width: `${hpPct}%` }}
                    />
                    {shieldPct > 0 && (
                      <div
                        className="absolute inset-y-0 left-0 bg-[#FACC15]/75 transition-all duration-300"
                        style={{ width: `${shieldPct}%` }}
                      />
                    )}
                  </div>

                  {u.isAlly && (
                    <div className="h-1 rounded-full bg-[#091212]/85 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] transition-all duration-300"
                        style={{ width: `${mpPct}%` }}
                      />
                    </div>
                  )}

                  {u.shield > 0 && (
                    <div className="flex justify-center">
                      <span className="inline-flex items-center gap-0.5 px-1 rounded bg-[#78350F]/90 text-[9px] font-mono text-[#FDE68A]">
                        <Shield className="w-2.5 h-2.5" />
                        {formatNum(u.shield)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Character Sprite + Flat Horizontal Ground Ring + 3D Helical Ribbon + Elemental Impact VFX */}
              <div className="relative flex items-end justify-center">
                {/* Ground Contact Shadow */}
                <div
                  className={`pointer-events-none absolute -bottom-1.5 rounded-[50%] bg-black/50 blur-[3px] ${
                    isGiantBoss ? 'w-40 h-9' : 'w-16 h-4'
                  }`}
                />

                {/* TRUE FLAT ISOMETRIC GROUND VFX RING UNDER FEET (outer scaleY(0.40) + inner animate-spin!) */}
                {allyGroundRing && (
                  <div
                    className="pointer-events-none absolute left-1/2 -bottom-12 -translate-x-1/2 w-28 sm:w-32 h-28 sm:h-32 z-0"
                    style={{ transform: 'scaleY(0.40)' }}
                  >
                    <img
                      src={allyGroundRing.transparentUrl}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      className="w-full h-full object-contain animate-spin"
                      style={{
                        opacity: isTurn ? 0.98 : 0.78,
                        animationDuration: `${Math.max(4, Math.round(11 / Math.max(0.35, allyGroundRing.defaultSpeed)))}s`,
                        filter: `drop-shadow(0 0 ${isTurn ? 12 : 6}px ${allyGroundRing.glowRgba})`,
                      }}
                    />
                  </div>
                )}

                {/* Crisp Turn / Target Positioning Ring on Ground */}
                <div
                  className={`pointer-events-none absolute -bottom-2.5 rounded-[50%] transition-all duration-200 z-[1] ${
                    isGiantBoss ? 'w-48 h-13' : 'w-20 sm:w-24 h-6 sm:h-7'
                  }`}
                  style={{
                    border: `${isTurn || isSelected ? 2.5 : 1.2}px solid ${
                      isSelected ? '#EF4444' : isTurn ? '#FDE047' : `${elemMeta.color}99`
                    }`,
                    boxShadow: isSelected
                      ? '0 0 20px rgba(239,68,68,0.9), inset 0 0 12px rgba(239,68,68,0.45)'
                      : isTurn
                        ? `0 0 22px ${elemMeta.color}, inset 0 0 12px rgba(253,224,71,0.5)`
                        : undefined,
                    background: isSelected
                      ? 'radial-gradient(ellipse at center, rgba(239,68,68,0.28) 0%, transparent 72%)'
                      : isTurn
                        ? 'radial-gradient(ellipse at center, rgba(253,224,71,0.22) 0%, transparent 72%)'
                        : undefined,
                  }}
                />

                {/* Sprite Body with Phase-Staggered Idle Breathing, 3D Helical Ribbon & Hit Flash */}
                <div
                  className={`relative z-10 ${!isActing && !isHit ? 'animate-combat-breathe' : ''}`}
                  style={{
                    animationDelay: `${(idx * 0.37) % 2.1}s`,
                    filter: isHit
                      ? 'brightness(2.5) saturate(0.4) drop-shadow(0 0 14px #FFFFFF)'
                      : isTurn
                        ? `drop-shadow(0 0 10px ${elemMeta.color}) drop-shadow(0 6px 8px rgba(0,0,0,0.45))`
                        : 'drop-shadow(0 6px 8px rgba(0,0,0,0.5))',
                  }}
                >
                  {u.isAlly ? (
                    <CharacterAuraVFX
                      auraId={getVfxAuraIndexForRealm(u.realmIndex)}
                      characterHeight={82}
                      speed={fastMode ? 1.5 : 1.0}
                      intensity={isTurn ? 1.05 : 0.78}
                      phaseOffset={idx * 1.45}
                      showParticles={true}
                    >
                      <DisciplePortrait
                        discipleId={u.id}
                        name={u.name}
                        glyph={u.glyph}
                        element={u.element}
                        realmIndex={u.realmIndex}
                        spiritRoot={u.spiritRoot}
                        size="lg"
                        fullBody
                        hideAura
                        animMode={
                          isActing && (actionAnim?.phase === 'move' || actionAnim?.phase === 'impact')
                            ? 'attack'
                            : 'idle'
                        }
                        className="!w-20 !h-20 sm:!w-24 sm:!h-24"
                      />
                    </CharacterAuraVFX>
                  ) : (
                    <div
                      className={`transition-transform duration-150 ${
                        !dead ? 'group-hover:scale-105' : ''
                      }`}
                    >
                      <EnemyUnitSprite
                        id={u.id}
                        name={u.name}
                        element={u.element}
                        glyph={u.glyph}
                        isBoss={u.isBoss}
                        className={
                          isGiantBoss
                            ? 'w-40 h-40 sm:w-52 sm:h-52'
                            : 'w-20 h-20 sm:w-24 sm:h-24'
                        }
                      />
                    </div>
                  )}
                </div>

                {/* Dramatic On-Target Elemental Skill VFX (Slashes, Flame Pillars, Waves, Vines, Shield Dome) */}
                {hasImpactHere && impactVfx && impactRingPreset && (
                  <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                    {/* Expanding Transparent Magic Ring Impact */}
                    <img
                      src={impactRingPreset.transparentUrl}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      className={`animate-combat-impact object-contain ${
                        isGiantBoss ? 'w-56 h-56' : 'w-32 h-32'
                      }`}
                      style={{
                        filter: `drop-shadow(0 0 18px ${ELEMENT_META[impactVfx.element].color})`,
                      }}
                    />

                    {/* Element-Specific Signature Skill Graphics */}
                    {impactVfx.vfxType === 'sword' && (
                      <svg
                        viewBox="0 0 120 120"
                        className={`absolute left-1/2 top-1/2 animate-skill-slash ${
                          isGiantBoss ? 'w-52 h-52' : 'w-32 h-32'
                        }`}
                      >
                        <path
                          d="M 12 104 Q 60 54 108 12"
                          stroke="#FEF08A"
                          strokeWidth="7"
                          strokeLinecap="round"
                          fill="none"
                        />
                        <path
                          d="M 18 22 Q 62 62 104 102"
                          stroke="#F59E0B"
                          strokeWidth="5"
                          strokeLinecap="round"
                          fill="none"
                        />
                        <path
                          d="M 12 104 Q 60 54 108 12"
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          fill="none"
                        />
                      </svg>
                    )}

                    {impactVfx.vfxType === 'flame' && (
                      <div
                        className={`absolute left-1/2 bottom-0 animate-skill-pillar rounded-full ${
                          isGiantBoss ? 'w-40 h-56' : 'w-24 h-36'
                        }`}
                        style={{
                          background:
                            'radial-gradient(ellipse at 50% 80%, #FFFBEB 0%, #FACC15 26%, #F97316 55%, #DC262688 78%, transparent 100%)',
                          filter: 'blur(2px) drop-shadow(0 0 18px #F97316)',
                        }}
                      />
                    )}

                    {impactVfx.vfxType === 'wave' && (
                      <div
                        className={`absolute left-1/2 top-1/2 animate-skill-slash rounded-full border-4 border-[#38BDF8] ${
                          isGiantBoss ? 'w-48 h-48' : 'w-28 h-28'
                        }`}
                        style={{
                          background:
                            impactVfx.targetType === 'ally_heal'
                              ? 'radial-gradient(circle, rgba(74,222,128,0.45) 0%, rgba(56,189,248,0.3) 55%, transparent 75%)'
                              : 'radial-gradient(circle, rgba(224,242,254,0.6) 0%, rgba(14,165,233,0.4) 55%, transparent 75%)',
                          boxShadow: '0 0 24px #38BDF8',
                        }}
                      />
                    )}

                    {impactVfx.vfxType === 'vine' && (
                      <svg
                        viewBox="0 0 120 120"
                        className={`absolute left-1/2 top-1/2 animate-skill-slash ${
                          isGiantBoss ? 'w-48 h-48' : 'w-32 h-32'
                        }`}
                      >
                        <path
                          d="M 10 95 C 35 20, 85 100, 110 20"
                          stroke="#22C55E"
                          strokeWidth="6"
                          strokeLinecap="round"
                          fill="none"
                        />
                        <path
                          d="M 15 35 C 45 95, 80 25, 108 88"
                          stroke="#86EFAC"
                          strokeWidth="4"
                          strokeLinecap="round"
                          fill="none"
                        />
                      </svg>
                    )}

                    {impactVfx.vfxType === 'mountain' && (
                      <div
                        className={`absolute left-1/2 bottom-0 animate-skill-pillar rounded-t-full border-2 border-[#FDE047] ${
                          isGiantBoss ? 'w-44 h-44' : 'w-28 h-28'
                        }`}
                        style={{
                          background:
                            impactVfx.targetType === 'ally_shield'
                              ? 'radial-gradient(circle, rgba(254,240,138,0.48) 0%, rgba(217,119,6,0.25) 65%, transparent 80%)'
                              : 'radial-gradient(ellipse at 50% 80%, #FEF08A 0%, #D97706 50%, transparent 85%)',
                          boxShadow: '0 0 22px #F59E0B',
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Floating Combat Numbers & Status Tags */}
                {unitFloats.map((f) => (
                  <div
                    key={f.id}
                    className="pointer-events-none absolute left-1/2 -top-6 -translate-x-1/2 z-40 animate-damage-float text-center whitespace-nowrap"
                  >
                    <div
                      className={`${
                        f.isCrit ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'
                      } font-mono font-extrabold drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]`}
                      style={{ color: f.color }}
                    >
                      {f.text}
                    </div>
                    {f.subText && (
                      <div className="text-[10px] sm:text-[11px] font-extrabold text-[#FEF08A] drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                        {f.subText}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
