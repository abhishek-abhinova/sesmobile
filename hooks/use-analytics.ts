'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useDevice } from './use-device';

/**
 * Privacy-conscious event tracking.
 *
 * Sends only event type + entity + path. No PII, no IP, no user agent beyond
 * the coarse device class that the browser exposes. All calls are fire-and-forget
 * and never block navigation — failures are silently ignored.
 */
export function useAnalytics() {
  const pathname = usePathname();
  const device = useDevice();
  const lastPath = useRef<string | null>(null);

  const track = useCallback(
    (payload: {
      type: string;
      entityType?: string;
      entityId?: string;
      path?: string;
      query?: string;
      metadata?: Record<string, string | number | boolean>;
    }) => {
      const body = JSON.stringify({
        ...payload,
        path: payload.path ?? pathname,
        device: device.isMobile ? 'mobile' : device.isTablet ? 'tablet' : 'desktop',
      });

      // `navigator.sendBeacon` survives page unload (important for WhatsApp clicks).
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon('/api/analytics/track', blob)) return;
      }

      void fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {
        /* analytics must never surface errors */
      });
    },
    [pathname, device.isMobile, device.isTablet],
  );

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    track({ type: 'PAGE_VIEW', path: pathname });
  }, [pathname, track]);

  return { track };
}

/**
 * Tracks a click immediately before an outbound navigation (WhatsApp / tel:).
 * Returns a handler you spread onto the anchor.
 */
export function useOutboundClickTracker() {
  const { track } = useAnalytics();
  return useCallback(
    (type: 'WHATSAPP_CLICK' | 'CALL_CLICK', entity?: { type: string; id: string; name?: string }) => {
      track({
        type,
        entityType: entity?.type,
        entityId: entity?.id,
        metadata: entity?.name ? { product: entity.name } : undefined,
      });
    },
    [track],
  );
}
