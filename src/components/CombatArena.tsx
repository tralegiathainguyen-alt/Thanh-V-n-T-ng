import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ELEMENT_META,
  ELEMENT_SKILLS,
  EQUIPMENT_SETS,
  RARITY_META,
  REALM_LADDER,
} from '../data/constants';
import {
  CombatContext,
  ElementType,
  EquipmentItem,
  GameState,
  GemItem,
  SkillDef,
} from '../types/game';
import {
  computeDiscipleStats,
  createGem,
  doesGenerateElement,
  formatNum,
  generateEquipment,
  getElementRelation,
  rollRarity,
} from '../utils/gameLogic';
import { sfx } from '../utils/sound';
import {
  DisciplePortrait,
  ElementSeal,
  EnemyUnitSprite,
  EquipmentSlotIcon,
  FiveElementDiagram,
  GemSprite,
  RarityFrameBox,
  ResourceIcon,
  SkillIcon,
  gemTierToRarity,
} from './ElementIcons';
import { FastForward, Play, Pause, Shield, Swords, Zap, Trophy, RotateCcw } from 'lucide-react';

interface CombatUnit {
  id: string;
  name: string;
  isAlly: boolean;
  element: ElementType;
  glyph: string;
  realmLabel: string;
  realmIndex?: number;
  spiritRoot?: import('../types/game').SpiritRootGrade;
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

interface FloatingText {
  id: number;
  unitId: string;
  text: string;
  subText?: string;
  color: string;
}

interface ActiveVfx {
  id: number;
  casterId: string;
  skillId: string;
  element: ElementType;
  skillName: string;
  comboChain: number;
  isCombo: boolean;
}

export interface BattleVictoryRewards {
  linhThach: number;
  linhThao: number;
  huyenThiet: number;
  cuongHoaThach: number;
  dotPhaDan: number;
  linhKhi: number;
  tinhHoaBoss: number;
  tienNgoc: number;
  droppedEquipment: EquipmentItem[];
  droppedGems: GemItem[];
}

interface CombatArenaProps {
  state: GameState;
  context: CombatContext;
  onFinish: (victory: boolean, rewards?: BattleVictoryRewards) => void;
  onClose: () => void;
}

export function CombatArena({ state, context, onFinish, onClose }: CombatArenaProps) {
  const initialUnits = useMemo<CombatUnit[]>(() => {
    const tangKinhLvl = state.buildings.tang_kinh_cac.level;
    const allies: CombatUnit[] = state.disciples
      .filter((d) => d.inFormation)
      .sort((a, b) => a.formationOrder - b.formationOrder)
      .slice(0, 5)
      .map((d) => {
        const st = computeDiscipleStats(d, state.inventory, state.alliance, tangKinhLvl);
        return {
          id: d.id,
          name: d.name,
          isAlly: true,
          element: d.element,
          glyph: d.avatarGlyph,
          realmLabel: REALM_LADDER[d.realmIndex]?.majorName || 'Luyện Khí',
          realmIndex: d.realmIndex,
          spiritRoot: d.spiritRoot,
          maxHp: st.hp,
          hp: st.hp,
          shield: 0,
          mp: 35,
          maxMp: 100,
          atk: st.atk,
          def: st.def,
          spd: st.spd,
          crit: st.crit,
          critDmg: st.critDmg,
          elemBonus: st.elemBonus,
          skills: ELEMENT_SKILLS[d.element],
        };
      });

    const enemies: CombatUnit[] = context.enemies.map((e) => ({
      id: e.id,
      name: e.name,
      isAlly: false,
      element: e.element,
      glyph: e.glyph,
      realmLabel: e.isBoss ? 'BOSS HUYỀN THOẠI' : 'Yêu Linh',
      maxHp: e.hp,
      hp: e.hp,
      shield: 0,
      mp: 30,
      maxMp: 100,
      atk: e.atk,
      def: e.def,
      spd: e.spd,
      crit: e.isBoss ? 22 : 12,
      critDmg: 155,
      elemBonus: 10,
      isBoss: e.isBoss,
      skills: ELEMENT_SKILLS[e.element],
    }));

    return [...allies, ...enemies];
  }, [state, context]);

  const [units, setUnits] = useState<CombatUnit[]>(initialUnits);
  const [round, setRound] = useState(1);
  const [turnQueue, setTurnQueue] = useState<string[]>(() =>
    [...initialUnits].sort((a, b) => b.spd - a.spd).map((u) => u.id),
  );
  const [turnIndex, setTurnIndex] = useState(0);
  const [selectedTargetId, setSelectedTargetId] = useState<string>(context.enemies[0]?.id || '');
  const [comboElement, setComboElement] = useState<ElementType | null>(null);
  const [comboChain, setComboChain] = useState(0);
  const [autoBattle, setAutoBattle] = useState(false);
  const [fastMode, setFastMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hitUnitIds, setHitUnitIds] = useState<string[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [activeVfx, setActiveVfx] = useState<ActiveVfx | null>(null);
  const [combatLog, setCombatLog] = useState<string[]>([
    `Khai chiến: ${context.title}! Hãy tận dụng Tương Sinh Ngũ Hành để tạo Combo Liên Hoàn.`,
  ]);
  const [battleOutcome, setBattleOutcome] = useState<{
    victory: boolean;
    rewards?: BattleVictoryRewards;
  } | null>(null);

  const unitsRef = useRef(units);
  unitsRef.current = units;

  const activeUnitId = turnQueue[turnIndex];
  const activeUnit = units.find((u) => u.id === activeUnitId && u.hp > 0);
  const allies = units.filter((u) => u.isAlly);
  const enemies = units.filter((u) => !u.isAlly);
  const aliveEnemies = enemies.filter((e) => e.hp > 0);
  const aliveAllies = allies.filter((a) => a.hp > 0);

  // Ensure selected target is always an alive enemy
  useEffect(() => {
    if (aliveEnemies.length > 0 && !aliveEnemies.some((e) => e.id === selectedTargetId)) {
      setSelectedTargetId(aliveEnemies[0].id);
    }
  }, [aliveEnemies, selectedTargetId]);

  const pushFloat = (unitId: string, text: string, color: string, subText?: string) => {
    const id = Date.now() + Math.random();
    setFloatingTexts((prev) => [...prev.slice(-8), { id, unitId, text, color, subText }]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((f) => f.id !== id));
    }, 950);
  };

  const buildRewards = (): BattleVictoryRewards => {
    const dropBonus = 1 + state.alliance.tech.dropLevel * 0.1;
    if (context.mode === 'boss' && context.bossDef) {
      const b = context.bossDef;
      const piece1 = generateEquipment({
        rarity: b.guaranteedMinRarity,
        setId: b.setId,
      });
      const piece2 = generateEquipment({
        rarity: Math.random() < 0.35 ? 'truyen_thuyet' : 'huyen_thoai',
        setId: b.setId,
      });
      return {
        linhThach: Math.round(b.recommendedPower * 0.22 * dropBonus),
        linhThao: Math.round(b.recommendedPower * 0.03),
        huyenThiet: Math.round(b.recommendedPower * 0.028),
        cuongHoaThach: Math.max(18, Math.round(b.recommendedPower / 550)),
        dotPhaDan: 3,
        linhKhi: Math.round(b.recommendedPower * 0.25),
        tinhHoaBoss: Math.max(2, Math.round(b.recommendedPower / 10000) + 1),
        tienNgoc: 60,
        droppedEquipment: [piece1, piece2],
        droppedGems: [createGem(b.element, 2), createGem(undefined, 1)],
      };
    }

    if (context.mode === 'vein' && context.veinDef) {
      const v = context.veinDef;
      return {
        linhThach: v.linhThachPerHour * 2,
        linhThao: 150,
        huyenThiet: 120,
        cuongHoaThach: 20,
        dotPhaDan: 2,
        linhKhi: 1200,
        tinhHoaBoss: 1,
        tienNgoc: v.tienNgocPerHour * 2,
        droppedEquipment: [generateEquipment({ rarity: v.grade === 'Thiên Cấp' ? 'truyen_thuyet' : 'huyen_thoai' })],
        droppedGems: [createGem(v.element, 2)],
      };
    }

    const r = context.realmDef!;
    const drop1 = generateEquipment({ rarity: rollRarity(r.rewards.dropRarityPool) });
    const extraDrop = Math.random() < 0.45 ? [generateEquipment({ rarity: rollRarity(r.rewards.dropRarityPool) })] : [];
    return {
      linhThach: Math.round(r.rewards.linhThach * dropBonus),
      linhThao: r.rewards.linhThao,
      huyenThiet: r.rewards.huyenThiet,
      cuongHoaThach: r.rewards.cuongHoaThach,
      dotPhaDan: r.rewards.dotPhaDan,
      linhKhi: r.rewards.linhKhi,
      tinhHoaBoss: Math.random() < 0.35 ? 1 : 0,
      tienNgoc: 20,
      droppedEquipment: [drop1, ...extraDrop],
      droppedGems: [createGem(r.element, 1)],
    };
  };

  const advanceTurn = (nextUnits: CombatUnit[]) => {
    const aliveE = nextUnits.filter((u) => !u.isAlly && u.hp > 0);
    const aliveA = nextUnits.filter((u) => u.isAlly && u.hp > 0);

    if (aliveE.length === 0) {
      sfx.victory();
      const rewards = buildRewards();
      setBattleOutcome({ victory: true, rewards });
      setBusy(false);
      return;
    }
    if (aliveA.length === 0) {
      setBattleOutcome({ victory: false });
      setBusy(false);
      return;
    }

    // Find next alive unit in queue
    let nextIdx = turnIndex + 1;
    let nextQueue = turnQueue;
    let nextRound = round;

    const findAlive = (q: string[], start: number) => {
      for (let i = start; i < q.length; i++) {
        const u = nextUnits.find((unit) => unit.id === q[i]);
        if (u && u.hp > 0) return i;
      }
      return -1;
    };

    let found = findAlive(nextQueue, nextIdx);
    if (found === -1) {
      nextRound += 1;
      nextQueue = [...nextUnits]
        .filter((u) => u.hp > 0)
        .sort((a, b) => b.spd - a.spd)
        .map((u) => u.id);
      found = 0;
      setRound(nextRound);
      setTurnQueue(nextQueue);
    }
    setTurnIndex(found);
    setBusy(false);
  };

  const executeSkill = (caster: CombatUnit, skill: SkillDef, targetId?: string) => {
    if (busy || battleOutcome) return;
    setBusy(true);

    const delayMs = fastMode ? 320 : 620;
    const nextUnits = unitsRef.current.map((u) => ({ ...u }));
    const acting = nextUnits.find((u) => u.id === caster.id);
    if (!acting || acting.hp <= 0) {
      advanceTurn(nextUnits);
      return;
    }

    // MP consumption / regen
    if (skill.mpCost > 0) {
      acting.mp = Math.max(0, acting.mp - skill.mpCost);
    } else {
      acting.mp = Math.min(acting.maxMp, acting.mp + 25);
    }

    // Five-Element Tương Sinh Combo Logic (Allies track global combo chain)
    let isComboTriggered = false;
    let newComboChain = comboChain;
    if (acting.isAlly) {
      if (doesGenerateElement(comboElement, skill.element)) {
        isComboTriggered = true;
        newComboChain = Math.min(5, comboChain + 1);
        setComboChain(newComboChain);
        setComboElement(skill.element);
        sfx.combo(newComboChain);
      } else {
        newComboChain = 1;
        setComboChain(1);
        setComboElement(skill.element);
        sfx.attack();
      }
    } else {
      sfx.attack();
    }

    const tangKinhBonus = acting.isAlly ? 1 + (state.buildings.tang_kinh_cac.level - 1) * 0.06 : 1;
    const comboMult = isComboTriggered ? 1 + 0.25 * newComboChain : 1;

    setActiveVfx({
      id: Date.now(),
      casterId: acting.id,
      skillId: skill.id,
      element: skill.element,
      skillName: skill.name,
      comboChain: newComboChain,
      isCombo: isComboTriggered,
    });

    const hitIds: string[] = [];
    const logs: string[] = [];

    if (skill.target === 'ally_heal') {
      const team = nextUnits.filter((u) => u.isAlly === acting.isAlly && u.hp > 0);
      team.forEach((ally) => {
        const healAmt = Math.round((acting.atk * skill.multiplier * 1.45 + ally.maxHp * 0.14) * comboMult);
        ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
        pushFloat(ally.id, `+${formatNum(healAmt)}`, '#16A34A', isComboTriggered ? `LIÊN HOÀN x${newComboChain}` : 'HỒI XUÂN');
      });
      logs.push(
        `${acting.name} thi triển [${skill.name}]${isComboTriggered ? ` (NGŨ HÀNH LIÊN HOÀN x${newComboChain}!)` : ''}, hồi phục toàn đội.`,
      );
    } else if (skill.target === 'ally_shield') {
      const team = nextUnits.filter((u) => u.isAlly === acting.isAlly && u.hp > 0);
      team.forEach((ally) => {
        const shieldAmt = Math.round((acting.def * 2.8 + ally.maxHp * 0.2) * comboMult);
        ally.shield += shieldAmt;
        pushFloat(ally.id, `+${formatNum(shieldAmt)} Giáp`, '#B45309', isComboTriggered ? `LIÊN HOÀN x${newComboChain}` : 'HỘ THUẪN');
      });
      logs.push(
        `${acting.name} thi triển [${skill.name}]${isComboTriggered ? ` (NGŨ HÀNH LIÊN HOÀN x${newComboChain}!)` : ''}, dựng Hộ Thuẫn toàn đội.`,
      );
    } else {
      const oppPool = nextUnits.filter((u) => u.isAlly !== acting.isAlly && u.hp > 0);
      const targets =
        skill.target === 'all'
          ? oppPool
          : [oppPool.find((u) => u.id === targetId) || oppPool[0]].filter(Boolean);

      targets.forEach((tgt) => {
        hitIds.push(tgt.id);
        const rel = getElementRelation(skill.element, tgt.element);
        const elemRelMult = rel === 'counter' ? 1.35 : rel === 'resisted' ? 0.8 : 1.0;
        const critChance = acting.crit + (rel === 'counter' ? 15 : 0) + (isComboTriggered && skill.element === 'Kim' ? 25 : 0);
        const isCrit = Math.random() * 100 < critChance;
        const critMult = isCrit ? acting.critDmg / 100 : 1.0;

        const armorPen = isComboTriggered && skill.element === 'Kim' ? 0.72 : 1.0;
        const mitigatedAtk = Math.max(acting.atk * 0.28, acting.atk * skill.multiplier - tgt.def * 0.42 * armorPen);
        const rawDmg = mitigatedAtk * (1 + acting.elemBonus / 100) * elemRelMult * comboMult * critMult * tangKinhBonus;
        const finalDmg = Math.max(18, Math.round(rawDmg * (0.94 + Math.random() * 0.12)));

        let remainingDmg = finalDmg;
        if (tgt.shield > 0) {
          const absorbed = Math.min(tgt.shield, remainingDmg);
          tgt.shield -= absorbed;
          remainingDmg -= absorbed;
        }
        tgt.hp = Math.max(0, tgt.hp - remainingDmg);

        const tags: string[] = [];
        if (isComboTriggered) tags.push(`LIÊN HOÀN x${newComboChain}`);
        if (rel === 'counter') tags.push('KHẮC CHẾ!');
        if (isCrit) tags.push('BẠO KÍCH');

        pushFloat(
          tgt.id,
          `-${formatNum(finalDmg)}`,
          isCrit ? '#DC2626' : rel === 'counter' ? '#D97706' : '#F8FAFC',
          tags.join(' · ') || undefined,
        );
      });

      // Moc basic self-heal / Tho combo shield bonus
      if (skill.id === 'moc_basic') {
        const selfHeal = Math.round(acting.maxHp * (isComboTriggered ? 0.14 : 0.08));
        acting.hp = Math.min(acting.maxHp, acting.hp + selfHeal);
        pushFloat(acting.id, `+${formatNum(selfHeal)}`, '#16A34A');
      }
      if (skill.id === 'tho_basic' && isComboTriggered) {
        const sh = Math.round(acting.maxHp * 0.18);
        acting.shield += sh;
        pushFloat(acting.id, `+${formatNum(sh)} Giáp`, '#B45309');
      }

      logs.push(
        `${acting.name} [${ELEMENT_META[skill.element].name}] dùng ${skill.name}${isComboTriggered ? ` — KÍCH HOẠT TƯƠNG SINH LIÊN HOÀN x${newComboChain}!` : ''}`,
      );
    }

    setHitUnitIds(hitIds);
    setUnits(nextUnits);
    setCombatLog((prev) => [...logs, ...prev].slice(0, 12));

    setTimeout(() => {
      setHitUnitIds([]);
      setActiveVfx(null);
      advanceTurn(nextUnits);
    }, delayMs);
  };

  // Automatic turn execution for Enemies OR when Auto-Battle is active for Allies
  useEffect(() => {
    if (busy || battleOutcome || !activeUnit) return;

    if (!activeUnit.isAlly || autoBattle) {
      const thinkDelay = fastMode ? 240 : 480;
      const timer = setTimeout(() => {
        const ult = activeUnit.skills[1];
        const basic = activeUnit.skills[0];

        // Choose smart skill
        let chosenSkill = basic;
        if (ult && activeUnit.mp >= ult.mpCost) {
          if (ult.target === 'ally_heal') {
            const injured = unitsRef.current.some((u) => u.isAlly === activeUnit.isAlly && u.hp > 0 && u.hp < u.maxHp * 0.72);
            chosenSkill = injured ? ult : basic;
          } else {
            chosenSkill = ult;
          }
        }

        // Choose smart target (prefer element counter or lowest HP)
        const opps = unitsRef.current.filter((u) => u.isAlly !== activeUnit.isAlly && u.hp > 0);
        const preferred =
          opps.find((o) => getElementRelation(chosenSkill.element, o.element) === 'counter') ||
          [...opps].sort((a, b) => a.hp - b.hp)[0];

        executeSkill(activeUnit, chosenSkill, preferred?.id);
      }, thinkDelay);
      return () => clearTimeout(timer);
    }
  }, [activeUnit, autoBattle, busy, battleOutcome, fastMode, turnIndex, round]);

  const nextComboElement = comboElement ? ELEMENT_META[comboElement].generates : null;
  const isPlayerTurn = Boolean(activeUnit?.isAlly && !autoBattle && !busy && !battleOutcome);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#0E1E1E] via-[#172E2C] to-[#0E1A1A] text-[#F5ECD8]">
      {/* Top Combat Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#112221]/95 border-b border-[#C9A45C]/50 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="px-2.5 py-1 rounded bg-[#233E3B] border border-[#C9A45C]/60 text-xs font-mono font-bold text-[#F3D388] shrink-0">
            Hiệp {round}
          </div>
          <div className="min-w-0">
            <h2
              className="text-lg sm:text-xl font-bold text-[#F7E1A3] truncate"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {context.title}
            </h2>
            <p className="text-[11px] text-[#B8CEC5] truncate">{context.subtitle}</p>
          </div>
        </div>

        {/* Five-Element Tương Sinh Combo Chain Tracker */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1A312F] border border-[#D4B06A]/60">
          <Zap className="w-4 h-4 text-[#F3D388] shrink-0" />
          <span className="text-xs font-semibold text-[#EAD8B0] whitespace-nowrap">Ngũ Hành Liên Hoàn:</span>
          {comboElement ? (
            <div className="flex items-center gap-1.5 text-xs">
              <ElementSeal element={comboElement} size="xs" showName />
              <span className="text-[#F3D388] font-mono font-bold">x{comboChain}</span>
              {nextComboElement && (
                <>
                  <span className="text-[#9AB5AA]">→ tiếp:</span>
                  <ElementSeal element={nextComboElement} size="xs" showName />
                </>
              )}
            </div>
          ) : (
            <span className="text-xs text-[#9AB5AA]">Xuất chiêu để khởi tạo chuỗi</span>
          )}
        </div>

        {/* Speed / Auto / Retreat controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAutoBattle((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              autoBattle
                ? 'bg-[#D4A24C] text-[#1B140A] border-[#F8E2A6]'
                : 'bg-[#1D3532] text-[#E9DEC4] border-[#C9A45C]/50 hover:bg-[#274642]'
            }`}
          >
            {autoBattle ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {autoBattle ? 'Đang Tự Động' : 'Tự Động'}
          </button>
          <button
            onClick={() => setFastMode((v) => !v)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border flex items-center gap-1 transition-colors cursor-pointer ${
              fastMode
                ? 'bg-[#2D8A68] text-white border-[#86EFAC]'
                : 'bg-[#1D3532] text-[#E9DEC4] border-[#C9A45C]/50'
            }`}
          >
            <FastForward className="w-3.5 h-3.5" />
            {fastMode ? '2x' : '1x'}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#4E1E1B] hover:bg-[#6E2722] border border-[#E07A6B]/50 text-[#FDE8E6] cursor-pointer whitespace-nowrap"
          >
            Rút Lui
          </button>
        </div>
      </div>

      {/* Turn Order Timeline Strip */}
      <div className="flex items-center gap-2 px-4 py-1.5 bg-[#0D1A19]/80 border-b border-[#C9A45C]/25 overflow-x-auto shrink-0">
        <span className="text-[11px] text-[#9BB4AA] font-medium whitespace-nowrap">Thứ tự lượt (SPD):</span>
        {turnQueue.map((uid, idx) => {
          const u = units.find((x) => x.id === uid);
          if (!u || u.hp <= 0) return null;
          const isCurrent = idx === turnIndex;
          return (
            <div
              key={`${uid}_${idx}`}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] border whitespace-nowrap transition-transform ${
                isCurrent
                  ? 'bg-[#D4A24C] text-[#1D150A] border-[#FFF1C4] font-bold scale-105'
                  : u.isAlly
                    ? 'bg-[#1C3833] text-[#DDF0E8] border-[#3F7066]'
                    : 'bg-[#3B1E20] text-[#F7D7D4] border-[#824143]'
              }`}
            >
              <span>{u.name.split(' ').slice(-1)[0]}</span>
              <span className="font-mono text-[10px] opacity-80">{u.spd}</span>
            </div>
          );
        })}
      </div>

      {/* Main Battle Stage */}
      <div className="relative flex-1 overflow-y-auto flex flex-col justify-between p-4 sm:p-6 overflow-x-hidden">
        {/* Clean Isometric Sect Backdrop at 20% Opacity */}
        <img
          src="./assets/aistudio/1_80f8120e.png"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute inset-0 w-full h-full object-cover object-top scale-[1.07] origin-top opacity-20"
        />

        {/* Elemental Skill VFX Overlay */}
        {activeVfx && (
          <div
            key={activeVfx.id}
            className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center"
          >
            <div
              className="animate-combo-burst flex flex-col items-center px-8 py-5 rounded-2xl border-2 shadow-2xl"
              style={{
                backgroundColor: 'rgba(14, 28, 27, 0.88)',
                borderColor: ELEMENT_META[activeVfx.element].border,
                boxShadow: `0 0 48px ${ELEMENT_META[activeVfx.element].color}88`,
              }}
            >
              <SkillIcon skillId={activeVfx.skillId} name={activeVfx.skillName} className="w-16 h-16" />
              <div
                className="mt-2 text-2xl sm:text-3xl font-bold tracking-wide"
                style={{
                  color: '#FDF1C8',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {activeVfx.skillName}
              </div>
              {activeVfx.isCombo && (
                <div className="mt-1 text-sm font-bold tracking-wide text-[#FBBF24]">
                  NGŨ HÀNH TƯƠNG SINH · LIÊN HOÀN x{activeVfx.comboChain}!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Battle Grid: Left Allies vs Right Enemies */}
        <div className="relative z-10 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 my-auto">
          {/* ALLIES FORMATION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[#C8DFD4] px-1">
              <span>Đội Hình Tông Môn ({aliveAllies.length}/{allies.length})</span>
              <span className="text-[#F2D384]">Phe Ta</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allies.map((u, allyIdx) => {
                const isTurn = activeUnit?.id === u.id;
                const isHit = hitUnitIds.includes(u.id);
                const dead = u.hp <= 0;
                const hpPct = Math.max(0, (u.hp / u.maxHp) * 100);
                const mpPct = Math.max(0, (u.mp / u.maxMp) * 100);
                const isNextComboUnit = nextComboElement === u.element && !dead;
                const isCenteredFifth = allies.length === 5 && allyIdx === 4;

                return (
                  <div
                    key={u.id}
                    className={`relative rounded-xl p-3 border transition-all ${
                      isCenteredFifth ? 'sm:col-span-2 sm:max-w-[calc(50%-0.375rem)] sm:mx-auto sm:w-full' : ''
                    } ${
                      isHit ? 'animate-hit-shake' : ''
                    } ${
                      dead
                        ? 'opacity-40 bg-[#131F1E] border-[#2C3F3D]'
                        : isTurn
                          ? 'bg-[#21413D] border-[#F5D687] shadow-[0_0_20px_rgba(245,214,135,0.28)]'
                          : 'bg-[#162C2A]/90 border-[#3A5F5A]'
                    }`}
                  >
                    {/* Floating combat numbers */}
                    {floatingTexts
                      .filter((f) => f.unitId === u.id)
                      .map((f) => (
                        <div
                          key={f.id}
                          className="pointer-events-none absolute left-1/2 -top-2 -translate-x-1/2 z-30 animate-damage-float text-center whitespace-nowrap"
                        >
                          <div className="text-lg font-mono font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" style={{ color: f.color }}>
                            {f.text}
                          </div>
                          {f.subText && (
                            <div className="text-[10px] font-bold text-[#FDE047] drop-shadow">{f.subText}</div>
                          )}
                        </div>
                      ))}

                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <DisciplePortrait
                          discipleId={u.id}
                          name={u.name}
                          glyph={u.glyph}
                          element={u.element}
                          realmIndex={u.realmIndex}
                          spiritRoot={u.spiritRoot}
                          borderColor={isTurn ? '#FDE047' : '#D4B06A'}
                          size="md"
                          fullBody
                          animMode={activeVfx?.casterId === u.id ? 'attack' : 'idle'}
                          className={
                            activeVfx?.casterId === u.id
                              ? 'translate-x-2 scale-115 transition-transform duration-150'
                              : 'transition-transform duration-150'
                          }
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#FBF2DC] truncate">{u.name}</div>
                          <div className="text-[11px] text-[#AFC8BE] truncate">
                            {u.realmLabel} · ATK {formatNum(u.atk)}
                          </div>
                        </div>
                      </div>
                      <ElementSeal element={u.element} size="sm" />
                    </div>

                    {/* HP & Shield Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono tabular-nums">
                        <span className="text-[#BCE6CD]">
                          HP {formatNum(u.hp)}/{formatNum(u.maxHp)}
                        </span>
                        {u.shield > 0 && (
                          <span className="text-[#F5C96B] flex items-center gap-0.5">
                            <Shield className="w-3 h-3" /> {formatNum(u.shield)}
                          </span>
                        )}
                      </div>
                      <div className="h-2 rounded-full bg-[#0C1817] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#1F8A5B] to-[#4ADE80] transition-all duration-200"
                          style={{ width: `${hpPct}%` }}
                        />
                      </div>

                      {/* MP Bar */}
                      <div className="flex justify-between text-[10px] font-mono tabular-nums text-[#93C5FD]">
                        <span>Linh Lực {u.mp}/{u.maxMp}</span>
                        {isNextComboUnit && <span className="text-[#FDE047] font-bold">Sẵn sàng Liên Hoàn!</span>}
                      </div>
                      <div className="h-1.5 rounded-full bg-[#0C1817] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] transition-all duration-200"
                          style={{ width: `${mpPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ENEMIES / BOSS FORMATION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[#F5C6C2] px-1">
              <span>Yêu Ma / Thủ Vệ ({aliveEnemies.length}/{enemies.length})</span>
              <span className="text-[#F5A89F]">Nhấp để chọn mục tiêu</span>
            </div>
            <div className={`grid gap-3 ${enemies.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {enemies.map((u) => {
                const isTurn = activeUnit?.id === u.id;
                const isSelected = selectedTargetId === u.id && u.hp > 0;
                const isHit = hitUnitIds.includes(u.id);
                const dead = u.hp <= 0;
                const hpPct = Math.max(0, (u.hp / u.maxHp) * 100);
                const relToActive = activeUnit?.isAlly ? getElementRelation(activeUnit.element, u.element) : 'neutral';

                return (
                  <button
                    key={u.id}
                    type="button"
                    disabled={dead}
                    onClick={() => !dead && setSelectedTargetId(u.id)}
                    className={`relative text-left rounded-xl p-3.5 border transition-all cursor-pointer ${
                      isHit ? 'animate-hit-shake' : ''
                    } ${
                      dead
                        ? 'opacity-35 bg-[#1B1415] border-[#382728] cursor-default'
                        : isSelected
                          ? 'bg-[#3C1E20] border-[#F59E0B] shadow-[0_0_22px_rgba(245,158,11,0.3)]'
                          : isTurn
                            ? 'bg-[#361A1D] border-[#EF4444]'
                            : 'bg-[#261719]/90 border-[#63363A] hover:border-[#C97C78]'
                    }`}
                  >
                    {floatingTexts
                      .filter((f) => f.unitId === u.id)
                      .map((f) => (
                        <div
                          key={f.id}
                          className="pointer-events-none absolute left-1/2 -top-2 -translate-x-1/2 z-30 animate-damage-float text-center whitespace-nowrap"
                        >
                          <div className="text-xl font-mono font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" style={{ color: f.color }}>
                            {f.text}
                          </div>
                          {f.subText && (
                            <div className="text-[10px] font-bold text-[#FDE047] drop-shadow">{f.subText}</div>
                          )}
                        </div>
                      ))}

                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <EnemyUnitSprite
                          id={u.id}
                          name={u.name}
                          element={u.element}
                          glyph={u.glyph}
                          isBoss={u.isBoss}
                          className={u.isBoss ? 'w-20 h-20 sm:w-24 sm:h-24' : 'w-16 h-16'}
                        />
                        <div className="min-w-0">
                          <div className="text-sm sm:text-base font-bold text-[#FDECE8] truncate">{u.name}</div>
                          <div className="text-[11px] text-[#E4B3AE] flex items-center gap-1.5 flex-wrap">
                            <span>{u.realmLabel}</span>
                            <span>·</span>
                            <span className="font-mono">ATK {formatNum(u.atk)}</span>
                            {!dead && relToActive === 'counter' && (
                              <span className="text-[#FDE047] font-bold">· KHẮC CHẾ +35%</span>
                            )}
                            {!dead && relToActive === 'resisted' && (
                              <span className="text-[#93C5FD] font-semibold">· Bị khắc -20%</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ElementSeal element={u.element} size={u.isBoss ? 'lg' : 'sm'} />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono tabular-nums">
                        <span className="text-[#FECACA]">
                          HP {formatNum(u.hp)} / {formatNum(u.maxHp)}
                        </span>
                        <span className="text-[#FCA5A5]">{Math.ceil(hpPct)}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-[#140B0C] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#B91C1C] to-[#F87171] transition-all duration-200"
                          style={{ width: `${hpPct}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Command Deck & Live Log */}
        <div className="relative z-10 max-w-6xl w-full mx-auto mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Skill Bar (2 cols) */}
          <div className="lg:col-span-2 rounded-xl bg-[#132524]/95 border border-[#C9A45C]/60 p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-xs font-semibold text-[#F4D993]">
                {activeUnit
                  ? activeUnit.isAlly
                    ? `Lượt của ${activeUnit.name} (Hệ ${ELEMENT_META[activeUnit.element].name})`
                    : `Địch đang xuất chiêu: ${activeUnit.name}...`
                  : 'Đang tính lượt...'}
              </div>
              {activeUnit?.isAlly && nextComboElement === activeUnit.element && (
                <span className="text-xs font-bold text-[#FDE047]">
                  Hệ {ELEMENT_META[activeUnit.element].name} khớp Tương Sinh → Xuất chiêu để kích hoạt Liên Hoàn!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(activeUnit?.isAlly ? activeUnit.skills : allies[0]?.skills || []).map((sk) => {
                const canCast = isPlayerTurn && activeUnit && activeUnit.mp >= sk.mpCost;
                const willCombo = activeUnit?.isAlly && doesGenerateElement(comboElement, sk.element);
                return (
                  <button
                    key={sk.id}
                    type="button"
                    disabled={!canCast}
                    onClick={() => activeUnit && executeSkill(activeUnit, sk, selectedTargetId)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      canCast
                        ? willCombo
                          ? 'bg-gradient-to-r from-[#2D4532] to-[#3B391E] border-[#FDE047] hover:brightness-110 cursor-pointer'
                          : 'bg-[#1D3936] border-[#C9A45C]/70 hover:border-[#F6DF9F] hover:bg-[#244642] cursor-pointer'
                        : 'bg-[#12201F] border-[#2C4240] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SkillIcon skillId={sk.id} name={sk.name} className="w-10 h-10" />
                        <span className="font-bold text-sm text-[#FCF1D2] truncate">{sk.name}</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-[#93C5FD] whitespace-nowrap">
                        {sk.mpCost > 0 ? `${sk.mpCost} Linh Lực` : '+25 Linh Lực'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#C8DDD4] leading-snug">{sk.description}</p>
                    <p className="text-[10px] text-[#F2D180] mt-1 leading-snug">{sk.comboBonusDesc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Combat Log (1 col) */}
          <div className="rounded-xl bg-[#101F1E]/95 border border-[#C9A45C]/40 p-3 flex flex-col max-h-40">
            <div className="text-xs font-semibold text-[#D6C59C] mb-1.5 flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-[#D4A24C]" /> Chiến Báo Trận Đấu
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 text-[11px] text-[#C7D8D0] pr-1">
              {combatLog.map((line, i) => (
                <div key={i} className={i === 0 ? 'text-[#FCE7A7] font-medium' : 'opacity-80'}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Victory / Defeat Result Modal */}
      {battleOutcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg scroll-parchment p-4 sm:p-5 text-[#24211C] space-y-4">
            <div className="flex items-center justify-between border-b border-[#D5C39E] pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    battleOutcome.victory ? 'bg-[#D4A24C]/25 text-[#9A6914]' : 'bg-[#C84332]/20 text-[#B91C1C]'
                  }`}
                >
                  {battleOutcome.victory ? <Trophy className="w-6 h-6" /> : <RotateCcw className="w-6 h-6" />}
                </div>
                <div>
                  <h3
                    className="text-2xl font-bold"
                    style={{
                      fontFamily: 'var(--font-display)',
                      color: battleOutcome.victory ? '#8A5A0F' : '#A62820',
                    }}
                  >
                    {battleOutcome.victory ? 'Đại Thắng Trở Về!' : 'Thất Bại Trong Gang Tấc'}
                  </h3>
                  <p className="text-xs text-[#6B5F4E]">
                    {battleOutcome.victory
                      ? `Hoàn thành ${context.title} sau ${round} hiệp.`
                      : 'Hãy đột phá cảnh giới, cường hóa trang bị hoặc đổi đội hình khắc hệ Ngũ Hành.'}
                  </p>
                </div>
              </div>
            </div>

            {battleOutcome.victory && battleOutcome.rewards && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                  <div className="p-2 rounded bg-[#ECE3CE] border border-[#D4C39F] flex items-center gap-1.5">
                    <ResourceIcon resource="linhThach" size="xs" />
                    <span>
                      Linh Thạch: <strong className="text-[#8A5A0F]">+{formatNum(battleOutcome.rewards.linhThach)}</strong>
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#ECE3CE] border border-[#D4C39F] flex items-center gap-1.5">
                    <ResourceIcon resource="linhKhi" size="xs" />
                    <span>
                      Linh Khí: <strong className="text-[#1D5E8C]">+{formatNum(battleOutcome.rewards.linhKhi)}</strong>
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#ECE3CE] border border-[#D4C39F] flex items-center gap-1.5">
                    <ResourceIcon resource="linhThao" size="xs" />
                    <span>
                      Linh Thảo: <strong className="text-[#257A52]">+{formatNum(battleOutcome.rewards.linhThao)}</strong>
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#ECE3CE] border border-[#D4C39F] flex items-center gap-1.5">
                    <ResourceIcon resource="huyenThiet" size="xs" />
                    <span>
                      Huyền Thiết: <strong>+{formatNum(battleOutcome.rewards.huyenThiet)}</strong>
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#ECE3CE] border border-[#D4C39F] flex items-center gap-1.5">
                    <ResourceIcon resource="cuongHoaThach" size="xs" />
                    <span>
                      Cường Hóa Thạch: <strong>+{battleOutcome.rewards.cuongHoaThach}</strong>
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#ECE3CE] border border-[#D4C39F] flex items-center gap-1.5">
                    <ResourceIcon resource="tienNgoc" size="xs" />
                    <span>
                      Tiên Ngọc: <strong className="text-[#15803D]">+{battleOutcome.rewards.tienNgoc}</strong>
                    </span>
                  </div>
                  {battleOutcome.rewards.tinhHoaBoss > 0 && (
                    <div className="p-2 rounded bg-[#FCEBEA] border border-[#D4574E] col-span-2 sm:col-span-3 flex items-center gap-1.5">
                      <ResourceIcon resource="tinhHoaBoss" size="sm" />
                      <span>
                        Tinh Hoa Boss (Nâng bậc Tiên Khí/Thần Khí):{' '}
                        <strong className="text-[#B92B27]">+{battleOutcome.rewards.tinhHoaBoss}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Dropped Equipment & Gems */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-[#5C4E3A]">Chiến Lợi Phẩm Trang Bị & Linh Ngọc</div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {battleOutcome.rewards.droppedEquipment.map((eq) => {
                      const rm = RARITY_META[eq.rarity];
                      return (
                        <div
                          key={eq.id}
                          className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-xs"
                          style={{ backgroundColor: rm.bg, borderColor: rm.border }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <RarityFrameBox rarity={eq.rarity} size="sm">
                              <EquipmentSlotIcon slot={eq.slot} className="w-7 h-7" />
                            </RarityFrameBox>
                            <div className="min-w-0">
                              <span className="font-bold" style={{ color: rm.color }}>
                                [{rm.name}] {eq.name}
                              </span>
                              {eq.setId && (
                                <span className="ml-1.5 text-[11px] font-semibold text-[#8A5A0F]">
                                  · {EQUIPMENT_SETS[eq.setId]?.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] text-[#5C5347] shrink-0">{eq.subStats.length} dòng ẩn</span>
                        </div>
                      );
                    })}
                    {battleOutcome.rewards.droppedGems.map((gem) => (
                      <div
                        key={gem.id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#E9F3EE] border border-[#7AB098] text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <RarityFrameBox rarity={gemTierToRarity(gem.tier)} size="sm">
                            <GemSprite element={gem.element} tier={gem.tier} className="w-7 h-7" />
                          </RarityFrameBox>
                          <span className="font-semibold text-[#1D5E46]">{gem.name}</span>
                        </div>
                        <span className="font-mono text-[11px]">+{gem.statValue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!battleOutcome.victory && <FiveElementDiagram />}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => onFinish(battleOutcome.victory, battleOutcome.rewards)}
                className="px-5 py-2.5 rounded-lg bg-[#1E3B38] hover:bg-[#284E4A] text-[#F7E5B4] font-semibold text-sm border border-[#C9A45C] cursor-pointer"
              >
                {battleOutcome.victory ? 'Nhận Thưởng & Trở Về Tông Môn' : 'Trở Về Tông Môn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
