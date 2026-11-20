import React, { useState } from 'react';
import {
  EXPRESSION_PRESETS,
  HAIR_COLOR_PRESETS,
  OUTFIT_PRESETS,
  PaperDollConfig,
  savePaperDollConfig,
} from '../data/characterPaperDoll';
import { getVfxRingPreset } from '../data/vfxRings';
import { getVfxAuraPreset } from '../data/vfxAuras';
import { ChibiPaperDoll, PaperDollMotionState } from './ChibiPaperDoll';
import { RotateCw, Sparkles, Swords, X, Zap } from 'lucide-react';

interface CharacterCreatorPanelProps {
  config: PaperDollConfig;
  onChange: (next: PaperDollConfig) => void;
  onClose: () => void;
}

const RING_CHOICES = [0, 3, 4, 6, 10, 13, 15, 16];
const AURA_CHOICES = [0, 1, 3, 6, 9, 12, 14, 16];

export const CharacterCreatorPanel: React.FC<CharacterCreatorPanelProps> = ({
  config,
  onChange,
  onClose,
}) => {
  const [previewState, setPreviewState] = useState<PaperDollMotionState>('idle');
  const [previewBack, setPreviewBack] = useState(false);

  const update = (patch: Partial<PaperDollConfig>) => {
    const next = { ...config, ...patch };
    onChange(next);
    savePaperDollConfig(next);
  };

  const triggerTest = (state: 'attack' | 'hit') => {
    setPreviewBack(false);
    setPreviewState(state);
    window.setTimeout(() => {
      setPreviewState((cur) => (cur === state ? 'idle' : cur));
    }, 650);
  };

  return (
    <div
      data-camera-control="true"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="fixed left-2 sm:left-3 bottom-11 lg:bottom-13 z-40 w-[300px] sm:w-[330px] max-h-[82dvh] overflow-y-auto rounded-2xl bg-[#112221]/95 border border-[#C9A45C]/80 text-[#F6EBD0] shadow-2xl backdrop-blur-md p-3 space-y-2.5 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#C9A45C]/30 pb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#F5D687]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tạo Hình Chibi</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPreviewBack((v) => !v)}
            title="Xoay trước / sau lưng"
            className="w-6 h-6 rounded-md bg-[#1D3936] hover:bg-[#284E4A] flex items-center justify-center text-[#8BE5C2] cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-6 h-6 rounded-md bg-[#1D3936] hover:bg-[#5E2320] flex items-center justify-center text-[#F6EBD0] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Live Preview Stage + Test Attack / Hit Buttons */}
      <div className="relative rounded-xl bg-gradient-to-b from-[#1A3533] to-[#0E1E1D] border border-[#C9A45C]/35 pt-2 pb-2.5 flex flex-col items-center">
        <div
          className="transition-transform duration-150"
          style={{
            transform:
              previewState === 'attack'
                ? 'translateX(14px) scale(1.06)'
                : previewState === 'hit'
                  ? 'translateX(-10px)'
                  : 'none',
          }}
        >
          <ChibiPaperDoll
            config={config}
            motionState={previewState}
            facingBack={previewBack}
            size={112}
          />
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => triggerTest('attack')}
            className="px-2.5 py-1 rounded-lg bg-[#9A6914] hover:bg-[#B47D1A] text-[10px] font-bold text-[#FFF7DF] flex items-center gap-1 cursor-pointer"
          >
            <Swords className="w-3 h-3" /> Test Xuất Chiêu
          </button>
          <button
            type="button"
            onClick={() => triggerTest('hit')}
            className="px-2.5 py-1 rounded-lg bg-[#8C2D27] hover:bg-[#A6352E] text-[10px] font-bold text-[#FEE2E2] flex items-center gap-1 cursor-pointer"
          >
            <Zap className="w-3 h-3" /> Test Bị Đánh
          </button>
        </div>
      </div>

      {/* 1. Gender ♂ / ♀ + 4 Hairstyles */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'male', icon: '♂', title: 'Nam' },
              { id: 'female', icon: '♀', title: 'Nữ' },
            ] as const
          ).map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => update({ gender: g.id })}
              title={g.title}
              className={`w-8 h-8 rounded-lg text-base font-bold flex items-center justify-center cursor-pointer transition-all ${
                config.gender === g.id
                  ? 'bg-[#C9A45C] text-[#112221] shadow'
                  : 'bg-[#1A3331] text-[#CFE2DA] hover:bg-[#244542]'
              }`}
            >
              {g.icon}
            </button>
          ))}
        </div>

        {/* 4 Hairstyles */}
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3].map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => update({ hairStyle: idx })}
              title={`Kiểu tóc ${idx + 1}`}
              className={`w-8 h-8 rounded-lg text-[11px] font-mono font-bold flex items-center justify-center cursor-pointer transition-all ${
                config.hairStyle === idx
                  ? 'bg-[#C9A45C] text-[#112221] shadow'
                  : 'bg-[#1A3331] text-[#CFE2DA] hover:bg-[#244542]'
              }`}
            >
              ✂{idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Hair Color Swatches (8 circles) */}
      <div className="flex items-center justify-between gap-1 px-1">
        {HAIR_COLOR_PRESETS.map((c) => {
          const active = config.hairColor === c.hex;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => update({ hairColor: c.hex })}
              title={c.name}
              className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                active ? 'ring-2 ring-[#FDE047] scale-115' : 'ring-1 ring-white/30 hover:scale-105'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          );
        })}
      </div>

      {/* 3. 5 Expressions (icon row) */}
      <div className="grid grid-cols-5 gap-1">
        {EXPRESSION_PRESETS.map((ex) => {
          const active = config.expression === ex.id;
          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => update({ expression: ex.id })}
              title={ex.name}
              className={`h-8 rounded-lg text-base flex items-center justify-center cursor-pointer transition-all ${
                active
                  ? 'bg-[#C9A45C] ring-1 ring-[#FFF3C4] scale-105'
                  : 'bg-[#1A3331] hover:bg-[#244542]'
              }`}
            >
              {ex.icon}
            </button>
          );
        })}
      </div>

      {/* 4. 4 Starter Outfits */}
      <div className="grid grid-cols-4 gap-1">
        {OUTFIT_PRESETS.map((o) => {
          const active = config.outfit === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => update({ outfit: o.id })}
              title={o.name}
              className={`py-1.5 px-1 rounded-lg flex flex-col items-center gap-0.5 cursor-pointer transition-all border ${
                active
                  ? 'bg-[#234A42] border-[#F5D687] text-[#FFF3C4]'
                  : 'bg-[#172E2C] border-transparent text-[#BFD4CB] hover:bg-[#203E3B]'
              }`}
            >
              <span className="text-sm leading-none">{o.icon}</span>
              <span className="text-[9px] font-bold truncate max-w-full">{o.name}</span>
            </button>
          );
        })}
      </div>

      {/* 4b. Handheld Weapon (Phi Kiếm / Quạt Xếp / Không) */}
      <div className="grid grid-cols-3 gap-1">
        {(
          [
            { id: 'none', icon: '∅', label: 'Tay Không' },
            { id: 'sword', icon: '⚔', label: 'Phi Kiếm' },
            { id: 'fan', icon: '🪭', label: 'Quạt Xếp' },
          ] as const
        ).map((w) => {
          const active = (config.weapon || 'sword') === w.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => update({ weapon: w.id })}
              className={`py-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer border transition-all ${
                active
                  ? 'bg-[#234A42] border-[#F5D687] text-[#FFF3C4]'
                  : 'bg-[#172E2C] border-transparent text-[#BFD4CB] hover:bg-[#203E3B]'
              }`}
            >
              <span>{w.icon}</span>
              <span>{w.label}</span>
            </button>
          );
        })}
      </div>

      {/* 5. Quick Foot Ring & Body Aura Icon Pickers */}
      <div className="space-y-1.5 pt-1 border-t border-[#C9A45C]/25">
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          <span className="text-[9px] font-bold text-[#9FC0B4] shrink-0 w-9">Vòng</span>
          {RING_CHOICES.map((rid) => {
            const active = config.footRingId === rid;
            const preset = rid > 0 ? getVfxRingPreset(rid) : null;
            return (
              <button
                key={`ring_${rid}`}
                type="button"
                onClick={() => update({ footRingId: rid })}
                title={preset ? preset.name : 'Tắt vòng chân'}
                className={`w-7 h-7 rounded-md shrink-0 flex items-center justify-center cursor-pointer border ${
                  active ? 'border-[#F5D687] bg-[#284E4A]' : 'border-white/10 bg-[#162C2A]'
                }`}
              >
                {preset ? (
                  <img src={preset.transparentUrl} alt="" className="w-6 h-6 object-contain" />
                ) : (
                  <span className="text-[10px] text-[#8CA89E]">∅</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          <span className="text-[9px] font-bold text-[#9FC0B4] shrink-0 w-9">Aura</span>
          {AURA_CHOICES.map((aid) => {
            const active = config.auraId === aid;
            const preset = aid > 0 ? getVfxAuraPreset(aid) : null;
            return (
              <button
                key={`aura_${aid}`}
                type="button"
                onClick={() => update({ auraId: aid })}
                title={preset ? preset.name : 'Tắt hào quang'}
                className={`w-7 h-7 rounded-md shrink-0 flex items-center justify-center cursor-pointer border ${
                  active ? 'border-[#F5D687] bg-[#284E4A]' : 'border-white/10 bg-[#162C2A]'
                }`}
              >
                {preset ? (
                  <img src={preset.url} alt="" className="w-6 h-6 object-contain" />
                ) : (
                  <span className="text-[10px] text-[#8CA89E]">∅</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
