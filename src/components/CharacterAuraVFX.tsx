import React, { useEffect, useRef } from 'react';
import { getVfxAuraPreset, VfxAuraPreset } from '../data/vfxAuras';

export interface CharacterAuraVFXProps {
  auraId: number; // 1..16
  /** Base height (px) of the character being wrapped; aura scales to 1.4x-1.7x of this */
  characterHeight?: number;
  /** Optional speed multiplier (default 1.0) */
  speed?: number;
  /** Optional overall opacity multiplier (default 1.0) */
  intensity?: number;
  /** Render rising sparks/embers overlay */
  showParticles?: boolean;
  /** Phase offset so multiple disciples don't sway in robotic unison */
  phaseOffset?: number;
  /** Character content rendered sandwiched between back layer (z-0) and front luminous wrap (z-20) */
  children?: React.ReactNode;
  className?: string;
}

interface AuraSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

const FACE_WINDOW_MASK =
  'radial-gradient(ellipse 34% 40% at 50% 42%, transparent 0%, transparent 50%, rgba(0,0,0,0.85) 100%)';

/**
 * Reusable 2-layer vertical Character Aura VFX component:
 * - Back layer (below character): crisp RGBA Normal Blending so colors pop on bright daylight maps.
 * - Front layer (above character): subtle screen-blended phase-shifted wrap with center-face mask
 *   so ribbons feel 3D-wrapped around the chibi without ever obscuring the face.
 * - Natural vertical motion presets (NO 360° rotation):
 *   - flow_ribbon: float + soft sway/skew ±3.5-5° + out-of-phase scaleX/scaleY breathing
 *   - fire: rapid flicker + irregular vertical flame surge
 *   - lightning: snappy bursts + occasional horizontal flip (scaleX: -1)
 *   - ascend: upward stretch pulse + straight-upward rising radiant particles
 */
export const CharacterAuraVFX: React.FC<CharacterAuraVFXProps> = ({
  auraId,
  characterHeight = 80,
  speed = 1,
  intensity = 1,
  showParticles = true,
  phaseOffset = 0,
  children,
  className = '',
}) => {
  const preset: VfxAuraPreset = getVfxAuraPreset(auraId);
  const auraSize = Math.round(characterHeight * preset.heightRatio);

  const backRef = useRef<HTMLImageElement | null>(null);
  const frontRef = useRef<HTMLImageElement | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const cfgRef = useRef({ preset, speed, intensity, showParticles, auraSize, phaseOffset });
  cfgRef.current = { preset, speed, intensity, showParticles, auraSize, phaseOffset };

  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();
    let t = phaseOffset;
    let lightningTimer = 0;
    let lightningFlip = 1;
    let lightningAlpha = 1;
    const sparks: AuraSpark[] = [];

    const pCanvas = particleCanvasRef.current;
    const pCtx = pCanvas ? pCanvas.getContext('2d') : null;

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      const cur = cfgRef.current;
      const spd = Math.max(0.05, cur.speed);
      t += dt * spd;

      let backTransform = '';
      let frontTransform = '';
      let backAlpha = cur.preset.backOpacity * cur.intensity;
      let frontAlpha = cur.preset.frontOpacity * cur.intensity;
      let brightness = 1;

      if (cur.preset.motion === 'lightning') {
        lightningTimer += dt * spd;
        if (lightningTimer >= 0.13 + (cur.preset.id % 3) * 0.04) {
          lightningTimer = 0;
          if (Math.random() < 0.45) lightningFlip = -lightningFlip;
          lightningAlpha = Math.random() < 0.22 ? 0.45 : 0.92 + Math.random() * 0.25;
        }
        const jitterX = (Math.sin(t * 28) * 1.4).toFixed(2);
        const jitterY = (Math.cos(t * 23) * 1.5).toFixed(2);
        const scaleY = (1 + Math.sin(t * 17) * 0.045).toFixed(3);
        backTransform = `translate(${jitterX}px, ${jitterY}px) scale(${lightningFlip}, ${scaleY})`;
        frontTransform = `translate(${(-Number(jitterX)).toFixed(2)}px, ${jitterY}px) scale(${-lightningFlip * 1.03}, ${(Number(scaleY) * 1.02).toFixed(3)})`;
        backAlpha *= lightningAlpha;
        frontAlpha *= lightningAlpha * 1.15;
        brightness = 0.95 + lightningAlpha * 0.28;
      } else if (cur.preset.motion === 'fire') {
        const surgeY = 1 + Math.sin(t * 7.2) * 0.055 + Math.sin(t * 13.4) * 0.035;
        const surgeX = 1 + Math.cos(t * 6.4) * 0.04;
        const skew = Math.sin(t * 5.3) * 3.8 + Math.cos(t * 11.1) * 1.6;
        const floatY = -Math.abs(Math.sin(t * 6.0)) * 3.5;
        const flicker = 0.88 + Math.sin(t * 16.5) * 0.12 + Math.cos(t * 23.0) * 0.06;

        backTransform = `translateY(${floatY.toFixed(2)}px) skewX(${skew.toFixed(2)}deg) scale(${surgeX.toFixed(3)}, ${surgeY.toFixed(3)})`;
        frontTransform = `translateY(${(floatY - 1.5).toFixed(2)}px) skewX(${(-skew * 0.7).toFixed(2)}deg) scale(${(surgeX * 1.04).toFixed(3)}, ${(surgeY * 1.03).toFixed(3)})`;
        backAlpha *= flicker;
        frontAlpha *= flicker * 1.15;
        brightness = 0.95 + flicker * 0.22;
      } else if (cur.preset.motion === 'ascend') {
        const stretchY = 1 + Math.sin(t * 2.8) * 0.065;
        const breatheX = 1 - Math.sin(t * 2.8) * 0.035;
        const floatY = -3 - Math.sin(t * 2.2) * 3.5;
        const sway = Math.sin(t * 1.5) * 2.2;
        const pulse = 0.92 + Math.sin(t * 3.4) * 0.1;

        backTransform = `translateY(${floatY.toFixed(2)}px) rotate(${sway.toFixed(2)}deg) scale(${breatheX.toFixed(3)}, ${stretchY.toFixed(3)})`;
        frontTransform = `translateY(${(floatY - 2).toFixed(2)}px) rotate(${(-sway * 0.6).toFixed(2)}deg) scale(${(breatheX * 1.04).toFixed(3)}, ${(stretchY * 1.04).toFixed(3)})`;
        backAlpha *= pulse;
        frontAlpha *= pulse * 1.1;
        brightness = 1.0 + Math.sin(t * 3.4) * 0.12;
      } else {
        // flow_ribbon (aura_01..12, aura_15): gentle float + soft sway/skew ±3.5-5° + out-of-phase scaleX/scaleY breathing
        const floatY = Math.sin(t * 1.9) * 3.5;
        const swayDeg = Math.sin(t * 1.35) * 3.8;
        const skewDeg = Math.cos(t * 1.6) * 2.8;
        const scaleX = 1 + Math.sin(t * 2.1) * 0.055;
        const scaleY = 1 + Math.sin(t * 2.1 + 1.4) * 0.055;

        const fFloatY = Math.sin(t * 1.9 + 1.1) * 3.8;
        const fSwayDeg = Math.sin(t * 1.35 + 1.2) * 4.2;
        const fScaleX = 1.03 + Math.sin(t * 2.1 + 2.0) * 0.05;
        const fScaleY = 1.03 + Math.sin(t * 2.1 + 0.5) * 0.05;

        backTransform = `translateY(${floatY.toFixed(2)}px) rotate(${swayDeg.toFixed(2)}deg) skewX(${skewDeg.toFixed(2)}deg) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
        frontTransform = `translateY(${fFloatY.toFixed(2)}px) rotate(${fSwayDeg.toFixed(2)}deg) scale(${fScaleX.toFixed(3)}, ${fScaleY.toFixed(3)})`;
      }

      if (backRef.current) {
        backRef.current.style.transform = backTransform;
        backRef.current.style.opacity = Math.max(0, Math.min(1, backAlpha)).toFixed(3);
        backRef.current.style.filter =
          brightness !== 1
            ? `brightness(${brightness.toFixed(2)}) drop-shadow(0 0 6px ${cur.preset.primaryColor}66)`
            : `drop-shadow(0 0 5px ${cur.preset.primaryColor}55)`;
      }
      if (frontRef.current) {
        frontRef.current.style.transform = frontTransform;
        frontRef.current.style.opacity = Math.max(0, Math.min(0.6, frontAlpha)).toFixed(3);
      }

      // Auxiliary rising particles from feet up past head
      if (pCanvas && pCtx) {
        const w = pCanvas.width;
        const h = pCanvas.height;
        pCtx.clearRect(0, 0, w, h);

        if (cur.showParticles && cur.intensity > 0.05) {
          const spawnRate = cur.preset.motion === 'ascend' ? 14 : cur.preset.motion === 'fire' ? 13 : 7;
          if (sparks.length < 24 && Math.random() < dt * spawnRate * spd) {
            const isAscend = cur.preset.motion === 'ascend';
            sparks.push({
              x: w * (0.24 + Math.random() * 0.52),
              y: h * (0.72 + Math.random() * 0.2),
              vx: isAscend ? (Math.random() - 0.5) * 8 : (Math.random() - 0.5) * 18,
              vy: isAscend ? -(48 + Math.random() * 44) : -(24 + Math.random() * 28),
              size: 1.5 + Math.random() * 2.2,
              life: 0,
              maxLife: isAscend ? 0.75 + Math.random() * 0.45 : 0.9 + Math.random() * 0.7,
              color: Math.random() < 0.5 ? cur.preset.secondaryColor : cur.preset.primaryColor,
            });
          }

          pCtx.save();
          pCtx.globalCompositeOperation = 'lighter';
          for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i];
            s.life += dt * spd;
            if (s.life >= s.maxLife) {
              sparks.splice(i, 1);
              continue;
            }
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            const p = s.life / s.maxLife;
            const alpha = Math.sin(p * Math.PI) * 0.9 * cur.intensity;
            pCtx.globalAlpha = Math.max(0, Math.min(1, alpha));
            pCtx.fillStyle = s.color;
            pCtx.beginPath();
            pCtx.arc(s.x, s.y, s.size * (1 - p * 0.35), 0, Math.PI * 2);
            pCtx.fill();
          }
          pCtx.restore();
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [preset.id, phaseOffset]);

  return (
    <div className={`relative inline-flex items-end justify-center ${className}`}>
      {/* BACK LAYER (z-0): Crisp Normal-blended RGBA PNG behind the chibi */}
      <img
        ref={backRef}
        src={preset.url}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none select-none absolute left-1/2 bottom-0 z-0 object-contain"
        style={{
          width: auraSize,
          height: auraSize,
          marginLeft: -auraSize / 2,
          transformOrigin: '50% 85%',
        }}
      />

      {/* CHARACTER LAYER (z-10): Chibi sprite stays 100% sharp and readable */}
      <div className="relative z-10 flex items-end justify-center">{children}</div>

      {/* FRONT LAYER (z-20): Subtle luminous wrap with center-face window mask so face is NEVER covered */}
      <img
        ref={frontRef}
        src={preset.url}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none select-none absolute left-1/2 bottom-0 z-20 object-contain mix-blend-screen"
        style={{
          width: auraSize,
          height: auraSize,
          marginLeft: -auraSize / 2,
          transformOrigin: '50% 85%',
          WebkitMaskImage: FACE_WINDOW_MASK,
          maskImage: FACE_WINDOW_MASK,
        }}
      />

      {/* RISING PARTICLES LAYER (z-30) */}
      {showParticles && (
        <canvas
          ref={particleCanvasRef}
          width={Math.round(auraSize * 1.1)}
          height={Math.round(auraSize * 1.15)}
          className="pointer-events-none select-none absolute left-1/2 bottom-0 z-30"
          style={{
            width: Math.round(auraSize * 1.1),
            height: Math.round(auraSize * 1.15),
            marginLeft: -Math.round((auraSize * 1.1) / 2),
          }}
        />
      )}
    </div>
  );
};
