/** URL-safe slug generation and parsing helpers. */

const UNIQUE_EXTRA = new Set([
  'a','an','the','and','or','of','for','to','in','on','at','by','with','from','is','are','was','were',
  'be','been','am','do','does','did','will','would','should','can','could','may','might','must',
]);

/** Latin transliteration for the Devanagari/Tamil text we occasionally receive from admin. */
const TRANSLITERATIONS: Array<[RegExp, string]> = [
  [/[\u0900-\u097F]/g, ''],
  [/[\u0B80-\u0BFF]/g, ''],
  [/[\u0C00-\u0C7F]/g, ''],
  [/[\u0D00-\u0D7F]/g, ''],
  [/[‘’“”]/g, ''],
  [/[–—]/g, '-'],
];

export function slugify(input: string, options: { maxLength?: number; dropStopWords?: boolean } = {}): string {
  const { maxLength = 90, dropStopWords = false } = options;
  if (!input) return '';

  let value = input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  for (const [pattern, replacement] of TRANSLITERATIONS) {
    value = value.replace(pattern, replacement);
  }

  value = value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (dropStopWords) {
    value = value
      .split('-')
      .filter((part) => part.length > 0 && !UNIQUE_EXTRA.has(part))
      .join('-');
  }

  if (value.length > maxLength) {
    value = value.slice(0, maxLength).replace(/-+[^-]*$/, '').replace(/-+$/, '');
  }

  return value || 'item';
}

/** Appends -2, -3, ... until `exists` returns false. */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
  maxLength = 90,
): Promise<string> {
  const root = slugify(base, { maxLength: maxLength - 6 });
  let candidate = root;
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!(await exists(candidate))) return candidate;
    candidate = `${root}-${counter}`;
    counter += 1;
    if (counter > 9999) return `${root}-${Date.now()}`;
  }
}

export function slugFromId(name: string, id?: string): string {
  const base = slugify(name);
  return id ? `${base}-${id.slice(-4).toLowerCase()}` : base;
}

export function normaliseForSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function absoluteUrl(path: string, base?: string): string {
  const origin = (base ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  if (!path) return origin;
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function safeRedirect(path: string | null | undefined, fallback = '/'): string {
  if (!path) return fallback;
  // Block open redirects: only allow same-origin relative paths.
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return fallback;
  return path;
}
