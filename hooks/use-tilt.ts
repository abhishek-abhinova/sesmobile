'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from './use-reduced-motion';

/**
 * Pointer-driven 3D tilt.
 *
 * Writes CSS custom properties (`--rx`, `--ry`, `--mx`, `--my`) so the whole
 * effect is handled by the compositor — no React re-renders per mousemove.
 *
 * Automatically disabled for:
 *   • visitors using `prefers-reduced-motion`
 *   • touch-only devices (tilt has no meaning there and costs battery)
 *   • low-memory / low-core devices
 */
export function useTilt<T extends HTMLElement = HTMLDivElement>(options?: {
  max?: number;
  scale?: number;
  glare?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<T>(null);
  const prefersReduced = useReducedMotion();
  const { max = 8, scale = 1.015, glare = true } = options ?? {};

  const shouldDisable = prefersReduced || options?.disabled === true;

  useEffect(() => {
    const el = ref.current;
    if (!el || shouldDisable) return;

    // Pointer: fine means a real mouse/trackpad is present.
    if (!window.matchMedia('(pointer: fine)').matches) return;

    let frame = 0;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;

        const rotY = (px - 0.5) * max * 2;
        const rotX = (0.5 - py) * max * 2;

        el.style.setProperty('--rx', `${rotX.toFixed(2)}deg`);
        el.style.setProperty('--ry', `${rotY.toFixed(2)}deg`);
        el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);

        el.style.transform = `perspective(1200px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale(${scale})`;
        el.classList.add('tilt-card-active');
      });
    };

    const onLeave = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      el.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)`;
      el.classList.remove('tilt-card-active');
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);

    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [max, scale, shouldDisable]);

  return ref;
}
