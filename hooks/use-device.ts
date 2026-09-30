'use client';

import { useEffect, useState } from 'react';

/** The Network Information API is not in the default DOM typings. */
interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
}

export interface DeviceProfile {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** Coarse pointer — touch-first interaction. */
  isTouch: boolean;
  /** Device reports very low resources; ship the lightweight experience. */
  isLowPower: boolean;
  /** Viewport width in CSS pixels. */
  width: number;
  ready: boolean;
}

const FALLBACK: DeviceProfile = {
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isTouch: false,
  isLowPower: false,
  width: 1280,
  ready: false,
};

function detect(): DeviceProfile {
  if (typeof window === 'undefined') return FALLBACK;

  const width = window.innerWidth;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;

  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;

  const isLowPower =
    Boolean(connection?.saveData) ||
    (typeof connection?.effectiveType === 'string' && ['slow-2g', '2g'].includes(connection.effectiveType)) ||
    cores <= 2 ||
    memory <= 2;

  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    isTouch,
    isLowPower,
    width,
    ready: true,
  };
}

/**
 * Device capability detection.
 *
 * Used to decide whether to mount decorative 3D, particle canvases and heavy
 * animation. Everything expensive is behind `!isMobile && !isLowPower`.
 */
export function useDevice(): DeviceProfile {
  const [profile, setProfile] = useState<DeviceProfile>(FALLBACK);

  useEffect(() => {
    setProfile(detect());

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => setProfile(detect()), 150);
    };

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return profile;
}
