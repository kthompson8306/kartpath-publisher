import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, Menu, Search, X } from 'lucide-react';
import { Link } from 'wouter';
import { getListPublishedContentItemsQueryKey, useListPublishedContentItems } from '@workspace/api-client-react';
import type { ContentItem, EditorialContentType } from '@workspace/api-client-react';

type SeoProps = { title: string; description: string; path: string };

const imageAssets = import.meta.glob('../assets/las-images/*.jpg', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const image = (name: string) => imageAssets[`../assets/las-images/${name}`] ?? '';
const PUBLICATION_SLUG = 'life-around-senoia';

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
  ['Events', '/events'], ['Directory', '/directory'], ['Editions', '/editions'],
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
          </div>
          <Link href="/advertise" className="btn-sharp nav-ad">Advertise <ArrowRight size={14} /></Link>
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

export function PublicHome() {
  const query = usePublishedContent();
  const items = query.data ?? [];
  const featured = items.find((item) => item.contentType === 'featured-family');
  const nonprofit = items.find((item) => item.contentType === 'nonprofit-spotlight');
  const achiever = items.find((item) => item.contentType === 'young-achiever');
  const latest = items.slice(0, 3);
  return <PageShell seo={{ title: 'Life Around Senoia — Local Stories, People & Places', description: 'Life Around Senoia is a bi-monthly magazine and digital publication for the people, businesses, and stories of Senoia, Georgia.', path: '/' }}>
    <section className="mega-hero"><div className="mega-hero-bg"><span className="giant-num">LAS</span><div className="mega-hero-inner">{query.isPending ? <p className="dek">Loading the latest published stories…</p> : featured ? <><span className="mega-kicker"><i className="dash" />Featured Family · Published</span><h1>{featured.title}</h1><p className="dek">{featured.summary}</p><div className="mega-cta-row"><Link href="/people" className="btn-ghost-dark">Read the Story <ArrowRight size={14} /></Link><span className="mega-meta">Life Around Senoia · Published editorial</span></div></> : <><span className="mega-kicker"><i className="dash" />Life Around Senoia</span><h1>Stories from<br /><em>around town.</em></h1><p className="dek">No featured story is published right now.</p></>}</div></div><div className="hero-strip-imgs">{[nonprofit, achiever].filter(Boolean).map((item) => <div className="strip-img published-story-placeholder" key={item!.id}><span className="lbl">{item!.contentType.replaceAll('-', ' ')}<b>{item!.title}</b></span></div>)}</div></section>
    <div className="wrap"><AdZone /></div>
    <div className="marquee-band"><div className="marquee-track"><span>SENOIA, GEORGIA</span><span>ALIVE AFTER FIVE — SEPT 18, OCT 16, NOV 20</span><span>FARMERS MARKET EVERY SATURDAY</span><span>SENOIA, GEORGIA</span></div></div>
    <div className="wrap"><SectionHead index="01" title="Latest Published Stories" link={{ label: 'View All', href: '/people' }} /><div className="published-home-grid">{latest.map((item) => <Link href={item.contentType === 'nonprofit-spotlight' ? '/nonprofit' : item.contentType === 'business-listing' ? '/directory' : item.contentType === 'event' ? '/events' : '/people'} className="spread-side-item" key={item.id} data-testid={`public-published-${item.slug}`}><span className="tag">{item.contentType.replaceAll('-', ' ')}</span><h3>{item.title}</h3><p>{item.summary}</p></Link>)}{!query.isPending && latest.length === 0 && <PublicContentState query={query} emptyMessage="No editorial stories are published right now." />}</div><SectionHead index="02" title="Explore the Publication" /><div className="index-rail">{[['01', 'People', 'Published families, young achievers, and pets', '/people'], ['02', 'Nonprofit', 'Published organizations holding this town together', '/nonprofit'], ['03', 'Lifestyle', 'History, home cooking, and local reflection', '/lifestyle'], ['04', 'Events', 'Published events around Senoia', '/events'], ['05', 'Directory', 'Published businesses and services', '/directory']].map(([num, title, desc, href]) => <Link href={href} className="index-row" key={num}><span className="idx-num">{num}</span><h3>{title}</h3><span className="idx-desc">{desc}</span><span className="arrow">→</span></Link>)}</div><AdZone label="In-feed placement" /></div>
    <div className="pull-break"><span className="bigq">“</span><p>We have the freedom to worship. Across our community each week, church doors open without fear, and families gather to pray.</p><span className="attr">Secret Sauce — Issue 06</span></div>
    <div className="wrap"><SectionHead index="03" title="Digital Editions" /><div className="edition-promo"><div className="edition-cover" style={{ backgroundImage: `url(${image('las6-cover.jpg')})` }}><span>LAS 06</span></div><div className="edition-copy"><span className="mono-label">Latest Published Edition</span><h2>Issue 06 — The Full Flip-Through</h2><p>The Brewington family, the Senoia Optimist Club, Milo Stupski, and a tribute to Ellis Crook — every page exactly as printed, plus our one-year anniversary as a publication.</p><Link href="/editions" className="btn-sharp honey-button">Open Full Edition <ArrowRight size={14} /></Link></div></div></div>
    <Newsletter />
  </PageShell>;
}

function Newsletter() {
  const [submitted, setSubmitted] = useState(false);
  return <section className="newsletter" id="newsletter"><div className="wrap"><span className="mono-label">Join The List</span><h2>Senoia stories, straight to your inbox — no fluff, just the town.</h2>{submitted ? <p className="form-confirm">Thanks — your interest is noted. Email <a href="mailto:hello@kartpathmedia.com">hello@kartpathmedia.com</a> to complete your subscription.</p> : <form className="news-input-row" onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}><input required type="email" aria-label="Email address" placeholder="you@email.com" /><button type="submit">Subscribe</button></form>}</div></section>;
}

function PublishedStoryCard({ item, reverse = false }: { item: ContentItem; reverse?: boolean }) {
  return <article className={`family-row published-story-row ${reverse ? 'reverse' : ''}`} data-testid={`public-published-${item.slug}`}>
    <div className="family-img">
      {item.coverUrl
        ? <img src={item.coverUrl} alt={item.title} className="family-photo" loading="lazy" data-testid={`img-cover-${item.slug}`} />
        : <><span className="family-issue-badge">Published story</span><div className="published-story-mark">LAS</div></>
      }
    </div>
    <div className="family-copy"><span className="tag">{item.contentType.replaceAll('-', ' ')}</span><h2>{item.title}</h2><p className="dek">{item.summary}</p><p>{item.body}</p><DetailValue item={item} names={['quote', 'pullQuote']} /></div>
  </article>;
}

function PublishedStoryList({ query, emptyMessage }: { query: ReturnType<typeof usePublishedContent>; emptyMessage: string }) {
  return <><PublicContentState query={query} emptyMessage={emptyMessage} />{query.data?.map((item, index) => <PublishedStoryCard item={item} reverse={index % 2 === 1} key={item.id} />)}</>;
}

export function People() {
  const featuredFamiliesQuery = usePublishedContent('featured-family');
  const youngAchieversQuery = usePublishedContent('young-achiever');
  const petsQuery = usePublishedContent('pet-of-the-month');
  return <PageShell seo={{ title: 'People — Families, Kids & Companions of Senoia', description: 'Meet the families, young achievers, and companions who give Senoia its heart in Life Around Senoia.', path: '/people' }}>
    <PageHero kicker="People of Senoia" title={<>Six issues. Six families.<br />One town’s whole heart.</>}>Every issue, we sit down on someone’s porch and listen. These are the families, kids, and companions who’ve let us in.</PageHero>
    <section><div className="wrap"><SectionHead index="01" title="Published Featured Families" /><PublishedStoryList query={featuredFamiliesQuery} emptyMessage="No featured families are published right now." /></div></section>
    <section className="on-paper2"><div className="wrap">
      <SectionHead index="02" title="Published Young Achievers" /><PublicContentState query={youngAchieversQuery} emptyMessage="No young achievers are published right now." />
      <div className="people-grid">{youngAchieversQuery.data?.map((item) => <article className="people-card" key={item.id} data-testid={`public-published-${item.slug}`}><div className="pimg">{item.coverUrl ? <img src={item.coverUrl} alt={item.title} loading="lazy" data-testid={`img-cover-${item.slug}`} /> : <div className="noimg">LAS</div>}</div><div className="pbody"><span className="pmeta">Published Young Achiever</span><h3>{item.title}</h3><p>{item.summary}</p><p>{item.body}</p></div></article>)}</div>
      <SectionHead index="03" title="Published Pets of the Month" /><PublicContentState query={petsQuery} emptyMessage="No pets of the month are published right now." />
      <div className="people-grid">{petsQuery.data?.map((item) => <article className="people-card" key={item.id} data-testid={`public-published-${item.slug}`}><div className="pimg">{item.coverUrl ? <img src={item.coverUrl} alt={item.title} loading="lazy" data-testid={`img-cover-${item.slug}`} /> : <div className="noimg">LAS</div>}</div><div className="pbody"><span className="pmeta">Published Pet of the Month</span><h3>{item.title}</h3><p>{item.summary}</p><p>{item.body}</p></div></article>)}</div>
    </div></section>
  </PageShell>;
}

export function Nonprofit() {
  const query = usePublishedContent('nonprofit-spotlight');
  return <PageShell seo={{ title: 'Nonprofit Spotlight — Life Around Senoia', description: 'The organizations quietly holding Senoia together, from the Senoia Optimist Club to i58 Mission.', path: '/nonprofit' }}>
    <PageHero kicker="Nonprofit Spotlight" title={<>The organizations quietly<br />holding this town together</>}>Every issue, we uplift a local nonprofit making a real difference — and give you a way to help.</PageHero>
    <section><div className="wrap"><SectionHead index="01" title="Published Nonprofit Spotlights" /><PublishedStoryList query={query} emptyMessage="No nonprofit spotlights are published right now." /></div></section>
    <section><div className="wrap"><div className="involved-strip"><span className="mono-label">Know a Nonprofit We Should Feature?</span><h2>Help us find the next organization worth spotlighting</h2><Link href="/about#nominate" className="btn-sharp honey-button">Nominate a Nonprofit <ArrowRight size={14} /></Link></div></div></section>
  </PageShell>;
}

export function Lifestyle() {
  return <PageShell seo={{ title: 'Lifestyle — History, Recipes & Life Around Senoia', description: 'History, home cooking, and the small reflections that give Senoia its character.', path: '/lifestyle' }}><PageHero kicker="Lifestyle" title={<>The flavor of<br />life around town</>}>History, home cooking, and the small reflections that give Senoia its character.</PageHero><section id="secret-sauce"><div className="wrap-narrow"><SectionHead index="01" title="Secret Sauce" /><div className="sauce-card"><span className="tag">Issue 06</span><h2>Freedom Worth Celebrating</h2><p>Every July, we’re reminded how blessed we are to call America home. Among the many freedoms we enjoy, one is especially easy to overlook: the freedom to worship. Across our community each week, church doors open without fear, Bibles are read openly, and families gather to pray.</p><p>While political freedom shapes the way we live, spiritual freedom has the power to shape who we become — and perhaps that’s the greatest freedom worth celebrating this season.</p></div><div className="sauce-card"><span className="tag">Issue 01</span><h2>Community: Senoia’s True Secret Sauce</h2><p>Ask anyone what they love about Senoia and you’ll almost always hear the same answer: the community. Yes, there’s the small-town charm, the Hollywood history, the local shops. But Senoia’s heart runs deeper than surface-level treasures.</p><p>What makes Senoia so special is the sense of belonging it cultivates. Neighbors care, strangers are welcomed, and differences are respected. It doesn’t require uniformity, only unity.</p></div></div></section><section className="on-paper2" id="crooks-corner"><div className="wrap"><SectionHead index="02" title="Crook’s Corner" /><p className="intro-copy">Formerly our Historical Society column — renamed in Issue 06 to honor Ellis Crook, who spent 95 years calling Senoia home and helped preserve its story before his passing on June 22, 2026.</p><div className="hist-row"><div className="hist-img"><img src={image('lifestyle-history.jpg')} alt="The Senoia town sign downtown" loading="lazy" /></div><div className="hist-copy"><span className="tag">Keeping Senoia’s Story Alive</span><h2>The Senoia Area Historical Society</h2><p>What began with $55.89 left over from a 1976 Bicentennial celebration became the seed money for something lasting — a Society dedicated to making sure Senoia’s stories are never lost to time.</p><div className="hist-timeline">{[['1976', 'A Bicentennial celebration leaves $55.89 — the Society’s seed money.'], ['1980', 'The Senoia Area Historical Society officially incorporates.'], ['1989', 'Senoia’s Historic District is added to the National Register of Historic Places.'], ['1990', 'The Society purchases the historic 1870s Carmichael home at 6 Couch Street.'], ['2010', 'The Senoia Area History Museum opens its doors on July 18.']].map(([year, text]) => <div className="t-row" key={year}><span className="yr">{year}</span>{text}</div>)}</div><p className="small-copy">Open weekends · <a href="https://www.senoiahistory.com" target="_blank" rel="noopener noreferrer">senoiahistory.com</a></p></div></div></div></section><section id="recipe"><div className="wrap"><SectionHead index="03" title="Recipe" /><div className="recipe-row"><div className="recipe-img"><img src={image('lifestyle-recipe.jpg')} alt="Senoia Sunrise cocktail poolside" loading="lazy" /></div><div className="recipe-copy"><span className="tag">Issue 06</span><h2>Senoia Sunrise</h2><p className="dek">Some cocktails are made for celebrations. Others are made for slow summer afternoons. The Senoia Sunrise is both.</p><ul className="ing-list"><li>2 oz Doc Brown’s Day Swigger Southern Ember Whiskey</li><li>3 oz fresh orange juice</li><li>Splash of fresh lime juice</li><li>Sparkling water, to top</li><li>Fresh peach slice, for garnish</li></ul><ol className="steps-list"><li>Fill a cocktail shaker with ice.</li><li>Add the whiskey, orange juice, and lime juice. Shake well until chilled.</li><li>Fill a rocks glass with fresh ice and strain the cocktail into the glass.</li><li>Top with sparkling water.</li><li>Garnish with a fresh peach slice.</li></ol></div></div></div></section><section className="on-paper2"><div className="wrap"><SectionHead index="04" title="Around Town" /><div className="mouse-row"><div className="mouse-copy"><span className="tag">Issue 03 · Downtown Scavenger Hunt</span><h2>A Little Mouse, A Big Idea</h2><p>Local artist Catrina Didier noticed the iconic red brick downtown and wondered: what if there was a mouse painted somewhere in town? The idea grew legs — or tiny painted paws — into the Downtown Senoia Mouse Hunt.</p><p>Pick up an activity booklet at the Welcome Center, track down each hand-painted mouse hidden in shop windows, and return your completed map for a prize. Proceeds support Catrina’s mission work at home and abroad.</p></div><div className="mouse-img"><img src={image('lifestyle-secretsauce.jpg')} alt="Downtown Senoia Main Street" loading="lazy" /></div></div></div></section></PageShell>;
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
      return <article className="event-row" key={item.id} data-testid={`public-published-${item.slug}`}><div className="when">{month}<span className="day">{day}</span></div><div><span className="tag">Published Event</span><h3>{item.title}</h3><div className="loc">{location}</div><p>{item.summary}</p><p>{item.body}</p></div></article>;
    })}</div></div></section>
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
    <section><div className="wrap"><div className="involved-strip"><span className="mono-label">Own a Business in Senoia?</span><h2>Get listed — and get considered for a feature</h2><Link href="/advertise" className="btn-sharp honey-button">Add Your Business <ArrowRight size={14} /></Link></div></div></section>
  </PageShell>;
}

const issues = [['01', 'Sept 2025', 'The Bergstroms', 'las1-cover.jpg'], ['02', 'Nov–Dec 2025', 'Joe & Dawn McGee', 'las2-cover.jpg'], ['03', 'Winter 2026', 'The Crooks of Senoia', 'las3-cover.jpg'], ['04', 'Spring 2026', 'The Jenkins Family', 'las4-cover.jpg'], ['05', 'May–Jun 2026', 'The Bartels Family', 'las5-cover.jpg'], ['06', 'Jul–Aug 2026', 'The Brewingtons', 'las6-cover.jpg']] as const;
export function Editions() {
  return <PageShell seo={{ title: 'Digital Editions — Life Around Senoia Archive', description: 'Read every issue of Life Around Senoia exactly as it was printed, from Issue 01 through Issue 06.', path: '/editions' }}><PageHero kicker="The Archive" title={<>Every issue,<br />flip-through ready</>}>Read Life Around Senoia exactly as it was printed — full-page spreads, ads and all — right in your browser.</PageHero><section><div className="wrap"><div className="featured-reader"><div className="reader-cover"><img src={image('las6-cover.jpg')} alt="Life Around Senoia Issue 6 cover" /></div><div className="reader-copy"><span className="mono-label">Latest Edition · Issue 06</span><h2>Making Room at the Table</h2><p>The Brewington family, the Senoia Optimist Club’s four decades of service, Milo Stupski, and a tribute to Ellis Crook — plus our one-year anniversary as a publication. July–August 2026.</p><button type="button" className="btn-sharp honey-button" onClick={() => alert('The full edition reader is being prepared. See the web stories in the meantime.')}>Open Full Edition <ArrowRight size={14} /></button></div></div></div></section><section className="on-paper2"><div className="wrap"><SectionHead index="" title="Full Archive" /><div className="archive-grid">{issues.map(([issue, date, title, cover]) => <button type="button" className="issue-card" key={issue} onClick={() => alert(`Issue ${issue} reader is being prepared.`)}><div className="issue-cover-img"><img src={image(cover)} alt={`Life Around Senoia Issue ${issue} cover`} loading="lazy" /></div><div className="meta"><span className="date">{date}</span><h3>Issue {issue}</h3><p>{title}</p></div></button>)}</div></div></section></PageShell>;
}

export function About() {
  const [sent, setSent] = useState(false);
  const expectations = [['Featured Family', 'Sharing what makes a local household unique, grounded, and inspiring.'], ['Young Achiever', 'Highlighting a student making an impact in the classroom, on the field, or in the community.'], ['Nonprofit Spotlight', 'Uplifting the organizations making a real difference — and ways you can help.'], ['Pet of the Month', 'Because our furry, feathered, and four-legged friends are family too.'], ['Secret Sauce & Crook’s Corner', 'Reflection and local history — the columns that give the magazine its soul.'], ['Events & Recipes', 'What’s happening downtown and what to serve when you get there.']] as const;
  return <PageShell seo={{ title: 'About Us — Life Around Senoia', description: 'Meet the people behind Life Around Senoia, a magazine written by the town, for the town.', path: '/about' }}><PageHero kicker="About the Publication" title={<>A magazine written by the town, for the town.</>}>Life Around Senoia is a celebration of community, connection, and the people who make this small town special.</PageHero><section><div className="wrap-narrow quote-block"><p>“We’re both fathers, friends, and participants in our communities. This publication is our way of giving back — of highlighting what’s good, celebrating what’s real, and making sure no one in town feels like a stranger.”</p><span className="mono-label">— Kevin Thompson, Publisher</span></div></section><section className="on-paper2"><div className="wrap"><SectionHead index="" title="Our Team" /><div className="team-grid"><article className="team-card"><div className="team-photo" /><div><h2>Kevin Thompson</h2><span className="team-role">Publisher &amp; Founder</span><p>Nearly 20 years in publishing, including work with a niche publisher of nearly 35 enthusiast titles — a journey that led Kevin to launch a business helping publishers and content-driven organizations scale, tell better stories, and grow their communities.</p></div></article><article className="team-card"><div className="team-photo" /><div><h2>Blake Adams</h2><span className="team-role">Advertising Director &amp; Managing Partner</span><p>Born and raised in Fayette and Coweta County, Blake has proudly called Senoia home for over 15 years — active in the local business and creative scene, with a deep passion for connecting people and building things that matter to his hometown.</p></div></article></div><SectionHead index="" title="What To Expect" /><div className="expect-grid">{expectations.map(([title, body]) => <article className="expect-item" key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></div></section><section className="nominate-section" id="nominate"><div className="wrap"><SectionHead index="" title="Nominate a Story" /><p className="nominate-intro">This magazine is shaped by the community. Nominate a Featured Family, Young Achiever, local business, nonprofit, or Pet of the Month.</p><form className="nominate-form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>{[['Your Name', 'text'], ['Your Email', 'email']].map(([label, type]) => <label key={label}>{label}<input required type={type} /></label>)}<label className="full">I’d like to nominate a...<select><option>Featured Family</option><option>Young Achiever</option><option>Local Business</option><option>Nonprofit</option><option>Pet of the Month</option><option>Community Event</option></select></label><label className="full">Tell us their story<textarea required /></label><div className="full"><button className="btn-sharp honey-button" type="submit">{sent ? 'Nomination noted' : 'Submit Nomination'} <ArrowRight size={14} /></button></div></form><p className="nominate-note">Or email <a href="mailto:editorial@kartpathmedia.com">editorial@kartpathmedia.com</a></p></div></section></PageShell>;
}

export function Advertise() {
  return <PageShell seo={{ title: 'Advertise — Life Around Senoia', description: 'Put your business in front of the people who live, work, and spend time around Senoia.', path: '/advertise' }}><PageHero kicker="Partner with the Publication" title={<>A good local business<br />deserves a good local home.</>}>Life Around Senoia is built for the people who make this place work. Talk with our advertising team about print, digital, directory, and story opportunities.</PageHero><section><div className="wrap"><div className="edition-promo advertise-promo"><div className="edition-cover" style={{ backgroundImage: `url(${image('feature-truck.jpg')})` }}><span>FOR HERE</span></div><div className="edition-copy"><span className="mono-label">Advertising &amp; Partnerships</span><h2>Get listed — and get considered for a feature</h2><p>Reach Senoia readers through the bi-monthly magazine, digital publication, and the businesses directory built around the town’s real places.</p><a href="mailto:blake@kartpathmedia.com?subject=Life%20Around%20Senoia%20advertising" className="btn-sharp honey-button">Start a conversation <ArrowRight size={14} /></a></div></div><AdZone label="Premium placement" /></div></section></PageShell>;
}