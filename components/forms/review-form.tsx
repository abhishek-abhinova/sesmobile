'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StarInput } from '@/components/shared/star-rating';

interface Errors {
  authorName?: string;
  authorEmail?: string;
  rating?: string;
  body?: string;
}

export function ReviewForm({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter();
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  function validate(): boolean {
    const next: Errors = {};
    if (authorName.trim().length < 2) next.authorName = 'Please enter your name.';
    if (authorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail)) next.authorEmail = 'Enter a valid email.';
    if (rating < 1) next.rating = 'Choose a star rating.';
    if (body.trim().length < 10) next.body = 'Please write at least 10 characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setPending(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          authorName: authorName.trim(),
          authorEmail: authorEmail.trim() || undefined,
          rating,
          title: title.trim() || undefined,
          body: body.trim(),
          website,
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok: true; data?: { message?: string } }
        | { ok: false; error?: { message?: string; fieldErrors?: Record<string, string[]> } }
        | null;

      if (!res.ok || !json?.ok) {
        const failure = json && !json.ok ? json.error : undefined;
        if (failure?.fieldErrors) {
          setErrors({
            authorName: failure.fieldErrors.authorName?.[0],
            authorEmail: failure.fieldErrors.authorEmail?.[0],
            rating: failure.fieldErrors.rating?.[0],
            body: failure.fieldErrors.body?.[0],
          });
        }
        toast.error(failure?.message ?? 'We could not submit your review. Please try again.');
        return;
      }

      setDone(true);
      setTitle('');
      setBody('');
      setRating(0);
      router.refresh();
    } catch {
      toast.error('We could not submit your review. Please try again.');
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="py-4 text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
        <p className="mt-3 text-sm font-semibold">Thank you for the review!</p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          It will appear on {productName} once our team has checked it.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setDone(false)}>
          Write another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div>
        <Label>Your rating</Label>
        <StarInput name="rating" value={rating} onChange={(value) => { setRating(value); setErrors((e) => ({ ...e, rating: undefined })); }} className="mt-1.5" />
        {errors.rating ? <FieldError>{errors.rating}</FieldError> : null}
      </div>

      <div className="mt-3">
        <Label htmlFor="review-name">
          <span className="text-brand-orange-500" aria-hidden="true">
            *
          </span>{' '}
          Name
        </Label>
        <Input
          id="review-name"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          autoComplete="name"
          aria-invalid={Boolean(errors.authorName)}
          placeholder="Your name"
          className="mt-1.5"
        />
        {errors.authorName ? <FieldError>{errors.authorName}</FieldError> : null}
      </div>

      <div className="mt-3">
        <Label htmlFor="review-email">Email (optional)</Label>
        <Input
          id="review-email"
          value={authorEmail}
          onChange={(e) => setAuthorEmail(e.target.value)}
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.authorEmail)}
          placeholder="Not published"
          className="mt-1.5"
        />
        {errors.authorEmail ? <FieldError>{errors.authorEmail}</FieldError> : null}
      </div>

      <div className="mt-3">
        <Label htmlFor="review-title">Headline (optional)</Label>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={160}
          placeholder="e.g. Perfect fit for my phone"
          className="mt-1.5"
        />
      </div>

      <div className="mt-3">
        <Label htmlFor="review-body">
          <span className="text-brand-orange-500" aria-hidden="true">
            *
          </span>{' '}
          Your review
        </Label>
        <Textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-invalid={Boolean(errors.body)}
          maxLength={2000}
          placeholder="How does the product fit and perform?"
          className="mt-1.5"
        />
        {errors.body ? <FieldError>{errors.body}</FieldError> : null}
      </div>

      {/* Honeypot */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="review-website">Website</label>
        <input
          id="review-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <Button type="submit" size="sm" block loading={pending} className="mt-4">
        Submit review
      </Button>

      <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-px size-3.5 shrink-0" />
        Reviews are moderated before publishing. We never share your email address.
      </p>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{children}</p>;
}
