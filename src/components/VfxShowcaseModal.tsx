import React, { useState } from 'react';
import {
  VFX_GROUP_LABELS,
  VFX_RING_PRESETS,
  VfxRingGroup,
  getVfxRingPreset,
} from '../data/vfxRings';
import {
  VfxRingTuningOverride,
  loadAssetStudioConfig,
  resetVfxRingTuning,
  saveAllVfxRingsTuning,
  saveVfxRingTuning,
} from '../utils/assetOverrides';
import { MagicRingVFX } from './MagicRingVFX';
import { sfx } from '../utils/sound';
import {
  CheckCircle2,
  Eye,
  Flame,
  Layers,
  RotateCcw,
  Save,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';

interface VfxShowcaseModalProps {
  onClose?: () => void;
  standalone?: boolean;
}

const GROUPS: VfxRingGroup[] = ['smoke_water', 'cosmic_orbit', 'rune_circle', 'lightning_fire'];

function getEffectiveTuningForRing(
  ringId: number,
  savedMap: Record<number, Partial<VfxRingTuningOverride>>,
): VfxRingTuningOverride {
  const p = getVfxRingPreset(ringId);
  const saved = savedMap[ringId] || {};
  return {
    rotationSpeed: saved.rotationSpeed ?? 1.0,
    bloomIntensity: saved.bloomIntensity ?? p.defaultBloom,
    uvDistortion: saved.uvDistortion ?? p.defaultUvDistortion,
    particleDensity: saved.particleDensity ?? p.defaultParticleDensity,
    showFloorLight: saved.showFloorLight ?? true,
    ringScale: saved.ringScale ?? 1.0,
    ringOffsetY: saved.ringOffsetY ?? 2,
  };
}

export const VfxShowcaseModal: React.FC<VfxShowcaseModalProps> = ({
  onClose,
  standalone = false,
}) => {
  const [savedRings, setSavedRings] = useState<Record<number, Partial<VfxRingTuningOverride>>>(
    () => loadAssetStudioConfig().vfxRings || {},
  );
  const [selectedId, setSelectedId] = useState<number>(16);
  const initialTuning = getEffectiveTuningForRing(16, loadAssetStudioConfig().vfxRings || {});

  const [rotationSpeed, setRotationSpeed] = useState<number>(initialTuning.rotationSpeed);
  const [bloomIntensity, setBloomIntensity] = useState<number>(initialTuning.bloomIntensity);
  const [uvDistortion, setUvDistortion] = useState<number>(initialTuning.uvDistortion);
  const [particleDensity, setParticleDensity] = useState<number>(initialTuning.particleDensity);
  const [ringScale, setRingScale] = useState<number>(initialTuning.ringScale);
  const [ringOffsetY, setRingOffsetY] = useState<number>(initialTuning.ringOffsetY);
  const [showFloorLight, setShowFloorLight] = useState<boolean>(initialTuning.showFloorLight);
  const [isometric, setIsometric] = useState<boolean>(true);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const selected = getVfxRingPreset(selectedId);

  const flashNotice = (msg: string) => {
    setSaveNotice(msg);
    window.setTimeout(() => setSaveNotice((cur) => (cur === msg ? null : cur)), 3200);
  };

  const selectRing = (ringId: number) => {
    const eff = getEffectiveTuningForRing(ringId, savedRings);
    setSelectedId(ringId);
    setRotationSpeed(eff.rotationSpeed);
    setBloomIntensity(eff.bloomIntensity);
    setUvDistortion(eff.uvDistortion);
    setParticleDensity(eff.particleDensity);
    setRingScale(eff.ringScale);
    setRingOffsetY(eff.ringOffsetY);
    setShowFloorLight(eff.showFloorLight);
  };

  const resetCurrentRing = () => {
    sfx.click();
    const nextCfg = resetVfxRingTuning(selectedId);
    setSavedRings(nextCfg.vfxRings);
    const p = getVfxRingPreset(selectedId);
    setRotationSpeed(1.0);
    setBloomIntensity(p.defaultBloom);
    setUvDistortion(p.defaultUvDistortion);
    setParticleDensity(p.defaultParticleDensity);
    setRingScale(1.0);
    setRingOffsetY(2);
    setShowFloorLight(true);
    flashNotice(`Đã đặt lại vòng #${String(selectedId).padStart(2, '0')} về mặc định & cập nhật game!`);
  };

  const currentPayload = (): VfxRingTuningOverride => ({
    rotationSpeed,
    bloomIntensity,
    uvDistortion,
    particleDensity,
    showFloorLight,
    ringScale,
    ringOffsetY,
  });

  const handleSaveCurrentRing = () => {
    const nextCfg = saveVfxRingTuning(selectedId, currentPayload());
    setSavedRings(nextCfg.vfxRings);
    sfx.upgrade();
    flashNotice(
      `Đã lưu & áp dụng vòng #${String(selectedId).padStart(2, '0')} (${selected.name}) trực tiếp vào game!`,
    );
  };

  const handleSaveAllRings = () => {
    const nextCfg = saveAllVfxRingsTuning(currentPayload());
    setSavedRings(nextCfg.vfxRings);
    sfx.upgrade();
    flashNotice('Đã lưu & áp dụng thông số hiện tại cho toàn bộ 16 vòng VFX trong game!');
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
              Tinh Chỉnh 16 Trận Pháp VFX · Lưu &amp; Áp Dụng Live Vào Game
            </h1>
            <p className="text-[11px] text-[#8FB3A8] truncate">
              Chọn vòng → Kéo thanh trượt tinh chỉnh → Bấm &quot;Lưu Vào Game&quot; để hiển thị ngay dưới chân đệ tử
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

      {saveNotice && (
        <div className="px-4 py-2 bg-[#123326] border-b border-[#34D399]/50 text-xs font-semibold text-[#A7F3D0] flex items-center justify-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveNotice}</span>
        </div>
      )}

      {/* Main Content: Left Spotlight + Sliders + Save, Right 16-Ring Grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: WebGL Spotlight Stage + Tuning Controls */}
          <div className="lg:col-span-5 space-y-4">
            {/* Simulated Dark Stone Floor Stage */}
            <div className="relative rounded-2xl overflow-hidden border border-[#243B44] bg-[#070D11] shadow-2xl min-h-[320px] sm:min-h-[360px] flex flex-col items-center justify-center p-4">
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
              <div
                className="relative z-10 flex items-center justify-center my-4 transition-transform"
                style={{
                  transform: `translateY(${ringOffsetY}px) scale(${ringScale.toFixed(2)})`,
                }}
              >
                <MagicRingVFX
                  ringId={selected.id}
                  size={250}
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

            {/* Real-time Shader & Particle Sliders + SAVE BUTTONS */}
            <div className="rounded-2xl bg-[#0B151B] border border-[#223942] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FCE6A6]">
                  <Sliders className="w-4 h-4" />
                  Tinh Chỉnh Shader &amp; VFX Trực Tiếp
                </div>
                <button
                  type="button"
                  onClick={resetCurrentRing}
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

              {/* Slider 5: In-Game Ring Scale & Vertical Offset */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#1A2D36]">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#A8C4BC]">Cỡ vòng trong game</span>
                    <span className="font-mono font-bold text-[#FDE047]">{ringScale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.05}
                    value={ringScale}
                    onChange={(e) => setRingScale(parseFloat(e.target.value))}
                    className="w-full accent-[#FACC15] cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#A8C4BC]">Lệch dọc dưới chân</span>
                    <span className="font-mono font-bold text-[#FDE047]">
                      {ringOffsetY > 0 ? `+${ringOffsetY}` : ringOffsetY}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-20}
                    max={20}
                    step={1}
                    value={ringOffsetY}
                    onChange={(e) => setRingOffsetY(parseInt(e.target.value, 10))}
                    className="w-full accent-[#FACC15] cursor-pointer"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-[#A8C4BC] pt-0.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showFloorLight}
                  onChange={(e) => setShowFloorLight(e.target.checked)}
                  className="accent-[#D4A24C]"
                />
                Bật ánh sáng môi trường hắt xuống mặt sàn (Ambient PointLight)
              </label>

              {/* SAVE & APPLY LIVE TO GAME BUTTONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#1A2D36]">
                <button
                  type="button"
                  onClick={handleSaveCurrentRing}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-b from-[#235746] to-[#163B30] hover:from-[#2C6C57] hover:to-[#1C4B3D] border border-[#6EE7B7]/80 text-[#ECFDF5] text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Lưu Vòng #{String(selectedId).padStart(2, '0')} Vào Game
                </button>
                <button
                  type="button"
                  onClick={handleSaveAllRings}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-b from-[#7A5416] to-[#52370C] hover:from-[#94661B] hover:to-[#694711] border border-[#FACC15]/70 text-[#FEF9C3] text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  Lưu Cho Cả 16 Vòng
                </button>
              </div>
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
                      const isSaved = Boolean(savedRings[ring.id]);
                      const cardTuning = isSel
                        ? currentPayload()
                        : getEffectiveTuningForRing(ring.id, savedRings);

                      return (
                        <button
                          key={ring.id}
                          type="button"
                          onClick={() => {
                            sfx.click();
                            selectRing(ring.id);
                          }}
                          className={`group relative rounded-xl p-2 flex flex-col items-center justify-between bg-[#060C0F] border transition-all cursor-pointer ${
                            isSel
                              ? 'border-[#FACC15] ring-2 ring-[#FACC15]/35 shadow-lg'
                              : isSaved
                                ? 'border-[#34D399]/60 hover:border-[#6EE7B7]'
                                : 'border-[#1C2F37] hover:border-[#496F7E]'
                          }`}
                        >
                          <div className="w-full flex items-center justify-between text-[10px] font-mono text-[#7C9FA9] mb-1">
                            <span>#{String(ring.id).padStart(2, '0')}</span>
                            <div className="flex items-center gap-1">
                              {isSaved && (
                                <span className="px-1 py-0.2 rounded bg-[#0F3828] text-[#6EE7B7] text-[9px] font-sans font-bold">
                                  Đã lưu
                                </span>
                              )}
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: ring.primaryColor }}
                              />
                            </div>
                          </div>

                          <div className="my-1 flex items-center justify-center">
                            <MagicRingVFX
                              ringId={ring.id}
                              size={112}
                              rotationSpeed={cardTuning.rotationSpeed}
                              bloomIntensity={cardTuning.bloomIntensity}
                              uvDistortion={cardTuning.uvDistortion}
                              particleDensity={cardTuning.particleDensity * 0.75}
                              isometric={isometric}
                              showFloorLight={cardTuning.showFloorLight}
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
