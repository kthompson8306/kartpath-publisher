import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Menu, Search, X } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { getGetPublishedArticleQueryKey, getGetPublicationBySlugQueryKey, getListPublishedContentItemsQueryKey, useGetPublicationBySlug, useGetPublishedArticle, useListPublishedContentItems, useSubmitBusinessListing, useSubmitEventSubmission, useSubscribeToPublication, useSubmitNomination } from '@workspace/api-client-react';
import type { ContentItem, EditorialContentType } from '@workspace/api-client-react';

type SeoProps = { title: string; description: string; path: string };

const imageAssets = import.meta.glob('../assets/las-images/*.jpg', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const image = (name: string) => imageAssets[`../assets/las-images/${name}`] ?? '';
const PUBLICATION_SLUG = 'life-around-senoia';

// Maps any content type to its public URL section
function articlePath(contentType: string, slug: string): string {
  const section: Record<string, string> = {
    'featured-family': 'people',
    'young-achiever': 'people',
    'people-around-town': 'people',
    'pet-of-the-month': 'lifestyle',
    'nonprofit-spotlight': 'nonprofit',
    'lifestyle-column': 'lifestyle',
    recipe: 'lifestyle',
    'crooks-corner': 'crooks-corner',
    event: 'events',
    'business-listing': 'directory',
  };
  return `/${section[contentType] ?? 'people'}/${slug}`;
}

function usePublishedContent(contentType?: EditorialContentType) {
  return useListPublishedContentItems(
    PUBLICATION_SLUG,
    contentType ? { contentType } : undefined,
    {
      query: {
        queryKey: getListPublishedContentItemsQueryKey(
          PUBLICATION_SLUG,
          contentType ? { contentType } : undefined,
        ),
        staleTime: 0,
        refetchOnMount: 'always',
        retry: false,
      },
    },
  );
}

function useIssueContent(issue: string) {
  const params = { issue };
  return useListPublishedContentItems(
    PUBLICATION_SLUG,
    params,
    {
      query: {
        queryKey: getListPublishedContentItemsQueryKey(PUBLICATION_SLUG, params),
        staleTime: 0,
        refetchOnMount: 'always',
        retry: false,
      },
    },
  );
}

function PublicContentState({
  query,
  emptyMessage,
}: {
  query: ReturnType<typeof usePublishedContent>;
  emptyMessage: string;
}) {
  if (query.isPending) {
    return <div className="public-content-state">Loading the latest published stories…</div>;
  }
  if (query.isError) {
    return <div className="public-content-state">Published stories are temporarily unavailable. Please check back soon.</div>;
  }
  if (!query.data?.length) {
    return <div className="public-content-state">{emptyMessage}</div>;
  }
  return null;
}

function DetailValue({ item, names }: { item: ContentItem; names: string[] }) {
  for (const name of names) {
    const value = item.details?.[name];
    if (value) return <span>{value}</span>;
  }
  return null;
}

function Seo({ title, description, path }: SeoProps) {
  useEffect(() => {
    document.title = title;
    const setMeta = (selector: string, attributes: Record<string, string>) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
      if (!el) {
        el = document.createElement(selector.startsWith('link') ? 'link' : 'meta') as HTMLMetaElement | HTMLLinkElement;
        document.head.appendChild(el);
      }
      Object.entries(attributes).forEach(([key, value]) => el?.setAttribute(key, value));
    };
    const canonical = `${window.location.origin}${path === '/' ? '' : path}`;
    setMeta('meta[name="description"]', { name: 'description', content: description });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    setMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    setMeta('link[rel="canonical"]', { rel: 'canonical', href: canonical });
  }, [description, path, title]);
  return null;
}

const nav = [
  ['People', '/people'], ['Nonprofit', '/nonprofit'], ['Lifestyle', '/lifestyle'],
  ["Crook's Corner", '/crooks-corner'], ['Events', '/events'], ['Directory', '/directory'], ['Editions', '/editions'],
] as const;

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="util-bar"><div className="wrap util-inner"><span><i className="live-dot" />SENOIA, GA · CLEAR, 84°F · VOL. 02</span><span className="util-links"><a href="mailto:kevin@kartpathmedia.com">CONTACT</a><a href="/about">ABOUT</a><a href="#newsletter">SUBSCRIBE</a></span></div></div>
      <header className="site-header">
        <nav className="nav-bar" aria-label="Primary navigation">
          <Link href="/" className="brand">LIFE <em>around</em> SENOIA</Link>
          <div className={`nav-links ${open ? 'is-open' : ''}`}>
            <Link href="/">Home</Link>
            {nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
            <Link href="/sign-in" className="nav-staff-mobile">Staff sign in <ArrowUpRight size={12} /></Link>
          </div>
          <Link href="/advertise" className="btn-sharp nav-ad">Advertise <ArrowRight size={14} /></Link>
          <Link href="/sign-in" className="btn-sharp nav-staff">Staff sign in <ArrowUpRight size={14} /></Link>
          <button type="button" className="mobile-toggle" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'}>{open ? <X size={20} /> : <Menu size={20} />}</button>
        </nav>
      </header>
    </>
  );
}

export function Footer() {
  return <footer>
    <div className="footer-grid">
      <div><div className="brand footer-brand">LIFE <em>around</em> SENOIA</div><p className="footer-tag">A bi-monthly magazine and digital publication for the people, businesses, and stories of Senoia, GA. Published by KartPath Media.</p></div>
      <div><h4>Explore</h4>{nav.slice(0, 4).map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div>
      <div><h4>Publication</h4><Link href="/editions">Editions</Link><Link href="/about">About</Link><Link href="/advertise">Advertise</Link></div>
      <div><h4>Directory</h4><Link href="/directory">Browse All</Link><Link href="/advertise">Add a Business</Link></div>
      <div><h4>Contact</h4><a href="mailto:kevin@kartpathmedia.com">kevin@kartpathmedia.com</a><a href="mailto:blake@kartpathmedia.com">blake@kartpathmedia.com</a></div>
    </div>
    <div className="footer-giant">SENOIA</div>
    <div className="footer-bottom"><span>© 2026 KARTPATH MEDIA LLC</span><span>PEACHTREE CITY, GA</span></div>
  </footer>;
}

function AdZone({ label = 'Advertisement' }: { label?: string }) {
  return <div className="ad-zone"><span className="ad-lbl">{label}</span><div className="ad-inner">Local business sponsorship placement</div></div>;
}

function PageShell({ children, seo }: { children: ReactNode; seo: SeoProps }) {
  return <div className="las-site"><Seo {...seo} /><PublicHeader /><main>{children}</main><Footer /></div>;
}

function PageHero({ kicker, title, children }: { kicker: string; title: ReactNode; children: ReactNode }) {
  return <section className="page-hero"><div className="wrap"><span className="mega-kicker light-kicker"><i className="dash" />{kicker}</span><h1>{title}</h1><p>{children}</p></div></section>;
}

function SectionHead({ index, title, link }: { index: string; title: string; link?: { label: string; href: string } }) {
  return <div className="sec-head"><div className="tt"><span className="tt-idx">§{index}</span><h2>{title}</h2></div>{link && <Link className="view-all" href={link.href}>{link.label} <ArrowRight size={13} /></Link>}</div>;
}

// Converts stored 0–1 focal-point values to CSS background-position percentages.
function focalPoint(item: ContentItem | undefined): string {
  return `${(((item as any)?.coverFocalX ?? 0.5) * 100).toFixed(1)}% ${(((item as any)?.coverFocalY ?? 0.5) * 100).toFixed(1)}%`;
}

// Hero slideshow — new slides enter from the RIGHT (track slides left).
function HeroSlideshow({ slides, isPending }: { slides: ContentItem[]; isPending: boolean }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => { setIdx(0); }, [slides.length]);
  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [paused, slides.length]);

  const N = Math.max(slides.length, 1);

  return (
    <div className="mega-hero-slides-wrap" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="mega-hero-slides-track" style={{ width: `${N * 100}%`, transform: `translateX(${-(idx * (100 / N))}%)` }}>
        {isPending ? (
          <div className="mega-hero-bg" style={{ width: `${100 / N}%`, flexShrink: 0 }}>
            <span className="giant-num">LAS</span>
            <div className="mega-hero-inner"><p className="dek">Loading the latest published stories…</p></div>
          </div>
        ) : slides.length === 0 ? (
          <div className="mega-hero-bg" style={{ width: '100%', flexShrink: 0 }}>
            <span className="giant-num">LAS</span>
            <div className="mega-hero-inner">
              <span className="mega-kicker"><i className="dash" />Life Around Senoia</span>
              <h1>Stories from<br /><em>around town.</em></h1>
              <p className="dek">No featured stories are published right now.</p>
            </div>
          </div>
        ) : slides.map((item) => (
          <div key={item.id} className="mega-hero-bg" style={{ width: `${100 / N}%`, flexShrink: 0, ...(item.coverUrl ? { backgroundImage: `linear-gradient(to right, rgba(11,14,10,0.80) 0%, rgba(11,14,10,0.35) 60%), url(${item.coverUrl})`, backgroundPosition: `0% 0%, ${focalPoint(item)}`, backgroundSize: `auto, cover` } : {}) }}>
            <span className="giant-num">LAS</span>
            <div className="mega-hero-inner">
              <span className="mega-kicker"><i className="dash" />Featured Family · Published</span>
              <h1>{item.title}</h1>
              <p className="dek">{item.summary}</p>
              <div className="mega-cta-row">
                <Link href={`/people/${item.slug}`} className="btn-ghost-dark">Read the Story <ArrowRight size={14} /></Link>
                <span className="mega-meta">Life Around Senoia · Published editorial</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="hero-slide-dots">
          {slides.map((_, i) => <button key={i} type="button" className={`dot${i === idx ? ' dot--active' : ''}`} onClick={() => setIdx(i)} aria-label={`Slide ${i + 1}`} />)}
        </div>
      )}
    </div>
  );
}

// Strip box — new slides enter from the LEFT (opposite to hero).
// Items are laid out in REVERSE order in the DOM, track moves right as idx advances.
function StripBox({ slides, staggerMs }: { slides: ContentItem[]; staggerMs: number }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => { setIdx(0); }, [slides.length]);
  useEffect(() => {
    if (slides.length <= 1) return;
    let iid: ReturnType<typeof setInterval>;
    const tid = setTimeout(() => {
      iid = setInterval(() => setIdx((i) => (i + 1) % slides.length), 8000);
    }, staggerMs);
    return () => { clearTimeout(tid); clearInterval(iid); };
  }, [slides.length, staggerMs]);

  if (!slides.length) return <div className="strip-img strip-img--empty" />;

  const N = slides.length;
  const reversed = [...slides].reverse();
  const tx = -(N - 1 - idx) * (100 / N);

  return (
    <div className="strip-img strip-img--carousel" style={{ backgroundImage: 'none', padding: 0 }}>
      <div style={{ display: 'flex', width: `${N * 100}%`, height: '100%', transform: `translateX(${tx}%)`, transition: 'transform 500ms ease-in-out' }}>
        {reversed.map((item) => (
          <Link key={item.id} href={articlePath(item.contentType, item.slug)}
            style={{ width: `${100 / N}%`, flexShrink: 0, height: '100%', display: 'block', position: 'relative', ...(item.coverUrl ? { backgroundImage: `url(${item.coverUrl})`, backgroundSize: 'cover', backgroundPosition: focalPoint(item) } : { background: '#181c17' }) }}>
            <span className="lbl">
              {item.contentType === 'lifestyle-column' ? 'secret sauce' : item.contentType.replaceAll('-', ' ')}
              <b>{item.title}</b>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Pull-quote carousel — cross-fades between articles that have a pull quote set.
function PullQuoteCarousel({ items }: { items: ContentItem[] }) {
  const quotes = useMemo(() => items.filter((i) => i.pullQuote), [items]);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (quotes.length <= 1) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx((i) => (i + 1) % quotes.length); setVisible(true); }, 400);
    }, 8000);
    return () => clearInterval(id);
  }, [quotes.length]);

  if (!quotes.length) {
    return (
      <div className="pull-break">
        <span className="bigq">"</span>
        <p>We have the freedom to worship. Across our community each week, church doors open without fear, and families gather to pray.</p>
        <span className="attr">Secret Sauce — Issue 06</span>
      </div>
    );
  }

  const q = quotes[idx];
  const tl = q.contentType === 'lifestyle-column' ? 'Secret Sauce' : q.contentType.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="pull-break">
      <span className="bigq">"</span>
      <p style={{ transition: 'opacity 400ms ease', opacity: visible ? 1 : 0 }}>{q.pullQuote}</p>
      <span className="attr" style={{ transition: 'opacity 400ms ease', opacity: visible ? 1 : 0 }}>{q.title} — {tl}</span>
    </div>
  );
}

export function PublicHome() {
  const query = usePublishedContent();
  const pubQuery = useGetPublicationBySlug(PUBLICATION_SLUG, {
    query: {
      queryKey: getGetPublicationBySlugQueryKey(PUBLICATION_SLUG),
      staleTime: 0,
      refetchOnMount: 'always',
      retry: false,
    },
  });
  const items = query.data ?? [];
  const curation = pubQuery.data?.settings?.homepageCuration;

  // Build a pool: pinned items first (in stated order), then fill with remaining items of that type.
  const buildPool = (pinnedIds: string[], typeFilter: (i: ContentItem) => boolean, limit: number): ContentItem[] => {
    const pinned = pinnedIds.map((id) => items.find((i) => i.id === id)).filter((i): i is ContentItem => Boolean(i));
    const pinnedSet = new Set(pinnedIds);
    const rest = items.filter((i) => typeFilter(i) && !pinnedSet.has(i.id));
    return [...pinned, ...rest].slice(0, limit);
  };

  const heroPool = buildPool(curation?.heroOrder ?? [], (i) => i.contentType === 'featured-family', 6);
  const nonprofitPool = buildPool(curation?.stripNonprofit ?? [], (i) => i.contentType === 'nonprofit-spotlight', 4);
  const achieverPool = buildPool(curation?.stripAchiever ?? [], (i) => i.contentType === 'young-achiever', 4);
  const recipePool = buildPool(curation?.stripRecipe ?? [], (i) => i.contentType === 'recipe', 4);
  const secretSaucePool = buildPool(curation?.stripSecretSauce ?? [], (i) => i.contentType === 'lifestyle-column' && i.details?.subsection === 'secret-sauce', 4);
  const latest = items.slice(0, 3);

  return <PageShell seo={{ title: 'Life Around Senoia — Local Stories, People & Places', description: 'Life Around Senoia is a bi-monthly magazine and digital publication for the people, businesses, and stories of Senoia, Georgia.', path: '/' }}>
    <section className="mega-hero">
      <HeroSlideshow slides={heroPool} isPending={query.isPending} />
      <div className="hero-strip-imgs">
        <StripBox slides={nonprofitPool} staggerMs={0} />
        <StripBox slides={achieverPool} staggerMs={2000} />
        <StripBox slides={recipePool} staggerMs={4000} />
        <StripBox slides={secretSaucePool} staggerMs={6000} />
      </div>
    </section>
    <div className="wrap"><AdZone /></div>
    <div className="marquee-band"><div className="marquee-track"><span>SENOIA, GEORGIA</span><span>ALIVE AFTER FIVE — SEPT 18, OCT 16, NOV 20</span><span>FARMERS MARKET EVERY SATURDAY</span><span>SENOIA, GEORGIA</span></div></div>
    <div className="wrap"><SectionHead index="01" title="Latest Published Stories" link={{ label: 'View All', href: '/people' }} /><div className="published-home-grid">{latest.map((item) => <Link href={item.contentType === 'nonprofit-spotlight' ? '/nonprofit' : item.contentType === 'business-listing' ? '/directory' : item.contentType === 'event' ? '/events' : '/people'} className="spread-side-item" key={item.id} data-testid={`public-published-${item.slug}`}><span className="tag">{item.contentType.replaceAll('-', ' ')}</span><h3>{item.title}</h3><p>{item.summary}</p></Link>)}{!query.isPending && latest.length === 0 && <PublicContentState query={query} emptyMessage="No editorial stories are published right now." />}</div><SectionHead index="02" title="Explore the Publication" /><div className="index-rail">{[['01', 'People', 'Published families, young achievers, and pets', '/people'], ['02', 'Nonprofit', 'Published organizations holding this town together', '/nonprofit'], ['03', 'Lifestyle', 'History, home cooking, and local reflection', '/lifestyle'], ['04', 'Events', 'Published events around Senoia', '/events'], ['05', 'Directory', 'Published businesses and services', '/directory']].map(([num, title, desc, href]) => <Link href={href} className="index-row" key={num}><span className="idx-num">{num}</span><h3>{title}</h3><span className="idx-desc">{desc}</span><span className="arrow">→</span></Link>)}</div><AdZone label="In-feed placement" /></div>
    <PullQuoteCarousel items={items} />
    <div className="wrap"><SectionHead index="03" title="Digital Editions" /><div className="edition-promo"><div className="edition-cover" style={{ backgroundImage: `url(${image('las6-cover.jpg')})` }}><span>LAS 06</span></div><div className="edition-copy"><span className="mono-label">Latest Published Edition</span><h2>Issue 06 — The Full Flip-Through</h2><p>The Brewington family, the Senoia Optimist Club, Milo Stupski, and a tribute to Ellis Crook — every page exactly as printed, plus our one-year anniversary as a publication.</p><Link href="/editions" className="btn-sharp honey-button">Open Full Edition <ArrowRight size={14} /></Link></div></div></div>
    <Newsletter />
  </PageShell>;
}

function Newsletter() {
  const [submitted, setSubmitted] = useState(false);
  const [subError, setSubError] = useState('');
  const subscribeMutation = useSubscribeToPublication();
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubError('');
    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;
    const firstName = (fd.get('firstName') as string) || undefined;
    const lastName = (fd.get('lastName') as string) || undefined;
    const phone = (fd.get('phone') as string) || undefined;
    const city = (fd.get('city') as string) || undefined;
    subscribeMutation.mutate({ slug: PUBLICATION_SLUG, data: { email, firstName, lastName, phone, city } }, {
      onSuccess: () => setSubmitted(true),
      onError: () => setSubError('Something went wrong. Please try again or email hello@kartpathmedia.com.'),
    });
  };
  return <section className="newsletter" id="newsletter" style={{ background: 'var(--ink)', color: 'var(--paper)' }}><div className="wrap"><span className="mono-label">Join The List</span><h2>Senoia stories, straight to your inbox — no fluff, just the town.</h2>{submitted ? <p className="form-confirm">You're on the list — look for Life Around Senoia in your inbox soon.</p> : <>{subError && <p style={{ color: 'var(--brick)', marginBottom: 12, font: '.9rem var(--ui)' }}>{subError}</p>}<form className="subscribe-form" onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxWidth: '560px' }}><input required type="text" name="firstName" placeholder="First name" aria-label="First name" style={{ gridColumn: '1', padding: '10px 14px', font: '.92rem var(--ui)', border: '1px solid rgba(247,245,238,.25)', background: 'rgba(247,245,238,.08)', color: 'var(--paper)', outline: 'none' }} /><input required type="text" name="lastName" placeholder="Last name" aria-label="Last name" style={{ gridColumn: '2', padding: '10px 14px', font: '.92rem var(--ui)', border: '1px solid rgba(247,245,238,.25)', background: 'rgba(247,245,238,.08)', color: 'var(--paper)', outline: 'none' }} /><input required type="email" name="email" placeholder="Email address" aria-label="Email address" style={{ gridColumn: '1 / -1', padding: '10px 14px', font: '.92rem var(--ui)', border: '1px solid rgba(247,245,238,.25)', background: 'rgba(247,245,238,.08)', color: 'var(--paper)', outline: 'none' }} /><input type="tel" name="phone" placeholder="Phone (optional)" aria-label="Phone number" style={{ gridColumn: '1', padding: '10px 14px', font: '.92rem var(--ui)', border: '1px solid rgba(247,245,238,.25)', background: 'rgba(247,245,238,.08)', color: 'var(--paper)', outline: 'none' }} /><input type="text" name="city" placeholder="City" aria-label="City" style={{ gridColumn: '2', padding: '10px 14px', font: '.92rem var(--ui)', border: '1px solid rgba(247,245,238,.25)', background: 'rgba(247,245,238,.08)', color: 'var(--paper)', outline: 'none' }} /><button type="submit" disabled={subscribeMutation.isPending} style={{ gridColumn: '1 / -1' }}>{subscribeMutation.isPending ? '…' : 'Subscribe'}</button></form></>}</div></section>;
}

export function renderBody(body: string | null | undefined): React.ReactNode {
  if (!body) return null;
  // Split on double newlines first; fall back to single newlines for legacy content
  let blocks = body.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 1 && body.includes('\n')) {
    blocks = body.split(/\n/).map((b) => b.trim()).filter(Boolean);
  }
  return blocks.map((block, i) => {
    const isSingleLine = !block.includes('\n');
    const isShort = block.length <= 80;
    const noTerminalPunct = !/[.!?]$/.test(block);
    const notQuote = !/^["\u201c]/.test(block);
    const fewPeriods = (block.match(/\./g) ?? []).length <= 1;
    if (isSingleLine && isShort && noTerminalPunct && notQuote && fewPeriods) {
      return <h3 key={i} className="body-subhead">{block}</h3>;
    }
    return <p key={i}>{block.split('\n').join(' ')}</p>;
  });
}

function PublishedStoryCard({ item, reverse = false }: { item: ContentItem; reverse?: boolean }) {
  const path = articlePath(item.contentType, item.slug);
  return <article className={`family-row published-story-row ${reverse ? 'reverse' : ''}`} data-testid={`public-published-${item.slug}`}>
    <div className="family-img" style={{ maxHeight: '280px', overflow: 'hidden' }}>
      {item.coverUrl
        ? <img src={item.coverUrl} alt={(item as any).coverAltText ?? item.title} className="family-photo" loading="lazy" data-testid={`img-cover-${item.slug}`} style={{ objectPosition: `${((item as any).coverFocalX ?? 0.5) * 100}% ${((item as any).coverFocalY ?? 0.5) * 100}%` }} />
        : <><span className="family-issue-badge">Story</span><div className="published-story-mark">LAS</div></>
      }
    </div>
    <div className="family-copy"><span className="tag">{item.contentType.replaceAll('-', ' ')}</span><h2>{item.title}</h2><p className="dek">{item.summary}</p><Link href={path} className="story-read-link">Read full story <ArrowRight size={12} /></Link></div>
  </article>;
}

function PublishedStoryList({ query, emptyMessage }: { query: ReturnType<typeof usePublishedContent>; emptyMessage: string }) {
  return <><PublicContentState query={query} emptyMessage={emptyMessage} />{query.data?.map((item, index) => <PublishedStoryCard item={item} reverse={index % 2 === 1} key={item.id} />)}</>;
}

export function People() {
  const familiesQuery = usePublishedContent('featured-family');
  const achieversQuery = usePublishedContent('young-achiever');
  const aroundTownQuery = usePublishedContent('people-around-town' as EditorialContentType);
  const [filter, setFilter] = useState<'' | 'featured-family' | 'young-achiever' | 'people-around-town'>('');

  const allItems = useMemo(() => [
    ...(familiesQuery.data ?? []),
    ...(achieversQuery.data ?? []),
    ...(aroundTownQuery.data ?? []),
  ], [familiesQuery.data, achieversQuery.data, aroundTownQuery.data]);

  const filtered = useMemo(() => {
    if (filter === 'featured-family') return familiesQuery.data ?? [];
    if (filter === 'young-achiever') return achieversQuery.data ?? [];
    if (filter === 'people-around-town') return aroundTownQuery.data ?? [];
    return allItems;
  }, [filter, allItems, familiesQuery.data, achieversQuery.data, aroundTownQuery.data]);

  const isPending = familiesQuery.isPending || achieversQuery.isPending || aroundTownQuery.isPending;
  const isError = familiesQuery.isError || achieversQuery.isError || aroundTownQuery.isError;
  const filterLabels: Record<string, string> = {
    '': 'All',
    'featured-family': 'Featured Families',
    'young-achiever': 'Young Achievers',
    'people-around-town': 'People Around Town',
  };

  return (
    <PageShell seo={{ title: 'People — Families, Achievers & Community of Senoia', description: 'Meet the families, young achievers, and community members who give Senoia its heart in Life Around Senoia.', path: '/people' }}>
      <PageHero kicker="People of Senoia" title={<>The faces and<br />families of Senoia</>}>Every issue, we sit down with the people who make this town what it is — families, young achievers, and the community voices that shape it.</PageHero>
      <section>
        <div className="wrap">
          <SectionHead index="01" title="People Stories" />
          <div className="filter-pills" style={{ marginBottom: '32px' }}>
            {(['', 'featured-family', 'young-achiever', 'people-around-town'] as const).map((f) => (
              <button type="button" key={f} className={`filter-pill${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {filterLabels[f]}
              </button>
            ))}
          </div>
          {isPending && <div className="public-content-state">Loading people stories…</div>}
          {isError && <div className="public-content-state">People stories are temporarily unavailable.</div>}
          {!isPending && !isError && filtered.length === 0 && (
            <div className="public-content-state">No stories are published in this section yet.</div>
          )}
          {filtered.map((item, index) => <PublishedStoryCard item={item} reverse={index % 2 === 1} key={item.id} />)}
        </div>
      </section>
    </PageShell>
  );
}

export function Nonprofit() {
  const query = usePublishedContent('nonprofit-spotlight');
  return <PageShell seo={{ title: 'Nonprofit Spotlight — Life Around Senoia', description: 'The organizations quietly holding Senoia together, from the Senoia Optimist Club to i58 Mission.', path: '/nonprofit' }}>
    <PageHero kicker="Nonprofit Spotlight" title={<>The organizations quietly<br />holding this town together</>}>Every issue, we uplift a local nonprofit making a real difference — and give you a way to help.</PageHero>
    <section><div className="wrap"><SectionHead index="01" title="Nonprofit Spotlights" /><PublishedStoryList query={query} emptyMessage="No nonprofit spotlights are published right now." /></div></section>
    <section><div className="wrap"><div className="involved-strip"><span className="mono-label">Know a Nonprofit We Should Feature?</span><h2>Help us find the next organization worth spotlighting</h2><Link href="/about#nominate" className="btn-sharp honey-button">Nominate a Nonprofit <ArrowRight size={14} /></Link></div></div></section>
  </PageShell>;
}

// ── Business categories ───────────────────────────────────────────────────────
const BUSINESS_CATEGORIES = [
  'Dining & Drinks',
  'Shopping & Retail',
  'Professional Services',
  'Health & Wellness',
  'Real Estate',
  'Automotive',
  'Home & Garden',
  'Arts & Entertainment',
  'Beauty & Salon',
  'Other',
];

// ── Business listing submission page ─────────────────────────────────────────
export function BusinessSubmitPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [showOther, setShowOther] = useState(false);
  const mutation = useSubmitBusinessListing();

  return (
    <PageShell seo={{ title: 'Submit a Business — Life Around Senoia', description: 'Add your business to the Life Around Senoia community directory.', path: '/submit/business' }}>
      <PageHero kicker="Community Directory" title={<>List your business<br />with the community</>}>Help your neighbors find you. Submissions are reviewed by the editorial team before going live.</PageHero>
      <section className="nominate-section">
        <div className="wrap">
          <SectionHead index="" title="Business Listing Submission" />
          {submitted ? (
            <p className="form-confirm" style={{ color: 'var(--paper)' }}>Your listing has been submitted — thank you! Our team will review it and reach out if we have any questions before publishing.</p>
          ) : (
            <>
              <p className="nominate-intro">Fill out the form below to submit your business to the <em>Life Around Senoia</em> directory. Only confirmed local businesses are published.</p>
              {error && <p style={{ color: 'var(--honey)', font: '.9rem var(--ui)', marginBottom: 16 }}>{error}</p>}
              <form className="nominate-form" onSubmit={(e) => {
                e.preventDefault();
                setError('');
                const fd = new FormData(e.currentTarget);
                const selectedCat = fd.get('category') as string;
                const otherCat = (fd.get('otherCategory') as string | null)?.trim() ?? '';
                const category = selectedCat === 'Other' && otherCat ? otherCat : selectedCat;
                mutation.mutate({ slug: PUBLICATION_SLUG, data: {
                  businessName: fd.get('businessName') as string,
                  category,
                  phone: (fd.get('phone') as string) || undefined,
                  website: (fd.get('website') as string) || undefined,
                  description: (fd.get('description') as string) || undefined,
                  submitterName: fd.get('submitterName') as string,
                  submitterEmail: fd.get('submitterEmail') as string,
                } }, {
                  onSuccess: () => setSubmitted(true),
                  onError: () => setError('Something went wrong. Please try again or email kevin@kartpathmedia.com.'),
                });
              }}>
                <label className="full">Business Name *<input required type="text" name="businessName" placeholder="Your business name" /></label>
                <label className="full">Category *
                  <select required name="category" onChange={(e) => setShowOther(e.target.value === 'Other')}>
                    {BUSINESS_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </label>
                {showOther && <label className="full">Specify your category *<input required type="text" name="otherCategory" placeholder="e.g. Photography Studio" /></label>}
                <label>Phone<input type="tel" name="phone" placeholder="770-555-0000" /></label>
                <label>Website<input type="url" name="website" placeholder="https://yourbusiness.com" /></label>
                <label className="full">Short Description<textarea name="description" rows={4} placeholder="Tell us about your business in a few sentences…" /></label>
                <label>Your Name *<input required type="text" name="submitterName" placeholder="Your full name" /></label>
                <label>Your Email *<input required type="email" name="submitterEmail" placeholder="you@email.com" /></label>
                <div className="full"><button className="btn-sharp honey-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Submitting…' : 'Submit Listing'} <ArrowRight size={14} /></button></div>
              </form>
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}

// ── Event submission page ─────────────────────────────────────────────────────
export function EventSubmitPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const mutation = useSubmitEventSubmission();

  return (
    <PageShell seo={{ title: 'Submit an Event — Life Around Senoia', description: 'Let the Senoia community know about your upcoming event.', path: '/submit/event' }}>
      <PageHero kicker="Community Events" title={<>Share your event<br />with Senoia</>}>Got something happening in town? Let us know and we'll consider it for the events calendar.</PageHero>
      <section className="nominate-section">
        <div className="wrap">
          <SectionHead index="" title="Event Submission" />
          {submitted ? (
            <p className="form-confirm" style={{ color: 'var(--paper)' }}>Your event has been submitted — thank you! Our team will review it and be in touch if we have any questions before publishing.</p>
          ) : (
            <>
              <p className="nominate-intro">Fill out the form below to submit your event to the <em>Life Around Senoia</em> events calendar. All submissions are reviewed by the editorial team before publishing.</p>
              {error && <p style={{ color: 'var(--honey)', font: '.9rem var(--ui)', marginBottom: 16 }}>{error}</p>}
              <form className="nominate-form" onSubmit={(e) => {
                e.preventDefault();
                setError('');
                const fd = new FormData(e.currentTarget);
                mutation.mutate({ slug: PUBLICATION_SLUG, data: {
                  eventName: fd.get('eventName') as string,
                  eventDate: fd.get('eventDate') as string,
                  eventTime: (fd.get('eventTime') as string) || undefined,
                  location: fd.get('location') as string,
                  description: (fd.get('description') as string) || undefined,
                  ticketUrl: (fd.get('ticketUrl') as string) || undefined,
                  contactName: fd.get('contactName') as string,
                  contactEmail: fd.get('contactEmail') as string,
                  contactPhone: (fd.get('contactPhone') as string) || undefined,
                } }, {
                  onSuccess: () => setSubmitted(true),
                  onError: () => setError('Something went wrong. Please try again or email kevin@kartpathmedia.com.'),
                });
              }}>
                <label className="full">Event Name *<input required type="text" name="eventName" placeholder="Name of your event" /></label>
                <label>Date *<input required type="date" name="eventDate" /></label>
                <label>Time<input type="text" name="eventTime" placeholder="e.g. 6:00 PM" /></label>
                <label className="full">Location / Venue *<input required type="text" name="location" placeholder="e.g. Senoia City Square, 1 Main St" /></label>
                <label className="full">Description<textarea name="description" rows={4} placeholder="Tell us about the event…" /></label>
                <label className="full">Ticket / Event Link<input type="url" name="ticketUrl" placeholder="https://eventbrite.com/…" /></label>
                <label>Contact Name *<input required type="text" name="contactName" placeholder="Your full name" /></label>
                <label>Contact Email *<input required type="email" name="contactEmail" placeholder="you@email.com" /></label>
                <label>Contact Phone<input type="tel" name="contactPhone" placeholder="770-555-0000" /></label>
                <div className="full"><button className="btn-sharp honey-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Submitting…' : 'Submit Event'} <ArrowRight size={14} /></button></div>
              </form>
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}

export function Lifestyle() {
  const recipesQuery = usePublishedContent('recipe');
  const lifestyleQuery = usePublishedContent('lifestyle-column');
  const petsQuery = usePublishedContent('pet-of-the-month');
  const [filter, setFilter] = useState<'' | 'secret-sauce' | 'recipe' | 'around-town' | 'pet-of-the-month' | 'health-wellness'>('');

  const allItems = useMemo(() => [
    ...(lifestyleQuery.data ?? []),
    ...(recipesQuery.data ?? []),
    ...(petsQuery.data ?? []),
  ], [lifestyleQuery.data, recipesQuery.data, petsQuery.data]);

  const filtered = useMemo(() => {
    if (filter === 'recipe') return recipesQuery.data ?? [];
    if (filter === 'secret-sauce') return (lifestyleQuery.data ?? []).filter((i) => i.details?.subsection === 'secret-sauce');
    if (filter === 'around-town') return (lifestyleQuery.data ?? []).filter((i) => i.details?.subsection === 'around-town');
    if (filter === 'health-wellness') return (lifestyleQuery.data ?? []).filter((i) => i.details?.subsection === 'health-wellness');
    if (filter === 'pet-of-the-month') return petsQuery.data ?? [];
    return allItems;
  }, [filter, allItems, recipesQuery.data, lifestyleQuery.data, petsQuery.data]);

  const isPending = lifestyleQuery.isPending || recipesQuery.isPending || petsQuery.isPending;
  const isError = lifestyleQuery.isError || recipesQuery.isError || petsQuery.isError;
  const filterLabels: Record<string, string> = {
    '': 'All',
    'secret-sauce': 'Secret Sauce',
    recipe: 'Recipes',
    'around-town': 'Around Town',
    'health-wellness': 'Health & Wellness',
    'pet-of-the-month': 'Pets',
  };

  return (
    <PageShell seo={{ title: 'Lifestyle — Home Cooking, Essays & Life Around Senoia', description: 'Home cooking, local character, and community life in Senoia.', path: '/lifestyle' }}>
      <PageHero kicker="Lifestyle" title={<>The flavor of<br />life around town</>}>Home cooking and the small reflections that give Senoia its character.</PageHero>
      <section>
        <div className="wrap">
          <SectionHead index="01" title="Lifestyle Stories" />
          <div className="filter-pills" style={{ marginBottom: '32px' }}>
            {(['', 'secret-sauce', 'recipe', 'around-town', 'health-wellness', 'pet-of-the-month'] as const).map((f) => (
              <button type="button" key={f} className={`filter-pill${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {filterLabels[f]}
              </button>
            ))}
          </div>
          {isPending && <div className="public-content-state">Loading lifestyle stories…</div>}
          {isError && <div className="public-content-state">Lifestyle stories are temporarily unavailable.</div>}
          {!isPending && !isError && filtered.length === 0 && (
            <div className="public-content-state">No stories are published in this section yet.</div>
          )}
          {filtered.map((item, index) => <PublishedStoryCard item={item} reverse={index % 2 === 1} key={item.id} />)}
        </div>
      </section>
    </PageShell>
  );
}

export function CrooksCorner() {
  const query = usePublishedContent('crooks-corner');
  const items = query.data ?? [];
  return (
    <PageShell seo={{ title: "Crook's Corner — Local History — Life Around Senoia", description: "Senoia's history preserved by the people who lived it — named for Ellis Crook, 1931–2026.", path: '/crooks-corner' }}>
      <PageHero kicker="Crook's Corner" title={<>Keeping Senoia's<br />story alive</>}>
        Formerly our Historical Society column — renamed in Issue 06 to honor Ellis Crook, who spent 95 years calling Senoia home and helped preserve its story before his passing on June 22, 2026.
      </PageHero>
      <section>
        <div className="wrap">
          <SectionHead index="01" title="Historical Features" />
          <PublicContentState query={query} emptyMessage="No Crook's Corner features are published right now." />
          {items.map((item) => {
            let timeline: { year: string; event: string }[] = [];
            try { timeline = JSON.parse(item.details?.timeline ?? '[]') as { year: string; event: string }[]; } catch { /* ignore */ }
            return (
              <div className="hist-row" key={item.id} data-testid={`public-published-${item.slug}`}>
                {item.coverUrl
                  ? <div className="hist-img"><img src={item.coverUrl} alt={(item as any).coverAltText ?? item.title} loading="lazy" data-testid={`img-cover-${item.slug}`} /></div>
                  : <div className="hist-img"><img src={image('lifestyle-history.jpg')} alt="Senoia historical photo" loading="lazy" /></div>
                }
                <div className="hist-copy">
                  {item.details?.issue && <span className="tag">Issue {item.details.issue}</span>}
                  <h2>{item.title}</h2>
                  <p>{item.summary}</p>
                  {renderBody(item.body)}
                  {timeline.length > 0 && (
                    <div className="hist-timeline">
                      {timeline.map(({ year, event }) => (
                        <div className="t-row" key={year}><span className="yr">{year}</span>{event}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}

export function Events() {
  const query = usePublishedContent('event');
  const items = query.data ?? [];
  return <PageShell seo={{ title: 'Events — What’s Happening Around Senoia', description: 'A living calendar of Senoia’s published events.', path: '/events' }}>
    <PageHero kicker="Around Town" title={<>What’s happening<br />downtown</>}>A living calendar of Senoia’s published events and Main Street happenings.</PageHero>
    <section><div className="wrap"><SectionHead index="01" title="Published Events" /><PublicContentState query={query} emptyMessage="No events are published right now." /><div className="event-list">{items.map((item) => {
      const month = item.details.month ?? item.details.date ?? 'EVENT';
      const day = item.details.day ?? '';
      const location = item.details.location ?? item.details.address ?? 'Senoia, Georgia';
      return <article className="event-row" key={item.id} data-testid={`public-published-${item.slug}`}><div className="when">{month}<span className="day">{day}</span></div><div><span className="tag">Event</span><h3>{item.title}</h3><div className="loc">{location}</div><p>{item.summary}</p></div></article>;
    })}</div></div></section>
    <section><div className="wrap"><div className="involved-strip"><span className="mono-label">Got Something Happening?</span><h2>Submit your event to the Senoia calendar</h2><Link href="/submit/event" className="btn-sharp honey-button">Submit an Event <ArrowRight size={14} /></Link></div></div></section>
  </PageShell>;
}

export function Directory() {
  const contentQuery = usePublishedContent('business-listing');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const items = contentQuery.data ?? [];
  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map((item) => item.details.category).filter(Boolean)))], [items]);
  const filtered = useMemo(() => items.filter((item) => {
    const haystack = `${item.title} ${item.summary} ${item.body} ${Object.values(item.details).join(' ')}`.toLowerCase();
    return (category === 'All' || item.details.category === category) && haystack.includes(search.toLowerCase());
  }), [category, items, search]);
  return <PageShell seo={{ title: 'Business Directory — Life Around Senoia', description: 'Find published storefronts, services, restaurants, and local businesses across Senoia, Georgia.', path: '/directory' }}>
    <PageHero kicker="Business Directory" title={<>Every storefront and<br />service on Main Street</>}>Published businesses and services from Life Around Senoia.</PageHero>
    <section><div className="wrap"><div className="dir-controls"><label className="dir-search"><Search size={17} /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search businesses or categories..." aria-label="Search businesses" /></label><div className="filter-pills">{categories.map((cat) => <button type="button" className={`filter-pill ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)} key={cat}>{cat}</button>)}</div></div><PublicContentState query={contentQuery} emptyMessage="No businesses are published right now." /><div className="biz-grid">{filtered.map((item) => <article className="biz-card" key={item.id} data-testid={`public-published-${item.slug}`}><span className="cat">{item.details.category ?? 'Business Listing'}</span><h2>{item.title}</h2><p className="contact">{item.summary}<br />{item.details.phone ?? item.details.website ?? ''}</p>{item.body && <p>{item.body}</p>}</article>)}</div>{!contentQuery.isPending && !contentQuery.isError && contentQuery.data?.length && filtered.length === 0 ? <div className="empty-state">No businesses match that search. Try another category or phrase.</div> : null}</div></section>
    <section><div className="wrap"><div className="involved-strip"><span className="mono-label">Own a Business in Senoia?</span><h2>Get listed — and get considered for a feature</h2><Link href="/submit/business" className="btn-sharp honey-button">Submit a Business <ArrowRight size={14} /></Link></div></div></section>
  </PageShell>;
}

const issues = [['01', 'Sept 2025', 'The Bergstroms', 'las1-cover.jpg'], ['02', 'Nov–Dec 2025', 'Joe & Dawn McGee', 'las2-cover.jpg'], ['03', 'Winter 2026', 'The Crooks of Senoia', 'las3-cover.jpg'], ['04', 'Spring 2026', 'The Jenkins Family', 'las4-cover.jpg'], ['05', 'May–Jun 2026', 'The Bartels Family', 'las5-cover.jpg'], ['06', 'Jul–Aug 2026', 'The Brewingtons', 'las6-cover.jpg']] as const;

// Issuu embed URLs — add each issue's embed src here once uploaded to Issuu.
// Format: 'https://e.issuu.com/embed.html?d=<document-id>&u=<username>'
const issuuEmbeds: Partial<Record<string, string>> = {
  // '01': 'https://e.issuu.com/embed.html?d=las-issue-01&u=lifearoundsenoia',
  // '02': 'https://e.issuu.com/embed.html?d=las-issue-02&u=lifearoundsenoia',
  // '03': 'https://e.issuu.com/embed.html?d=las-issue-03&u=lifearoundsenoia',
  // '04': 'https://e.issuu.com/embed.html?d=las-issue-04&u=lifearoundsenoia',
  // '05': 'https://e.issuu.com/embed.html?d=las-issue-05&u=lifearoundsenoia',
  // '06': 'https://e.issuu.com/embed.html?d=las-issue-06&u=lifearoundsenoia',
};
export function Editions() {
  return <PageShell seo={{ title: 'Digital Editions — Life Around Senoia Archive', description: 'Read every issue of Life Around Senoia exactly as it was printed, from Issue 01 through Issue 06.', path: '/editions' }}><PageHero kicker="The Archive" title={<>Every issue,<br />flip-through ready</>}>Read Life Around Senoia exactly as it was printed — full-page spreads, ads and all — right in your browser.</PageHero><section><div className="wrap"><div className="featured-reader"><div className="reader-cover"><img src={image('las6-cover.jpg')} alt="Life Around Senoia Issue 6 cover" /></div><div className="reader-copy"><span className="mono-label">Latest Edition · Issue 06</span><h2>Making Room at the Table</h2><p>The Brewington family, the Senoia Optimist Club’s four decades of service, Milo Stupski, and a tribute to Ellis Crook — plus our one-year anniversary as a publication. July–August 2026.</p><Link href="/editions/06" className="btn-sharp honey-button">Open Full Edition <ArrowRight size={14} /></Link></div></div></div></section><section className="on-paper2"><div className="wrap"><SectionHead index="" title="Full Archive" /><div className="archive-grid">{issues.map(([issue, date, title, cover]) => <Link href={'/editions/' + issue} className="issue-card" key={issue}><div className="issue-cover-img"><img src={image(cover)} alt={`Life Around Senoia Issue ${issue} cover`} loading="lazy" /></div><div className="meta"><span className="date">{date}</span><h3>Issue {issue}</h3><p>{title}</p></div></Link>)}</div></div></section></PageShell>;
}

export function EditionReader() {
  const { issue } = useParams<{ issue: string }>();
  const issueIndex = issues.findIndex(([num]) => num === issue);
  const contentQuery = useIssueContent(issue ?? '');

  if (issueIndex === -1) {
    return <PageShell seo={{ title: 'Edition Not Found — Life Around Senoia', description: 'That edition was not found.', path: '/editions' }}>
      <section><div className="wrap" style={{ padding: '80px 0', textAlign: 'center' }}>
        <p style={{ marginBottom: 20, font: '1rem var(--ui)', color: 'var(--ink-soft)' }}>That edition doesn't exist.</p>
        <Link href="/editions" className="btn-sharp honey-button">← Back to Archive <ArrowRight size={14} /></Link>
      </div></section>
    </PageShell>;
  }

  const [num, date, title, cover] = issues[issueIndex];
  const prevIssue = issueIndex > 0 ? issues[issueIndex - 1] : null;
  const nextIssue = issueIndex < issues.length - 1 ? issues[issueIndex + 1] : null;

  return (
    <PageShell seo={{ title: `Issue ${num} — ${title} — Life Around Senoia`, description: `Read Issue ${num} of Life Around Senoia, featuring ${title}. ${date}. Every published story in one place.`, path: `/editions/${num}` }}>
      <section style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
        <div className="wrap" style={{ paddingTop: '32px', paddingBottom: 0 }}>
          <Link href="/editions" style={{ display: 'inline-block', font: '700 .72rem var(--mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--honey)', textDecoration: 'none', marginBottom: '24px' }}>← All Editions</Link>
        </div>
        <div className="wrap" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div className="featured-reader" style={{ border: 'none' }}>
            <div className="reader-cover">
              <img src={image(cover)} alt={`Life Around Senoia Issue ${num} cover`} />
            </div>
            <div className="reader-copy">
              <span className="mono-label">Issue {num} · {date}</span>
              <h2>{title}</h2>
              <p>Life Around Senoia — every published story, all in one place.</p>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '8px' }}>
                {prevIssue && <Link href={'/editions/' + prevIssue[0]} style={{ font: '700 .72rem var(--mono)', letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(247,245,238,.5)', textDecoration: 'none' }}>← Issue {prevIssue[0]}</Link>}
                {nextIssue && <Link href={'/editions/' + nextIssue[0]} style={{ font: '700 .72rem var(--mono)', letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--honey)', textDecoration: 'none' }}>Issue {nextIssue[0]} →</Link>}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section>
        <div className="wrap">
          <SectionHead index="" title="Full Issue Flip-Through" />
          {issuuEmbeds[num] ? (
            <div style={{ position: 'relative', paddingBottom: '66%', height: 0, overflow: 'hidden', background: 'var(--ink)' }}>
              <iframe
                src={issuuEmbeds[num]}
                title={`Life Around Senoia Issue ${num} — Full Flip-Through`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allowFullScreen
                loading="lazy"
              />
            </div>
          ) : (
            <div style={{ border: '1px dashed var(--line)', padding: '48px 32px', textAlign: 'center', background: 'var(--paper-2)' }}>
              <p style={{ font: '700 .72rem var(--mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: '12px' }}>Flip-Through Coming Soon</p>
              <p style={{ font: '1rem var(--editorial)', color: 'var(--ink-soft)', maxWidth: '440px', margin: '0 auto' }}>The full Issuu reader for this issue will appear here once it has been uploaded. Read individual stories below in the meantime.</p>
            </div>
          )}
        </div>
      </section>
      <section>
        <div className="wrap">
          <SectionHead index="" title="Stories in This Edition" />
          <PublishedStoryList query={contentQuery} emptyMessage="No stories have been published yet. Check back soon." />
        </div>
      </section>
      {(prevIssue || nextIssue) && (
        <section style={{ borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
          <div className="wrap" style={{ paddingTop: '40px', paddingBottom: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div>{prevIssue && <Link href={'/editions/' + prevIssue[0]} className="btn-sharp honey-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '.82rem' }}>← Issue {prevIssue[0]}: {prevIssue[2]}</Link>}</div>
            <Link href="/editions" style={{ font: '700 .7rem var(--mono)', textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-soft)', textDecoration: 'none' }}>All Editions</Link>
            <div>{nextIssue && <Link href={'/editions/' + nextIssue[0]} className="btn-sharp honey-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '.82rem' }}>Issue {nextIssue[0]}: {nextIssue[2]} →</Link>}</div>
          </div>
        </section>
      )}
    </PageShell>
  );
}

export function About() {
  const [sent, setSent] = useState(false);
  const [nomError, setNomError] = useState('');
  const nominateMutation = useSubmitNomination();
  const expectations = [['Featured Family', 'Sharing what makes a local household unique, grounded, and inspiring.'], ['Young Achiever', 'Highlighting a student making an impact in the classroom, on the field, or in the community.'], ['Nonprofit Spotlight', 'Uplifting the organizations making a real difference — and ways you can help.'], ['Pet of the Month', 'Because our furry, feathered, and four-legged friends are family too.'], ['Secret Sauce & Crook’s Corner', 'Reflection and local history — the columns that give the magazine its soul.'], ['Events & Recipes', 'What’s happening downtown and what to serve when you get there.']] as const;
  return <PageShell seo={{ title: 'About Us — Life Around Senoia', description: 'Meet the people behind Life Around Senoia, a magazine written by the town, for the town.', path: '/about' }}><PageHero kicker="About the Publication" title={<>A magazine written by the town, for the town.</>}>Life Around Senoia is a celebration of community, connection, and the people who make this small town special.</PageHero><section><div className="wrap-narrow quote-block"><p>“We’re both fathers, friends, and participants in our communities. This publication is our way of giving back — of highlighting what’s good, celebrating what’s real, and making sure no one in town feels like a stranger.”</p><span className="mono-label">— Kevin Thompson, Publisher</span></div></section><section className="on-paper2"><div className="wrap"><SectionHead index="" title="Our Team" /><div className="team-grid"><article className="team-card"><div className="team-photo" /><div><h2>Kevin Thompson</h2><span className="team-role">Publisher &amp; Founder</span><p>Nearly 20 years in publishing, including work with a niche publisher of nearly 35 enthusiast titles — a journey that led Kevin to launch a business helping publishers and content-driven organizations scale, tell better stories, and grow their communities.</p></div></article><article className="team-card"><div className="team-photo" /><div><h2>Blake Adams</h2><span className="team-role">Advertising Director &amp; Managing Partner</span><p>Born and raised in Fayette and Coweta County, Blake has proudly called Senoia home for over 15 years — active in the local business and creative scene, with a deep passion for connecting people and building things that matter to his hometown.</p></div></article></div><SectionHead index="" title="What To Expect" /><div className="expect-grid">{expectations.map(([title, body]) => <article className="expect-item" key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></div></section><section className="nominate-section" id="nominate"><div className="wrap"><SectionHead index="" title="Nominate a Story" /><p className="nominate-intro">This magazine is shaped by the community. Nominate a Featured Family, Young Achiever, local business, nonprofit, or Pet of the Month.</p><form className="nominate-form" onSubmit={(e) => { e.preventDefault(); setNomError(''); const fd = new FormData(e.currentTarget); nominateMutation.mutate({ slug: PUBLICATION_SLUG, data: { firstName: fd.get('firstName') as string, lastName: fd.get('lastName') as string, nominatorEmail: fd.get('nominatorEmail') as string, phone: (fd.get('phone') as string) || undefined, city: (fd.get('city') as string) || undefined, category: fd.get('category') as string, story: fd.get('story') as string } }, { onSuccess: () => setSent(true), onError: () => setNomError('Something went wrong. Please try again or email editorial@kartpathmedia.com.') }); }}><label>First Name<input required type="text" name="firstName" /></label><label>Last Name<input required type="text" name="lastName" /></label><label>Email<input required type="email" name="nominatorEmail" /></label><label>Phone<input type="tel" name="phone" /></label><label>City<input type="text" name="city" /></label><label className="full">I'd like to nominate a...<select name="category"><option>Featured Family</option><option>Young Achiever</option><option>Local Business</option><option>Nonprofit</option><option>Pet of the Month</option><option>Community Event</option><option>Other</option></select></label><label className="full">Tell us their story<textarea required name="story" /></label><div className="full">{nomError && <p style={{ color: 'var(--brick)', font: '.88rem var(--ui)', marginBottom: 8 }}>{nomError}</p>}<button className="btn-sharp honey-button" type="submit" disabled={nominateMutation.isPending}>{sent ? 'Nomination received!' : nominateMutation.isPending ? 'Sending…' : 'Submit Nomination'} <ArrowRight size={14} /></button></div></form><p className="nominate-note">Or email <a href="mailto:editorial@kartpathmedia.com">editorial@kartpathmedia.com</a></p></div></section></PageShell>;
}

// ── Shared article detail page ────────────────────────────────────────────────

function ArticleDetailInner({ pubSlug, slug, sectionLabel, sectionPath }: {
  pubSlug: string;
  slug: string;
  sectionLabel: string;
  sectionPath: string;
}) {
  const query = useGetPublishedArticle(pubSlug, slug, {
    query: {
      queryKey: getGetPublishedArticleQueryKey(pubSlug, slug),
      staleTime: 0,
      refetchOnMount: 'always',
      retry: false,
    },
  });

  // All hooks must come before any conditional returns (Rules of Hooks).
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  // galleryItems derived from query data — safe to use empty array as fallback.
  const galleryItems = useMemo(
    () => (query.data?.gallery ?? []).filter((g) => g.mediaUrl),
    [query.data],
  );

  useEffect(() => {
    if (lightboxIdx === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowRight') setLightboxIdx((i) => i !== null ? Math.min(i + 1, galleryItems.length - 1) : null);
      if (e.key === 'ArrowLeft') setLightboxIdx((i) => i !== null ? Math.max(i - 1, 0) : null);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [lightboxIdx, galleryItems.length]);

  if (query.isPending) {
    return <PageShell seo={{ title: 'Loading… — Life Around Senoia', description: '', path: `/${sectionPath}/${slug}` }}>
      <section><div className="wrap" style={{ padding: '80px 0' }}><div className="public-content-state">Loading…</div></div></section>
    </PageShell>;
  }

  if (query.isError || !query.data) {
    return <PageShell seo={{ title: 'Article Not Found — Life Around Senoia', description: 'That article could not be found.', path: `/${sectionPath}` }}>
      <section><div className="wrap" style={{ padding: '80px 0', textAlign: 'center' }}>
        <p style={{ marginBottom: 20, font: '1rem var(--ui)', color: 'var(--ink-soft)' }}>That article doesn't exist or hasn't been published yet.</p>
        <Link href={`/${sectionPath}`} className="btn-sharp honey-button">← Back to {sectionLabel} <ArrowRight size={14} /></Link>
      </div></section>
    </PageShell>;
  }

  const article = query.data;
  const focalX = (article as any).coverFocalX ?? 0.5;
  const focalY = (article as any).coverFocalY ?? 0.5;

  return <PageShell seo={{ title: `${article.title} — Life Around Senoia`, description: article.summary, path: `/${sectionPath}/${slug}` }}>
    {/* Dark header with title */}
    <section style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
      <div className="wrap" style={{ paddingTop: '36px', paddingBottom: '48px' }}>
        <Link href={`/${sectionPath}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', font: '700 .72rem var(--mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--honey)', textDecoration: 'none', marginBottom: '24px' }}>
          <ArrowLeft size={12} /> {sectionLabel}
        </Link>
        <span className="mega-kicker" style={{ fontSize: '.72rem', color: 'rgba(247,245,238,.5)' }}><i className="dash" />{article.contentType.replaceAll('-', ' ')}</span>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, lineHeight: 1.07, letterSpacing: '-.04em', marginTop: '12px', marginBottom: '22px' }}>{article.title}</h1>
        <p style={{ fontFamily: 'var(--editorial)', fontSize: '1.2rem', lineHeight: 1.4, color: 'rgba(247,245,238,.75)', maxWidth: '660px', marginBottom: 0 }}>{article.summary}</p>
      </div>
    </section>

    {/* Cover photo */}
    {article.coverUrl && (
      <div style={{ width: '100%', maxHeight: '520px', overflow: 'hidden' }}>
        <img
          src={article.coverUrl}
          alt={(article as any).coverAltText ?? article.title}
          style={{ width: '100%', height: '520px', objectFit: 'cover', objectPosition: `${focalX * 100}% ${focalY * 100}%`, display: 'block' }}
        />
      </div>
    )}

    {/* Article body */}
    <section>
      <div className="wrap-narrow article-body">
        {(() => {
          // For recipe articles, render structured ingredients + steps from details.
          // The body field may contain a flat text version; filter it to just the intro
          // (any blocks before a line starting with "Ingredients" or "Instructions").
          if (article.contentType === 'recipe' && article.details) {
            const rawIngredients = (article.details as Record<string, string>).ingredients;
            const rawSteps = (article.details as Record<string, string>).steps;
            const servings = (article.details as Record<string, string>).servings;
            const ingredients: string[] = rawIngredients ? (() => { try { return JSON.parse(rawIngredients); } catch { return []; } })() : [];
            const steps: string[] = rawSteps ? (() => { try { return JSON.parse(rawSteps); } catch { return []; } })() : [];

            // Intro = body blocks that don't start with "Ingredients" or "Instructions"
            const introBlocks = (article.body ?? '').split(/\n\n+/).map(b => b.trim()).filter(Boolean)
              .filter(b => !/^ingredients\b/i.test(b) && !/^instructions\b/i.test(b) && !/^steps\b/i.test(b));

            return <>
              {introBlocks.map((block, i) => <p key={i}>{block}</p>)}
              {(ingredients.length > 0 || steps.length > 0) && (
                <div className="recipe-structured" style={{ marginTop: '2rem' }}>
                  {servings && (
                    <p style={{ fontFamily: 'var(--mono)', fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>
                      {servings}
                    </p>
                  )}
                  {ingredients.length > 0 && (
                    <div style={{ marginBottom: '2rem' }}>
                      <h3 className="body-subhead" style={{ marginBottom: '.75rem' }}>Ingredients</h3>
                      <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.7, fontFamily: 'var(--read)', fontSize: '1.05rem' }}>
                        {ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                      </ul>
                    </div>
                  )}
                  {steps.length > 0 && (
                    <div>
                      <h3 className="body-subhead" style={{ marginBottom: '.75rem' }}>Instructions</h3>
                      <ol style={{ paddingLeft: '1.25rem', lineHeight: 1.7, fontFamily: 'var(--read)', fontSize: '1.05rem' }}>
                        {steps.map((step, i) => <li key={i} style={{ marginBottom: '.5rem' }}>{step}</li>)}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </>;
          }
          return renderBody(article.body);
        })()}
      </div>
    </section>

    {/* Photo gallery */}
    {article.gallery.length > 0 && (
      <section className="on-paper2">
        <div className="wrap">
          <SectionHead index="" title="Photo Gallery" />
          <div className="article-gallery">
            {article.gallery.map((gitem) => {
              const lbIdx = galleryItems.findIndex((g) => g.id === gitem.id);
              return (
                <figure
                  key={gitem.id}
                  className="gallery-figure"
                  onClick={gitem.mediaUrl ? () => setLightboxIdx(lbIdx) : undefined}
                  role={gitem.mediaUrl ? 'button' : undefined}
                  aria-label={gitem.mediaUrl ? `View ${gitem.caption ?? 'photo'} enlarged` : undefined}
                  tabIndex={gitem.mediaUrl ? 0 : undefined}
                  onKeyDown={gitem.mediaUrl ? (e) => e.key === 'Enter' && setLightboxIdx(lbIdx) : undefined}
                >
                  {gitem.mediaUrl && (
                    <img src={gitem.mediaUrl} alt={gitem.altText ?? gitem.caption ?? article.title} loading="lazy" />
                  )}
                  {gitem.caption && <figcaption>{gitem.caption}</figcaption>}
                </figure>
              );
            })}
          </div>
        </div>
      </section>
    )}

    <Newsletter />

    {/* Lightbox */}
    {lightboxIdx !== null && (
      <div className="lightbox-overlay" onClick={() => setLightboxIdx(null)} role="dialog" aria-modal="true" aria-label="Photo enlarged view">
        <button className="lightbox-close" onClick={() => setLightboxIdx(null)} aria-label="Close lightbox"><X size={18} /></button>
        {lightboxIdx > 0 && (
          <button className="lightbox-prev" onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }} aria-label="Previous photo"><ArrowLeft size={22} /></button>
        )}
        {lightboxIdx < galleryItems.length - 1 && (
          <button className="lightbox-next" onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }} aria-label="Next photo"><ArrowRight size={22} /></button>
        )}
        <div className="lightbox-img-wrap" onClick={(e) => e.stopPropagation()}>
          <img
            src={galleryItems[lightboxIdx]!.mediaUrl!}
            alt={galleryItems[lightboxIdx]!.altText ?? galleryItems[lightboxIdx]!.caption ?? article.title}
          />
          {galleryItems[lightboxIdx]!.caption && (
            <p className="lightbox-caption">{galleryItems[lightboxIdx]!.caption}</p>
          )}
          {galleryItems.length > 1 && (
            <span className="lightbox-counter">{lightboxIdx + 1} / {galleryItems.length}</span>
          )}
        </div>
      </div>
    )}
  </PageShell>;
}

export function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const path = window.location.pathname;
  // Determine section from URL path segment
  const section = path.split('/')[1] ?? 'people';
  const sectionMap: Record<string, { label: string; path: string }> = {
    'people': { label: 'People', path: 'people' },
    'nonprofit': { label: 'Nonprofit', path: 'nonprofit' },
    'lifestyle': { label: 'Lifestyle', path: 'lifestyle' },
    'crooks-corner': { label: "Crook's Corner", path: 'crooks-corner' },
    'events': { label: 'Events', path: 'events' },
    'directory': { label: 'Directory', path: 'directory' },
  };
  const { label, path: sectionPath } = sectionMap[section] ?? { label: 'Stories', path: 'people' };
  return <ArticleDetailInner pubSlug={PUBLICATION_SLUG} slug={slug ?? ''} sectionLabel={label} sectionPath={sectionPath} />;
}

export function Advertise() {
  return <PageShell seo={{ title: 'Advertise — Life Around Senoia', description: 'Put your business in front of the people who live, work, and spend time around Senoia.', path: '/advertise' }}><PageHero kicker="Partner with the Publication" title={<>A good local business<br />deserves a good local home.</>}>Life Around Senoia is built for the people who make this place work. Talk with our advertising team about print, digital, directory, and story opportunities.</PageHero><section><div className="wrap"><div className="edition-promo advertise-promo"><div className="edition-cover" style={{ backgroundImage: `url(${image('feature-truck.jpg')})` }}><span>FOR HERE</span></div><div className="edition-copy"><span className="mono-label">Advertising &amp; Partnerships</span><h2>Get listed — and get considered for a feature</h2><p>Reach Senoia readers through the bi-monthly magazine, digital publication, and the businesses directory built around the town’s real places.</p><a href="mailto:blake@kartpathmedia.com?subject=Life%20Around%20Senoia%20advertising" className="btn-sharp honey-button">Start a conversation <ArrowRight size={14} /></a></div></div><AdZone label="Premium placement" /></div></section></PageShell>;
}