import React, { useState } from 'react';
import {
  ELEMENT_META,
  EQUIPMENT_SETS,
  LEGENDARY_BOSSES,
  RARITY_META,
  SECRET_REALMS,
} from '../data/constants';
import { BossDef, CombatContext, GameState, SecretRealmDef } from '../types/game';
import { computeTotalSectPower, formatNum, getLeaderboardData } from '../utils/gameLogic';
import {
  ElementSeal,
  EnemyUnitSprite,
  FiveElementDiagram,
  LegendarySetSprite,
  ScrollModalShell,
} from './ElementIcons';
import { Compass, Crown, Flame, Skull, Swords, Trophy, Zap } from 'lucide-react';

interface WorldRealmModalProps {
  state: GameState;
  initialTab?: 'realms' | 'bosses' | 'leaderboard';
  onClose: () => void;
  onStartCombat: (ctx: CombatContext) => void;
  onSweepRealm: (realm: SecretRealmDef) => void;
}

export function WorldRealmModal({
  state,
  initialTab = 'realms',
  onClose,
  onStartCombat,
  onSweepRealm,
}: WorldRealmModalProps) {
  const [tab, setTab] = useState<'realms' | 'bosses' | 'leaderboard'>(initialTab);
  const myPower = computeTotalSectPower(state);
  const leaderboard = getLeaderboardData(state);

  const launchRealm = (realm: SecretRealmDef) => {
    if (state.resources.stamina < realm.staminaCost) return;
    onStartCombat({
      mode: 'realm',
      title: realm.name,
      subtitle: realm.subtitle,
      targetId: realm.id,
      enemies: realm.enemies,
      staminaCost: realm.staminaCost,
      realmDef: realm,
    });
  };

  const launchBoss = (boss: BossDef) => {
    if (state.resources.stamina < boss.staminaCost) return;
    onStartCombat({
      mode: 'boss',
      title: `Săn Boss: ${boss.name}`,
      subtitle: boss.title,
      targetId: boss.id,
      staminaCost: boss.staminaCost,
      bossDef: boss,
      enemies: [
        {
          id: boss.id,
          name: boss.name,
          element: boss.element,
          hp: boss.hp,
          atk: boss.atk,
          def: boss.def,
          spd: boss.spd,
          isBoss: true,
          glyph: ELEMENT_META[boss.element].hanzi,
        },
      ],
    });
  };

  return (
    <ScrollModalShell
      title="Tiên Đồ · Bí Cảnh, Săn Boss & Bảng Xếp Hạng Toàn Cầu"
      subtitle={`Thực Lực Tông Môn: ${formatNum(myPower)} · Thể Lực: ${state.resources.stamina}/${state.resources.maxStamina}`}
      onClose={onClose}
      maxWidth="max-w-5xl"
    >
      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-[#D4C39F] pb-2.5">
        <button
          onClick={() => setTab('realms')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            tab === 'realms' ? 'bg-[#1E3B38] text-[#F9E6B3]' : 'bg-[#EAE1CD] text-[#4C4335] hover:bg-[#DFD2B5]'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          Phụ Bản Bí Cảnh (5 Tầng)
        </button>
        <button
          onClick={() => setTab('bosses')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            tab === 'bosses' ? 'bg-[#8F241D] text-[#FFF1E6]' : 'bg-[#EAE1CD] text-[#4C4335] hover:bg-[#DFD2B5]'
          }`}
        >
          <Skull className="w-3.5 h-3.5" />
          Săn Boss Bộ Huyền Thoại
        </button>
        <button
          onClick={() => setTab('leaderboard')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            tab === 'leaderboard' ? 'bg-[#8A5A0F] text-[#FFF6DF]' : 'bg-[#EAE1CD] text-[#4C4335] hover:bg-[#DFD2B5]'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          Bảng Xếp Hạng Toàn Cầu
        </button>
      </div>

      {tab === 'realms' && (
        <div className="space-y-4">
          <FiveElementDiagram />

          <div className="space-y-3">
            {SECRET_REALMS.map((realm, idx) => {
              const cleared = state.clearedRealms.includes(realm.id);
              const unlocked = idx === 0 || state.clearedRealms.includes(SECRET_REALMS[idx - 1].id);
              const enoughStamina = state.resources.stamina >= realm.staminaCost;
              const counterEl = Object.entries(ELEMENT_META).find(([, v]) => v.counters === realm.element)?.[0];

              return (
                <div
                  key={realm.id}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    unlocked
                      ? 'bg-[#F5EFE0] border-[#D4C39F]'
                      : 'bg-[#E9E2D2]/70 border-[#D5CCB8] opacity-70'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ElementSeal element={realm.element} size="sm" />
                      <h3 className="text-base font-bold text-[#1E3331]" style={{ fontFamily: 'var(--font-display)' }}>
                        {realm.name}
                      </h3>
                      <span className="text-xs text-[#6B5F4C]">· {realm.subtitle}</span>
                      {cleared && <span className="text-xs font-bold text-[#257A52]">· Đã thông quan</span>}
                    </div>
                    <div className="text-xs text-[#5A5041] flex flex-wrap items-center gap-x-3 gap-y-1 font-mono tabular-nums">
                      <span>
                        Khuyến nghị: <strong className={myPower >= realm.recommendedPower ? 'text-[#257A52]' : 'text-[#B92B27]'}>{formatNum(realm.recommendedPower)}</strong>
                      </span>
                      <span>·</span>
                      <span>Linh Thạch +{formatNum(realm.rewards.linhThach)}</span>
                      <span>·</span>
                      <span>Linh Khí +{formatNum(realm.rewards.linhKhi)}</span>
                      <span>·</span>
                      <span>Rơi: {realm.rewards.dropRarityPool.map((r) => RARITY_META[r].name).join(' / ')}</span>
                    </div>
                    {counterEl && (
                      <div className="text-[11px] text-[#1D5E8C]">
                        Gợi ý chiến thuật: Dùng đệ tử hệ <strong>{ELEMENT_META[counterEl as keyof typeof ELEMENT_META].name}</strong> để khắc chế (+35% sát thương)!
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {realm.enemies.map((enemy) => (
                        <div
                          key={enemy.id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#EAE0C9]/90 border border-[#D4C39F]"
                        >
                          <EnemyUnitSprite
                            id={enemy.id}
                            name={enemy.name}
                            element={enemy.element}
                            glyph={enemy.glyph}
                            className="w-8 h-8"
                          />
                          <span className="text-[11px] font-semibold text-[#3C3327] whitespace-nowrap">
                            {enemy.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {cleared && (
                      <button
                        disabled={!enoughStamina}
                        onClick={() => onSweepRealm(realm)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 whitespace-nowrap ${
                          enoughStamina
                            ? 'bg-[#D4A24C] hover:bg-[#E4B55E] text-[#1D150A] cursor-pointer'
                            : 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Càn Quét (-{realm.staminaCost} TL)
                      </button>
                    )}
                    <button
                      disabled={!unlocked || !enoughStamina}
                      onClick={() => launchRealm(realm)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap ${
                        unlocked && enoughStamina
                          ? 'bg-[#1E3B38] hover:bg-[#2A514D] text-[#F9E6B3] cursor-pointer'
                          : 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                      }`}
                    >
                      <Swords className="w-3.5 h-3.5" />
                      {unlocked ? `Khiêu Chiến (-${realm.staminaCost} TL)` : 'Chưa mở'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'bosses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LEGENDARY_BOSSES.map((boss) => {
            const setDef = EQUIPMENT_SETS[boss.setId];
            const minRar = RARITY_META[boss.guaranteedMinRarity];
            const kills = state.defeatedBosses[boss.id] || 0;
            const enoughStamina = state.resources.stamina >= boss.staminaCost;

            return (
              <div
                key={boss.id}
                className="p-4 rounded-xl bg-gradient-to-b from-[#FAF5E8] to-[#EFE4CC] border-2 border-[#C9A45C] flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <EnemyUnitSprite
                        id={boss.id}
                        name={boss.name}
                        element={boss.element}
                        isBoss
                        className="w-20 h-20"
                      />
                      <div>
                        <h3 className="text-lg font-bold text-[#1E3331]" style={{ fontFamily: 'var(--font-display)' }}>
                          {boss.name}
                        </h3>
                        <div className="text-[11px] font-semibold text-[#8A5A0F]">{boss.title}</div>
                      </div>
                    </div>
                    <ElementSeal element={boss.element} size="sm" showName />
                  </div>

                  <p className="text-xs text-[#544A3C]">{boss.description}</p>

                  <div className="p-2.5 rounded-lg bg-[#EAE0C9] border border-[#D4C39F] text-xs space-y-1.5">
                    <div className="flex justify-between font-mono tabular-nums">
                      <span>Thực lực đề nghị:</span>
                      <strong className={myPower >= boss.recommendedPower ? 'text-[#257A52]' : 'text-[#B92B27]'}>
                        {formatNum(boss.recommendedPower)}
                      </strong>
                    </div>
                    <div className="flex items-center gap-2.5 pt-1 border-t border-[#D4C39F]/70">
                      <LegendarySetSprite setId={boss.setId} className="w-12 h-12" />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="text-[11px] text-[#5B5142]">Rơi chắc chắn:</span>
                          <strong style={{ color: minRar.color }}>
                            2 Món [{minRar.name}+] · {setDef?.name}
                          </strong>
                        </div>
                        <div className="text-[11px] text-[#6B5F4C]">
                          Bộ (2): {setDef?.twoPieceDesc} · (4): {setDef?.fourPieceDesc}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#6B5F4C]">Đã hạ gục: {kills} lần</span>
                  <button
                    disabled={!enoughStamina}
                    onClick={() => launchBoss(boss)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                      enoughStamina
                        ? 'bg-[#A62820] hover:bg-[#C2342A] text-[#FFF4E8] cursor-pointer'
                        : 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    Săn Boss (-{boss.staminaCost} TL)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-[#EAE1CD] border border-[#D4C39F] flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>
              <strong>Bảng Phong Thần Liên Server:</strong> Xếp hạng theo tổng thực lực tông môn toàn cầu (cập nhật trực tiếp).
            </span>
            <span className="font-mono font-bold text-[#8A5A0F]">
              Hạng hiện tại của bạn: #{leaderboard.findIndex((r) => r.isPlayer) + 1}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#D4C39F] bg-[#FAF6EC]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1E3B38] text-[#F5DF9F]">
                <tr>
                  <th className="py-2.5 px-3">Hạng</th>
                  <th className="py-2.5 px-3">Tông Môn & Chưởng Môn</th>
                  <th className="py-2.5 px-3">Máy Chủ</th>
                  <th className="py-2.5 px-3">Cảnh Giới Cao Nhất</th>
                  <th className="py-2.5 px-3">Tiên Minh</th>
                  <th className="py-2.5 px-3 text-right">Tổng Thực Lực</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3D6BC]">
                {leaderboard.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={
                      row.isPlayer
                        ? 'bg-[#FCEFC7] font-semibold'
                        : idx < 3
                          ? 'bg-[#F6EFE0]'
                          : 'hover:bg-[#F3EBDC]'
                    }
                  >
                    <td className="py-2.5 px-3 font-mono font-bold">
                      {idx === 0 ? (
                        <span className="text-[#B4690E] inline-flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5" /> 1
                        </span>
                      ) : (
                        `#${idx + 1}`
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-[#1E3331]">
                        {row.sectName} {row.isPlayer ? '(Bạn)' : ''}
                      </div>
                      <div className="text-[11px] text-[#6B5F4C]">{row.master}</div>
                    </td>
                    <td className="py-2.5 px-3 text-[#5A5041]">{row.server}</td>
                    <td className="py-2.5 px-3 font-medium text-[#1D5E8C]">{row.realm}</td>
                    <td className="py-2.5 px-3 text-[#5A5041]">{row.alliance}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#8A5A0F] tabular-nums">
                      {formatNum(row.power)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ScrollModalShell>
  );
}
