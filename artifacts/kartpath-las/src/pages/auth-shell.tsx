import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { LasMark, SectionKicker } from '@/components/las-brand';

export default function AuthShell({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [, setLocation] = useLocation();
  const isSignIn = mode === 'sign-in';
  return (
    <div className="las-page min-h-[100dvh] bg-[hsl(var(--pine))] text-[hsl(var(--paper))]">
      <div className="mx-auto grid min-h-[100dvh] max-w-[1440px] lg:grid-cols-[.85fr_1.15fr]">
        <aside className="hidden flex-col justify-between border-r border-[hsl(var(--pine-2))] p-10 lg:flex xl:p-14">
          <LasMark />
          <div><span className="font-meta text-[10px] uppercase tracking-[.18em] text-[hsl(var(--honey))]">The local desk</span><p className="mt-5 max-w-sm font-display text-5xl font-semibold leading-[.94] tracking-[-.055em]">A closer look at the place we call home.</p><p className="mt-6 max-w-xs font-editorial text-xl leading-tight text-[hsl(var(--paper)/.58)]">Life Around Senoia is built with the patience and point of view local stories deserve.</p></div>
          <p className="font-meta text-[9px] uppercase tracking-[.14em] text-[hsl(var(--paper)/.34)]">Senoia · Coweta County · Georgia</p>
        </aside>
        <main className="flex flex-col p-5 sm:p-8 lg:p-14">
          <div className="flex items-center justify-between lg:justify-end"><div className="lg:hidden"><LasMark compact /></div><Link href="/" className="inline-flex items-center gap-2 font-ui text-xs uppercase tracking-[.12em] text-[hsl(var(--paper)/.65)] hover:text-[hsl(var(--honey))]" data-testid="link-auth-home"><ArrowLeft size={14} /> Back to publication</Link></div>
          <div className="my-auto w-full max-w-[480px] self-center py-14">
            <div className="mb-8"><SectionKicker light>Staff workspace</SectionKicker><h1 className="mt-4 font-display text-5xl font-semibold leading-none tracking-[-.055em] sm:text-6xl">{isSignIn ? 'Welcome back.' : 'Join the desk.'}</h1><p className="mt-4 max-w-sm font-editorial text-xl leading-tight text-[hsl(var(--paper)/.62)]">{isSignIn ? 'Sign in to continue to your publication workspace.' : 'Create an account to request access to the Life Around Senoia workspace.'}</p></div>
            <div className="border border-[hsl(var(--paper)/.25)] bg-[hsl(var(--paper)/.06)] p-6 sm:p-8" data-testid={`card-auth-${mode}`}>
              <div className="flex items-center gap-3 border-b border-[hsl(var(--paper)/.14)] pb-5"><LockKeyhole size={17} className="text-[hsl(var(--honey))]" /><span className="font-meta text-[10px] uppercase tracking-[.15em] text-[hsl(var(--paper)/.7)]">Secure staff access</span></div>
              <p className="mt-6 font-ui text-sm leading-6 text-[hsl(var(--paper)/.65)]">Clerk authentication is being connected to this branded surface. Your identity and publication access will appear here once the auth provider is configured.</p>
              <button type="button" onClick={() => setLocation('/staff')} className="mt-7 inline-flex w-full items-center justify-center gap-3 bg-[hsl(var(--honey))] px-5 py-3 font-ui text-xs font-bold uppercase tracking-[.13em] text-[hsl(var(--pine))] transition-transform hover:-translate-y-0.5" data-testid={`button-continue-${mode}`}>Continue to staff foundation <ArrowRight size={15} /></button>
              <p className="mt-5 text-center font-meta text-[9px] uppercase tracking-[.14em] text-[hsl(var(--paper)/.35)]">No editorial content is created in this step.</p>
            </div>
            <p className="mt-7 text-center font-ui text-xs text-[hsl(var(--paper)/.5)]">{isSignIn ? 'Need an account?' : 'Already have an account?'} <Link href={isSignIn ? '/sign-up' : '/sign-in'} className="font-semibold text-[hsl(var(--honey))] hover:underline" data-testid={`link-switch-${mode}`}>{isSignIn ? 'Request access' : 'Sign in'}</Link></p>
          </div>
        </main>
      </div>
    </div>
  );
}