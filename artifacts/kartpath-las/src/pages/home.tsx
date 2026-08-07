import { ArrowDown, ArrowUpRight, Check, LoaderCircle } from 'lucide-react';
import { getGetPublicationBySlugQueryKey, getHealthCheckQueryKey, useGetPublicationBySlug, useHealthCheck } from '@workspace/api-client-react';
import { LasMark, PublicNav, SectionKicker } from '@/components/las-brand';

const publicationSlug = 'life-around-senoia';

const lanes = [
  { number: '01', title: 'People', description: 'The families, makers, and neighbors who give Senoia its character.' },
  { number: '02', title: 'Good work', description: 'Local organizations doing the steady work that makes a town stronger.' },
  { number: '03', title: 'Around town', description: 'Events, places, and useful things worth putting on the calendar.' },
  { number: '04', title: 'The directory', description: 'A considered guide to the businesses and services close to home.' },
];

export default function Home() {
  const publicationQuery = useGetPublicationBySlug(publicationSlug, { query: { queryKey: getGetPublicationBySlugQueryKey(publicationSlug), retry: 1 } });
  const healthQuery = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), retry: false } });
  const publication = publicationQuery.data;
  const name = publication?.name || 'Life Around Senoia';
  const description = publication?.description || 'A confident, neighborly publication for the people and places that make Senoia feel like home.';

  return (
    <div className="las-page min-h-[100dvh]">
      <PublicNav />
      <main>
        <section className="relative overflow-hidden bg-[hsl(var(--pine))] text-[hsl(var(--paper))]">
          <div className="pointer-events-none absolute -right-16 top-10 select-none font-display text-[clamp(13rem,35vw,34rem)] font-bold leading-none text-[hsl(var(--pine-2))]">S</div>
          <div className="relative mx-auto grid max-w-[1400px] gap-12 px-5 pb-16 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.08fr_.92fr] lg:gap-20 lg:px-12 lg:pb-24 lg:pt-28">
            <div className="las-reveal max-w-3xl">
              <SectionKicker light>Independent local publishing · Est. Senoia, Georgia</SectionKicker>
              <h1 className="las-wordmark mt-7 max-w-4xl font-display text-[clamp(4.5rem,11vw,10.5rem)] font-semibold tracking-[-.07em]">Life<br /><em className="text-[hsl(var(--honey))]">Around</em><br />Senoia</h1>
              <div className="mt-9 flex max-w-xl items-start gap-4 border-l-2 border-[hsl(var(--brick))] pl-5">
                <p className="font-editorial text-xl leading-tight text-[hsl(var(--paper)/.8)] sm:text-2xl">{description}</p>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <a href="#about" className="inline-flex items-center gap-3 bg-[hsl(var(--honey))] px-5 py-3 font-ui text-xs font-bold uppercase tracking-[.13em] text-[hsl(var(--pine))] transition-transform hover:-translate-y-0.5" data-testid="link-explore-publication">Explore the publication <ArrowDown size={15} /></a>
                <span className="font-meta text-[10px] uppercase tracking-[.18em] text-[hsl(var(--paper)/.52)]">A new local standard</span>
              </div>
            </div>
            <div className="las-reveal las-reveal-delay self-end lg:pb-2">
              <div className="ml-auto max-w-md border-t border-[hsl(var(--paper)/.25)] pt-5">
                <div className="flex items-start justify-between gap-8">
                  <span className="font-meta text-[10px] uppercase tracking-[.18em] text-[hsl(var(--paper)/.5)]">The first word</span>
                  <span className="font-meta text-[10px] uppercase tracking-[.18em] text-[hsl(var(--honey))]">LAS / 001</span>
                </div>
                <p className="mt-12 font-editorial text-3xl leading-[1.04] text-[hsl(var(--paper))] sm:text-4xl">“A town is more than its address. It’s the stories we choose to keep close.”</p>
                <div className="mt-8 h-px w-16 bg-[hsl(var(--brick))]" />
                <p className="mt-4 font-ui text-xs uppercase tracking-[.14em] text-[hsl(var(--paper)/.55)]">A publication in the making</p>
              </div>
            </div>
          </div>
          <div className="relative border-t border-[hsl(var(--pine-2))]">
            <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3 sm:px-8 lg:px-12">
              <span className="font-meta text-[9px] uppercase tracking-[.18em] text-[hsl(var(--paper)/.47)]">Senoia · Coweta County · Georgia</span>
              <span className="font-meta text-[9px] uppercase tracking-[.18em] text-[hsl(var(--honey))]">Made for here</span>
            </div>
          </div>
        </section>

        <section id="about" className="mx-auto max-w-[1400px] scroll-mt-12 px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:gap-24">
            <div>
              <SectionKicker>Why this exists</SectionKicker>
              <h2 className="mt-5 max-w-sm font-display text-5xl font-semibold leading-[.94] tracking-[-.055em] sm:text-6xl">The close view matters.</h2>
            </div>
            <div className="max-w-2xl">
              <p className="font-editorial text-2xl leading-[1.18] text-[hsl(var(--ink-soft))] sm:text-3xl">Life Around Senoia is being built as a durable home for local perspective — not a feed, not a bulletin board, and not a distant newsroom’s idea of small-town life.</p>
              <p className="mt-7 max-w-xl font-ui text-sm leading-7 text-[hsl(var(--ink-soft))]">The platform foundation is intentionally taking shape before the first editorial templates arrive. That means a clear publication identity, a trustworthy staff workspace, and room for the work to grow at the pace of the place it serves.</p>
              <div className="mt-10 grid max-w-xl grid-cols-2 border-y border-[hsl(var(--line))] py-5 sm:grid-cols-3">
                <div><span className="block font-meta text-2xl text-[hsl(var(--brick))]">01</span><span className="mt-2 block font-ui text-[10px] uppercase tracking-[.14em] text-[hsl(var(--ink-soft))]">Publication</span></div>
                <div><span className="block font-meta text-2xl text-[hsl(var(--brick))]">GA</span><span className="mt-2 block font-ui text-[10px] uppercase tracking-[.14em] text-[hsl(var(--ink-soft))]">Rooted here</span></div>
                <div className="col-span-2 mt-5 sm:col-span-1 sm:mt-0"><span className="block font-meta text-2xl text-[hsl(var(--brick))]">LAS</span><span className="mt-2 block font-ui text-[10px] uppercase tracking-[.14em] text-[hsl(var(--ink-soft))]">A local standard</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="lanes" className="scroll-mt-12 border-y border-[hsl(var(--line))] bg-[hsl(var(--paper-2))]">
          <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <div className="flex flex-col justify-between gap-7 border-b border-[hsl(var(--line))] pb-7 sm:flex-row sm:items-end">
              <div><SectionKicker>Editorial lanes</SectionKicker><h2 className="mt-4 font-display text-5xl font-semibold tracking-[-.055em] sm:text-6xl">What will live here.</h2></div>
              <p className="max-w-xs font-editorial text-lg leading-tight text-[hsl(var(--ink-soft))]">The shape of the publication is clear. The stories will come next.</p>
            </div>
            <div className="mt-8 grid border-l border-t border-[hsl(var(--line))] sm:grid-cols-2 lg:grid-cols-4">
              {lanes.map((lane) => (
                <div key={lane.number} className="group min-h-[250px] border-b border-r border-[hsl(var(--line))] p-6 transition-colors hover:bg-[hsl(var(--pine))] hover:text-[hsl(var(--paper))] sm:p-8">
                  <div className="flex items-start justify-between"><span className="font-meta text-xs text-[hsl(var(--brick))] group-hover:text-[hsl(var(--honey))]">{lane.number}</span><ArrowUpRight size={17} className="opacity-40 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></div>
                  <h3 className="mt-16 font-display text-3xl font-semibold tracking-[-.04em]">{lane.title}</h3>
                  <p className="mt-3 font-ui text-xs leading-5 text-[hsl(var(--ink-soft))] group-hover:text-[hsl(var(--paper)/.68)]">{lane.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="partners" className="mx-auto max-w-[1400px] scroll-mt-12 px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <div className="grid overflow-hidden border border-[hsl(var(--pine))] bg-[hsl(var(--pine))] text-[hsl(var(--paper))] lg:grid-cols-[1.1fr_.9fr]">
            <div className="relative p-8 sm:p-12 lg:p-16">
              <div className="pointer-events-none absolute -right-2 top-4 font-display text-[13rem] font-bold leading-none text-[hsl(var(--pine-2))]">+</div>
              <SectionKicker light>For the people helping make it possible</SectionKicker>
              <h2 className="relative mt-6 max-w-xl font-display text-5xl font-semibold leading-[.95] tracking-[-.06em] sm:text-6xl">Good local work deserves a good local home.</h2>
              <p className="relative mt-7 max-w-md font-editorial text-xl leading-tight text-[hsl(var(--paper)/.72)]">We’re laying the groundwork for a publication that readers trust and local partners are proud to stand beside.</p>
              <a href="mailto:hello@lifearoundsenoia.com" className="relative mt-9 inline-flex items-center gap-3 border border-[hsl(var(--honey))] px-5 py-3 font-ui text-xs font-semibold uppercase tracking-[.13em] text-[hsl(var(--honey))] transition-colors hover:bg-[hsl(var(--honey))] hover:text-[hsl(var(--pine))]" data-testid="link-contact-partners">Start a conversation <ArrowUpRight size={15} /></a>
            </div>
            <div className="border-t border-[hsl(var(--pine-2))] bg-[hsl(var(--pine-2)/.4)] p-8 sm:p-12 lg:border-l lg:border-t-0 lg:p-16">
              <span className="font-meta text-[10px] uppercase tracking-[.18em] text-[hsl(var(--honey))]">Foundation status</span>
              <div className="mt-8 space-y-5">
                <div className="flex items-start gap-3 border-b border-[hsl(var(--paper)/.15)] pb-5"><Check size={17} className="mt-0.5 shrink-0 text-[hsl(var(--honey))]" /><div><p className="font-ui text-sm font-semibold">Publication identity</p><p className="mt-1 font-ui text-xs text-[hsl(var(--paper)/.58)]">Name, voice, and local point of view established.</p></div></div>
                <div className="flex items-start gap-3 border-b border-[hsl(var(--paper)/.15)] pb-5"><Check size={17} className="mt-0.5 shrink-0 text-[hsl(var(--honey))]" /><div><p className="font-ui text-sm font-semibold">Staff foundation</p><p className="mt-1 font-ui text-xs text-[hsl(var(--paper)/.58)]">Access and publication context are ready for editors.</p></div></div>
                <div className="flex items-start gap-3"><LoaderCircle size={17} className="mt-0.5 shrink-0 animate-spin text-[hsl(var(--brick))]" /><div><p className="font-ui text-sm font-semibold">First editorial release</p><p className="mt-1 font-ui text-xs text-[hsl(var(--paper)/.58)]">Taking shape with care. No rushed placeholders.</p></div></div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-[hsl(var(--pine-2))] bg-[hsl(var(--pine))] text-[hsl(var(--paper))]">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-5 py-10 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12">
          <div><LasMark compact /><p className="mt-5 max-w-xs font-editorial text-lg leading-tight text-[hsl(var(--paper)/.62)]">A closer look at the place we call home.</p></div>
          <div className="flex flex-col items-start gap-4 lg:items-end"><div className="flex items-center gap-2 font-meta text-[9px] uppercase tracking-[.14em] text-[hsl(var(--paper)/.48)]" data-testid="status-platform-health"><span className={`size-1.5 rounded-full ${healthQuery.isError ? 'bg-[hsl(var(--brick))]' : 'bg-[hsl(var(--honey))]'}`} />Platform {healthQuery.isPending ? 'checking' : healthQuery.isError ? 'offline' : 'ready'}</div><span className="font-meta text-[9px] uppercase tracking-[.16em] text-[hsl(var(--paper)/.38)]">{name} · {publication?.locale || 'en-US'}</span></div>
        </div>
      </footer>
    </div>
  );
}