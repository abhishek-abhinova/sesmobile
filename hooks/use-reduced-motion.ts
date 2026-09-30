'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks `prefers-reduced-motion`. Every animation in the app consults this
 * so we respect the OS accessibility setting rather than fighting it.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reduced;
}
