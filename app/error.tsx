'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaced in the server log; the digest correlates with the server trace.
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
        <AlertTriangle className="size-7" />
      </span>

      <h1 className="mt-5 text-2xl font-bold sm:text-3xl">Something went wrong</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        We hit an unexpected problem loading this page. Please try again — and if it keeps happening, WhatsApp or call
        us and we will help you directly.
      </p>

      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset} icon={<RotateCcw className="size-4" />}>
          Try again
        </Button>
        <Button variant="outline" asChild icon={<Home className="size-4" />}>
          <Link href="/">Go to homepage</Link>
        </Button>
        <Button variant="whatsapp" asChild icon={<MessageCircle className="size-4" />}>
          <a href="https://wa.me/918892399728" target="_blank" rel="noopener noreferrer">
            WhatsApp us
          </a>
        </Button>
      </div>
    </div>
  );
}
