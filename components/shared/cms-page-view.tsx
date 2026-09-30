import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { formatDate } from '@/lib/format';
import type { CmsPage } from '@/lib/cms';

export function CmsPageView({ page, city, businessName }: { page: CmsPage; city: string; businessName: string }) {
  return (
    <div className="container py-6 lg:py-10">
      <Breadcrumbs items={[{ name: page.title }]} className="mb-4" />

      <article className="mx-auto max-w-3xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold sm:text-4xl">{page.title}</h1>
          {page.excerpt ? <p className="mt-3 text-base leading-relaxed text-muted-foreground">{page.excerpt}</p> : null}
          <p className="mt-3 text-xs text-muted-foreground">
            {businessName} · Updated {formatDate(page.updatedAt)}
          </p>
        </header>

        {page.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.coverImageUrl}
            alt=""
            className="mb-8 aspect-[21/9] w-full rounded-2xl object-cover"
          />
        ) : null}

        {page.content ? (
          <div className="prose-ses" dangerouslySetInnerHTML={{ __html: page.content }} />
        ) : (
          <p className="text-sm text-muted-foreground">
            This page has not been written yet. Please contact us on WhatsApp or call the shop in {city} and we will
            help you directly.
          </p>
        )}
      </article>
    </div>
  );
}
