import React, { useEffect, useRef, useState } from 'react';
import { PaperDollConfig } from '../data/characterPaperDoll';
import { ChibiPaperDoll } from './ChibiPaperDoll';

interface MotionParticle {
  id: number;
  kind: 'dust' | 'qi' | 'wind';
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  angleDeg?: number;
  color?: string;
}

export interface SmoothIsoPlayerProps {
  config: PaperDollConfig;
  playerName: string;
  unitScale: number;
  /** Percentage (0..100) map click target */
  clickTarget: { x: number; y: number; id: number } | null;
}

const MAX_SPEED_PCT = 14.5; // % of map width/sec
const ACCEL_TIME_S = 0.15; // 150ms smooth acceleration ramp

export const SmoothIsoPlayer: React.FC<SmoothIsoPlayerProps> = ({
  config,
  playerName,
  unitScale,
  clickTarget,
}) => {
  const posRef = useRef({ x: 47, y: 58 });
  const velRef = useRef({ vx: 0, vy: 0 });
  const targetRef = useRef<{ x: number; y: number } | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const strideRef = useRef(0);
  const dustTimerRef = useRef(0);
  const vfxTimerRef = useRef(0);
  const attackTimerRef = useRef(0);
  const facingLeftRef = useRef(false);
  const particleIdRef = useRef(1);
  const particlesRef = useRef<MotionParticle[]>([]);

  const [renderState, setRenderState] = useState({
    x: 47,
    y: 58,
    isRunning: false,
    isAttacking: false,
    strideFrame: 0 as 0 | 1,
    facingLeft: false,
    facingBack: false,
    tiltDeg: 0,
    bouncePx: 0,
    squashX: 1,
    squashY: 1,
    particles: [] as MotionParticle[],
  });

  const [marker, setMarker] = useState<{ x: number; y: number; id: number } | null>(null);

  // Sync click-to-move target & spawn fading ground target dot
  useEffect(() => {
    if (!clickTarget) return;
    const clampedX = Math.max(12, Math.min(86, clickTarget.x));
    const clampedY = Math.max(24, Math.min(86, clickTarget.y));
    targetRef.current = { x: clampedX, y: clampedY };
    setMarker({ x: clampedX, y: clampedY, id: clickTarget.id });
    const t = window.setTimeout(() => {
      setMarker((cur) => (cur && cur.id === clickTarget.id ? null : cur));
    }, 620);
    return () => window.clearTimeout(t);
  }, [clickTarget]);

  // WASD / Arrow keys + Spacebar (Sword-Qi Flourish) listener
  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (attackTimerRef.current <= 0.12) {
          attackTimerRef.current = 0.55;
          // Crisp forward impulse dash in facing direction
          const dir = facingLeftRef.current ? -1 : 1;
          velRef.current.vx = dir * MAX_SPEED_PCT * 0.95;
          // Burst of golden qi sparkles on flourish
          for (let i = 0; i < 6; i += 1) {
            particlesRef.current.push({
              id: particleIdRef.current++,
              kind: 'qi',
              x: posRef.current.x + dir * (1.2 + Math.random() * 1.4),
              y: posRef.current.y - 2.2 + (Math.random() - 0.5) * 3.0,
              vx: dir * (4 + Math.random() * 5),
              vy: (Math.random() - 0.5) * 4,
              age: 0,
              life: 0.36 + Math.random() * 0.18,
              size: 4 + Math.random() * 4,
              color: i % 2 === 0 ? '#FDE047' : '#6EE7B7',
            });
          }
        }
        return;
      }
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        keysRef.current.add(k);
        targetRef.current = null; // manual keyboard overrides click target
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    const onBlur = () => keysRef.current.clear();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // 60fps smooth acceleration / braking / stride / motion VFX physics loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let facingLeft = false;
    let facingBack = false;

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      if (attackTimerRef.current > 0) {
        attackTimerRef.current = Math.max(0, attackTimerRef.current - dt);
      }
      const isAttacking = attackTimerRef.current > 0;

      const keys = keysRef.current;
      let dirX = 0;
      let dirY = 0;
      if (keys.has('a') || keys.has('arrowleft')) dirX -= 1;
      if (keys.has('d') || keys.has('arrowright')) dirX += 1;
      if (keys.has('w') || keys.has('arrowup')) dirY -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dirY += 1;

      let desiredVx = 0;
      let desiredVy = 0;

      if (!isAttacking) {
        if (dirX !== 0 || dirY !== 0) {
          const len = Math.hypot(dirX, dirY);
          desiredVx = (dirX / len) * MAX_SPEED_PCT;
          desiredVy = (dirY / len) * MAX_SPEED_PCT * 0.72; // isometric vertical foreshortening
        } else if (targetRef.current) {
          const dx = targetRef.current.x - posRef.current.x;
          const dy = targetRef.current.y - posRef.current.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 0.55) {
            targetRef.current = null;
          } else {
            // Smooth braking within 5.5% of destination
            const brake = Math.min(1, dist / 5.5);
            const spd = MAX_SPEED_PCT * Math.max(0.22, brake);
            desiredVx = (dx / dist) * spd;
            desiredVy = (dy / dist) * spd * 0.85;
          }
        }
      }

      // Smooth 150ms acceleration / deceleration
      const accelRate = Math.min(1, dt / (isAttacking ? 0.12 : ACCEL_TIME_S));
      velRef.current.vx += (desiredVx - velRef.current.vx) * accelRate;
      velRef.current.vy += (desiredVy - velRef.current.vy) * accelRate;

      const speed = Math.hypot(velRef.current.vx, velRef.current.vy);
      if (speed < 0.15 && desiredVx === 0 && desiredVy === 0) {
        velRef.current.vx = 0;
        velRef.current.vy = 0;
      } else {
        posRef.current.x = Math.max(12, Math.min(86, posRef.current.x + velRef.current.vx * dt));
        posRef.current.y = Math.max(24, Math.min(86, posRef.current.y + velRef.current.vy * dt));
      }

      const isRunning = !isAttacking && speed > 0.6;
      const speedRatio = Math.min(1, speed / MAX_SPEED_PCT);

      if (Math.abs(velRef.current.vx) > 0.35 && !isAttacking) {
        facingLeft = velRef.current.vx < 0;
        facingLeftRef.current = facingLeft;
      }
      if (Math.abs(velRef.current.vy) > 0.35 && !isAttacking) {
        facingBack = velRef.current.vy < 0;
      }

      let bouncePx = 0;
      let squashX = 1;
      let squashY = 1;
      let tiltDeg = 0;

      if (isRunning) {
        strideRef.current += dt * 11.5 * Math.max(0.55, speedRatio);
        bouncePx = Math.abs(Math.sin(strideRef.current)) * 5.2 * speedRatio;
        const squashWave = Math.cos(strideRef.current * 2) * 0.05 * speedRatio;
        squashX = 1 + squashWave;
        squashY = 1 - squashWave;
        tiltDeg = (velRef.current.vx >= 0 ? 4.5 : -4.5) * speedRatio;

        // Spawn 2-3 soft sand/earth dust puffs behind feet per stride
        dustTimerRef.current += dt;
        if (dustTimerRef.current >= 0.22) {
          dustTimerRef.current = 0;
          const count = 2 + (Math.random() < 0.45 ? 1 : 0);
          for (let i = 0; i < count; i += 1) {
            particlesRef.current.push({
              id: particleIdRef.current++,
              kind: 'dust',
              x: posRef.current.x + (Math.random() - 0.5) * 0.9,
              y: posRef.current.y + (Math.random() - 0.5) * 0.4,
              vx: -velRef.current.vx * 0.14 + (Math.random() - 0.5) * 1.4,
              vy: -velRef.current.vy * 0.14 - 0.6 - Math.random() * 0.8,
              age: 0,
              life: 0.42 + Math.random() * 0.16,
              size: 5 + Math.random() * 4,
            });
          }
        }

        // Spawn Xianxia spirit-wind trail + golden/jade qi sparkles when moving briskly
        vfxTimerRef.current += dt;
        if (speedRatio > 0.38 && vfxTimerRef.current >= 0.095) {
          vfxTimerRef.current = 0;
          const moveAngle = (Math.atan2(velRef.current.vy, velRef.current.vx) * 180) / Math.PI;
          // Spirit wind streak
          particlesRef.current.push({
            id: particleIdRef.current++,
            kind: 'wind',
            x: posRef.current.x - velRef.current.vx * 0.045,
            y: posRef.current.y - 2.2 - Math.random() * 2.8,
            vx: -velRef.current.vx * 0.12,
            vy: -velRef.current.vy * 0.12,
            age: 0,
            life: 0.26,
            size: 16 + Math.random() * 12,
            angleDeg: moveAngle,
            color: Math.random() < 0.5 ? '#A7F3D0' : '#FEF08A',
          });
          // Floating qi sparkle mote
          particlesRef.current.push({
            id: particleIdRef.current++,
            kind: 'qi',
            x: posRef.current.x + (Math.random() - 0.5) * 1.4,
            y: posRef.current.y - 1.2 - Math.random() * 4.2,
            vx: -velRef.current.vx * 0.08 + (Math.random() - 0.5) * 0.9,
            vy: -1.4 - Math.random() * 1.2,
            age: 0,
            life: 0.46 + Math.random() * 0.2,
            size: 3 + Math.random() * 3,
            color: Math.random() < 0.55 ? '#FDE047' : '#6EE7B7',
          });
        }
      } else {
        dustTimerRef.current = 0.18;
        vfxTimerRef.current = 0.06;
      }

      // Advance motion particles
      if (particlesRef.current.length > 0) {
        particlesRef.current = particlesRef.current
          .map((d) => ({
            ...d,
            age: d.age + dt,
            x: d.x + d.vx * dt,
            y: d.y + d.vy * dt,
          }))
          .filter((d) => d.age < d.life);
      }

      const strideFrame = (Math.floor(strideRef.current / Math.PI) % 2) as 0 | 1;

      setRenderState({
        x: posRef.current.x,
        y: posRef.current.y,
        isRunning,
        isAttacking,
        strideFrame,
        facingLeft,
        facingBack: isAttacking ? false : facingBack,
        tiltDeg,
        bouncePx,
        squashX,
        squashY,
        particles: particlesRef.current.slice(),
      });

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const dollSize = Math.round(98 * Math.max(0.55, Math.min(1.15, unitScale)));

  return (
    <>
      {/* Ground Click-to-Move Target Dot & Expanding Ring */}
      {marker && (
        <div
          key={marker.id}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-[65]"
          style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
        >
          <div className="w-8 h-4 rounded-full border-2 border-[#FDE047] bg-[#FDE047]/20 animate-ping" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-1 rounded-full bg-[#FEF08A]" />
        </div>
      )}

      {/* Motion VFX: Footstep Dust + Spirit Wind Streaks + Golden Qi Sparkles */}
      {renderState.particles.map((p) => {
        const t = p.age / p.life;
        if (p.kind === 'wind') {
          return (
            <div
              key={p.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: '2.5px',
                background: `linear-gradient(90deg, transparent, ${p.color || '#A7F3D0'}, transparent)`,
                opacity: (1 - t) * 0.72,
                transform: `rotate(${p.angleDeg ?? 0}deg) scaleX(${(0.75 + t * 0.55).toFixed(2)})`,
                mixBlendMode: 'screen',
                zIndex: Math.round(99 + p.y * 10),
              }}
            />
          );
        }
        if (p.kind === 'qi') {
          return (
            <div
              key={p.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color || '#FDE047',
                boxShadow: `0 0 6px ${p.color || '#FDE047'}`,
                opacity: (1 - t) * 0.88,
                transform: `scale(${(1 - t * 0.45).toFixed(2)})`,
                mixBlendMode: 'screen',
                zIndex: Math.round(101 + p.y * 10),
              }}
            />
          );
        }
        const opacity = (1 - t) * 0.55;
        const scale = 0.7 + t * 0.9;
        return (
          <div
            key={p.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-[1px]"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size * 0.75}px`,
              backgroundColor: '#D6C29F',
              opacity,
              transform: `scale(${scale.toFixed(2)})`,
              zIndex: Math.round(98 + p.y * 10),
            }}
          />
        );
      })}

      {/* Controllable Paper Doll Main Character (2.5D Y-Sorted) */}
      <div
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
        style={{
          left: `${renderState.x}%`,
          top: `${renderState.y}%`,
          zIndex: Math.round(100 + renderState.y * 10),
        }}
      >
        <div className="flex flex-col items-center">
          <div className="mb-0.5 px-2 py-0.5 rounded-full bg-[#102221]/85 border border-[#F5D687]/75 text-[10px] font-bold text-[#FFF3C4] whitespace-nowrap shadow">
            ★ {playerName}
          </div>
          <ChibiPaperDoll
            config={config}
            motionState={
              renderState.isAttacking
                ? 'attack'
                : renderState.isRunning
                  ? 'run'
                  : 'idle'
            }
            strideFrame={renderState.strideFrame}
            facingLeft={renderState.facingLeft}
            facingBack={renderState.facingBack}
            size={dollSize}
            tiltDeg={renderState.tiltDeg}
            bouncePx={renderState.bouncePx}
            squashX={renderState.squashX}
            squashY={renderState.squashY}
          />
        </div>
      </div>
    </>
  );
};
