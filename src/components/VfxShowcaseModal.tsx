import React, { useState } from 'react';
import {
  VFX_GROUP_LABELS,
  VFX_RING_PRESETS,
  VfxRingGroup,
  getVfxRingPreset,
} from '../data/vfxRings';
import { MagicRingVFX } from './MagicRingVFX';
import { sfx } from '../utils/sound';
import {
  Eye,
  Flame,
  Layers,
  RotateCcw,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';

interface VfxShowcaseModalProps {
  onClose?: () => void;
  standalone?: boolean;
}

const GROUPS: VfxRingGroup[] = ['smoke_water', 'cosmic_orbit', 'rune_circle', 'lightning_fire'];

export const VfxShowcaseModal: React.FC<VfxShowcaseModalProps> = ({
  onClose,
  standalone = false,
}) => {
  const [selectedId, setSelectedId] = useState<number>(16);
  const [rotationSpeed, setRotationSpeed] = useState<number>(1.0);
  const [bloomIntensity, setBloomIntensity] = useState<number>(1.85);
  const [uvDistortion, setUvDistortion] = useState<number>(1.0);
  const [particleDensity, setParticleDensity] = useState<number>(1.15);
  const [isometric, setIsometric] = useState<boolean>(true);
  const [showFloorLight, setShowFloorLight] = useState<boolean>(true);

  const selected = getVfxRingPreset(selectedId);

  const applyPresetDefaults = (ringId: number) => {
    const p = getVfxRingPreset(ringId);
    setSelectedId(ringId);
    setRotationSpeed(1.0);
    setBloomIntensity(p.defaultBloom);
    setUvDistortion(p.defaultUvDistortion);
    setParticleDensity(p.defaultParticleDensity);
  };

  return (
    <div
      className={`${
        standalone ? 'min-h-screen w-full' : 'fixed inset-0 z-50'
      } bg-[#060B0E] text-[#EAF4F0] flex flex-col overflow-hidden`}
    >
      {/* Top Studio Header */}
      <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-[#0A1318]/95 border-b border-[#D4A24C]/30 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1C3D38] to-[#0D1E1D] border border-[#D4A24C]/70 flex items-center justify-center text-[#FCE6A6] shrink-0 shadow-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1
              className="text-base sm:text-xl font-bold text-[#FCE6A6] truncate"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Phòng Thử Nghiệm 16 Trận Pháp VFX · Thanh Vân Tiên Tông
            </h1>
            <p className="text-[11px] text-[#8FB3A8] truncate">
              WebGL Additive Shader · UV Noise Distortion · HDR Bloom · Dual-Layer Counter-Rotation · Floor PointLight
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              sfx.click();
              setIsometric((v) => !v);
            }}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              isometric
                ? 'bg-[#1D3B37] border-[#D4A24C] text-[#FCE6A6]'
                : 'bg-[#111E24] border-[#2C444D] text-[#A8C4BC]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {isometric ? 'Góc Nhìn Mặt Sàn (3D)' : 'Góc Nhìn Phẳng (2D)'}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={() => {
                sfx.click();
                onClose();
              }}
              className="w-8 h-8 rounded-lg bg-[#1A2930] hover:bg-[#263B45] border border-[#3B5561] text-[#D7E8E2] flex items-center justify-center cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content: Left Spotlight + Sliders, Right 16-Ring Grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: WebGL Spotlight Stage + Tuning Controls */}
          <div className="lg:col-span-5 space-y-4">
            {/* Simulated Dark Stone Floor Stage */}
            <div className="relative rounded-2xl overflow-hidden border border-[#243B44] bg-[#070D11] shadow-2xl min-h-[340px] sm:min-h-[380px] flex flex-col items-center justify-center p-4">
              {/* Perspective Grid Floor to clearly display ambient light reflection */}
              <div
                className="absolute inset-0 pointer-events-none opacity-35"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(120, 180, 190, 0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(120, 180, 190, 0.16) 1px, transparent 1px)',
                  backgroundSize: '36px 36px',
                  transform: isometric ? 'perspective(460px) rotateX(62deg) scale(1.6) translateY(28%)' : undefined,
                  transformOrigin: 'center center',
                }}
              />
              {/* Ambient colored floor pool reflecting onto stone grid */}
              {showFloorLight && (
                <div
                  className="absolute inset-x-6 bottom-6 h-40 rounded-full pointer-events-none blur-2xl transition-all duration-300"
                  style={{
                    background: `radial-gradient(ellipse at center, ${selected.primaryColor}66 0%, ${selected.secondaryColor}28 45%, transparent 75%)`,
                    opacity: Math.min(1, 0.45 + bloomIntensity * 0.25),
                  }}
                />
              )}

              {/* Ring Badge */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                <span className="px-2.5 py-1 rounded-full bg-[#0C181E]/90 border border-[#D4A24C]/50 text-[#FCE6A6] text-xs font-bold">
                  #{String(selected.id).padStart(2, '0')} · {selected.name}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#12262D]/90 border border-[#345B66] text-[11px] font-mono text-[#7DD3FC]">
                  {selected.group}
                </span>
              </div>

              {/* WebGL Shader MagicRingVFX */}
              <div className="relative z-10 flex items-center justify-center my-4">
                <MagicRingVFX
                  ringId={selected.id}
                  size={270}
                  rotationSpeed={rotationSpeed}
                  bloomIntensity={bloomIntensity}
                  uvDistortion={uvDistortion}
                  particleDensity={particleDensity}
                  isometric={isometric}
                  showFloorLight={showFloorLight}
                  renderMode="webgl"
                />
              </div>

              <div className="relative z-10 text-center text-xs text-[#9AB8B0]">
                <span className="font-semibold text-[#E8F4F0]">{selected.realmLabel}</span> ·{' '}
                <span>{selected.rowTitle}</span>
              </div>
            </div>

            {/* Real-time Shader & Particle Sliders */}
            <div className="rounded-2xl bg-[#0B151B] border border-[#223942] p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FCE6A6]">
                  <Sliders className="w-4 h-4" />
                  Tinh Chỉnh Shader &amp; VFX Trực Tiếp
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sfx.click();
                    applyPresetDefaults(selectedId);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#14252D] hover:bg-[#1D3540] border border-[#2F4E5B] text-[11px] font-semibold text-[#C2DCD4] flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Mặc định
                </button>
              </div>

              {/* Slider 1: Rotation Speed */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#A8C4BC]">Tốc Độ Xoay</span>
                  <span className="font-mono font-bold text-[#FCE6A6]">{rotationSpeed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.05}
                  value={rotationSpeed}
                  onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
                  className="w-full accent-[#D4A24C] cursor-pointer"
                />
              </div>

              {/* Slider 2: Bloom / HDR Intensity */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#A8C4BC]">Cường Độ Bloom / HDR Emissive</span>
                  <span className="font-mono font-bold text-[#7DD3FC]">{bloomIntensity.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.05}
                  value={bloomIntensity}
                  onChange={(e) => setBloomIntensity(parseFloat(e.target.value))}
                  className="w-full accent-[#38BDF8] cursor-pointer"
                />
              </div>

              {/* Slider 3: UV Noise Distortion */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#A8C4BC]">Độ Méo UV Noise (Uốn Lượn Năng Lượng)</span>
                  <span className="font-mono font-bold text-[#C084FC]">{uvDistortion.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2.5}
                  step={0.05}
                  value={uvDistortion}
                  onChange={(e) => setUvDistortion(parseFloat(e.target.value))}
                  className="w-full accent-[#C084FC] cursor-pointer"
                />
              </div>

              {/* Slider 4: Particle Density */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#A8C4BC]">Mật Độ Hạt Bay (Sparkles)</span>
                  <span className="font-mono font-bold text-[#6EE7B7]">{Math.round(particleDensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2.0}
                  step={0.05}
                  value={particleDensity}
                  onChange={(e) => setParticleDensity(parseFloat(e.target.value))}
                  className="w-full accent-[#34D399] cursor-pointer"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-[#A8C4BC] pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showFloorLight}
                  onChange={(e) => setShowFloorLight(e.target.checked)}
                  className="accent-[#D4A24C]"
                />
                Bật ánh sáng môi trường hắt xuống mặt sàn (Ambient PointLight)
              </label>
            </div>
          </div>

          {/* RIGHT: All 16 VFX Rings Grouped by 4 Cultivation Tiers */}
          <div className="lg:col-span-7 space-y-4">
            {GROUPS.map((groupKey) => {
              const meta = VFX_GROUP_LABELS[groupKey];
              const items = VFX_RING_PRESETS.filter((p) => p.group === groupKey);
              return (
                <section
                  key={groupKey}
                  className="rounded-2xl bg-[#0B151B]/95 border border-[#1E333C] p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div>
                      <h2 className="text-xs sm:text-sm font-bold text-[#FCE6A6] flex items-center gap-1.5">
                        {groupKey === 'lightning_fire' ? (
                          <Flame className="w-3.5 h-3.5 text-[#F97316]" />
                        ) : (
                          <Layers className="w-3.5 h-3.5 text-[#7DD3FC]" />
                        )}
                        {meta.title}
                      </h2>
                      <p className="text-[11px] text-[#7FA198]">{meta.subtitle}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#12242C] border border-[#2B4854] text-[10px] font-mono text-[#93C5FD]">
                      {meta.badge}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {items.map((ring) => {
                      const isSel = ring.id === selectedId;
                      return (
                        <button
                          key={ring.id}
                          type="button"
                          onClick={() => {
                            sfx.click();
                            applyPresetDefaults(ring.id);
                          }}
                          className={`group relative rounded-xl p-2 flex flex-col items-center justify-between bg-[#060C0F] border transition-all cursor-pointer ${
                            isSel
                              ? 'border-[#FACC15] ring-2 ring-[#FACC15]/35 shadow-lg'
                              : 'border-[#1C2F37] hover:border-[#496F7E]'
                          }`}
                        >
                          <div className="w-full flex items-center justify-between text-[10px] font-mono text-[#7C9FA9] mb-1">
                            <span>#{String(ring.id).padStart(2, '0')}</span>
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: ring.primaryColor }}
                            />
                          </div>

                          <div className="my-1 flex items-center justify-center">
                            <MagicRingVFX
                              ringId={ring.id}
                              size={112}
                              rotationSpeed={rotationSpeed}
                              bloomIntensity={bloomIntensity}
                              uvDistortion={uvDistortion}
                              particleDensity={particleDensity * 0.75}
                              isometric={isometric}
                              showFloorLight={showFloorLight}
                              renderMode="canvas2d"
                            />
                          </div>

                          <div className="w-full text-center mt-1">
                            <div className="text-[11px] font-bold text-[#EAF4F0] truncate">
                              {ring.name}
                            </div>
                            <div className="text-[10px] text-[#87ABA1] truncate">
                              {ring.realmLabel}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
