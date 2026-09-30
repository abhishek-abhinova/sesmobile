'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const STOCK_STATUSES = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'COMING_SOON'] as const;

export function StockStatusSelect({ id, value }: { id: string; value: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  const [pending, setPending] = useState(false);

  async function update(next: string) {
    const previous = current;
    setCurrent(next);
    setPending(true);
    try {
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stockStatus: next }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error?: { message?: string } }
        | null;
      if (!res.ok || !json?.ok) {
        setCurrent(previous);
        toast.error(json && !json.ok ? (json.error?.message ?? 'Could not update stock.') : 'Could not update stock.');
        return;
      }
      toast.success('Stock status updated');
      router.refresh();
    } catch {
      setCurrent(previous);
      toast.error('Could not update stock.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Select value={current} onValueChange={update} disabled={pending}>
      <SelectTrigger className="h-9 w-[9.5rem] text-xs" aria-label="Stock status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STOCK_STATUSES.map((option) => (
          <SelectItem key={option} value={option} className="text-xs">
            {option.toLowerCase().replace(/_/g, ' ')}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function PublishToggle({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const published = status === 'ACTIVE';

  async function toggle() {
    setPending(true);
    try {
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: published ? 'DRAFT' : 'ACTIVE' }),
      });
      const json = (await res.json().catch(() => null)) as { ok: boolean } | null;
      if (!res.ok || !json?.ok) {
        toast.error('Could not change visibility.');
        return;
      }
      toast.success(published ? 'Product hidden' : 'Product published');
      router.refresh();
    } catch {
      toast.error('Could not change visibility.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Switch checked={published} onCheckedChange={toggle} disabled={pending} aria-label="Published" />
      <span className="text-xs text-muted-foreground">{published ? 'Live' : 'Hidden'}</span>
    </div>
  );
}
