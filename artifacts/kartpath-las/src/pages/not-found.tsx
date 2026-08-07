import { ArrowLeft, CircleAlert } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="las-page flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--pine))] px-5 text-[hsl(var(--paper))]">
      <div className="max-w-xl border border-[hsl(var(--paper)/.2)] p-8 sm:p-12">
        <CircleAlert className="text-[hsl(var(--honey))]" size={28} />
        <p className="mt-8 font-meta text-[10px] uppercase tracking-[.18em] text-[hsl(var(--honey))]">LAS / 404</p>
        <h1 className="mt-4 font-display text-6xl font-semibold leading-none tracking-[-.06em]">That page isn’t on the map.</h1>
        <p className="mt-5 font-editorial text-xl text-[hsl(var(--paper)/.62)]">The address may have changed, or this part of the publication is still taking shape.</p>
        <Link href="/" className="mt-8 inline-flex items-center gap-2 border border-[hsl(var(--honey))] px-4 py-3 font-ui text-xs font-semibold uppercase tracking-[.13em] text-[hsl(var(--honey))]" data-testid="link-not-found-home"><ArrowLeft size={14} /> Return to LAS</Link>
      </div>
    </div>
  );
}
