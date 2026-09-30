'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Ban, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Decision = 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export function RetailerDecisionButtons({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<Decision | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [toggling, setToggling] = useState(false);

  async function decide(decision: Decision, rejectionReason?: string) {
    setPending(decision);
    try {
      const res = await fetch('/api/retailers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: decision, ...(rejectionReason ? { rejectionReason } : {}) }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error?: { message?: string } }
        | null;

      if (!res.ok || !json?.ok) {
        const failure = json && !json.ok ? json.error : undefined;
        toast.error(failure?.message ?? 'Could not update this retailer.');
        return;
      }

      toast.success(
        decision === 'APPROVED'
          ? 'Retailer approved'
          : decision === 'REJECTED'
            ? 'Application rejected'
            : 'Retailer suspended',
      );
      setRejecting(false);
      setReason('');
      router.refresh();
    } catch {
      toast.error('Could not update this retailer.');
    } finally {
      setPending(null);
    }
  }

  function toggle() {
    const next = status === 'APPROVED' ? 'SUSPENDED' : 'APPROVED';
    setToggling(true);
    decide(next).finally(() => setToggling(false));
  }

  if (status === 'PENDING') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" loading={pending === 'APPROVED'} onClick={() => decide('APPROVED')}>
          <Check className="mr-1.5 size-3.5" />
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => setRejecting((v) => !v)}>
          <X className="mr-1.5 size-3.5" />
          Reject
        </Button>
        {rejecting ? (
          <div className="w-full space-y-2 pt-1 sm:w-72">
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              placeholder="Reason shown to the applicant…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:border-brand-blue-500 focus-visible:outline-none dark:border-white/15 dark:bg-white/[0.04]"
            />
            <Button
              size="sm"
              variant="destructive"
              block
              loading={pending === 'REJECTED'}
              disabled={reason.trim().length === 0}
              onClick={() => decide('REJECTED', reason.trim())}
            >
              Confirm rejection
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" loading={toggling} onClick={toggle}>
      {status === 'APPROVED' ? (
        <>
          <Ban className="mr-1.5 size-3.5" />
          Suspend
        </>
      ) : (
        <>
          <Check className="mr-1.5 size-3.5" />
          Approve
        </>
      )}
    </Button>
  );
}
