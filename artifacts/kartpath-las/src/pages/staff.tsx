import { ArrowRight, Check, CircleAlert, Clock3, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { useGetCurrentUser, getGetCurrentUserQueryKey } from '@workspace/api-client-react';
import { LasMark, SectionKicker } from '@/components/las-brand';

function Initials({ name }: { name: string }) {
  const letters = name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'S';
  return <div className="grid size-12 place-items-center bg-[hsl(var(--honey))] font-display text-lg font-semibold text-[hsl(var(--pine))]" data-testid="avatar-staff">{letters}</div>;
}

export default function Staff() {
  const userQuery = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const user = userQuery.data;
  const access = user?.access?.[0];
  const isUnauthorized = userQuery.isError;

  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <header className="border-b border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <LasMark compact />
          <div className="flex items-center gap-5">
            <span className="hidden font-meta text-[10px] uppercase tracking-[.15em] text-[hsl(var(--sidebar-foreground)/.55)] sm:inline">Staff workspace</span>
            <Link href="/" className="font-ui text-xs uppercase tracking-[.13em] text-[hsl(var(--sidebar-foreground)/.72)] transition-colors hover:text-[hsl(var(--honey))]" data-testid="link-back-public">View publication</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 lg:py-20">
        {userQuery.isPending && (
          <div className="animate-pulse" data-testid="status-staff-loading">
            <div className="h-3 w-32 bg-[hsl(var(--muted))]" /><div className="mt-6 h-14 max-w-lg bg-[hsl(var(--muted))]" /><div className="mt-4 h-4 max-w-md bg-[hsl(var(--muted))]" />
            <div className="mt-14 grid gap-px border border-[hsl(var(--border))] bg-[hsl(var(--border))] sm:grid-cols-3"><div className="h-40 bg-[hsl(var(--card))]" /><div className="h-40 bg-[hsl(var(--card))]" /><div className="h-40 bg-[hsl(var(--card))]" /></div>
          </div>
        )}
        {isUnauthorized && (
          <div className="mx-auto max-w-2xl border border-[hsl(var(--brick)/.45)] bg-[hsl(var(--card))] p-8 sm:p-12" data-testid="state-staff-unauthorized">
            <CircleAlert className="text-[hsl(var(--brick))]" size={28} />
            <SectionKicker>Staff access required</SectionKicker>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-none tracking-[-.05em]">This desk is for the people behind the publication.</h1>
            <p className="mt-5 max-w-lg font-editorial text-xl leading-tight text-[hsl(var(--muted-foreground))]">Sign in with your staff account to see your publication access and workspace foundation.</p>
            <Link href="/sign-in" className="mt-8 inline-flex items-center gap-3 bg-[hsl(var(--primary))] px-5 py-3 font-ui text-xs font-bold uppercase tracking-[.13em] text-[hsl(var(--primary-foreground))]" data-testid="link-staff-auth">Go to staff sign in <ArrowRight size={15} /></Link>
          </div>
        )}
        {user && !userQuery.isPending && !isUnauthorized && (
          <>
            <div className="flex flex-col justify-between gap-8 border-b border-[hsl(var(--border))] pb-10 lg:flex-row lg:items-end">
              <div><SectionKicker>Publication operations</SectionKicker><h1 className="mt-5 max-w-3xl font-display text-6xl font-semibold leading-[.9] tracking-[-.065em] sm:text-8xl" data-testid="text-staff-welcome">Good to see you,<br /><em className="text-[hsl(var(--brick))]">{user.displayName.split(' ')[0]}.</em></h1><p className="mt-6 max-w-xl font-editorial text-2xl leading-tight text-[hsl(var(--muted-foreground))]">The operating foundation is ready. Editorial tools will arrive here as the publication takes its next steps.</p></div>
              <div className="flex items-center gap-3 lg:pb-2"><Initials name={user.displayName} /><div><p className="font-ui text-sm font-semibold" data-testid="text-staff-name">{user.displayName}</p><p className="font-meta text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]" data-testid="text-staff-email">{user.email}</p></div></div>
            </div>
            <div className="mt-12 grid gap-px border border-[hsl(var(--border))] bg-[hsl(var(--border))] sm:grid-cols-3" data-testid="grid-staff-foundation">
              <div className="bg-[hsl(var(--card))] p-7 sm:p-9"><ShieldCheck className="text-[hsl(var(--brick))]" size={22} /><p className="mt-16 font-meta text-[10px] uppercase tracking-[.17em] text-[hsl(var(--muted-foreground))]">Your access</p><p className="mt-2 font-display text-3xl font-semibold capitalize" data-testid="text-staff-role">{access?.role || 'Pending'}</p><p className="mt-2 font-ui text-xs leading-5 text-[hsl(var(--muted-foreground))]">{access?.permissions?.length ? `${access.permissions.length} permission${access.permissions.length === 1 ? '' : 's'} provisioned` : 'Access permissions are being prepared.'}</p></div>
              <div className="bg-[hsl(var(--card))] p-7 sm:p-9"><Check className="text-[hsl(var(--pine-2))]" size={22} /><p className="mt-16 font-meta text-[10px] uppercase tracking-[.17em] text-[hsl(var(--muted-foreground))]">Publication</p><p className="mt-2 font-display text-3xl font-semibold" data-testid="text-staff-publication">{access?.publicationSlug || 'Life Around Senoia'}</p><p className="mt-2 font-ui text-xs leading-5 text-[hsl(var(--muted-foreground))]">Your staff context is connected to this publication.</p></div>
              <div className="bg-[hsl(var(--card))] p-7 sm:p-9"><Clock3 className="text-[hsl(var(--honey))]" size={22} /><p className="mt-16 font-meta text-[10px] uppercase tracking-[.17em] text-[hsl(var(--muted-foreground))]">Workspace state</p><p className="mt-2 font-display text-3xl font-semibold">Foundation</p><p className="mt-2 font-ui text-xs leading-5 text-[hsl(var(--muted-foreground))]">No content forms are active in this milestone.</p></div>
            </div>
            <section className="mt-14 max-w-3xl border-t border-[hsl(var(--border))] pt-8"><SectionKicker>What’s next</SectionKicker><div className="mt-5 flex items-start gap-4"><span className="font-meta text-sm text-[hsl(var(--brick))]">M1</span><div><h2 className="font-display text-3xl font-semibold">A dependable place to begin.</h2><p className="mt-3 font-ui text-sm leading-6 text-[hsl(var(--muted-foreground))]">This staff shell establishes identity, access, and publication context before editorial workflows are introduced. It is intentionally quiet until there is real work to show.</p></div></div></section>
          </>
        )}
      </main>
      <footer className="mx-auto flex max-w-[1440px] items-center justify-between border-t border-[hsl(var(--border))] px-5 py-7 sm:px-8 lg:px-12"><span className="font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">LAS / Staff foundation</span><Link href="/" className="inline-flex items-center gap-2 font-ui text-[10px] uppercase tracking-[.13em] text-[hsl(var(--brick))]" data-testid="link-staff-footer-home">Return to LAS <ArrowRight size={13} /></Link></footer>
    </div>
  );
}