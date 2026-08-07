import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';

export function LasMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-3" data-testid="link-las-home">
      <span className={`relative grid place-items-center border border-[hsl(var(--honey))] bg-[hsl(var(--honey))] text-[hsl(var(--pine))] ${compact ? 'size-9' : 'size-11'}`}>
        <span className="font-display text-xl font-bold leading-none">L</span>
        <span className="absolute bottom-1 right-1 size-1.5 bg-[hsl(var(--brick))]" />
      </span>
      <span className="font-ui text-left leading-none">
        <span className="block text-[10px] font-semibold uppercase tracking-[.24em] text-[hsl(var(--honey))]">Life Around</span>
        <span className="block text-lg font-semibold tracking-[-.05em] text-[hsl(var(--paper))]">Senoia</span>
      </span>
    </Link>
  );
}

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const links = [
    { label: 'The publication', href: '#about' },
    { label: 'What’s coming', href: '#lanes' },
    { label: 'For partners', href: '#partners' },
  ];
  return (
    <header className="relative z-20 border-b border-[hsl(var(--pine-2))] bg-[hsl(var(--pine))] text-[hsl(var(--paper))]">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        <LasMark />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary navigation">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="font-ui text-xs font-medium uppercase tracking-[.13em] text-[hsl(var(--paper)/.74)] transition-colors hover:text-[hsl(var(--honey))]" data-testid={`link-nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
              {link.label}
            </a>
          ))}
          <Link href="/sign-in" className="inline-flex items-center gap-2 border border-[hsl(var(--paper)/.35)] px-4 py-2 font-ui text-xs font-semibold uppercase tracking-[.12em] transition-colors hover:border-[hsl(var(--honey))] hover:text-[hsl(var(--honey))]" data-testid="link-staff-sign-in">
            Staff sign in <ArrowUpRight size={14} />
          </Link>
        </nav>
        <button type="button" className="grid size-10 place-items-center border border-[hsl(var(--paper)/.28)] md:hidden" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close menu' : 'Open menu'} data-testid="button-mobile-menu">
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-[hsl(var(--pine-2))] px-5 py-5 md:hidden" aria-label="Mobile navigation">
          <div className="flex flex-col gap-4">
            {links.map((link) => <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="font-ui text-sm uppercase tracking-[.12em] text-[hsl(var(--paper)/.78)]" data-testid={`link-mobile-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>{link.label}</a>)}
            <Link href="/sign-in" className="mt-2 inline-flex w-fit items-center gap-2 border border-[hsl(var(--honey))] px-4 py-2 font-ui text-xs font-semibold uppercase tracking-[.12em] text-[hsl(var(--honey))]" data-testid="link-mobile-sign-in">Staff sign in <ArrowUpRight size={14} /></Link>
          </div>
        </nav>
      )}
    </header>
  );
}

export function SectionKicker({ children, light = false }: { children: string; light?: boolean }) {
  return <p className={`font-meta text-[10px] font-medium uppercase tracking-[.2em] ${light ? 'text-[hsl(var(--honey))]' : 'text-[hsl(var(--brick))]'}`}>{children}</p>;
}