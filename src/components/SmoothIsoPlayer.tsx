import React, { useEffect, useRef, useState } from 'react';
import { PaperDollConfig } from '../data/characterPaperDoll';
import { ChibiPaperDoll } from './ChibiPaperDoll';

interface DustPuff {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
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
  const dustIdRef = useRef(1);
  const dustsRef = useRef<DustPuff[]>([]);

  const [renderState, setRenderState] = useState({
    x: 47,
    y: 58,
    isRunning: false,
    facingLeft: false,
    facingBack: false,
    tiltDeg: 0,
    bouncePx: 0,
    squashX: 1,
    squashY: 1,
    dusts: [] as DustPuff[],
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

  // WASD / Arrow keys listener
  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
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

  // 60fps smooth acceleration / braking / stride / dust physics loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let facingLeft = false;
    let facingBack = false;

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const keys = keysRef.current;
      let dirX = 0;
      let dirY = 0;
      if (keys.has('a') || keys.has('arrowleft')) dirX -= 1;
      if (keys.has('d') || keys.has('arrowright')) dirX += 1;
      if (keys.has('w') || keys.has('arrowup')) dirY -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dirY += 1;

      let desiredVx = 0;
      let desiredVy = 0;

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

      // Smooth 150ms acceleration / deceleration
      const accelRate = Math.min(1, dt / ACCEL_TIME_S);
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

      const isRunning = speed > 0.6;
      const speedRatio = Math.min(1, speed / MAX_SPEED_PCT);

      if (Math.abs(velRef.current.vx) > 0.35) {
        facingLeft = velRef.current.vx < 0;
      }
      if (Math.abs(velRef.current.vy) > 0.35) {
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
        if (dustTimerRef.current >= 0.24) {
          dustTimerRef.current = 0;
          const count = 2 + (Math.random() < 0.45 ? 1 : 0);
          for (let i = 0; i < count; i += 1) {
            dustsRef.current.push({
              id: dustIdRef.current++,
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
      } else {
        dustTimerRef.current = 0.18;
      }

      // Advance dust particles
      if (dustsRef.current.length > 0) {
        dustsRef.current = dustsRef.current
          .map((d) => ({
            ...d,
            age: d.age + dt,
            x: d.x + d.vx * dt,
            y: d.y + d.vy * dt,
          }))
          .filter((d) => d.age < d.life);
      }

      setRenderState({
        x: posRef.current.x,
        y: posRef.current.y,
        isRunning,
        facingLeft,
        facingBack,
        tiltDeg,
        bouncePx,
        squashX,
        squashY,
        dusts: dustsRef.current.slice(),
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

      {/* Footstep Earth/Sand Dust Puffs */}
      {renderState.dusts.map((d) => {
        const p = d.age / d.life;
        const opacity = (1 - p) * 0.55;
        const scale = 0.7 + p * 0.9;
        return (
          <div
            key={d.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-[1px]"
            style={{
              left: `${d.x}%`,
              top: `${d.y}%`,
              width: `${d.size}px`,
              height: `${d.size * 0.75}px`,
              backgroundColor: '#D6C29F',
              opacity,
              transform: `scale(${scale.toFixed(2)})`,
              zIndex: Math.round(98 + d.y * 10),
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
            motionState={renderState.isRunning ? 'run' : 'idle'}
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
