'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { whatsapp } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';
import type { ContactInfo } from '@/components/layout/types';

/**
 * Floating WhatsApp CTA — the primary conversion channel for this business.
 * Appears after the visitor scrolls a little so it never covers the hero.
 */
export function WhatsAppFab({ contact }: { contact: ContactInfo }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 420);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem('ses-wa-dismissed') === '1');
    } catch {
      /* storage blocked — just show it */
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      window.sessionStorage.setItem('ses-wa-dismissed', '1');
    } catch {
      /* ignore */
    }
  }

  if (dismissed || !visible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-[4.75rem] right-4 z-40 flex items-center gap-2 md:bottom-6 no-print',
        'animate-scale-in',
      )}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide WhatsApp button"
        className="absolute -left-2 -top-2 grid size-6 place-items-center rounded-full bg-white text-slate-500 shadow-soft ring-1 ring-slate-200 transition hover:text-slate-900 dark:bg-brand-navy-900 dark:text-slate-300 dark:ring-white/10"
      >
        <X className="size-3.5" />
      </button>
      <a
        href={whatsapp.general({ whatsappNumber: contact.whatsappNumber, businessName: contact.businessName })}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-13 items-center gap-2.5 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_-8px_rgba(37,211,102,0.6)] transition hover:bg-[#1eb959]"
      >
        <MessageCircle className="size-5" />
        <span className="hidden sm:inline">Chat with us</span>
      </a>
    </div>
  );
}
