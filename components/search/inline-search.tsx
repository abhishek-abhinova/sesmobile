'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';

export function InlineSearch({
  placeholder = 'Search for a part, model or brand…',
  className,
  defaultValue = '',
}: {
  placeholder?: string;
  className?: string;
  defaultValue?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = value.trim();
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  }

  return (
    <form onSubmit={submit} role="search" className={className}>
      <label htmlFor="inline-search" className="sr-only">
        Search products
      </label>
      <div className="flex h-13 items-center gap-2 rounded-full border border-white/20 bg-white/10 pl-5 pr-1.5 backdrop-blur-md transition focus-within:border-brand-blue-400/70 focus-within:bg-white/15">
        <Search className="size-5 shrink-0 text-white/70" aria-hidden="true" />
        <input
          id="inline-search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-white placeholder:text-white/55 focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-blue-500 text-white transition hover:bg-brand-blue-400"
          aria-label="Search"
        >
          <ArrowRight className="size-5" />
        </button>
      </div>
    </form>
  );
}
