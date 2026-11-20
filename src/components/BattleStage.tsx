import React from 'react';
import { ELEMENT_META } from '../data/constants';
import { ElementType, SkillDef, SpiritRootGrade } from '../types/game';
import { formatNum, getElementRelation } from '../utils/gameLogic';
import { getVfxRingIndexForRealm, getVfxRingPreset } from '../data/vfxRings';
import { DisciplePortrait, ElementSeal, EnemyUnitSprite, SkillIcon } from './ElementIcons';
import { ChevronDown, Shield } from 'lucide-react';

/**
 * Sprite asset checklist for BattleStage (all currently wired to transparent PNGs):
 * - Allies (4x4 animated chibi sheets): ./assets/sprites/characters/*_sheet.png
 *   (diep_thanh_van, kim_nu, thuy_nam, to_bang_tam, moc_nam, lam_thanh_dao, tieu_xich_viem, hoa_nu, tho_nam, tho_nu)
 * - Legendary Bosses: ./assets/sprites/bosses/boss_{cuu_vi,huyen_vu,kiem_ma,ma_long}.png
 * - Secret Realm Monsters: ./assets/sprites/monsters/e1.png .. e15.png
 * - Spirit Vein Guardians: ./assets/sprites/guardians/vg1.png .. vg10.png
 * - Transparent VFX impact/ground rings: ./assets/vfx_rings/transparent/ring_01.png .. ring_16.png
 * If any custom enemy/boss ID is added later without a matching PNG, EnemyUnitSprite renders a clean emblem fallback.
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
  targetIds: string[];
  element: ElementType;
  vfxType: SkillDef['vfxType'];
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

// 2.5D Curved Formation (2 front row, 3 back row) for Allies (left)
const ALLY_SLOTS: FormationCoord[] = [
  { x: 32, y: 46 }, // Front top
  { x: 34, y: 69 }, // Front bottom
  { x: 17, y: 36 }, // Back top
  { x: 14, y: 57 }, // Back mid
  { x: 19, y: 78 }, // Back bottom
];

// 2.5D Curved Formation (2 front row, 3 back row) for Enemies (right)
const ENEMY_SLOTS: FormationCoord[] = [
  { x: 68, y: 46 }, // Front top
  { x: 66, y: 69 }, // Front bottom
  { x: 83, y: 36 }, // Back top
  { x: 86, y: 57 }, // Back mid
  { x: 81, y: 78 }, // Back bottom
];

const SINGLE_BOSS_SLOT: FormationCoord = { x: 74, y: 57 };

export function getUnitHomeCoord(unit: StageCombatUnit, indexInTeam: number, teamSize: number): FormationCoord {
  if (unit.isAlly) {
    if (teamSize === 1) return { x: 26, y: 57 };
    if (teamSize === 2) return indexInTeam === 0 ? { x: 29, y: 47 } : { x: 29, y: 69 };
    if (teamSize === 3) {
      const map3 = [
        { x: 32, y: 57 },
        { x: 17, y: 42 },
        { x: 18, y: 72 },
      ];
      return map3[indexInTeam] || ALLY_SLOTS[indexInTeam % ALLY_SLOTS.length];
    }
    return ALLY_SLOTS[indexInTeam % ALLY_SLOTS.length];
  }

  // Enemies
  if (teamSize === 1) return SINGLE_BOSS_SLOT;
  if (teamSize === 2) return indexInTeam === 0 ? { x: 71, y: 47 } : { x: 71, y: 69 };
  if (teamSize === 3) {
    const map3 = [
      { x: 68, y: 57 },
      { x: 83, y: 42 },
      { x: 82, y: 72 },
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
  const allPositioned = [
    ...allies.map((u, i) => ({ unit: u, idx: i, home: getUnitHomeCoord(u, i, allies.length) })),
    ...enemies.map((u, i) => ({ unit: u, idx: i, home: getUnitHomeCoord(u, i, enemies.length) })),
  ];

  const moveDurClass = fastMode ? 'duration-150' : 'duration-250';

  return (
    <div
      className={`relative flex-1 w-full overflow-hidden select-none ${
        screenShake ? 'animate-combat-shake' : ''
      }`}
    >
      {/* Bright, crisp 2.5D Xianxia Arena Backdrop (NO dark dimming veil) */}
      <img
        src="./assets/aistudio/1_80f8120e.png"
        alt="Lôi Đài Thanh Vân Tiên Tông"
        draggable={false}
        className="pointer-events-none absolute inset-0 w-full h-full object-cover object-center scale-[1.06] brightness-105 contrast-[1.03]"
      />
      {/* Gentle atmospheric vignette only at outer edges so center arena stays bright & legible */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 76% 68% at 50% 56%, rgba(255,248,225,0.06) 0%, rgba(16,28,26,0.22) 72%, rgba(10,18,18,0.52) 100%)',
        }}
      />
      {/* Subtle 2.5D Arena Courtyard Ground Ring */}
      <div
        className="pointer-events-none absolute left-1/2 top-[59%] -translate-x-1/2 -translate-y-1/2 w-[78%] max-w-[920px] h-[52%] rounded-[50%] border-2 border-[#FCE6A6]/30"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(252,230,166,0.12) 0%, rgba(201,164,92,0.05) 60%, transparent 78%)',
          boxShadow: 'inset 0 0 40px rgba(252,230,166,0.14)',
        }}
      />

      {/* Non-blocking Skill Callout Ribbon at Upper-Center when an Ultimate or Combo triggers */}
      {actionAnim && (actionAnim.phase === 'callout' || actionAnim.phase === 'move' || actionAnim.phase === 'impact') && (
        <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-[900] flex flex-col items-center">
          <div
            className="flex items-center gap-2.5 px-4 py-1.5 rounded-full border-2 shadow-2xl backdrop-blur-xs"
            style={{
              backgroundColor: 'rgba(14, 28, 27, 0.86)',
              borderColor: ELEMENT_META[actionAnim.element].border,
              boxShadow: `0 0 26px ${ELEMENT_META[actionAnim.element].color}88`,
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

      {/* 2.5D Units Layer (Depth-sorted by Y-coordinate!) */}
      <div className="relative w-full h-full max-w-[1220px] mx-auto">
        {allPositioned.map(({ unit: u, idx, home }) => {
          const dead = u.hp <= 0;
          const isTurn = activeUnitId === u.id && !dead;
          const isActing = actionAnim?.casterId === u.id;
          const isHit = hitUnitIds.includes(u.id);
          const isSelected = !u.isAlly && selectedTargetId === u.id && !dead;
          const isNextCombo = u.isAlly && nextComboElement === u.element && !dead;
          const isGiantBoss = !u.isAlly && enemies.length === 1 && u.isBoss;
          const elemMeta = ELEMENT_META[u.element];

          // Live position: dash to target if melee/single-target, else stay at home formation slot
          const curX = isActing && actionAnim?.dashTo ? actionAnim.dashTo.x : home.x;
          const curY = isActing && actionAnim?.dashTo ? actionAnim.dashTo.y : home.y;
          const leapY = isActing && actionAnim?.leapY ? actionAnim.leapY : 0;

          // Automatic 2.5D Y-depth z-index (lower rows always render in front of upper rows)
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

          // Knockback direction: enemies recoil right (+16px), allies recoil left (-16px)
          const knockbackX = isHit ? (u.isAlly ? -16 : 16) : 0;

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
                transform: `translate(-50%, -62%) translate(${knockbackX}px, ${leapY}px)`,
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
                  <span className="px-1.5 py-0.5 rounded bg-[#B91C1C]/90 border border-[#FCA5A5] text-[9px] font-bold text-white shadow">
                    MỤC TIÊU
                    {relToActive === 'counter' ? ' · KHẮC +35%' : relToActive === 'resisted' ? ' · -20%' : ''}
                  </span>
                  <ChevronDown className="w-5 h-5 text-[#EF4444] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] -mt-1" />
                </div>
              )}

              {/* Compact Overhead Unit Name + HP / Shield / MP Widget */}
              <div className="pointer-events-none mb-1 flex flex-col items-center z-20">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#101E1D]/82 border border-[#D4B06A]/45 shadow text-[10px] font-bold text-[#FAF2DE] whitespace-nowrap">
                  <ElementSeal element={u.element} size="xs" />
                  <span className="max-w-[96px] truncate">{u.name}</span>
                  {isNextCombo && (
                    <span className="w-2 h-2 rounded-full bg-[#FDE047] animate-ping" title="Sẵn sàng Liên Hoàn!" />
                  )}
                </div>

                {/* Slim HP + Shield Bar */}
                <div className={`mt-0.5 ${isGiantBoss ? 'w-32' : 'w-20 sm:w-24'} space-y-0.5`}>
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

                  {/* Slim Blue MP Bar (for Allies) */}
                  {u.isAlly && (
                    <div className="h-1 rounded-full bg-[#091212]/85 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] transition-all duration-300"
                        style={{ width: `${mpPct}%` }}
                      />
                    </div>
                  )}

                  {/* Shield badge if active */}
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

              {/* Character Sprite + Ground Positioning Ring + Impact VFX */}
              <div className="relative flex items-end justify-center">
                {/* Ground Contact Shadow */}
                <div
                  className={`pointer-events-none absolute -bottom-1.5 rounded-[50%] bg-black/45 blur-[3px] ${
                    isGiantBoss ? 'w-36 h-8' : 'w-16 h-4'
                  }`}
                />

                {/* Ground Element Positioning Ring (glows brighter on active turn or target lock) */}
                <div
                  className={`pointer-events-none absolute -bottom-2.5 rounded-[50%] transition-all duration-200 ${
                    isGiantBoss ? 'w-44 h-12' : 'w-20 sm:w-24 h-6 sm:h-7'
                  }`}
                  style={{
                    border: `${isTurn || isSelected ? 2.5 : 1.5}px solid ${
                      isSelected ? '#EF4444' : isTurn ? '#FDE047' : elemMeta.color
                    }`,
                    boxShadow: isSelected
                      ? '0 0 18px rgba(239,68,68,0.85), inset 0 0 10px rgba(239,68,68,0.45)'
                      : isTurn
                        ? `0 0 20px ${elemMeta.color}, inset 0 0 12px rgba(253,224,71,0.5)`
                        : `0 0 10px ${elemMeta.color}88`,
                    background: isSelected
                      ? 'radial-gradient(ellipse at center, rgba(239,68,68,0.28) 0%, transparent 72%)'
                      : isTurn
                        ? 'radial-gradient(ellipse at center, rgba(253,224,71,0.28) 0%, transparent 72%)'
                        : `radial-gradient(ellipse at center, ${elemMeta.color}22 0%, transparent 72%)`,
                  }}
                />

                {/* Subtle Transparent VFX Ring beneath high-realm Allies on their turn */}
                {allyGroundRing && isTurn && (
                  <img
                    src={allyGroundRing.transparentUrl}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="pointer-events-none absolute -bottom-9 w-28 h-28 object-contain opacity-85 animate-spin"
                    style={{ transform: 'scaleY(0.4)', animationDuration: '9s' }}
                  />
                )}

                {/* Sprite Body with Phase-Staggered Idle Breathing & Hit Flash */}
                <div
                  className={`relative z-10 ${!isActing && !isHit ? 'animate-combat-breathe' : ''}`}
                  style={{
                    animationDelay: `${(idx * 0.37) % 2.1}s`,
                    filter: isHit
                      ? 'brightness(2.5) saturate(0.4) drop-shadow(0 0 14px #FFFFFF)'
                      : isTurn
                        ? `drop-shadow(0 0 10px ${elemMeta.color}) drop-shadow(0 6px 8px rgba(0,0,0,0.45))`
                        : 'drop-shadow(0 6px 8px rgba(0,0,0,0.48))',
                  }}
                >
                  {u.isAlly ? (
                    <DisciplePortrait
                      discipleId={u.id}
                      name={u.name}
                      glyph={u.glyph}
                      element={u.element}
                      realmIndex={u.realmIndex}
                      spiritRoot={u.spiritRoot}
                      size="lg"
                      fullBody
                      animMode={isActing && (actionAnim?.phase === 'move' || actionAnim?.phase === 'impact') ? 'attack' : 'idle'}
                      className="!w-20 !h-20 sm:!w-24 sm:!h-24"
                    />
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
                            ? 'w-36 h-36 sm:w-48 sm:h-48'
                            : 'w-20 h-20 sm:w-24 sm:h-24'
                        }
                      />
                    </div>
                  )}
                </div>

                {/* On-Target Skill Impact VFX Burst (Transparent RGBA PNG Ring + Glow) */}
                {hasImpactHere && impactRingPreset && (
                  <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                    <img
                      src={impactRingPreset.transparentUrl}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      className={`animate-combat-impact object-contain ${
                        isGiantBoss ? 'w-56 h-56' : 'w-32 h-32'
                      }`}
                      style={{
                        filter: `drop-shadow(0 0 16px ${ELEMENT_META[impactVfx!.element].color})`,
                      }}
                    />
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
