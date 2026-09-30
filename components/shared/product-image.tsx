'use client';

import { useState } from 'react';
import { PackageOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Product / category image with a graceful placeholder.
 *
 * Remote hosts (Cloudinary, S3) are unknown until the admin uploads media, so we
 * avoid `next/image` remote-pattern configuration entirely and render a plain
 * `<img>` with lazy loading, decoding hints and a low-quality placeholder.
 */
export function ProductImage({
  src,
  alt,
  className,
  imageClassName,
  sizes,
  priority = false,
  fallbackIcon = true,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  fallbackIcon?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !src || failed;

  return (
    <div className={cn('relative overflow-hidden bg-slate-50 dark:bg-white/[0.03]', className)}>
      {showPlaceholder ? (
        <div className="grid h-full w-full place-items-center">
          {fallbackIcon ? (
            <PackageOpen className="size-8 text-slate-300 dark:text-slate-600" aria-hidden="true" />
          ) : null}
          <span className="sr-only">{alt}</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : undefined}
          onError={() => setFailed(true)}
          className={cn('size-full object-contain', imageClassName)}
        />
      )}
    </div>
  );
}
