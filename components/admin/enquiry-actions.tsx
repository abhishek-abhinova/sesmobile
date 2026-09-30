'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUSES = ['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED', 'SPAM'] as const;

export function EnquiryStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, setPending] = useState(false);

  async function update(next: string) {
    const previous = value;
    setValue(next);
    setPending(true);
    try {
      const res = await fetch('/api/enquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: next }),
      });
      const json = (await res.json().catch(() => null)) as { ok: boolean; error?: { message?: string } } | null;
      if (!res.ok || !json?.ok) {
        setValue(previous);
        toast.error(json?.error?.message ?? 'Could not update the enquiry.');
        return;
      }
      toast.success('Enquiry updated');
      router.refresh();
    } catch {
      setValue(previous);
      toast.error('Could not update the enquiry.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Select value={value} onValueChange={update} disabled={pending}>
      <SelectTrigger className="h-9 w-[9.5rem] text-xs" aria-label="Change enquiry status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((option) => (
          <SelectItem key={option} value={option} className="text-xs capitalize">
            {option.toLowerCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function EnquiryNotesForm({ id, notes }: { id: string; notes: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(notes ?? '');
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      const res = await fetch('/api/enquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, notes: value }),
      });
      const json = (await res.json().catch(() => null)) as { ok: boolean; error?: { message?: string } } | null;
      if (!res.ok || !json?.ok) {
        toast.error(json?.error?.message ?? 'Could not save the note.');
        return;
      }
      toast.success('Note saved');
      router.refresh();
    } catch {
      toast.error('Could not save the note.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <label htmlFor={`notes-${id}`} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        Internal notes
      </label>
      <textarea
        id={`notes-${id}`}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={2}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:border-brand-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500/25 dark:border-white/15 dark:bg-white/[0.04]"
        placeholder="Called on WhatsApp, awaiting confirmation…"
      />
      <Button size="sm" className="mt-2" loading={pending} onClick={save}>
        Save note
      </Button>
    </div>
  );
}
