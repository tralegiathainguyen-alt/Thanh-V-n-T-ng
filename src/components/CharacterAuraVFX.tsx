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
  /** Render rising sparks & 3D helical orbiting ribbons */
  showParticles?: boolean;
  /** Phase offset so multiple disciples don't animate in robotic unison */
  phaseOffset?: number;
  /** Character content sandwiched between back layer (z-0) and front wrap layer (z-20) */
  children?: React.ReactNode;
  className?: string;
}

interface HelicalSpark {
  angle: number;
  vAngle: number;
  heightRatio: number; // 0 (feet) -> 1 (above head)
  vy: number;
  radiusMult: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

// Mask for the front aura pass: leaves the chibi's face (upper-center) 100% clear
// while allowing the glowing ribbons to sweep visibly across the waist, lower torso & sides!
const FRONT_WRAP_MASK =
  'radial-gradient(ellipse 34% 34% at 50% 34%, transparent 0%, transparent 55%, rgba(0,0,0,0.92) 100%)';

/**
 * True 3D Wrap-Around CharacterAuraVFX:
 * - Back Layer (z-0): RGBA aura texture behind the chibi + back-half (z < 0) of 3D helical orbiting ribbons & wisps.
 * - Character (z-10): Chibi sprite stays 100% sharp with clear face.
 * - Front Layer (z-20): Phase-shifted front-sweeping waist/torso wrap (face-masked) + front-half (z >= 0)
 *   of the exact same 3D helical energy ribbons & wisps, creating a genuine 360° wrap around the character's body!
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
  const canvasW = Math.round(auraSize * 1.15);
  const canvasH = Math.round(auraSize * 1.15);

  const backImgRef = useRef<HTMLImageElement | null>(null);
  const frontImgRef = useRef<HTMLImageElement | null>(null);
  const backCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frontCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const cfgRef = useRef({ preset, speed, intensity, showParticles, auraSize, phaseOffset, characterHeight });
  cfgRef.current = { preset, speed, intensity, showParticles, auraSize, phaseOffset, characterHeight };

  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();
    let t = phaseOffset;
    let lightningTimer = 0;
    let lightningFlip = 1;
    let lightningAlpha = 1;
    const sparks: HelicalSpark[] = [];

    const backCtx = backCanvasRef.current?.getContext('2d') ?? null;
    const frontCtx = frontCanvasRef.current?.getContext('2d') ?? null;

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      const cur = cfgRef.current;
      const spd = Math.max(0.05, cur.speed);
      t += dt * spd;

      // 1) Animate Back & Front RGBA Aura Textures with 3D cylindrical wrap feel (NO 360° flat spin!)
      let backTransform = '';
      let frontTransform = '';
      let backAlpha = cur.preset.backOpacity * cur.intensity;
      let frontAlpha = cur.preset.frontOpacity * cur.intensity;
      let brightness = 1;

      if (cur.preset.motion === 'lightning') {
        lightningTimer += dt * spd;
        if (lightningTimer >= 0.12 + (cur.preset.id % 3) * 0.04) {
          lightningTimer = 0;
          if (Math.random() < 0.5) lightningFlip = -lightningFlip;
          lightningAlpha = Math.random() < 0.2 ? 0.42 : 0.92 + Math.random() * 0.25;
        }
        const jx = (Math.sin(t * 28) * 1.6).toFixed(2);
        const jy = (Math.cos(t * 23) * 1.5).toFixed(2);
        const sy = (1 + Math.sin(t * 16) * 0.05).toFixed(3);
        backTransform = `translate(${jx}px, ${jy}px) scale(${lightningFlip}, ${sy})`;
        frontTransform = `translate(${(-Number(jx)).toFixed(2)}px, ${jy}px) scale(${-lightningFlip * 0.94}, ${(Number(sy) * 0.94).toFixed(3)})`;
        backAlpha *= lightningAlpha;
        frontAlpha *= lightningAlpha * 1.25;
        brightness = 0.95 + lightningAlpha * 0.28;
      } else if (cur.preset.motion === 'fire') {
        const surgeY = 1 + Math.sin(t * 7.2) * 0.06 + Math.sin(t * 13.4) * 0.035;
        const surgeX = 1 + Math.cos(t * 6.4) * 0.05;
        const swayX = Math.sin(t * 4.5) * 3.5;
        const skew = Math.sin(t * 5.3) * 4.2;
        const floatY = -Math.abs(Math.sin(t * 6.0)) * 3.2;
        const flicker = 0.88 + Math.sin(t * 16.5) * 0.12;

        backTransform = `translate(${(-swayX * 0.6).toFixed(2)}px, ${floatY.toFixed(2)}px) skewX(${skew.toFixed(2)}deg) scale(${surgeX.toFixed(3)}, ${surgeY.toFixed(3)})`;
        frontTransform = `translate(${(swayX * 0.8).toFixed(2)}px, ${(floatY + 3).toFixed(2)}px) skewX(${(-skew * 0.7).toFixed(2)}deg) scale(${(-surgeX * 0.95).toFixed(3)}, ${(surgeY * 0.92).toFixed(3)})`;
        backAlpha *= flicker;
        frontAlpha *= flicker * 1.2;
        brightness = 0.95 + flicker * 0.22;
      } else if (cur.preset.motion === 'ascend') {
        const orbitSin = Math.sin(t * 2.2);
        const orbitCos = Math.cos(t * 2.2);
        const stretchY = 1 + Math.sin(t * 2.8) * 0.065;
        const scaleXBack = 0.88 + Math.abs(orbitCos) * 0.16;
        const scaleXFront = -(0.86 + Math.abs(orbitSin) * 0.16);
        const floatY = -2 - Math.sin(t * 2.2) * 3.0;

        backTransform = `translate(${(-orbitSin * 4.5).toFixed(2)}px, ${floatY.toFixed(2)}px) scale(${scaleXBack.toFixed(3)}, ${stretchY.toFixed(3)})`;
        frontTransform = `translate(${(orbitSin * 5.5).toFixed(2)}px, ${(floatY + 4).toFixed(2)}px) scale(${scaleXFront.toFixed(3)}, ${(stretchY * 0.92).toFixed(3)})`;
        backAlpha *= 0.85 + Math.abs(orbitCos) * 0.15;
        frontAlpha *= 0.75 + Math.abs(orbitSin) * 0.45;
        brightness = 1.0 + Math.sin(t * 3.2) * 0.12;
      } else {
        // flow_ribbon (aura_01..12, aura_15): cylindrical 3D wrap oscillation around body!
        // Back & front layers shift in opposite horizontal phase + flip scaleX so ribbons visibly wrap around torso
        const orbitPhase = t * 1.9;
        const swingX = Math.sin(orbitPhase) * 6.5;
        const depthPulse = Math.cos(orbitPhase);
        const floatY = Math.sin(t * 2.1) * 3.2;
        const swayDeg = Math.sin(t * 1.4) * 3.6;
        const scaleXBack = 0.9 + Math.abs(depthPulse) * 0.14;
        const scaleYBack = 1 + Math.sin(t * 2.1 + 1.3) * 0.055;

        const scaleXFront = -(0.86 + (1 - Math.abs(depthPulse)) * 0.16);
        const scaleYFront = 0.92 + Math.sin(t * 2.1 + 0.4) * 0.05;

        backTransform = `translate(${(-swingX * 0.55).toFixed(2)}px, ${floatY.toFixed(2)}px) rotate(${swayDeg.toFixed(2)}deg) scale(${scaleXBack.toFixed(3)}, ${scaleYBack.toFixed(3)})`;
        frontTransform = `translate(${(swingX * 0.75).toFixed(2)}px, ${(floatY + 4).toFixed(2)}px) rotate(${(-swayDeg * 0.8).toFixed(2)}deg) scale(${scaleXFront.toFixed(3)}, ${scaleYFront.toFixed(3)})`;
        // Front ribbon brightens as it sweeps across the front waist, softens as it wraps around the sides
        frontAlpha *= 0.85 + Math.abs(Math.sin(orbitPhase)) * 0.45;
      }

      if (backImgRef.current) {
        backImgRef.current.style.transform = backTransform;
        backImgRef.current.style.opacity = Math.max(0, Math.min(1, backAlpha)).toFixed(3);
        backImgRef.current.style.filter =
          brightness !== 1
            ? `brightness(${brightness.toFixed(2)}) drop-shadow(0 0 6px ${cur.preset.primaryColor}66)`
            : `drop-shadow(0 0 5px ${cur.preset.primaryColor}55)`;
      }
      if (frontImgRef.current) {
        frontImgRef.current.style.transform = frontTransform;
        frontImgRef.current.style.opacity = Math.max(0, Math.min(0.65, frontAlpha)).toFixed(3);
      }

      // 2) Draw TRUE 3D Depth-Sorted Helical Orbiting Ribbons & Spiraling Wisps
      //    z = sin(angle): z < 0 draws on backCtx (behind chibi), z >= 0 draws on frontCtx (in front of chibi)!
      if (backCtx && frontCtx) {
        const w = backCanvasRef.current!.width;
        const h = backCanvasRef.current!.height;
        backCtx.clearRect(0, 0, w, h);
        frontCtx.clearRect(0, 0, w, h);

        if (cur.showParticles && cur.intensity > 0.05) {
          const cx = w * 0.5;
          const feetY = h * 0.88;
          const topY = h * 0.14;
          const bodyH = feetY - topY;
          const orbitRx = cur.characterHeight * 0.48;
          const orbitRy = cur.characterHeight * 0.12;

          // Draw 2 continuous 3D helical energy ribbons spiraling around the chibi's body
          const ribbonCount = cur.preset.motion === 'lightning' ? 1 : 2;
          const steps = 42;
          const spiralTurns = cur.preset.motion === 'ascend' ? 1.8 : 2.1;
          const baseOmega = cur.preset.motion === 'fire' ? 3.2 : cur.preset.motion === 'ascend' ? 2.8 : 2.15;

          for (let r = 0; r < ribbonCount; r++) {
            const rPhase = t * baseOmega + r * Math.PI;
            const color = r === 0 ? cur.preset.primaryColor : cur.preset.secondaryColor;

            for (let s = 0; s < steps; s++) {
              const u0 = s / steps;
              const u1 = (s + 1) / steps;
              const ang0 = rPhase + u0 * Math.PI * 2 * spiralTurns;
              const ang1 = rPhase + u1 * Math.PI * 2 * spiralTurns;
              const midAng = (ang0 + ang1) * 0.5;
              const zDepth = Math.sin(midAng); // < 0 behind character, >= 0 in front of character

              // Taper ribbon width at feet & head ends
              const env = Math.sin(u0 * Math.PI);
              if (env < 0.05) continue;

              // Gently flare radius around waist/chest so it visibly wraps around the chibi silhouette
              const rad0 = orbitRx * (0.78 + Math.sin(u0 * Math.PI) * 0.32);
              const rad1 = orbitRx * (0.78 + Math.sin(u1 * Math.PI) * 0.32);

              const x0 = cx + Math.cos(ang0) * rad0;
              const y0 = feetY - u0 * bodyH + Math.sin(ang0) * orbitRy;
              const x1 = cx + Math.cos(ang1) * rad1;
              const y1 = feetY - u1 * bodyH + Math.sin(ang1) * orbitRy;

              const targetCtx = zDepth >= 0 ? frontCtx : backCtx;
              const isFront = zDepth >= 0;

              // Softly fade ribbon right over the face region (u between 0.62 and 0.85 on front pass)
              let faceFade = 1;
              if (isFront && u0 > 0.56 && u0 < 0.86) {
                faceFade = 0.25;
              }

              targetCtx.save();
              targetCtx.globalCompositeOperation = isFront ? 'lighter' : 'source-over';
              targetCtx.lineCap = 'round';
              targetCtx.strokeStyle = color;
              targetCtx.globalAlpha =
                Math.min(0.9, env * (isFront ? 0.62 : 0.48) * faceFade * cur.intensity);
              targetCtx.lineWidth = (1.6 + env * 2.4) * (isFront ? 1.15 : 0.85);
              targetCtx.beginPath();
              targetCtx.moveTo(x0, y0);
              targetCtx.lineTo(x1, y1);
              targetCtx.stroke();

              // Bright inner core filament
              targetCtx.strokeStyle = '#FFFFFF';
              targetCtx.globalAlpha = Math.min(0.7, env * (isFront ? 0.38 : 0.2) * faceFade * cur.intensity);
              targetCtx.lineWidth = Math.max(0.7, env * 1.1);
              targetCtx.stroke();
              targetCtx.restore();
            }
          }

          // Spawn & update 3D helical orbiting sparkles (pass behind & in front of chibi!)
          const spawnRate = cur.preset.motion === 'ascend' ? 16 : cur.preset.motion === 'fire' ? 15 : 10;
          if (sparks.length < 24 && Math.random() < dt * spawnRate * spd) {
            sparks.push({
              angle: Math.random() * Math.PI * 2,
              vAngle: (cur.preset.motion === 'ascend' ? 2.4 : 3.2) + Math.random() * 1.8,
              heightRatio: Math.random() * 0.22,
              vy: (cur.preset.motion === 'ascend' ? 0.78 : 0.48) + Math.random() * 0.3,
              radiusMult: 0.78 + Math.random() * 0.42,
              size: 1.5 + Math.random() * 2.1,
              life: 0,
              maxLife: 0.95 + Math.random() * 0.75,
              color: Math.random() < 0.55 ? cur.preset.secondaryColor : cur.preset.primaryColor,
            });
          }

          for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i];
            s.life += dt * spd;
            if (s.life >= s.maxLife || s.heightRatio > 1.08) {
              sparks.splice(i, 1);
              continue;
            }
            s.angle += s.vAngle * dt * spd;
            s.heightRatio += s.vy * dt * spd;

            const zDepth = Math.sin(s.angle);
            const isFront = zDepth >= 0;
            const targetCtx = isFront ? frontCtx : backCtx;
            const sx = cx + Math.cos(s.angle) * (orbitRx * s.radiusMult);
            const sy = feetY - s.heightRatio * bodyH + zDepth * orbitRy;
            const lifeFade = Math.sin((s.life / s.maxLife) * Math.PI);

            targetCtx.save();
            targetCtx.globalCompositeOperation = 'lighter';
            targetCtx.globalAlpha = Math.max(0, Math.min(1, lifeFade * (isFront ? 0.95 : 0.65) * cur.intensity));
            targetCtx.fillStyle = s.color;
            targetCtx.beginPath();
            targetCtx.arc(sx, sy, s.size * (isFront ? 1.1 : 0.8), 0, Math.PI * 2);
            targetCtx.fill();
            targetCtx.restore();
          }
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [preset.id, phaseOffset]);

  return (
    <div className={`relative inline-flex items-end justify-center ${className}`}>
      {/* BACK LAYER (z-0): RGBA Aura Texture + Back-Half (z < 0) of 3D Helical Ribbons */}
      <img
        ref={backImgRef}
        src={preset.url}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none select-none absolute left-1/2 -bottom-1.5 z-0 object-contain"
        style={{
          width: auraSize,
          height: auraSize,
          marginLeft: -auraSize / 2,
          transformOrigin: '50% 80%',
        }}
      />
      {showParticles && (
        <canvas
          ref={backCanvasRef}
          width={canvasW}
          height={canvasH}
          className="pointer-events-none select-none absolute left-1/2 -bottom-2 z-[5]"
          style={{
            width: canvasW,
            height: canvasH,
            marginLeft: -canvasW / 2,
          }}
        />
      )}

      {/* CHARACTER LAYER (z-10): Chibi sprite stays 100% crisp */}
      <div className="relative z-10 flex items-end justify-center">{children}</div>

      {/* FRONT LAYER (z-20): Front-Sweeping Face-Masked Aura Wrap + Front-Half (z >= 0) of 3D Helical Ribbons */}
      <img
        ref={frontImgRef}
        src={preset.url}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none select-none absolute left-1/2 -bottom-1.5 z-20 object-contain mix-blend-screen"
        style={{
          width: auraSize,
          height: auraSize,
          marginLeft: -auraSize / 2,
          transformOrigin: '50% 80%',
          WebkitMaskImage: FRONT_WRAP_MASK,
          maskImage: FRONT_WRAP_MASK,
        }}
      />
      {showParticles && (
        <canvas
          ref={frontCanvasRef}
          width={canvasW}
          height={canvasH}
          className="pointer-events-none select-none absolute left-1/2 -bottom-2 z-30"
          style={{
            width: canvasW,
            height: canvasH,
            marginLeft: -canvasW / 2,
          }}
        />
      )}
    </div>
  );
};
