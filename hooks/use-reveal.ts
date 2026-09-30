'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './use-reduced-motion';

/**
 * Scroll-triggered reveal. Adds `data-visible="true"` once the element enters
 * the viewport; a `MutationObserver` picks up new children so lists that render
 * later (client-side filtering) still animate.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options?: { threshold?: number; rootMargin?: string }) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.setAttribute('data-visible', 'true');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).setAttribute('data-visible', 'true');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: options?.threshold ?? 0.12, rootMargin: options?.rootMargin ?? '0px 0px -60px 0px' },
    );

    const observeAll = () => el.querySelectorAll('[data-reveal]').forEach((child) => observer.observe(child));
    observeAll();
    el.setAttribute('data-visible', 'true');

    const mutation = new MutationObserver(observeAll);
    mutation.observe(el, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  }, [reduced, options?.threshold, options?.rootMargin]);

  return ref;
}

/** Tracks scroll position past a threshold (used for the sticky header). */
export function useScrolled(threshold = 16): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > threshold));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [threshold]);

  return scrolled;
}

/** Current vertical scroll offset (rAF-throttled). */
export function useScrollY(): number {
  const [y, setY] = useState(0);
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setY(window.scrollY));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  return y;
}
