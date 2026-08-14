import { useEffect, useMemo, useRef, useState } from 'react';
import { ClerkLoading } from '@clerk/react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, CircleAlert, Clock3, Download, Eye, FilePlus2, ImageIcon, Loader2, Pencil, Plus, RefreshCw, Save, Send, ShieldCheck, Trash2, Undo2, X } from 'lucide-react';
import { Link } from 'wouter';
import {
  EditorialContentType,
  EditorialStatus,
  getGetContentItemQueryKey,
  getGetCurrentUserQueryKey,
  getGetPublicationBySlugQueryKey,
  getListContentItemsQueryKey,
  getListGalleryItemsQueryKey,
  getListNominationsQueryKey,
  getListStaffRosterQueryKey,
  useAddGalleryItem,
  useCreateContentItem,
  useCreateStaffInvite,
  useCancelStaffInvite,
  useDeleteContentItem,
  useGetContentItem,
  useGetCurrentUser,
  useGetPublicationBySlug,
  useListContentItems,
  useListGalleryItems,
  useListNominations,
  useListStaffRoster,
  useListSubscribers,
  usePatchHomepageCuration,
  usePublishContentItem,
  useRemoveGalleryItem,
  useReorderGallery,
  useRevokeStaffAccess,
  useUpdateContentItem,
  useUpdateGalleryItem,
  useUpdateNominationStatus,
} from '@workspace/api-client-react';
import type { ContentItem, CreateContentItem, GalleryItem, NominationRecord, StaffInviteRecord, StaffMember, SubscriberRecord, UpdateNominationStatusBodyStatus } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { LasMark, SectionKicker } from '@/components/las-brand';
import { renderBody } from './public-pages';

type PinListProps = {
  label: string;
  ids: string[];
  setIds: (next: string[]) => void;
  options: { id: string; title: string }[];
  maxSlots: number;
  fillLabel: string;
  onDirty: () => void;
};

function PinList({ label, ids, setIds, options, maxSlots, fillLabel, onDirty }: PinListProps) {
  const addSlot = () => { if (ids.length < maxSlots) { setIds([...ids, '']); onDirty(); } };
  const removeSlot = (i: number) => { setIds(ids.filter((_, j) => j !== i)); onDirty(); };
  const updateSlot = (i: number, val: string) => { const next = [...ids]; next[i] = val; setIds(next); onDirty(); };
  return (
    <div className="space-y-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-ui text-[10px] font-bold uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">{label}</span>
        {ids.length < maxSlots && (
          <button type="button" onClick={addSlot} className="inline-flex items-center gap-1 font-ui text-[9px] uppercase tracking-[.12em] text-[hsl(var(--brick))] hover:opacity-70">
            <Plus size={10} /> Add slot
          </button>
        )}
      </div>
      {ids.length === 0 && (
        <p className="font-ui text-[10px] italic text-[hsl(var(--muted-foreground))]">Auto — shows latest {fillLabel} content in rotation.</p>
      )}
      {ids.map((id, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-4 shrink-0 font-meta text-[9px] text-[hsl(var(--muted-foreground))]">{i + 1}</span>
          <select
            value={id}
            onChange={(e) => updateSlot(i, e.target.value)}
            className="flex-1 border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-2 font-ui text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brick))]"
          >
            <option value="">— Choose a story —</option>
            {options.map((opt) => <option key={opt.id} value={opt.id}>{opt.title}</option>)}
          </select>
          <button type="button" onClick={() => removeSlot(i)} className="grid size-9 shrink-0 place-items-center border border-[hsl(var(--border))] text-[hsl(var(--brick))] hover:border-[hsl(var(--brick))]" aria-label="Remove slot"><X size={12} /></button>
        </div>
      ))}
    </div>
  );
}

function HomepageTab({ publicationId, publicationSlug }: { publicationId: string; publicationSlug: string }) {
  const pubQuery = useGetPublicationBySlug(publicationSlug, {
    query: {
      queryKey: getGetPublicationBySlugQueryKey(publicationSlug),
      staleTime: 0,
      refetchOnMount: 'always',
      retry: false,
    },
  });
  const itemsQueryParams = useMemo(
    () => ({ publicationId, status: EditorialStatus.published as any }),
    [publicationId],
  );
  const itemsQuery = useListContentItems(
    itemsQueryParams,
    { query: { enabled: Boolean(publicationId), queryKey: getListContentItemsQueryKey(itemsQueryParams), retry: false } },
  );
  const saveMutation = usePatchHomepageCuration();

  const existingCuration = pubQuery.data?.settings?.homepageCuration;
  const [heroOrder, setHeroOrder] = useState<string[]>([]);
  const [stripNonprofit, setStripNonprofit] = useState<string[]>([]);
  const [stripAchiever, setStripAchiever] = useState<string[]>([]);
  const [stripRecipe, setStripRecipe] = useState<string[]>([]);
  const [stripSecretSauce, setStripSecretSauce] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!initialized && pubQuery.data) {
      setInitialized(true);
      if (existingCuration) {
        setHeroOrder(existingCuration.heroOrder ?? []);
        setStripNonprofit(existingCuration.stripNonprofit ?? []);
        setStripAchiever(existingCuration.stripAchiever ?? []);
        setStripRecipe(existingCuration.stripRecipe ?? []);
        setStripSecretSauce(existingCuration.stripSecretSauce ?? []);
      }
    }
  }, [initialized, pubQuery.data, existingCuration]);

  const handleSave = () => {
    setSaved(false);
    saveMutation.mutate(
      { data: { publicationId, heroOrder, stripNonprofit, stripAchiever, stripRecipe, stripSecretSauce } },
      { onSuccess: () => { setSaved(true); void pubQuery.refetch(); } },
    );
  };

  const items = itemsQuery.data ?? [];
  const heroOptions = items.filter((i) => i.contentType === 'featured-family');
  const nonprofitOptions = items.filter((i) => i.contentType === 'nonprofit-spotlight');
  const achieverOptions = items.filter((i) => i.contentType === 'young-achiever');
  const recipeOptions = items.filter((i) => i.contentType === 'recipe');
  const secretSauceOptions = items.filter((i) => i.contentType === 'lifestyle-column' && (i.details as Record<string, string>)?.subsection === 'secret-sauce');
  const dirty = () => setSaved(false);

  return (
    <div className="mt-7 max-w-xl space-y-8">
      <div>
        <SectionKicker>Homepage</SectionKicker>
        <h2 className="mt-1 font-display text-3xl font-semibold tracking-[-.04em]">Curate the front page</h2>
        <p className="mt-2 font-ui text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          Pin stories to lead each section in order — they appear first in the rotation. Leave a section empty to show the latest published content automatically.
        </p>
      </div>

      {pubQuery.isPending ? (
        <div className="space-y-4">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-14 animate-pulse bg-[hsl(var(--muted))]" />)}</div>
      ) : (
        <div className="space-y-7">
          <PinList label="Hero — Featured Family" ids={heroOrder} setIds={setHeroOrder} options={heroOptions} maxSlots={6} fillLabel="Featured Family" onDirty={dirty} />
          <PinList label="Strip — Nonprofit Spotlight" ids={stripNonprofit} setIds={setStripNonprofit} options={nonprofitOptions} maxSlots={4} fillLabel="Nonprofit Spotlight" onDirty={dirty} />
          <PinList label="Strip — Young Achiever" ids={stripAchiever} setIds={setStripAchiever} options={achieverOptions} maxSlots={4} fillLabel="Young Achiever" onDirty={dirty} />
          <PinList label="Strip — Recipe" ids={stripRecipe} setIds={setStripRecipe} options={recipeOptions} maxSlots={4} fillLabel="Recipe" onDirty={dirty} />
          <PinList label="Strip — Secret Sauce" ids={stripSecretSauce} setIds={setStripSecretSauce} options={secretSauceOptions} maxSlots={4} fillLabel="Secret Sauce" onDirty={dirty} />
          <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)] px-4 py-3">
            <p className="font-ui text-[10px] leading-5 text-[hsl(var(--muted-foreground))]">
              <strong className="font-bold text-[hsl(var(--foreground))]">Pull quotes</strong> — open any article in the Editorial tab and fill in the "Pull quote" field to include it in the homepage quote rotation.
            </p>
          </div>
        </div>
      )}

      {!pubQuery.isPending && (
        <div className="flex items-center gap-4 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 border border-[hsl(var(--brick))] bg-[hsl(var(--brick))] px-4 py-2 font-ui text-[10px] font-bold uppercase tracking-[.12em] text-white transition-opacity disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saveMutation.isPending ? 'Saving…' : 'Save curation'}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 font-ui text-xs text-[hsl(var(--pine-2))]">
              <Check size={13} /> Saved
            </span>
          )}
          {saveMutation.isError && (
            <span className="font-ui text-xs text-[hsl(var(--brick))]">Save failed — try again.</span>
          )}
        </div>
      )}
    </div>
  );
}

const CONTENT_TYPES = [
  { value: EditorialContentType['featured-family'], label: 'Featured Family', short: 'Family' },
  { value: EditorialContentType['nonprofit-spotlight'], label: 'Nonprofit Spotlight', short: 'Nonprofit' },
  { value: EditorialContentType['young-achiever'], label: 'Young Achiever', short: 'Achiever' },
  { value: EditorialContentType['people-around-town'], label: 'People Around Town', short: 'Around Town' },
  { value: EditorialContentType['pet-of-the-month'], label: 'Pet of the Month', short: 'Pet' },
  { value: EditorialContentType['business-listing'], label: 'Business Listing', short: 'Business' },
  { value: EditorialContentType.event, label: 'Event', short: 'Event' },
  { value: EditorialContentType['crooks-corner'], label: "Crook's Corner", short: "Crook's" },
  { value: EditorialContentType.recipe, label: 'Recipe', short: 'Recipe' },
  { value: EditorialContentType['lifestyle-column'], label: 'Lifestyle Column', short: 'Lifestyle' },
  { value: EditorialContentType['about-page'], label: 'About Page', short: 'About' },
] as const;

type ContentType = (typeof CONTENT_TYPES)[number]['value'];
type TimelineEntry = { year: string; event: string };

const BUSINESS_CATEGORIES = [
  'Arts & Entertainment',
  'Automotive',
  'Beauty & Salon',
  'Churches',
  'Dining & Drinks',
  'Golf Carts',
  'Health & Wellness',
  'Home & Garden',
  'Nonprofits',
  'Professional Services',
  'Real Estate',
  'Shopping & Retail',
  'Other',
];

type FormState = Omit<CreateContentItem, 'publicationId' | 'details'> & {
  detailsText: string;
  // Shared structured field for new types
  issue: string;
  // lifestyle-column specific
  subsection: 'secret-sauce' | 'around-town' | '';
  // recipe specific
  servings: string;
  ingredients: string[];
  steps: string[];
  // crooks-corner specific
  timeline: TimelineEntry[];
  // event specific
  eventDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  eventAddress: string;
  admission: string;
  ticketsUrl: string;
  eventContact: string;
  // business-listing specific
  bizCategory: string;
  bizPhone: string;
  bizWebsite: string;
  bizFacebook: string;
  bizInstagram: string;
  bizAddress: string;
  bizHours: string;
  listingTier: 'standard' | 'premium';
  businessDescription: string;
  // digital_edition specific
  issuuEmbedUrl: string;
  editionDescription: string;
  editionEditorialTitle: string;
  // about-page specific
  kartpathHeadline: string;
  kartpathBody: string;
  member1Name: string;
  member1Role: string;
  member1Bio: string;
  member1MediaId: string;
  member1PhotoUrl: string;
  member2Name: string;
  member2Role: string;
  member2Bio: string;
  member2MediaId: string;
  member2PhotoUrl: string;
  // cover photo focal point (0–1 range, default 0.5) and zoom (1 = natural fit, >1 = tighter crop)
  coverFocalX: number;
  coverFocalY: number;
  coverZoom: number;
  // pull quote for homepage rotation
  pullQuote: string;
  // search engine meta description (blank = auto-generated at render time)
  metaDescription: string;
};

const EMPTY_FORM: FormState = {
  contentType: EditorialContentType['featured-family'],
  slug: '',
  title: '',
  summary: '',
  body: '',
  detailsText: '{}',
  coverMediaId: null,
  issue: '',
  subsection: '',
  servings: '',
  ingredients: [''],
  steps: [''],
  timeline: [{ year: '', event: '' }],
  eventDate: '',
  startTime: '',
  endTime: '',
  venue: '',
  eventAddress: '',
  admission: '',
  ticketsUrl: '',
  eventContact: '',
  bizCategory: '',
  bizPhone: '',
  bizWebsite: '',
  bizFacebook: '',
  bizInstagram: '',
  bizAddress: '',
  bizHours: '',
  listingTier: 'standard',
  businessDescription: '',
  issuuEmbedUrl: '',
  editionDescription: '',
  editionEditorialTitle: '',
  kartpathHeadline: '',
  kartpathBody: '',
  member1Name: '',
  member1Role: '',
  member1Bio: '',
  member1MediaId: '',
  member1PhotoUrl: '',
  member2Name: '',
  member2Role: '',
  member2Bio: '',
  member2MediaId: '',
  member2PhotoUrl: '',
  coverFocalX: 0.5,
  coverFocalY: 0.5,
  coverZoom: 1,
  pullQuote: '',
  metaDescription: '',
};

function Initials({ name }: { name: string }) {
  const letters = name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'S';
  return <div className="grid size-10 place-items-center bg-[hsl(var(--honey))] font-display text-base font-semibold text-[hsl(var(--pine))]" data-testid="avatar-staff">{letters}</div>;
}

function typeLabel(value: string) {
  return CONTENT_TYPES.find((type) => type.value === value)?.label ?? value;
}

function formatDate(value: string | null) {
  if (!value) return 'Not published';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function StatusChip({ status }: { status: EditorialStatus }) {
  const published = status === EditorialStatus.published;
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-1 font-meta text-[9px] uppercase tracking-[.14em] ${published ? 'border-[hsl(var(--pine-2)/.35)] bg-[hsl(var(--pine)/.07)] text-[hsl(var(--pine-2))]' : 'border-[hsl(var(--honey)/.65)] bg-[hsl(var(--honey)/.13)] text-[hsl(var(--ink-soft))]'}`} data-testid={`status-content-${status}`}>
      <span className={`size-1.5 rounded-full ${published ? 'bg-[hsl(var(--pine-2))]' : 'bg-[hsl(var(--honey))]'}`} />
      {published ? 'Published' : 'Draft'}
    </span>
  );
}

function StaffHeader({ userName, publicationSlug }: { userName: string; publicationSlug: string }) {
  return (
    <header className="border-b border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-3.5 sm:px-8 lg:px-10">
        <div className="flex items-center gap-5">
          <LasMark compact />
          <span className="hidden h-5 w-px bg-[hsl(var(--sidebar-border))] sm:block" />
          <div className="hidden sm:block">
            <p className="font-meta text-[9px] uppercase tracking-[.19em] text-[hsl(var(--honey))]">Editorial desk</p>
            <p className="mt-0.5 font-ui text-xs text-[hsl(var(--sidebar-foreground)/.65)]">{publicationSlug}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--sidebar-foreground)/.48)] md:inline">M2 / CMS + Media</span>
          <div className="flex items-center gap-2.5 border-l border-[hsl(var(--sidebar-border))] pl-4">
            <Initials name={userName} />
            <span className="hidden font-ui text-xs font-medium text-[hsl(var(--sidebar-foreground)/.8)] lg:inline" data-testid="text-staff-name">{userName}</span>
          </div>
          <Link href="/" className="inline-flex items-center gap-2 border border-[hsl(var(--sidebar-foreground)/.25)] px-3 py-2 font-ui text-[10px] uppercase tracking-[.12em] text-[hsl(var(--sidebar-foreground)/.75)] transition-colors hover:border-[hsl(var(--honey))] hover:text-[hsl(var(--honey))]" data-testid="link-back-public">
            <ArrowLeft size={13} /> <span className="hidden sm:inline">Publication</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function UnauthorizedState() {
  return (
    <div className="mx-auto max-w-2xl border border-[hsl(var(--brick)/.45)] bg-[hsl(var(--card))] p-8 sm:p-12" data-testid="state-staff-unauthorized">
      <CircleAlert className="text-[hsl(var(--brick))]" size={28} />
      <SectionKicker>Staff access required</SectionKicker>
      <h1 className="mt-4 font-display text-5xl font-semibold leading-none tracking-[-.05em]">This desk is for the people behind the publication.</h1>
      <p className="mt-5 max-w-lg font-editorial text-xl leading-tight text-[hsl(var(--muted-foreground))]">Sign in with your staff account to see your publication access and editorial workspace.</p>
      <Link href="/sign-in" className="mt-8 inline-flex items-center gap-3 bg-[hsl(var(--primary))] px-5 py-3 font-ui text-xs font-bold uppercase tracking-[.13em] text-[hsl(var(--primary-foreground))]" data-testid="link-staff-auth">Go to staff sign in <ArrowRight size={15} /></Link>
    </div>
  );
}

function NoPublicationState() {
  return (
    <div className="mx-auto max-w-2xl border border-[hsl(var(--brick)/.45)] bg-[hsl(var(--card))] p-8 sm:p-12" data-testid="state-staff-no-publication">
      <ShieldCheck className="text-[hsl(var(--brick))]" size={28} />
      <SectionKicker>Publication access pending</SectionKicker>
      <h1 className="mt-4 font-display text-5xl font-semibold leading-none tracking-[-.05em]">Your staff account is signed in, but no publication desk is assigned.</h1>
      <p className="mt-5 max-w-lg font-editorial text-xl leading-tight text-[hsl(var(--muted-foreground))]">Ask a publication administrator to connect your LAS access before opening editorial records.</p>
      <Link href="/" className="mt-8 inline-flex items-center gap-3 border border-[hsl(var(--border))] px-5 py-3 font-ui text-xs font-bold uppercase tracking-[.13em] text-[hsl(var(--foreground))]" data-testid="link-no-publication-home">Return to publication <ArrowRight size={15} /></Link>
    </div>
  );
}

function SkeletonWorkspace() {
  return (
    <div className="animate-pulse" data-testid="status-staff-loading">
      <div className="h-3 w-44 bg-[hsl(var(--muted))]" />
      <div className="mt-5 h-12 max-w-xl bg-[hsl(var(--muted))]" />
      <div className="mt-3 h-4 max-w-md bg-[hsl(var(--muted))]" />
      <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,.7fr)]">
        <div className="h-[560px] bg-[hsl(var(--muted))]" />
        <div className="h-[560px] bg-[hsl(var(--muted))]" />
      </div>
    </div>
  );
}

function FilterBar({
  status,
  contentType,
  onStatusChange,
  onTypeChange,
  onCreate,
}: {
  status: '' | EditorialStatus;
  contentType: '' | ContentType;
  onStatusChange: (value: '' | EditorialStatus) => void;
  onTypeChange: (value: '' | ContentType) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[hsl(var(--border))] pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative" data-testid="field-filter-status">
          <span className="sr-only">Filter by status</span>
          <select value={status} onChange={(event) => onStatusChange(event.target.value as '' | EditorialStatus)} className="h-9 appearance-none border border-[hsl(var(--input))] bg-[hsl(var(--card))] py-0 pl-3 pr-8 font-ui text-[11px] font-medium text-[hsl(var(--foreground))] outline-none transition-colors focus:border-[hsl(var(--brick))]" data-testid="select-filter-status">
            <option value="">All statuses</option>
            <option value={EditorialStatus.draft}>Drafts</option>
            <option value={EditorialStatus.published}>Published</option>
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2 top-3 text-[hsl(var(--muted-foreground))]" />
        </label>
        <label className="relative" data-testid="field-filter-type">
          <span className="sr-only">Filter by content type</span>
          <select value={contentType} onChange={(event) => onTypeChange(event.target.value as '' | ContentType)} className="h-9 max-w-[190px] appearance-none border border-[hsl(var(--input))] bg-[hsl(var(--card))] py-0 pl-3 pr-8 font-ui text-[11px] font-medium text-[hsl(var(--foreground))] outline-none transition-colors focus:border-[hsl(var(--brick))]" data-testid="select-filter-type">
            <option value="">All content types</option>
            {CONTENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2 top-3 text-[hsl(var(--muted-foreground))]" />
        </label>
      </div>
      <button type="button" onClick={onCreate} className="inline-flex h-9 items-center justify-center gap-2 bg-[hsl(var(--primary))] px-3.5 font-ui text-[10px] font-bold uppercase tracking-[.13em] text-[hsl(var(--primary-foreground))] transition-colors hover:bg-[hsl(var(--pine-2))]" data-testid="button-create-content">
        <Plus size={14} /> New story
      </button>
    </div>
  );
}

function ContentRow({
  item,
  selected,
  onSelect,
  onPublish,
  onDelete,
  busy,
}: {
  item: ContentItem;
  selected: boolean;
  onSelect: () => void;
  onPublish: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const isPublished = item.status === EditorialStatus.published;
  return (
    <article className={`group relative border-b border-[hsl(var(--border))] px-4 py-4 transition-colors sm:px-5 ${selected ? 'bg-[hsl(var(--honey)/.12)]' : 'hover:bg-[hsl(var(--card))]'}`} data-testid={`row-content-${item.id}`}>
      <button type="button" onClick={onSelect} className="block w-full text-left" data-testid={`button-edit-content-${item.id}`}>
        <div className="flex items-start gap-3">
          {item.coverUrl && (
            <img src={item.coverUrl} alt="" className="hidden size-12 shrink-0 object-cover sm:block" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--brick))]">{typeLabel(item.contentType)}</p>
                <h3 className="mt-1 truncate pr-2 font-display text-xl font-semibold leading-tight tracking-[-.025em] text-[hsl(var(--foreground))]">{item.title || 'Untitled story'}</h3>
              </div>
              <StatusChip status={item.status} />
            </div>
            <p className="mt-2 line-clamp-2 max-w-[560px] font-ui text-xs leading-5 text-[hsl(var(--muted-foreground))]">{item.summary || 'No summary added yet.'}</p>
            <div className="mt-3 flex items-center gap-3 font-meta text-[9px] uppercase tracking-[.1em] text-[hsl(var(--ink-faint))]">
              <span>{item.slug || 'no-slug'}</span>
              <span className="size-0.5 rounded-full bg-[hsl(var(--border))]" />
              <span>{isPublished ? formatDate(item.publishedAt) : `Edited ${formatDate(item.updatedAt)}`}</span>
              {item.coverUrl && <><span className="size-0.5 rounded-full bg-[hsl(var(--border))]" /><span className="text-[hsl(var(--pine-2))]">Photo ✓</span></>}
              <span className="size-0.5 rounded-full bg-[hsl(var(--border))]" />
              {item.metaDescription ? <span className="text-[hsl(var(--pine-2))]">meta ✓</span> : <span className="opacity-40">auto meta</span>}
            </div>
          </div>
        </div>
      </button>
      <div className="mt-3 flex items-center gap-2 border-t border-[hsl(var(--border)/.65)] pt-2 opacity-100 sm:absolute sm:bottom-3 sm:right-4 sm:mt-0 sm:border-0 sm:pt-0 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <button type="button" onClick={onPublish} disabled={busy} className="inline-flex items-center gap-1.5 border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-1.5 font-ui text-[9px] uppercase tracking-[.1em] text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--brick))] disabled:cursor-wait disabled:opacity-50" data-testid={`button-${isPublished ? 'unpublish' : 'publish'}-content-${item.id}`}>
          {isPublished ? <Undo2 size={12} /> : <Send size={12} />} {isPublished ? 'Unpublish' : 'Publish'}
        </button>
        <button type="button" onClick={onDelete} disabled={busy} className="inline-flex items-center justify-center border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1.5 text-[hsl(var(--brick))] transition-colors hover:border-[hsl(var(--brick))] disabled:cursor-wait disabled:opacity-50" aria-label={`Delete ${item.title}`} data-testid={`button-delete-content-${item.id}`}>
          <Trash2 size={13} />
        </button>
      </div>
    </article>
  );
}

function EmptyList({ filtered, onCreate }: { filtered: boolean; onCreate: () => void }) {
  return (
    <div className="flex min-h-[370px] flex-col items-center justify-center border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.45)] px-8 text-center" data-testid="state-content-empty">
      <div className="grid size-12 place-items-center border border-[hsl(var(--honey)/.7)] bg-[hsl(var(--honey)/.16)] text-[hsl(var(--brick))]"><FilePlus2 size={20} /></div>
      <p className="mt-5 font-meta text-[9px] uppercase tracking-[.18em] text-[hsl(var(--brick))]">{filtered ? 'No matching stories' : 'The desk is clear'}</p>
      <h3 className="mt-2 font-display text-3xl font-semibold tracking-[-.035em]">{filtered ? 'Try another lens.' : 'Start the first story.'}</h3>
      <p className="mt-2 max-w-xs font-ui text-xs leading-5 text-[hsl(var(--muted-foreground))]">{filtered ? 'There are no records in this status and content type combination.' : 'Create a draft to give the next local voice a place to land.'}</p>
      {!filtered && <button type="button" onClick={onCreate} className="mt-6 inline-flex items-center gap-2 border border-[hsl(var(--primary))] px-4 py-2.5 font-ui text-[10px] font-bold uppercase tracking-[.13em] text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))]" data-testid="button-empty-create"><Plus size={14} /> Create a draft</button>}
    </div>
  );
}

// ─── Cover photo uploader ────────────────────────────────────────────────────

type UploadState = 'idle' | 'requesting' | 'uploading' | 'completing' | 'done' | 'error';

function CoverPhotoUploader({
  coverMediaId,
  existingCoverUrl,
  publicationId,
  onChange,
  focalX,
  focalY,
  onFocalChange,
  zoom,
  onZoomChange,
}: {
  coverMediaId: string | null;
  existingCoverUrl: string | null | undefined;
  publicationId: string;
  onChange: (mediaId: string | null) => void;
  focalX: number;
  focalY: number;
  onFocalChange: (x: number, y: number) => void;
  zoom: number;
  onZoomChange: (z: number) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadError, setUploadError] = useState('');
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [imgRendered, setImgRendered] = useState<{ w: number; h: number } | null>(null);
  const focalDragRef = useRef<{ startX: number; startY: number; startFocalX: number; startFocalY: number; imgW: number; imgH: number; zoom: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const onFocalChangeRef = useRef(onFocalChange);
  onFocalChangeRef.current = onFocalChange;
  const [isFileDragging, setIsFileDragging] = useState(false);

  const displayUrl = localPreview ?? existingCoverUrl ?? null;

  // Reset rendered size when image swaps
  useEffect(() => { setImgRendered(null); }, [displayUrl]);

  // Window-level mouse listeners — handles drag even when pointer leaves the picker
  useEffect(() => {
    const CROP_RATIO = 16 / 9;
    const onMove = (e: MouseEvent) => {
      const drag = focalDragRef.current;
      if (!drag) return;
      const { startX, startY, startFocalX, startFocalY, imgW, imgH, zoom: z } = drag;
      const baseH = Math.min(imgH, imgW / CROP_RATIO);
      const bh = baseH / z;
      const bw = bh * CROP_RATIO;
      const overflowX = imgW - bw;
      const overflowY = imgH - bh;
      let newFX = startFocalX, newFY = startFocalY;
      if (overflowX > 0.5) newFX = Math.max(0, Math.min(1, startFocalX + (e.clientX - startX) / overflowX));
      if (overflowY > 0.5) newFY = Math.max(0, Math.min(1, startFocalY + (e.clientY - startY) / overflowY));
      onFocalChangeRef.current(Math.round(newFX * 1000) / 1000, Math.round(newFY * 1000) / 1000);
    };
    const onUp = () => { focalDragRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleFileChange = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files are accepted.');
      return;
    }
    setUploadError('');

    try {
      // Step 1 — request presigned upload URL
      setUploadState('requesting');
      const reqRes = await fetch('/api/storage/uploads/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          publicationId,
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });
      if (!reqRes.ok) {
        const err = (await reqRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Request failed (${reqRes.status})`);
      }
      const { mediaId, uploadURL } = (await reqRes.json()) as { mediaId: string; uploadURL: string };

      // Step 2 — PUT bytes directly to GCS
      setUploadState('uploading');
      const putRes = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!putRes.ok) {
        throw new Error(`File upload failed (${putRes.status})`);
      }

      // Step 3 — mark complete so it becomes status=ready
      setUploadState('completing');
      const completeRes = await fetch(`/api/storage/uploads/${mediaId}/complete`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!completeRes.ok) {
        const err = (await completeRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Finalize failed (${completeRes.status})`);
      }

      // Step 4 — update local preview and notify parent
      setLocalPreview(URL.createObjectURL(file));
      setUploadState('done');
      onChange(mediaId);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed — try again.');
      setUploadState('error');
    }
  };

  const busy = uploadState === 'requesting' || uploadState === 'uploading' || uploadState === 'completing';

  const stateLabel: Record<UploadState, string> = {
    idle: displayUrl ? 'Change photo' : 'Upload cover photo',
    requesting: 'Preparing…',
    uploading: 'Uploading…',
    completing: 'Finalizing…',
    done: 'Change photo',
    error: 'Retry upload',
  };

  return (
    <div
      data-testid="field-cover-photo"
      onDragOver={(e) => { e.preventDefault(); if (!busy) setIsFileDragging(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsFileDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsFileDragging(false);
        if (busy) return;
        const file = e.dataTransfer.files[0];
        if (file) void handleFileChange(file);
      }}
      className={isFileDragging ? 'outline outline-2 outline-offset-2 outline-[hsl(var(--brick))]' : undefined}
    >
      <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Cover photo <span className="normal-case tracking-normal">(optional)</span></span>

      {displayUrl ? (
        <div className="mb-2">
          {/* Full-image crop picker — shows the complete uncropped source photo.
              A 16:9 live-area box overlaid on top shows exactly what will render
              on the public site. Drag the box to reframe. */}
          <div className="relative flex w-full justify-center overflow-hidden border border-[hsl(var(--input))] bg-black select-none">
            <div className="relative" data-testid="focal-picker">
              <img
                ref={imgRef}
                src={displayUrl}
                alt="Cover photo preview"
                draggable={false}
                onLoad={() => {
                  const img = imgRef.current;
                  if (img) setImgRendered({ w: img.clientWidth, h: img.clientHeight });
                }}
                style={{ display: 'block', maxWidth: '100%', maxHeight: '288px' }}
                data-testid="img-cover-preview"
              />
              {imgRendered && (() => {
                const CROP_RATIO = 16 / 9;
                const { w: iw, h: ih } = imgRendered;
                let bw: number, bh: number, bl: number, bt: number;
                const baseH = Math.min(ih, iw / CROP_RATIO);
                bh = Math.round(baseH / zoom);
                bw = Math.round(bh * CROP_RATIO);
                const overflowX = iw - bw;
                const overflowY = ih - bh;
                bl = overflowX > 0.5 ? Math.round(overflowX * focalX) : Math.round((iw - bw) / 2);
                bt = overflowY > 0.5 ? Math.round(overflowY * focalY) : Math.round((ih - bh) / 2);
                const canDrag = overflowX > 0.5 || overflowY > 0.5;
                return (
                  <>
                    {/* Dark vignette outside the live area */}
                    {bt > 0 && <div className="pointer-events-none absolute left-0 right-0 top-0 bg-black/55" style={{ height: bt }} />}
                    {bt + bh < ih && <div className="pointer-events-none absolute left-0 right-0 bg-black/55" style={{ top: bt + bh, bottom: 0 }} />}
                    {bl > 0 && <div className="pointer-events-none absolute bg-black/55" style={{ left: 0, top: bt, width: bl, height: bh }} />}
                    {bl + bw < iw && <div className="pointer-events-none absolute bg-black/55" style={{ left: bl + bw, top: bt, right: 0, height: bh }} />}
                    {/* Live-area box — drag to reframe */}
                    <div
                      className="absolute border-2 border-white"
                      style={{
                        left: bl, top: bt, width: bw, height: bh,
                        cursor: canDrag ? 'grab' : 'default',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
                      }}
                      onMouseDown={canDrag ? (e) => {
                        e.preventDefault();
                        focalDragRef.current = { startX: e.clientX, startY: e.clientY, startFocalX: focalX, startFocalY: focalY, imgW: iw, imgH: ih, zoom };
                      } : undefined}
                      data-testid="focal-picker-box"
                    >
                      {/* Rule-of-thirds guides */}
                      <div className="pointer-events-none absolute left-1/3 top-0 bottom-0 w-px bg-white/25" />
                      <div className="pointer-events-none absolute left-2/3 top-0 bottom-0 w-px bg-white/25" />
                      <div className="pointer-events-none absolute top-1/3 left-0 right-0 h-px bg-white/25" />
                      <div className="pointer-events-none absolute top-2/3 left-0 right-0 h-px bg-white/25" />
                      {canDrag && (
                        <div className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2">
                          <span className="whitespace-nowrap rounded bg-black/60 px-2 py-0.5 font-ui text-[8px] uppercase tracking-[.1em] text-white/90">Drag to reframe</span>
                        </div>
                      )}
                    </div>
                    {/* File-drag overlay */}
                    {isFileDragging && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[hsl(var(--brick)/.35)]">
                        <span className="rounded bg-black/60 px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.12em] text-white">Drop to replace cover</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
          {/* Zoom control */}
          <div className="mt-2 flex items-center gap-2 px-0.5">
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => onZoomChange(Math.max(1, Math.round((zoom - 0.1) * 20) / 20))}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[hsl(var(--input))] font-ui text-sm leading-none text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--accent))] select-none"
            >−</button>
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={zoom}
              onChange={e => onZoomChange(parseFloat(e.target.value))}
              className="flex-1 accent-[hsl(var(--brick))]"
              aria-label="Zoom level"
            />
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => onZoomChange(Math.min(4, Math.round((zoom + 0.1) * 20) / 20))}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[hsl(var(--input))] font-ui text-sm leading-none text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--accent))] select-none"
            >+</button>
            <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-[hsl(var(--muted-foreground))]">{zoom.toFixed(2)}×</span>
            {zoom > 1.001 && (
              <button
                type="button"
                onClick={() => onZoomChange(1)}
                className="shrink-0 font-ui text-[9px] uppercase tracking-[.1em] text-[hsl(var(--brick))] transition-opacity hover:opacity-70 whitespace-nowrap"
              >Reset</button>
            )}
          </div>
          {/* Remove button — sits below the picker, not overlaid on the image */}
          <button
            type="button"
            onClick={() => { setLocalPreview(null); setImgRendered(null); onChange(null); setUploadState('idle'); }}
            className="mt-1 inline-flex items-center gap-1 font-ui text-[9px] uppercase tracking-[.1em] text-[hsl(var(--brick))] transition-colors hover:opacity-70"
            aria-label="Remove cover photo"
            data-testid="button-remove-cover"
          >
            <X size={10} /> Remove photo
          </button>
        </div>
      ) : (
        <div className={`mb-2 flex aspect-[16/9] max-h-40 flex-col items-center justify-center gap-1.5 border border-dashed transition-colors ${isFileDragging ? 'border-[hsl(var(--brick))] bg-[hsl(var(--brick)/.06)]' : 'border-[hsl(var(--input))] bg-[hsl(var(--card)/.45)]'}`}>
          {busy
            ? <Loader2 size={20} className="animate-spin text-[hsl(var(--muted-foreground))]" />
            : isFileDragging
            ? <><ImageIcon size={20} className="text-[hsl(var(--brick))]" /><span className="font-ui text-[9px] uppercase tracking-[.12em] text-[hsl(var(--brick))]">Drop image here</span></>
            : <><ImageIcon size={20} className="text-[hsl(var(--muted-foreground)/.5)]" /><span className="font-ui text-[9px] text-[hsl(var(--muted-foreground)/.6)]">Drag image here or click below</span></>}
        </div>
      )}

      <div className="flex items-center gap-2">
        <label className={`inline-flex cursor-pointer items-center gap-2 border border-[hsl(var(--border))] px-3 py-2 font-ui text-[10px] uppercase tracking-[.12em] transition-colors hover:border-[hsl(var(--brick))] ${busy ? 'cursor-wait opacity-50' : ''}`} data-testid="button-upload-cover">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
          {stateLabel[uploadState]}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileChange(file);
              e.target.value = '';
            }}
            data-testid="input-file-cover"
          />
        </label>
        {coverMediaId && (
          <span className="font-meta text-[9px] uppercase tracking-[.1em] text-[hsl(var(--pine-2))]">
            <Check size={10} className="mr-0.5 inline" />Photo attached
          </span>
        )}
      </div>

      {uploadError && (
        <p className="mt-1.5 font-ui text-[10px] leading-4 text-[hsl(var(--brick))]" role="alert" data-testid="status-upload-error">
          {uploadError}
        </p>
      )}
      {!uploadError && (
        <span className="mt-1.5 block font-ui text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">
          {displayUrl ? 'Focal point saves with the story.' : 'JPEG or PNG recommended. Photo appears on the public page after publishing.'}
        </span>
      )}
    </div>
  );
}

// ─── Team photo uploader (simplified — no focal-point/zoom) ─────────────────

function TeamPhotoUploader({
  label,
  mediaId,
  photoUrl,
  publicationId,
  onChange,
}: {
  label: string;
  mediaId: string;
  photoUrl: string;
  publicationId: string;
  onChange: (mediaId: string, photoUrl: string) => void;
}) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadError, setUploadError] = useState('');
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayUrl = localPreview || photoUrl || null;
  const busy = uploadState === 'requesting' || uploadState === 'uploading' || uploadState === 'completing';

  const handleFileChange = async (file: File) => {
    if (!file.type.startsWith('image/')) { setUploadError('Only image files are accepted.'); return; }
    setUploadError('');
    try {
      setUploadState('requesting');
      const reqRes = await fetch('/api/storage/uploads/request-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ publicationId, name: file.name, size: file.size, contentType: file.type }),
      });
      if (!reqRes.ok) { const e = (await reqRes.json().catch(() => ({}))) as { error?: string }; throw new Error(e.error ?? `Request failed (${reqRes.status})`); }
      const { mediaId: newId, uploadURL } = (await reqRes.json()) as { mediaId: string; uploadURL: string };

      setUploadState('uploading');
      const putRes = await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

      setUploadState('completing');
      const completeRes = await fetch(`/api/storage/uploads/${newId}/complete`, { method: 'POST', credentials: 'include' });
      if (!completeRes.ok) { const e = (await completeRes.json().catch(() => ({}))) as { error?: string }; throw new Error(e.error ?? `Finalize failed (${completeRes.status})`); }
      const { coverUrl: newPhotoUrl } = (await completeRes.json()) as { coverUrl: string };

      setLocalPreview(URL.createObjectURL(file));
      setUploadState('done');
      onChange(newId, newPhotoUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed — try again.');
      setUploadState('error');
    }
  };

  return (
    <div>
      <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">{label}</span>
      {displayUrl ? (
        <div className="relative mb-2 inline-block">
          <img src={displayUrl} alt="Team photo" className="size-24 rounded-sm object-cover" />
          <button type="button" onClick={() => { setLocalPreview(null); onChange('', ''); setUploadState('idle'); }} className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-[hsl(var(--brick))] text-white" aria-label="Remove photo"><X size={10} /></button>
        </div>
      ) : (
        <div className="mb-2 flex aspect-square w-24 flex-col items-center justify-center gap-1 border border-dashed border-[hsl(var(--input))] bg-[hsl(var(--card)/.45)]">
          {busy ? <Loader2 size={16} className="animate-spin text-[hsl(var(--muted-foreground))]" /> : <ImageIcon size={16} className="text-[hsl(var(--muted-foreground)/.4)]" />}
        </div>
      )}
      <label className={`inline-flex cursor-pointer items-center gap-1.5 border border-[hsl(var(--border))] px-2.5 py-1.5 font-ui text-[9px] uppercase tracking-[.12em] transition-colors hover:border-[hsl(var(--brick))] ${busy ? 'cursor-wait opacity-50' : ''}`}>
        {busy ? <Loader2 size={10} className="animate-spin" /> : <ImageIcon size={10} />}
        {busy ? 'Uploading…' : mediaId ? 'Replace photo' : 'Upload photo'}
        <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileChange(f); e.target.value = ''; }} />
      </label>
      {uploadError && <p className="mt-1 font-ui text-[10px] text-[hsl(var(--brick))]">{uploadError}</p>}
    </div>
  );
}

// ─── Staff preview ───────────────────────────────────────────────────────────

function StaffPreview({ form, coverUrl }: { form: FormState; coverUrl: string | null }) {
  const ingredients = form.contentType === 'recipe' ? form.ingredients.filter(Boolean) : [];
  const steps = form.contentType === 'recipe' ? form.steps.filter(Boolean) : [];
  const timeline = form.contentType === 'crooks-corner' ? form.timeline.filter((t) => t.year || t.event) : [];

  return (
    <div data-testid="section-preview">
      <p className="mb-3 flex items-center gap-1.5 font-ui text-[9px] uppercase tracking-[.15em] text-[hsl(var(--brick)/.7)]">
        <Eye size={10} />
        Draft preview — public-site rendering
      </p>
      <article className="family-row published-story-row" style={{ gridTemplateColumns: '1fr', marginBottom: 0 }}>
        <div className="family-img" style={{ minHeight: 260 }}>
          {coverUrl
            ? <img src={coverUrl} alt={form.title || 'Cover photo'} className="family-photo" style={{ objectPosition: `${(form.coverFocalX ?? 0.5) * 100}% ${(form.coverFocalY ?? 0.5) * 100}%` }} />
            : <><span className="family-issue-badge">Draft preview</span><div className="published-story-mark">LAS</div></>
          }
        </div>
        <div className="family-copy">
          <span className="tag">{form.contentType.replaceAll('-', ' ')}</span>
          <h2>{form.title || <em style={{ opacity: 0.35 }}>No headline yet</em>}</h2>
          <p className="dek">{form.summary || <em style={{ opacity: 0.35 }}>No standfirst yet</em>}</p>
          {renderBody(form.body)}
          {form.contentType === 'recipe' && (
            <>
              {form.servings && <p><strong>Yield:</strong> {form.servings}</p>}
              {ingredients.length > 0 && <ul className="ing-list">{ingredients.map((ing, i) => <li key={i}>{ing}</li>)}</ul>}
              {steps.length > 0 && <ol className="steps-list">{steps.map((step, i) => <li key={i}>{step}</li>)}</ol>}
            </>
          )}
          {form.contentType === 'crooks-corner' && timeline.length > 0 && (
            <div className="hist-timeline">
              {timeline.map(({ year, event }, i) => <div className="t-row" key={i}><span className="yr">{year}</span>{event}</div>)}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

// ─── Editor ─────────────────────────────────────────────────────────────────

function Editor({
  selectedId,
  isCreating,
  item,
  form,
  setForm,
  onCancel,
  onSave,
  onPublish,
  onDelete,
  saving,
  error,
  publicationId,
}: {
  selectedId: string | null;
  isCreating: boolean;
  item?: ContentItem;
  form: FormState;
  setForm: (next: FormState) => void;
  onCancel: () => void;
  onSave: () => void;
  onPublish: () => void;
  onDelete: () => void;
  saving: boolean;
  error: string;
  publicationId: string;
}) {
  const update = (key: keyof FormState, value: string | null) => setForm({ ...form, [key]: value });
  const hasItem = Boolean(selectedId || isCreating);
  const [previewMode, setPreviewMode] = useState(false);
  useEffect(() => { setPreviewMode(false); }, [selectedId, isCreating]);
  if (!hasItem) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-8 text-center" data-testid="state-editor-idle">
        <Pencil size={22} className="text-[hsl(var(--brick))]" />
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-.035em]">Choose a story to work on.</h2>
        <p className="mt-2 max-w-xs font-ui text-xs leading-5 text-[hsl(var(--muted-foreground))]">Select a record from the desk, or start a new draft when a local story is ready.</p>
      </div>
    );
  }
  return (
    <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]" data-testid="panel-content-editor">
      <div className="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--paper-2)/.48)] px-5 py-4 sm:px-6">
        <div>
          <SectionKicker>{isCreating ? 'New draft' : 'Story editor'}</SectionKicker>
          <h2 className="mt-1 font-display text-3xl font-semibold leading-none tracking-[-.04em]">{isCreating ? 'Put a voice on the page.' : 'Edit this story.'}</h2>
          {item && <p className="mt-2 font-meta text-[9px] uppercase tracking-[.11em] text-[hsl(var(--muted-foreground))]">Last changed {formatDate(item.updatedAt)}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-[hsl(var(--border))]" role="group" aria-label="Editor mode">
            <button type="button" onClick={() => setPreviewMode(false)} className={`px-3 py-1.5 font-ui text-[9px] uppercase tracking-[.12em] transition-colors ${!previewMode ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`} data-testid="button-mode-edit" aria-pressed={!previewMode}>Edit</button>
            <button type="button" onClick={() => setPreviewMode(true)} className={`inline-flex items-center gap-1 px-3 py-1.5 font-ui text-[9px] uppercase tracking-[.12em] transition-colors ${previewMode ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`} data-testid="button-mode-preview" aria-pressed={previewMode}><Eye size={10} />Preview</button>
          </div>
          <button type="button" onClick={onCancel} className="grid size-8 place-items-center border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--brick))] hover:text-[hsl(var(--brick))]" aria-label="Close editor" data-testid="button-close-editor"><X size={15} /></button>
        </div>
      </div>
      {previewMode ? (
        <div className="p-5 sm:p-6">
          <StaffPreview form={form} coverUrl={item?.coverUrl ?? null} />
        </div>
      ) : (
        <div className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-[1fr_1fr]">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Headline</span>
            <input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="A headline with a human voice" className="w-full border-0 border-b border-[hsl(var(--input))] bg-transparent px-0 py-2 font-display text-2xl font-semibold tracking-[-.025em] outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground)/.6)] focus:border-[hsl(var(--brick))]" data-testid="input-content-title" />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Content lane</span>
            <span className="relative block">
              <select value={form.contentType} onChange={(event) => update('contentType', event.target.value)} className="h-10 w-full appearance-none border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 pr-8 font-ui text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="select-content-type">
                {CONTENT_TYPES.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-3 top-3.5 text-[hsl(var(--muted-foreground))]" />
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">URL slug</span>
            <input value={form.slug} onChange={(event) => update('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))} placeholder="story-slug" className="h-10 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-content-slug" />
          </label>
        </div>
        {form.contentType !== 'business-listing' && (<>
        <label className="block">
          <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Standfirst</span>
          <textarea value={form.summary} onChange={(event) => update('summary', event.target.value)} rows={3} placeholder="The short read on why this matters here." className="w-full resize-y border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 font-editorial text-lg leading-tight outline-none focus:border-[hsl(var(--brick))]" data-testid="textarea-content-summary" />
        </label>
        <label className="block">
          <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Pull quote <span className="normal-case tracking-normal opacity-60">(optional — shown in homepage quote rotation)</span></span>
          <input value={form.pullQuote} onChange={(event) => update('pullQuote', event.target.value)} maxLength={220} placeholder="A memorable sentence from this piece…" className="h-10 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-editorial text-base outline-none focus:border-[hsl(var(--brick))]" data-testid="input-content-pull-quote" />
        </label>
        </>)}
        <label className="block">
          <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">
            SEO description <span className="normal-case tracking-normal opacity-60">(optional — auto-generated from standfirst when blank)</span>
          </span>
          <div className="relative">
            <textarea
              value={form.metaDescription}
              onChange={(event) => update('metaDescription', event.target.value.slice(0, 160))}
              rows={2}
              maxLength={160}
              placeholder="1–2 sentences for search engines and social cards. Written for Google, not the magazine."
              className="w-full resize-none border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 pr-14 font-ui text-sm leading-snug outline-none focus:border-[hsl(var(--brick))]"
              data-testid="textarea-content-meta-description"
            />
            <span className={`pointer-events-none absolute bottom-2.5 right-3 font-meta text-[9px] tabular-nums transition-colors ${
              form.metaDescription.length === 0
                ? 'text-[hsl(var(--muted-foreground)/.4)]'
                : form.metaDescription.length >= 120 && form.metaDescription.length <= 155
                ? 'text-[hsl(var(--pine-2))]'
                : form.metaDescription.length > 155
                ? 'text-[hsl(var(--honey))]'
                : 'text-[hsl(var(--muted-foreground))]'
            }`}>
              {form.metaDescription.length}/160
            </span>
          </div>
          {form.metaDescription.length === 0 && form.summary.trim() && (() => {
            const text = form.summary.trim();
            let preview = text;
            if (text.length > 160) {
              const candidate = text.slice(0, 156);
              const lastSentence = Math.max(
                candidate.lastIndexOf('. '),
                candidate.lastIndexOf('! '),
                candidate.lastIndexOf('? '),
                candidate.lastIndexOf('.\n'),
              );
              if (lastSentence >= 50) {
                preview = text.slice(0, lastSentence + 1).trim();
              } else {
                const lastSpace = text.slice(0, 153).lastIndexOf(' ');
                preview = lastSpace >= 50
                  ? text.slice(0, lastSpace).trim() + '…'
                  : text.slice(0, 157).trim() + '…';
              }
            }
            return (
              <p className="mt-1.5 font-ui text-[11px] leading-snug text-[hsl(var(--muted-foreground)/.55)]" data-testid="meta-description-preview">
                <span className="mr-1.5 font-meta text-[9px] uppercase tracking-[.1em]">Google will see:</span>{preview}
              </p>
            );
          })()}
        </label>
        {form.contentType !== 'business-listing' && (
        <label className="block">
          <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Story body</span>
          <textarea value={form.body} onChange={(event) => update('body', event.target.value)} rows={9} placeholder="Write the full story here." className="w-full resize-y border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 font-editorial text-lg leading-[1.35] outline-none focus:border-[hsl(var(--brick))]" data-testid="textarea-content-body" />
        </label>
        )}
        {/* ── Structured editors for new content types ─────────────────── */}
        {(() => {
          const ct = form.contentType;
          const updateIngredient = (i: number, v: string) => { const list = [...form.ingredients]; list[i] = v; setForm({ ...form, ingredients: list }); };
          const addIngredient = () => setForm({ ...form, ingredients: [...form.ingredients, ''] });
          const removeIngredient = (i: number) => setForm({ ...form, ingredients: form.ingredients.length > 1 ? form.ingredients.filter((_, idx) => idx !== i) : [''] });
          const updateStep = (i: number, v: string) => { const list = [...form.steps]; list[i] = v; setForm({ ...form, steps: list }); };
          const addStep = () => setForm({ ...form, steps: [...form.steps, ''] });
          const removeStep = (i: number) => setForm({ ...form, steps: form.steps.length > 1 ? form.steps.filter((_, idx) => idx !== i) : [''] });
          const updateTimeline = (i: number, field: 'year' | 'event', v: string) => { const list = [...form.timeline]; list[i] = { ...list[i], [field]: v }; setForm({ ...form, timeline: list }); };
          const addTimelineRow = () => setForm({ ...form, timeline: [...form.timeline, { year: '', event: '' }] });
          const removeTimelineRow = (i: number) => setForm({ ...form, timeline: form.timeline.length > 1 ? form.timeline.filter((_, idx) => idx !== i) : [{ year: '', event: '' }] });

          if (ct === 'recipe') return (
            <div className="space-y-4 rounded border border-[hsl(var(--honey)/.4)] bg-[hsl(var(--honey)/.06)] p-4">
              <p className="font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--brick))]">Recipe fields</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Issue number</span>
                  <input value={form.issue} onChange={(e) => update('issue', e.target.value)} placeholder="06" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-recipe-issue" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Servings / yield</span>
                  <input value={form.servings} onChange={(e) => update('servings', e.target.value)} placeholder="Makes 1 cocktail" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-recipe-servings" />
                </label>
              </div>
              <div>
                <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Ingredients</span>
                <div className="space-y-1.5" data-testid="list-ingredients">
                  {form.ingredients.map((ing, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={ing} onChange={(e) => updateIngredient(i, e.target.value)} placeholder={`Ingredient ${i + 1}`} className="h-9 flex-1 border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid={`input-ingredient-${i}`} />
                      <button type="button" onClick={() => removeIngredient(i)} className="grid size-9 shrink-0 place-items-center border border-[hsl(var(--border))] text-[hsl(var(--brick))] hover:border-[hsl(var(--brick))]" aria-label="Remove ingredient"><X size={12} /></button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addIngredient} className="mt-2 inline-flex items-center gap-1.5 font-ui text-[10px] uppercase tracking-[.12em] text-[hsl(var(--brick))] hover:text-[hsl(var(--destructive))]" data-testid="button-add-ingredient"><Plus size={11} /> Add ingredient</button>
              </div>
              <div>
                <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Steps</span>
                <div className="space-y-1.5" data-testid="list-steps">
                  {form.steps.map((step, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="flex flex-1 items-start gap-2">
                        <span className="mt-2.5 shrink-0 font-meta text-[9px] text-[hsl(var(--muted-foreground))]">{i + 1}.</span>
                        <textarea value={step} onChange={(e) => updateStep(i, e.target.value)} rows={2} placeholder={`Step ${i + 1}`} className="flex-1 resize-y border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 font-meta text-xs leading-5 outline-none focus:border-[hsl(var(--brick))]" data-testid={`textarea-step-${i}`} />
                      </div>
                      <button type="button" onClick={() => removeStep(i)} className="mt-0.5 grid size-9 shrink-0 place-items-center border border-[hsl(var(--border))] text-[hsl(var(--brick))] hover:border-[hsl(var(--brick))]" aria-label="Remove step"><X size={12} /></button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addStep} className="mt-2 inline-flex items-center gap-1.5 font-ui text-[10px] uppercase tracking-[.12em] text-[hsl(var(--brick))] hover:text-[hsl(var(--destructive))]" data-testid="button-add-step"><Plus size={11} /> Add step</button>
              </div>
            </div>
          );

          if (ct === 'crooks-corner') return (
            <div className="space-y-4 rounded border border-[hsl(var(--honey)/.4)] bg-[hsl(var(--honey)/.06)] p-4">
              <p className="font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--brick))]">Crook's Corner fields</p>
              <label className="block">
                <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Issue number</span>
                <input value={form.issue} onChange={(e) => update('issue', e.target.value)} placeholder="06" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-crooks-issue" />
              </label>
              <div>
                <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Timeline entries</span>
                <div className="space-y-1.5" data-testid="list-timeline">
                  {form.timeline.map((entry, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={entry.year} onChange={(e) => updateTimeline(i, 'year', e.target.value)} placeholder="Year" className="h-9 w-20 shrink-0 border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid={`input-timeline-year-${i}`} />
                      <input value={entry.event} onChange={(e) => updateTimeline(i, 'event', e.target.value)} placeholder="Event description" className="h-9 flex-1 border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid={`input-timeline-event-${i}`} />
                      <button type="button" onClick={() => removeTimelineRow(i)} className="grid size-9 shrink-0 place-items-center border border-[hsl(var(--border))] text-[hsl(var(--brick))] hover:border-[hsl(var(--brick))]" aria-label="Remove timeline row"><X size={12} /></button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addTimelineRow} className="mt-2 inline-flex items-center gap-1.5 font-ui text-[10px] uppercase tracking-[.12em] text-[hsl(var(--brick))] hover:text-[hsl(var(--destructive))]" data-testid="button-add-timeline"><Plus size={11} /> Add timeline entry</button>
              </div>
            </div>
          );

          if (ct === 'event') return (
            <div className="space-y-4 rounded border border-[hsl(var(--honey)/.4)] bg-[hsl(var(--honey)/.06)] p-4">
              <p className="font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--brick))]">Event fields</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Date</span>
                  <input type="date" value={form.eventDate} onChange={(e) => update('eventDate', e.target.value)} className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-event-date" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Start time</span>
                  <input type="time" value={form.startTime} onChange={(e) => update('startTime', e.target.value)} className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-event-start-time" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">End time</span>
                  <input type="time" value={form.endTime} onChange={(e) => update('endTime', e.target.value)} className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-event-end-time" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Venue name</span>
                  <input value={form.venue} onChange={(e) => update('venue', e.target.value)} placeholder="Senoia Coffee & Café" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-event-venue" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Address</span>
                  <input value={form.eventAddress} onChange={(e) => update('eventAddress', e.target.value)} placeholder="1 Main Street, Senoia GA 30276" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-event-address" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Admission / cost</span>
                  <input value={form.admission} onChange={(e) => update('admission', e.target.value)} placeholder="Free · $10 · $25/person" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-event-admission" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Website / tickets URL</span>
                  <input type="url" value={form.ticketsUrl} onChange={(e) => update('ticketsUrl', e.target.value)} placeholder="https://…" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-event-tickets-url" />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Contact (phone or email)</span>
                <input value={form.eventContact} onChange={(e) => update('eventContact', e.target.value)} placeholder="770-555-0100 · hello@example.com" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-event-contact" />
              </label>
            </div>
          );

          if (ct === 'business-listing') return (
            <div className="space-y-4 rounded border border-[hsl(var(--honey)/.4)] bg-[hsl(var(--honey)/.06)] p-4">
              {/* Header row with tier dropdown */}
              <div className="flex items-center justify-between gap-4">
                <p className="font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--brick))]">Business Listing fields</p>
                <label className="flex items-center gap-2 shrink-0">
                  <span className="font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Tier</span>
                  <span className="relative">
                    <select
                      value={form.listingTier}
                      onChange={(e) => update('listingTier', e.target.value as 'standard' | 'premium')}
                      className="h-8 appearance-none border border-[hsl(var(--input))] bg-[hsl(var(--background))] pl-2.5 pr-7 font-ui text-xs outline-none focus:border-[hsl(var(--brick))]"
                      data-testid="select-listing-tier"
                    >
                      <option value="standard">Standard</option>
                      <option value="premium">★ Premium</option>
                    </select>
                    <ChevronDown size={12} className="pointer-events-none absolute right-2 top-2 text-[hsl(var(--muted-foreground))]" />
                  </span>
                </label>
              </div>
              {/* Standard fields — always shown */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Category</span>
                  <span className="relative block">
                    <select value={form.bizCategory} onChange={(e) => update('bizCategory', e.target.value)} className="h-9 w-full appearance-none border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 pr-8 font-ui text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="select-biz-category">
                      <option value="">— choose category —</option>
                      {BUSINESS_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <ChevronDown size={13} className="pointer-events-none absolute right-3 top-2.5 text-[hsl(var(--muted-foreground))]" />
                  </span>
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Phone</span>
                  <input type="tel" value={form.bizPhone} onChange={(e) => update('bizPhone', e.target.value)} placeholder="770-555-0100" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-biz-phone" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Website</span>
                  <input type="url" value={form.bizWebsite} onChange={(e) => update('bizWebsite', e.target.value)} placeholder="https://…" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-biz-website" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Facebook URL <span className="opacity-50">(optional)</span></span>
                  <input type="url" value={form.bizFacebook} onChange={(e) => update('bizFacebook', e.target.value)} placeholder="https://facebook.com/yourbusiness" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-biz-facebook" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Instagram URL <span className="opacity-50">(optional)</span></span>
                  <input type="url" value={form.bizInstagram} onChange={(e) => update('bizInstagram', e.target.value)} placeholder="https://instagram.com/yourbusiness" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-biz-instagram" />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Street address</span>
                <input value={form.bizAddress} onChange={(e) => update('bizAddress', e.target.value)} placeholder="12 Main Street, Senoia GA 30276" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-biz-address" />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Hours</span>
                <textarea value={form.bizHours} onChange={(e) => update('bizHours', e.target.value)} rows={3} placeholder={'Mon–Fri  9am–5pm\nSat  10am–3pm\nSun  Closed'} className="w-full resize-y border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 font-meta text-xs leading-5 outline-none focus:border-[hsl(var(--brick))]" data-testid="textarea-biz-hours" />
              </label>
              {/* Premium-only fields */}
              {form.listingTier === 'premium' && (
                <div className="space-y-4 rounded border border-[hsl(var(--pine)/.35)] bg-[hsl(var(--pine)/.05)] p-3.5">
                  <p className="font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--pine-2))]">★ Premium features</p>
                  <label className="block">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">
                        Business Description <span className="normal-case tracking-normal opacity-60">(150–250 words recommended)</span>
                      </span>
                      <span className={`shrink-0 font-meta text-[9px] tabular-nums transition-colors ${(() => {
                        const wc = form.businessDescription.trim() ? form.businessDescription.trim().split(/\s+/).length : 0;
                        if (wc === 0) return 'text-[hsl(var(--muted-foreground)/.4)]';
                        if (wc >= 150 && wc <= 250) return 'text-[hsl(var(--pine-2))]';
                        if (wc > 250) return 'text-[hsl(var(--honey))]';
                        return 'text-[hsl(var(--muted-foreground))]';
                      })()}`}>
                        {form.businessDescription.trim() ? form.businessDescription.trim().split(/\s+/).length : 0} words
                      </span>
                    </div>
                    <textarea
                      value={form.businessDescription}
                      onChange={(e) => update('businessDescription', e.target.value)}
                      rows={7}
                      placeholder="Describe what makes your business special — your story, what you offer, and why Senoia customers choose you. Aim for 150–250 words."
                      className="w-full resize-y border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 font-editorial text-base leading-snug outline-none focus:border-[hsl(var(--brick))]"
                      data-testid="textarea-biz-description"
                    />
                    {(() => {
                      const wc = form.businessDescription.trim() ? form.businessDescription.trim().split(/\s+/).length : 0;
                      if (wc === 0) return null;
                      if (wc >= 150 && wc <= 250) return <p className="mt-1 font-ui text-[10px] text-[hsl(var(--pine-2))]">Good length — within the 150–250 word sweet spot.</p>;
                      if (wc < 150) return <p className="mt-1 font-ui text-[10px] text-[hsl(var(--muted-foreground))]">A bit short — consider adding more to tell the full story.</p>;
                      return <p className="mt-1 font-ui text-[10px] text-[hsl(var(--honey))]">Getting long — consider trimming to under 250 words.</p>;
                    })()}
                  </label>
                  <p className="font-ui text-[10px] leading-4 text-[hsl(var(--muted-foreground)/.7)]">Logo / hero image and gallery are managed in the sections below once the listing is saved.</p>
                </div>
              )}
            </div>
          );

          if (ct === 'digital_edition') return (
            <div className="space-y-4 rounded border border-[hsl(var(--honey)/.4)] bg-[hsl(var(--honey)/.06)] p-4">
              <p className="font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--brick))]">Digital Edition — Issuu embed</p>
              <label className="block">
                <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Issue Description <span className="normal-case tracking-normal opacity-60">(shown on public Editions page)</span></span>
                <textarea
                  value={form.editionDescription}
                  onChange={(e) => update('editionDescription', e.target.value)}
                  rows={3}
                  placeholder="Featuring the Brewington family, the Senoia Optimist Club, and a tribute to Ellis Crook…"
                  className="w-full resize-y border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 font-editorial text-base leading-tight outline-none focus:border-[hsl(var(--brick))]"
                  data-testid="textarea-edition-description"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Issuu Embed URL</span>
                <input
                  type="url"
                  value={form.issuuEmbedUrl}
                  onChange={(e) => update('issuuEmbedUrl', e.target.value)}
                  placeholder="https://e.issuu.com/embed.html?d=las-issue-06&u=lifearoundsenoia"
                  className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]"
                  data-testid="input-edition-issuu-url"
                />
                <span className="mt-1.5 block font-ui text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">
                  Paste the full Issuu embed URL. In Issuu, open the document → Share → Embed, and copy the <code>src</code> value from the iframe snippet.<br />
                  Format: <code>https://e.issuu.com/embed.html?d=las-issue-06&amp;u=lifearoundsenoia</code><br />
                  Leave blank to show the "Flip-Through Coming Soon" placeholder on the public site.
                </span>
              </label>
            </div>
          );

          if (ct === 'about-page') return (
            <div className="space-y-5 rounded border border-[hsl(var(--honey)/.4)] bg-[hsl(var(--honey)/.06)] p-4">
              <p className="font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--brick))]">About Page fields</p>
              <p className="font-ui text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">The <strong>Headline</strong> and <strong>Story body</strong> fields above drive the "About Life Around Senoia" section. Fill in the KartPath Media and team bio sections below.</p>

              {/* ── KartPath Media section ── */}
              <div className="space-y-3">
                <p className="font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">KartPath Media section</p>
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Section headline</span>
                  <input value={form.kartpathHeadline} onChange={(e) => update('kartpathHeadline', e.target.value)} placeholder="About KartPath Media" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Body copy <span className="normal-case tracking-normal opacity-60">(separate paragraphs with a blank line)</span></span>
                  <textarea value={form.kartpathBody} onChange={(e) => update('kartpathBody', e.target.value)} rows={6} placeholder="Our mission is simple…" className="w-full resize-y border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 font-meta text-xs leading-5 outline-none focus:border-[hsl(var(--brick))]" />
                </label>
              </div>

              <div className="border-t border-[hsl(var(--honey)/.5)]" />

              {/* ── Team member 1 ── */}
              <div className="space-y-3">
                <p className="font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Team member 1</p>
                <TeamPhotoUploader label="Headshot photo" mediaId={form.member1MediaId} photoUrl={form.member1PhotoUrl} publicationId={publicationId} onChange={(mid, url) => setForm({ ...form, member1MediaId: mid, member1PhotoUrl: url })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Name</span>
                    <input value={form.member1Name} onChange={(e) => update('member1Name', e.target.value)} placeholder="Kevin Thompson" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Title / role</span>
                    <input value={form.member1Role} onChange={(e) => update('member1Role', e.target.value)} placeholder="Publisher & Founder" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Bio</span>
                  <textarea value={form.member1Bio} onChange={(e) => update('member1Bio', e.target.value)} rows={3} className="w-full resize-y border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 font-meta text-xs leading-5 outline-none focus:border-[hsl(var(--brick))]" />
                </label>
              </div>

              <div className="border-t border-[hsl(var(--honey)/.5)]" />

              {/* ── Team member 2 ── */}
              <div className="space-y-3">
                <p className="font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Team member 2</p>
                <TeamPhotoUploader label="Headshot photo" mediaId={form.member2MediaId} photoUrl={form.member2PhotoUrl} publicationId={publicationId} onChange={(mid, url) => setForm({ ...form, member2MediaId: mid, member2PhotoUrl: url })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Name</span>
                    <input value={form.member2Name} onChange={(e) => update('member2Name', e.target.value)} placeholder="Blake Adams" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Title / role</span>
                    <input value={form.member2Role} onChange={(e) => update('member2Role', e.target.value)} placeholder="Advertising Director & Managing Partner" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Bio</span>
                  <textarea value={form.member2Bio} onChange={(e) => update('member2Bio', e.target.value)} rows={3} className="w-full resize-y border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 font-meta text-xs leading-5 outline-none focus:border-[hsl(var(--brick))]" />
                </label>
              </div>
            </div>
          );

          if (ct === 'lifestyle-column') return (
            <div className="space-y-4 rounded border border-[hsl(var(--honey)/.4)] bg-[hsl(var(--honey)/.06)] p-4">
              <p className="font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--brick))]">Lifestyle Column fields</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Issue number</span>
                  <input value={form.issue} onChange={(e) => update('issue', e.target.value)} placeholder="06" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-lifestyle-issue" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Subsection</span>
                  <span className="relative block">
                    <select value={form.subsection} onChange={(e) => update('subsection', e.target.value)} className="h-9 w-full appearance-none border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 pr-8 font-ui text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="select-lifestyle-subsection">
                      <option value="">— choose —</option>
                      <option value="secret-sauce">Secret Sauce</option>
                      <option value="around-town">Around Town</option>
                    </select>
                    <ChevronDown size={13} className="pointer-events-none absolute right-3 top-2.5 text-[hsl(var(--muted-foreground))]" />
                  </span>
                </label>
              </div>
            </div>
          );

          // Generic types: issue field + plain JSON details textarea
          return (
            <>
              <label className="block">
                <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Issue number</span>
                <input value={form.issue} onChange={(e) => update('issue', e.target.value)} placeholder="06" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-generic-issue" />
                <span className="mt-1.5 block font-ui text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">Which issue does this story belong to? Use two digits — e.g. 06, not 6.</span>
              </label>
              <label className="block">
                <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Details JSON</span>
                <textarea value={form.detailsText} onChange={(event) => update('detailsText', event.target.value)} rows={5} placeholder={'{"address":"..."}'} className="w-full resize-y border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 font-meta text-xs leading-5 outline-none focus:border-[hsl(var(--brick))]" data-testid="textarea-content-details" />
                <span className="mt-1.5 block font-ui text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">Use string values for lane-specific facts such as address, date, or contact.</span>
              </label>
            </>
          );
        })()}
        {/* ── Cover photo / Business logo (hidden for standard listings) ─ */}
        {(form.contentType !== 'business-listing' || form.listingTier === 'premium') && (<>
          {form.contentType === 'business-listing' && (
            <p className="px-5 font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))] sm:px-6">Business Logo / Hero Image</p>
          )}
          <CoverPhotoUploader
            coverMediaId={form.coverMediaId}
            existingCoverUrl={item?.coverUrl}
            publicationId={publicationId}
            onChange={(mediaId) => update('coverMediaId', mediaId)}
            focalX={form.coverFocalX}
            focalY={form.coverFocalY}
            onFocalChange={(x, y) => setForm({ ...form, coverFocalX: x, coverFocalY: y })}
            zoom={form.coverZoom}
            onZoomChange={(z) => setForm({ ...form, coverZoom: z })}
          />
        </>)}
        {/* ── Gallery (premium business listings + all other types) ──── */}
        {selectedId && !isCreating && (form.contentType !== 'business-listing' || form.listingTier === 'premium') && (
          <GalleryManager contentItemId={selectedId} publicationId={publicationId} />
        )}
        </div>
      )}
      {error && <div className="mx-5 flex items-start gap-2 border border-[hsl(var(--brick)/.4)] bg-[hsl(var(--brick)/.07)] px-3 py-2.5 font-ui text-xs leading-5 text-[hsl(var(--brick))] sm:mx-6" role="alert" data-testid="status-editor-error"><CircleAlert size={15} className="mt-0.5 shrink-0" /> {error}</div>}
      <div className="flex flex-col-reverse gap-2 border-t border-[hsl(var(--border))] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          {!isCreating && item && <button type="button" onClick={onDelete} disabled={saving} className="inline-flex items-center gap-2 px-1 py-2 font-ui text-[10px] uppercase tracking-[.12em] text-[hsl(var(--brick))] transition-colors hover:text-[hsl(var(--destructive))] disabled:opacity-50" data-testid="button-editor-delete"><Trash2 size={14} /> Delete story</button>}
        </div>
        <div className="flex flex-wrap gap-2">
          {!isCreating && item && <button type="button" onClick={onPublish} disabled={saving} className="inline-flex items-center justify-center gap-2 border border-[hsl(var(--primary))] px-3.5 py-2.5 font-ui text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] disabled:opacity-50" data-testid="button-editor-publish">{item.status === EditorialStatus.published ? <Undo2 size={14} /> : <Send size={14} />} {item.status === EditorialStatus.published ? 'Unpublish' : 'Publish'}</button>}
          <button type="button" onClick={onSave} disabled={saving} className="inline-flex items-center justify-center gap-2 bg-[hsl(var(--primary))] px-4 py-2.5 font-ui text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--primary-foreground))] transition-colors hover:bg-[hsl(var(--pine-2))] disabled:cursor-wait disabled:opacity-60" data-testid="button-save-content">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {isCreating ? 'Save draft' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Gallery management ────────────────────────────────────────────────────────

type GalleryItemRowProps = {
  item: GalleryItem;
  isFirst: boolean;
  isLast: boolean;
  publicationId: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onCaptionSave: (caption: string) => void;
};

function GalleryItemRow({ item, isFirst, isLast, onMoveUp, onMoveDown, onRemove, onCaptionSave }: GalleryItemRowProps) {
  const [caption, setCaption] = useState(item.caption ?? '');
  return (
    <div className="flex items-center gap-2 border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-2" data-testid={`gallery-item-${item.mediaAssetId}`}>
      {item.mediaUrl
        ? <img src={item.mediaUrl} alt={item.altText ?? ''} className="size-12 shrink-0 object-cover" />
        : <div className="grid size-12 shrink-0 place-items-center bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"><ImageIcon size={16} /></div>
      }
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        onBlur={() => onCaptionSave(caption)}
        placeholder="Caption (optional)"
        className="h-8 flex-1 border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 font-ui text-[10px] outline-none focus:border-[hsl(var(--brick))]"
        data-testid={`input-gallery-caption-${item.mediaAssetId}`}
      />
      <div className="flex shrink-0 flex-col gap-0.5">
        <button type="button" onClick={onMoveUp} disabled={isFirst} className="grid size-5 place-items-center border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--brick))] hover:text-[hsl(var(--brick))] disabled:opacity-30" aria-label="Move up"><ChevronUp size={11} /></button>
        <button type="button" onClick={onMoveDown} disabled={isLast} className="grid size-5 place-items-center border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--brick))] hover:text-[hsl(var(--brick))] disabled:opacity-30" aria-label="Move down"><ChevronDown size={11} /></button>
      </div>
      <button type="button" onClick={onRemove} className="grid size-8 shrink-0 place-items-center border border-[hsl(var(--border))] text-[hsl(var(--brick))] transition-colors hover:border-[hsl(var(--brick))]" aria-label="Remove from gallery" data-testid={`button-gallery-remove-${item.mediaAssetId}`}><X size={13} /></button>
    </div>
  );
}

function GalleryManager({ contentItemId, publicationId }: { contentItemId: string; publicationId: string }) {
  const queryClient = useQueryClient();
  const galleryParams = { publicationId };
  const galleryKey = getListGalleryItemsQueryKey(contentItemId, galleryParams);
  const galleryQuery = useListGalleryItems(contentItemId, galleryParams, {
    query: { queryKey: galleryKey, retry: false },
  });

  const addMutation = useAddGalleryItem();
  const removeMutation = useRemoveGalleryItem();
  const reorderMutation = useReorderGallery();
  const updateMutation = useUpdateGalleryItem();

  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadError, setUploadError] = useState('');
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const items = galleryQuery.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: galleryKey });

  // Upload a single image file through the full presigned-URL → storage → add-to-gallery flow.
  // Returns true on success, false on error. Awaits the addMutation so callers can sequence files.
  const handleFileChange = async (file: File): Promise<boolean> => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files are accepted.');
      return false;
    }
    try {
      setUploadState('requesting');
      const reqRes = await fetch('/api/storage/uploads/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ publicationId, name: file.name, size: file.size, contentType: file.type }),
      });
      if (!reqRes.ok) {
        const err = (await reqRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Request failed (${reqRes.status})`);
      }
      const { mediaId, uploadURL } = (await reqRes.json()) as { mediaId: string; uploadURL: string };

      setUploadState('uploading');
      const putRes = await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!putRes.ok) throw new Error(`File upload failed (${putRes.status})`);

      setUploadState('completing');
      const completeRes = await fetch(`/api/storage/uploads/${mediaId}/complete`, { method: 'POST', credentials: 'include' });
      if (!completeRes.ok) {
        const err = (await completeRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Finalize failed (${completeRes.status})`);
      }

      // Await the gallery-attach mutation so sequential multi-file uploads don't race.
      await new Promise<void>((resolve, reject) => {
        addMutation.mutate(
          { id: contentItemId, data: { publicationId, mediaId } },
          {
            onSuccess: () => { setUploadState('done'); void invalidate(); resolve(); },
            onError: (err: unknown) => {
              setUploadError((err as { message?: string })?.message ?? 'Could not add to gallery.');
              setUploadState('error');
              reject(err);
            },
          },
        );
      });
      return true;
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed — try again.');
      setUploadState('error');
      return false;
    }
  };

  // Upload multiple files sequentially, showing per-file progress.
  const handleFiles = async (fileList: FileList | File[]) => {
    const imageFiles = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setUploadError('Only image files are accepted.');
      return;
    }
    setUploadError('');
    setUploadQueue({ done: 0, total: imageFiles.length });
    for (let i = 0; i < imageFiles.length; i++) {
      setUploadQueue({ done: i, total: imageFiles.length });
      const ok = await handleFileChange(imageFiles[i]);
      if (!ok) break;
    }
    setUploadQueue(null);
  };

  const busy = uploadState === 'requesting' || uploadState === 'uploading' || uploadState === 'completing' || addMutation.isPending;

  const handleMove = (mediaId: string, direction: 'up' | 'down') => {
    const ids = items.map((i) => i.mediaAssetId);
    const idx = ids.indexOf(mediaId);
    if (direction === 'up' && idx <= 0) return;
    if (direction === 'down' && idx >= ids.length - 1) return;
    const newIds = [...ids];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newIds[idx], newIds[swapIdx]] = [newIds[swapIdx], newIds[idx]];
    reorderMutation.mutate(
      { id: contentItemId, data: { publicationId, items: newIds } },
      { onSuccess: () => void invalidate() },
    );
  };

  const handleRemove = (mediaId: string) => {
    if (!window.confirm('Remove this photo from the gallery?')) return;
    removeMutation.mutate(
      { id: contentItemId, mediaId, params: { publicationId } },
      { onSuccess: () => void invalidate() },
    );
  };

  const handleCaptionSave = (mediaId: string, caption: string) => {
    updateMutation.mutate(
      { id: contentItemId, mediaId, data: { publicationId, caption: caption || null } },
      { onSuccess: () => void invalidate() },
    );
  };

  const busyLabel = uploadQueue
    ? `Uploading ${uploadQueue.done + 1} of ${uploadQueue.total}…`
    : 'Uploading…';

  return (
    <div
      data-testid="field-gallery"
      onDragOver={(e) => { e.preventDefault(); if (!busy) setIsFileDragging(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsFileDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsFileDragging(false);
        if (busy) return;
        void handleFiles(e.dataTransfer.files);
      }}
      className={isFileDragging ? 'outline outline-2 outline-offset-2 outline-[hsl(var(--brick))]' : undefined}
    >
      <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">
        Photo gallery <span className="normal-case tracking-normal">(optional — appears on the article's public page)</span>
      </span>

      {galleryQuery.isPending && <div className="mb-2 h-10 animate-pulse border border-[hsl(var(--border))] bg-[hsl(var(--muted))]" />}
      {galleryQuery.isError && <p className="mb-2 font-ui text-[10px] text-[hsl(var(--brick))]">Could not load gallery. Try refreshing.</p>}

      {items.length > 0 && (
        <div className="mb-3 space-y-1.5" data-testid="gallery-item-list">
          {items.map((gitem, index) => (
            <GalleryItemRow
              key={gitem.id}
              item={gitem}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              publicationId={publicationId}
              onMoveUp={() => handleMove(gitem.mediaAssetId, 'up')}
              onMoveDown={() => handleMove(gitem.mediaAssetId, 'down')}
              onRemove={() => handleRemove(gitem.mediaAssetId)}
              onCaptionSave={(caption) => handleCaptionSave(gitem.mediaAssetId, caption)}
            />
          ))}
        </div>
      )}

      {/* Drop-zone hint — visible when actively dragging files over the gallery area */}
      {isFileDragging && (
        <div className="mb-2 flex items-center justify-center gap-2 border border-dashed border-[hsl(var(--brick))] bg-[hsl(var(--brick)/.06)] py-4 font-ui text-[10px] uppercase tracking-[.12em] text-[hsl(var(--brick))]">
          <ImageIcon size={14} />
          Drop to add {/* dynamically shows number if we can read it from dragEvent, otherwise generic */}
        </div>
      )}

      {uploadError && (
        <div className="mb-2 flex items-start gap-2 border border-[hsl(var(--brick)/.4)] bg-[hsl(var(--brick)/.07)] px-3 py-2 font-ui text-[10px] text-[hsl(var(--brick))]" role="alert" data-testid="status-gallery-upload-error">
          <CircleAlert size={13} className="mt-0.5 shrink-0" /> {uploadError}
        </div>
      )}

      <label className={`inline-flex cursor-pointer items-center gap-2 border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 font-ui text-[10px] uppercase tracking-[.12em] transition-colors hover:border-[hsl(var(--brick))] ${busy ? 'pointer-events-none opacity-50' : ''}`} data-testid="button-add-gallery-photo">
        {busy ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
        {busy ? busyLabel : 'Add photos'}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </label>
      {!busy && (
        <p className="mt-1.5 font-ui text-[10px] text-[hsl(var(--muted-foreground))]">
          Drag images here or click to select multiple at once.
        </p>
      )}
    </div>
  );
}

// ── Team management panel ─────────────────────────────────────────────────────

function RoleLabel({ role }: { role: string }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 font-meta text-[8px] uppercase tracking-[.12em] ${role === 'publication-admin' ? 'bg-[hsl(var(--brick)/.1)] text-[hsl(var(--brick))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>
      {role === 'publication-admin' ? 'Admin' : 'Editor'}
    </span>
  );
}

function TeamPanel({ publicationId, currentUserId }: { publicationId: string; currentUserId: string }) {
  const queryClient = useQueryClient();
  const rosterParams = { publicationId };
  const rosterQuery = useListStaffRoster(rosterParams, {
    query: { queryKey: getListStaffRosterQueryKey(rosterParams), retry: false },
  });
  const inviteMutation = useCreateStaffInvite();
  const revokeMutation = useRevokeStaffAccess();
  const cancelMutation = useCancelStaffInvite();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'publication-admin' | 'editor'>('editor');
  const [formError, setFormError] = useState('');
  const [formFeedback, setFormFeedback] = useState('');

  const members: StaffMember[] = rosterQuery.data?.members ?? [];
  const invites: StaffInviteRecord[] = rosterQuery.data?.invites ?? [];
  const mutating = inviteMutation.isPending || revokeMutation.isPending || cancelMutation.isPending;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListStaffRosterQueryKey(rosterParams) });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormFeedback('');
    if (!email.trim()) { setFormError('Email is required.'); return; }
    inviteMutation.mutate(
      { data: { publicationId, email: email.trim(), role } },
      {
        onSuccess: (result) => {
          const msg = result.result === 'granted'
            ? `Access granted — ${email.trim()} can sign in now.`
            : `Invite sent to ${email.trim()}. They'll get access the first time they sign in.`;
          setFormFeedback(msg);
          setEmail('');
          void invalidate();
        },
        onError: (err: unknown) => setFormError((err as { error?: string })?.error ?? 'Failed to send invite.'),
      },
    );
  };

  const handleRevoke = (member: StaffMember) => {
    if (!window.confirm(`Remove ${member.displayName || member.email}'s access? They will no longer be able to sign in to the CMS.`)) return;
    setFormError('');
    revokeMutation.mutate(
      { userId: member.userId, params: { publicationId } },
      {
        onSuccess: () => void invalidate(),
        onError: () => setFormError('Failed to remove staff member.'),
      },
    );
  };

  const handleCancel = (invite: StaffInviteRecord) => {
    setFormError('');
    cancelMutation.mutate(
      { inviteId: invite.id, params: { publicationId } },
      {
        onSuccess: () => void invalidate(),
        onError: () => setFormError('Failed to cancel invite.'),
      },
    );
  };

  return (
    <div className="mt-7 max-w-2xl space-y-8">
      {/* Invite form */}
      <section aria-label="Invite staff member">
        <SectionKicker>Add someone new</SectionKicker>
        <h2 className="mt-1 font-display text-3xl font-semibold tracking-[-.04em]">Invite a staff member</h2>
        <p className="mt-2 max-w-lg font-ui text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          Enter their email and role. If they already have an account they'll get access immediately. Otherwise we'll grant it the moment they sign up.
        </p>
        <form onSubmit={handleInvite} className="mt-5 space-y-3" data-testid="form-staff-invite">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="fritz@example.com"
              required
              className="h-9 flex-1 border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-ui text-xs outline-none focus:border-[hsl(var(--brick))]"
              data-testid="input-invite-email"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'publication-admin' | 'editor')}
              className="h-9 appearance-none border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 pr-8 font-ui text-xs outline-none focus:border-[hsl(var(--brick))] sm:w-44"
              data-testid="select-invite-role"
            >
              <option value="editor">Editor</option>
              <option value="publication-admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={mutating}
              className="inline-flex h-9 items-center gap-2 bg-[hsl(var(--pine))] px-4 font-ui text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--pine-foreground,#fff))] disabled:opacity-50"
              data-testid="button-send-invite"
            >
              {inviteMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Send invite
            </button>
          </div>
          {formError && (
            <div className="flex items-start gap-2 border border-[hsl(var(--brick)/.4)] bg-[hsl(var(--brick)/.07)] px-3 py-2 font-ui text-xs text-[hsl(var(--brick))]" role="alert" data-testid="status-invite-error">
              <CircleAlert size={14} className="mt-0.5 shrink-0" /> {formError}
            </div>
          )}
          {formFeedback && (
            <div className="flex items-center gap-2 border-l-2 border-[hsl(var(--pine-2))] bg-[hsl(var(--pine-2)/.07)] px-3 py-2 font-ui text-xs text-[hsl(var(--pine-2))]" role="status" data-testid="status-invite-feedback">
              <Check size={13} /> {formFeedback}
            </div>
          )}
        </form>
      </section>

      {/* Current members */}
      <section aria-label="Current staff members">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <SectionKicker>Active access</SectionKicker>
            <h2 className="mt-1 font-display text-3xl font-semibold tracking-[-.04em]">Current staff</h2>
          </div>
          <button type="button" onClick={() => void rosterQuery.refetch()} className="inline-flex items-center gap-2 font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--brick))]">
            <RefreshCw size={12} className={rosterQuery.isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        {rosterQuery.isPending && <div className="h-24 animate-pulse border border-[hsl(var(--border))] bg-[hsl(var(--card))]" />}
        {rosterQuery.isError && <p className="font-ui text-xs text-[hsl(var(--brick))]">Could not load roster. Try refreshing.</p>}
        {!rosterQuery.isPending && !rosterQuery.isError && members.length === 0 && (
          <p className="font-ui text-xs text-[hsl(var(--muted-foreground))]">No staff with access yet.</p>
        )}
        {members.length > 0 && (
          <div className="overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--border))]" data-testid="list-staff-members">
            {members.map((member) => (
              <div key={member.userId} className="flex items-center justify-between gap-4 bg-[hsl(var(--card))] px-4 py-3" data-testid={`staff-member-${member.userId}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-ui text-xs font-semibold">{member.displayName || member.email}</p>
                  {member.displayName && <p className="mt-0.5 truncate font-meta text-[10px] text-[hsl(var(--muted-foreground))]">{member.email}</p>}
                </div>
                <RoleLabel role={member.role} />
                {member.userId !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(member)}
                    disabled={mutating}
                    className="inline-flex items-center gap-1.5 font-meta text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--brick))] disabled:opacity-40"
                    data-testid={`button-revoke-${member.userId}`}
                  >
                    <X size={12} /> Remove
                  </button>
                )}
                {member.userId === currentUserId && (
                  <span className="font-meta text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">You</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending invites */}
      {invites.length > 0 && (
        <section aria-label="Pending invites">
          <SectionKicker>Awaiting sign-up</SectionKicker>
          <h2 className="mt-1 font-display text-3xl font-semibold tracking-[-.04em]">Pending invites</h2>
          <div className="mt-3 overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--border))]" data-testid="list-pending-invites">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between gap-4 bg-[hsl(var(--card))] px-4 py-3" data-testid={`staff-invite-${invite.id}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-ui text-xs font-semibold">{invite.email}</p>
                  <p className="mt-0.5 font-meta text-[10px] text-[hsl(var(--muted-foreground))]">Invite pending</p>
                </div>
                <RoleLabel role={invite.role} />
                <button
                  type="button"
                  onClick={() => handleCancel(invite)}
                  disabled={mutating}
                  className="inline-flex items-center gap-1.5 font-meta text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--brick))] disabled:opacity-40"
                  data-testid={`button-cancel-invite-${invite.id}`}
                >
                  <X size={12} /> Cancel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  new:      { label: 'New',      color: 'hsl(var(--brick))' },
  reviewed: { label: 'Reviewed', color: 'hsl(var(--honey))' },
  accepted: { label: 'Accepted', color: 'hsl(var(--pine-2))' },
  declined: { label: 'Declined', color: 'hsl(var(--muted-foreground))' },
};

function NominationsPanel({ publicationId }: { publicationId: string }) {
  const queryClient = useQueryClient();
  const nominationsQuery = useListNominations({ publicationId });
  const nominations: NominationRecord[] = nominationsQuery.data?.nominations ?? [];
  const updateMutation = useUpdateNominationStatus();

  const setStatus = (id: string, status: UpdateNominationStatusBodyStatus) => {
    updateMutation.mutate({ id, data: { status } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNominationsQueryKey({ publicationId }) }),
    });
  };

  const triageButtons: { status: UpdateNominationStatusBodyStatus; label: string }[] = [
    { status: 'reviewed', label: 'Reviewed' },
    { status: 'accepted', label: 'Accepted' },
    { status: 'declined', label: 'Declined' },
  ];

  return (
    <div className="mt-7">
      <div className="mb-6">
        <SectionKicker>Incoming nominations</SectionKicker>
        <h2 className="mt-1 font-display text-3xl font-semibold tracking-[-.04em]">Story nominations</h2>
        <p className="mt-2 font-ui text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          Reader-submitted story ideas from the public website. Mark each one as you review it.
        </p>
      </div>
      {nominationsQuery.isPending && (
        <div className="space-y-px border border-[hsl(var(--border))] bg-[hsl(var(--border))]">
          {[1, 2, 3].map((r) => <div key={r} className="h-28 animate-pulse bg-[hsl(var(--card))]" />)}
        </div>
      )}
      {nominationsQuery.isError && (
        <div className="border border-[hsl(var(--brick)/.4)] bg-[hsl(var(--card))] p-6">
          <p className="font-ui text-xs text-[hsl(var(--brick))]">Could not load nominations. Try refreshing the page.</p>
        </div>
      )}
      {!nominationsQuery.isPending && !nominationsQuery.isError && nominations.length === 0 && (
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-10 text-center">
          <p className="font-ui text-xs text-[hsl(var(--muted-foreground))]">
            No nominations yet. They'll appear here when readers submit them from the public site.
          </p>
        </div>
      )}
      {nominations.length > 0 && (
        <div className="overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--border))]">
          {nominations.map((nom) => {
            const meta = STATUS_META[nom.status] ?? STATUS_META['new'];
            const busy = updateMutation.isPending && (updateMutation.variables as { id: string } | undefined)?.id === nom.id;
            return (
              <div key={nom.id} className="space-y-2 bg-[hsl(var(--card))] px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-ui text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--brick))]">{nom.category}</span>
                    <span
                      className="rounded-sm px-1.5 py-0.5 font-ui text-[9px] font-bold uppercase tracking-[.1em]"
                      style={{ background: meta.color + '22', color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <span className="font-meta text-[9px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">
                    {new Date(nom.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <p className="font-display text-lg font-semibold tracking-[-.03em]">{nom.nominatorName}</p>
                  <p className="font-ui text-xs text-[hsl(var(--muted-foreground))]">{nom.nominatorEmail}</p>
                </div>
                <p className="font-editorial text-sm leading-relaxed text-[hsl(var(--foreground)/.8)]">{nom.story}</p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="font-ui text-[9px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Mark as:</span>
                  {triageButtons.map(({ status, label }) => {
                    const isActive = nom.status === status;
                    const btnMeta = STATUS_META[status];
                    return (
                      <button
                        key={status}
                        type="button"
                        disabled={isActive || busy}
                        onClick={() => setStatus(nom.id, status)}
                        className="rounded-sm border px-2 py-0.5 font-ui text-[9px] font-bold uppercase tracking-[.1em] transition-colors disabled:cursor-default"
                        style={isActive
                          ? { borderColor: btnMeta.color, background: btnMeta.color + '22', color: btnMeta.color }
                          : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}
                      >
                        {busy && isActive ? '…' : label}
                      </button>
                    );
                  })}
                  {nom.status !== 'new' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setStatus(nom.id, 'new')}
                      className="ml-1 font-ui text-[9px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))] underline-offset-2 hover:underline disabled:cursor-default"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SubscribersPanel({ publicationId }: { publicationId: string }) {
  const subscribersQuery = useListSubscribers({ publicationId });
  const subscribers: SubscriberRecord[] = subscribersQuery.data?.subscribers ?? [];

  const downloadCsv = () => {
    const rows = subscribers as (SubscriberRecord & { firstName?: string; lastName?: string; phone?: string; city?: string })[];
    const header = ['First Name', 'Last Name', 'Email', 'Phone', 'City', 'Signup Date', 'Status'];
    const lines = rows.map((s) => [
      s.firstName ?? '',
      s.lastName ?? '',
      s.email,
      s.phone ?? '',
      s.city ?? '',
      new Date(s.subscribedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      s.status,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header.join(','), ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <SectionKicker>Newsletter</SectionKicker>
          <h2 className="mt-1 font-display text-3xl font-semibold tracking-[-.04em]">Subscribers</h2>
          <p className="mt-2 font-ui text-xs leading-5 text-[hsl(var(--muted-foreground))]">
            Everyone who has signed up via the newsletter form on the public site.
            {!subscribersQuery.isPending && !subscribersQuery.isError && ` ${subscribers.length} subscriber${subscribers.length === 1 ? '' : 's'} total.`}
          </p>
        </div>
        {subscribers.length > 0 && (
          <button
            type="button"
            onClick={downloadCsv}
            className="mt-1 shrink-0 inline-flex items-center gap-1.5 border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 font-ui text-[10px] uppercase tracking-[.12em] transition-colors hover:border-[hsl(var(--brick))] hover:text-[hsl(var(--brick))]"
            data-testid="button-export-csv"
          >
            <Download size={11} /> Export CSV
          </button>
        )}
      </div>
      {subscribersQuery.isPending && (
        <div className="space-y-px border border-[hsl(var(--border))] bg-[hsl(var(--border))]">
          {[1, 2, 3].map((r) => <div key={r} className="h-10 animate-pulse bg-[hsl(var(--card))]" />)}
        </div>
      )}
      {subscribersQuery.isError && (
        <div className="border border-[hsl(var(--brick)/.4)] bg-[hsl(var(--card))] p-6">
          <p className="font-ui text-xs text-[hsl(var(--brick))]">Could not load subscribers. Try refreshing the page.</p>
        </div>
      )}
      {!subscribersQuery.isPending && !subscribersQuery.isError && subscribers.length === 0 && (
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-10 text-center">
          <p className="font-ui text-xs text-[hsl(var(--muted-foreground))]">
            No subscribers yet. They'll appear here after signing up on the public site.
          </p>
        </div>
      )}
      {subscribers.length > 0 && (
        <div className="overflow-hidden border border-[hsl(var(--border))]">
          <div className="grid grid-cols-[1fr_auto_auto] bg-[hsl(var(--muted)/.4)] px-4 py-2">
            <span className="font-ui text-[9px] font-bold uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Email</span>
            <span className="font-ui text-[9px] font-bold uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Signed up</span>
            <span className="pl-6 font-ui text-[9px] font-bold uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Status</span>
          </div>
          <div className="divide-y divide-[hsl(var(--border))] bg-[hsl(var(--card))]">
            {subscribers.map((sub) => (
              <div key={sub.id} className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-2.5">
                <span className="font-meta text-xs text-[hsl(var(--foreground))]">{sub.email}</span>
                <span className="font-meta text-[10px] text-[hsl(var(--muted-foreground))]">
                  {new Date(sub.subscribedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span
                  className="ml-6 rounded-sm px-1.5 py-0.5 font-ui text-[9px] font-bold uppercase tracking-[.1em]"
                  style={sub.status === 'active'
                    ? { background: 'hsl(var(--pine-2) / .15)', color: 'hsl(var(--pine-2))' }
                    : { background: 'hsl(var(--muted-foreground) / .15)', color: 'hsl(var(--muted-foreground))' }}
                >
                  {sub.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Staff() {
  const queryClient = useQueryClient();
  const userQuery = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const user = userQuery.data;
  const access = user?.access?.[0];
  const publicationId = access?.publicationId;
  const isUnauthorized = userQuery.isError;
  const safePublicationId = publicationId ?? '00000000-0000-0000-0000-000000000000';
  const isAdmin = access?.role === 'publication-admin';
  const [activeTab, setActiveTab] = useState<'editorial' | 'team' | 'nominations' | 'subscribers' | 'homepage' | 'events' | 'business-listings' | 'editions'>('editorial');
  const [status, setStatus] = useState<'' | EditorialStatus>('');
  const [contentType, setContentType] = useState<'' | ContentType>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editorError, setEditorError] = useState('');
  const [feedback, setFeedback] = useState('');

  const listParams = useMemo(() => ({
    publicationId: safePublicationId,
    ...(status ? { status } : {}),
  }), [safePublicationId, status]);
  const listQuery = useListContentItems(listParams, {
    query: { enabled: Boolean(publicationId), queryKey: getListContentItemsQueryKey(listParams), retry: false },
  });
  const detailParams = useMemo(() => ({ publicationId: safePublicationId }), [safePublicationId]);
  const detailQuery = useGetContentItem(selectedId ?? '', detailParams, {
    query: { enabled: Boolean(selectedId && publicationId), queryKey: getGetContentItemQueryKey(selectedId ?? '', detailParams), retry: false },
  });
  const createMutation = useCreateContentItem();
  const updateMutation = useUpdateContentItem();
  const publishMutation = usePublishContentItem();
  const deleteMutation = useDeleteContentItem();

  const items = listQuery.data ?? [];
  const editorialItems = items
    .filter((i) => i.contentType !== 'event' && i.contentType !== 'business-listing' && i.contentType !== 'digital_edition')
    .filter((i) => !contentType || i.contentType === contentType);
  const eventItems = items.filter((i) => i.contentType === 'event');
  const listingItems = items.filter((i) => i.contentType === 'business-listing');
  const editionItems = items.filter((i) => i.contentType === 'digital_edition');
  const selectedItem = detailQuery.data ?? items.find((item) => item.id === selectedId);
  const busy = createMutation.isPending || updateMutation.isPending || publishMutation.isPending || deleteMutation.isPending;

  useEffect(() => {
    if (selectedId && detailQuery.data) {
      const item = detailQuery.data;
      const ct = item.contentType;
      const d = item.details ?? {};
      let ingredients: string[] = [''];
      let steps: string[] = [''];
      let timeline: TimelineEntry[] = [{ year: '', event: '' }];
      let subsection: 'secret-sauce' | 'around-town' | '' = '';
      if (ct === 'recipe') {
        try { ingredients = JSON.parse(d.ingredients ?? '[]'); } catch { /* keep default */ }
        try { steps = JSON.parse(d.steps ?? '[]'); } catch { /* keep default */ }
        if (!ingredients.length) ingredients = [''];
        if (!steps.length) steps = [''];
      }
      if (ct === 'crooks-corner') {
        try { timeline = JSON.parse(d.timeline ?? '[]'); } catch { /* keep default */ }
        if (!timeline.length) timeline = [{ year: '', event: '' }];
      }
      if (ct === 'lifestyle-column') {
        subsection = (d.subsection as 'secret-sauce' | 'around-town' | '') ?? '';
      }
      setForm({
        contentType: item.contentType,
        slug: item.slug,
        title: item.title,
        summary: item.summary,
        body: item.body,
        detailsText: JSON.stringify(d, null, 2),
        coverMediaId: item.coverMediaId,
        coverFocalX: (item as any).coverFocalX ?? 0.5,
        coverFocalY: (item as any).coverFocalY ?? 0.5,
        coverZoom: (item as any).coverZoom ?? 1,
        issue: d.issue ?? '',
        subsection,
        servings: d.servings ?? '',
        ingredients,
        steps,
        timeline,
        // event
        eventDate: d.date ?? '',
        startTime: d.startTime ?? '',
        endTime: d.endTime ?? '',
        venue: d.venue ?? '',
        eventAddress: d.address ?? '',
        admission: d.admission ?? '',
        ticketsUrl: d.ticketsUrl ?? '',
        eventContact: d.contact ?? '',
        // business-listing
        bizCategory: d.category ?? '',
        bizPhone: d.phone ?? '',
        bizWebsite: d.website ?? '',
        bizFacebook: d.facebook_url ?? '',
        bizInstagram: d.instagram_url ?? '',
        bizAddress: ct === 'business-listing' ? (d.address ?? '') : '',
        bizHours: d.hours ?? '',
        issuuEmbedUrl: d.issuu_embed_url ?? '',
        editionDescription: d.description ?? '',
        editionEditorialTitle: d.editorial_title ?? '',
        kartpathHeadline: d.kartpathHeadline ?? '',
        kartpathBody: d.kartpathBody ?? '',
        member1Name: d.member1Name ?? '',
        member1Role: d.member1Role ?? '',
        member1Bio: d.member1Bio ?? '',
        member1MediaId: d.member1MediaId ?? '',
        member1PhotoUrl: d.member1PhotoUrl ?? '',
        member2Name: d.member2Name ?? '',
        member2Role: d.member2Role ?? '',
        member2Bio: d.member2Bio ?? '',
        member2MediaId: d.member2MediaId ?? '',
        member2PhotoUrl: d.member2PhotoUrl ?? '',
        pullQuote: item.pullQuote ?? '',
        metaDescription: item.metaDescription ?? '',
        listingTier: (item.listingTier as 'standard' | 'premium') ?? 'standard',
        businessDescription: item.businessDescription ?? '',
      });
      setEditorError('');
    }
  }, [selectedId, detailQuery.data]);

  const invalidateList = () => {
    void queryClient.invalidateQueries({ queryKey: getListContentItemsQueryKey(listParams) });
  };

  const invalidateDetail = (id: string) => {
    void queryClient.invalidateQueries({ queryKey: getGetContentItemQueryKey(id, detailParams) });
  };

  const beginCreate = () => {
    setSelectedId(null);
    setIsCreating(true);
    setForm(EMPTY_FORM);
    setEditorError('');
    setFeedback('');
  };

  const beginCreateEvent = () => { setSelectedId(null); setIsCreating(true); setForm({ ...EMPTY_FORM, contentType: EditorialContentType.event }); setEditorError(''); setFeedback(''); };
  const beginCreateListing = () => { setSelectedId(null); setIsCreating(true); setForm({ ...EMPTY_FORM, contentType: EditorialContentType['business-listing'] }); setEditorError(''); setFeedback(''); };
  const beginCreateEdition = () => {
    const nums = editionItems.map((e) => parseInt(e.slug.replace('edition-', ''), 10)).filter((n) => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    const nextSlug = `edition-${String(max + 1).padStart(2, '0')}`;
    setSelectedId(null);
    setIsCreating(true);
    setForm({ ...EMPTY_FORM, contentType: EditorialContentType.digital_edition, slug: nextSlug });
    setEditorError('');
    setFeedback('');
  };

  const selectItem = (item: ContentItem) => {
    setIsCreating(false);
    setSelectedId(item.id);
    setEditorError('');
    setFeedback('');
  };

  const cancelEditor = () => {
    setSelectedId(null);
    setIsCreating(false);
    setEditorError('');
  };

  const parseDetailsJson = () => {
    try {
      const parsed: unknown = JSON.parse(form.detailsText || '{}');
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object' || Object.values(parsed).some((value) => typeof value !== 'string')) {
        throw new Error('Details must be a JSON object with string values.');
      }
      return parsed as Record<string, string>;
    } catch {
      setEditorError('Details must be valid JSON with string values, for example {"address":"12 Main Street"}.');
      return null;
    }
  };

  const bodyForSave = () => {
    if (!publicationId) return null;
    if (!form.title.trim() || !form.slug.trim() || (form.contentType !== 'digital_edition' && form.contentType !== 'business-listing' && !form.summary.trim())) {
      setEditorError('Headline, slug, and standfirst are required.');
      return null;
    }
    const ct = form.contentType;
    let details: Record<string, string>;
    if (ct === 'recipe') {
      const ings = form.ingredients.map((s) => s.trim()).filter(Boolean);
      const stps = form.steps.map((s) => s.trim()).filter(Boolean);
      if (!ings.length) { setEditorError('At least one ingredient is required for a recipe.'); return null; }
      if (!stps.length) { setEditorError('At least one step is required for a recipe.'); return null; }
      details = { issue: form.issue.trim(), servings: form.servings.trim(), ingredients: JSON.stringify(ings), steps: JSON.stringify(stps) };
    } else if (ct === 'crooks-corner') {
      const tl = form.timeline.filter((e) => e.year.trim() || e.event.trim());
      details = { issue: form.issue.trim(), timeline: JSON.stringify(tl) };
    } else if (ct === 'lifestyle-column') {
      if (!form.subsection) { setEditorError('Subsection (Secret Sauce or Around Town) is required for a Lifestyle Column.'); return null; }
      if (!form.body.trim()) { setEditorError('Story body is required.'); return null; }
      details = { issue: form.issue.trim(), subsection: form.subsection };
    } else if (ct === 'event') {
      if (!form.eventDate) { setEditorError('A date is required for an event.'); return null; }
      if (!form.venue.trim()) { setEditorError('A venue name is required for an event.'); return null; }
      details = {
        date: form.eventDate,
        startTime: form.startTime,
        endTime: form.endTime,
        venue: form.venue.trim(),
        address: form.eventAddress.trim(),
        admission: form.admission.trim(),
        ticketsUrl: form.ticketsUrl.trim(),
        contact: form.eventContact.trim(),
      };
    } else if (ct === 'business-listing') {
      if (!form.bizCategory) { setEditorError('A category is required for a business listing.'); return null; }
      details = {
        category: form.bizCategory,
        phone: form.bizPhone.trim(),
        website: form.bizWebsite.trim(),
        ...(form.bizFacebook.trim() && { facebook_url: form.bizFacebook.trim() }),
        ...(form.bizInstagram.trim() && { instagram_url: form.bizInstagram.trim() }),
        address: form.bizAddress.trim(),
        hours: form.bizHours.trim(),
      };
    } else if (ct === 'about-page') {
      if (!form.body.trim()) { setEditorError('LAS section body is required.'); return null; }
      details = {
        lasHeadline: form.title.trim(),
        kartpathHeadline: form.kartpathHeadline.trim() || 'About KartPath Media',
        kartpathBody: form.kartpathBody.trim(),
        member1Name: form.member1Name.trim(),
        member1Role: form.member1Role.trim(),
        member1Bio: form.member1Bio.trim(),
        member1MediaId: form.member1MediaId,
        member1PhotoUrl: form.member1PhotoUrl,
        member2Name: form.member2Name.trim(),
        member2Role: form.member2Role.trim(),
        member2Bio: form.member2Bio.trim(),
        member2MediaId: form.member2MediaId,
        member2PhotoUrl: form.member2PhotoUrl,
      };
    } else if (ct === 'digital_edition') {
      if (isCreating && !/^edition-\d{2,}$/.test(form.slug.trim())) {
        setEditorError('Edition slug must follow the format edition-NN (e.g. edition-07).');
        return null;
      }
      details = {
        ...(form.issuuEmbedUrl.trim() && { issuu_embed_url: form.issuuEmbedUrl.trim() }),
        ...(form.editionDescription.trim() && { description: form.editionDescription.trim() }),
        ...(form.editionEditorialTitle.trim() && { editorial_title: form.editionEditorialTitle.trim() }),
      };
    } else {
      if (!form.body.trim()) { setEditorError('Headline, slug, standfirst, and story body are required.'); return null; }
      const parsed = parseDetailsJson();
      if (!parsed) return null;
      details = form.issue.trim() ? { ...parsed, issue: form.issue.trim() } : parsed;
    }
    const isBiz = ct === 'business-listing';
    return {
      publicationId,
      contentType: form.contentType,
      slug: form.slug.trim(),
      title: form.title.trim(),
      summary: isBiz ? '' : form.summary.trim(),
      body: isBiz ? '' : form.body.trim(),
      details,
      pullQuote: isBiz ? null : (form.pullQuote.trim() || null),
      metaDescription: form.metaDescription.trim() || null,
      listingTier: form.listingTier,
      businessDescription: isBiz ? (form.businessDescription.trim() || null) : null,
      coverMediaId: form.coverMediaId || null,
      coverFocalX: form.coverFocalX,
      coverFocalY: form.coverFocalY,
      coverZoom: form.coverZoom,
    } satisfies CreateContentItem;
  };

  const save = () => {
    setEditorError('');
    setFeedback('');
    const data = bodyForSave();
    if (!data) return;
    if (isCreating) {
      createMutation.mutate({ data }, {
        onSuccess: (item) => {
          invalidateList();
          setSelectedId(item.id);
          setIsCreating(false);
          setFeedback('Draft saved.');
        },
        onError: () => setEditorError('The draft could not be saved. Check the fields and try again.'),
      });
    } else if (selectedId) {
      updateMutation.mutate({ id: selectedId, data }, {
        onSuccess: () => {
          invalidateList();
          invalidateDetail(selectedId);
          setFeedback('Changes saved.');
        },
        onError: () => setEditorError('The story could not be updated. Check the fields and try again.'),
      });
    }
  };

  const publish = (item: ContentItem) => {
    if (!publicationId) return;
    const nextStatus = item.status === EditorialStatus.published ? EditorialStatus.draft : EditorialStatus.published;
    // Guard: a digital edition cannot be published without a saved Issuu embed URL.
    if (item.contentType === 'digital_edition' && nextStatus === EditorialStatus.published) {
      const det = (item.details ?? {}) as Record<string, string>;
      if (!det.issuu_embed_url?.trim()) {
        setEditorError('An Issuu embed URL is required before publishing this edition. Paste the URL in the editor below and save first.');
        return;
      }
    }
    setFeedback('');
    publishMutation.mutate({ id: item.id, data: { publicationId, status: nextStatus } }, {
      onSuccess: () => {
        invalidateList();
        invalidateDetail(item.id);
        setFeedback(nextStatus === EditorialStatus.published ? 'Story published.' : 'Story returned to draft.');
      },
      onError: () => setEditorError('The publication status could not be changed. Try again.'),
    });
  };

  const remove = (item: ContentItem) => {
    if (!publicationId || !window.confirm(`Delete "${item.title || 'Untitled story'}"? This cannot be undone.`)) return;
    deleteMutation.mutate({ id: item.id, params: { publicationId } }, {
      onSuccess: () => {
        invalidateList();
        if (selectedId === item.id) cancelEditor();
        setFeedback('Story deleted.');
      },
      onError: () => setEditorError('The story could not be deleted. Try again.'),
    });
  };

  return (
    <div className="las-page min-h-[100dvh] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {user && access && <StaffHeader userName={user.displayName} publicationSlug={access.publicationSlug} />}
      <main className="mx-auto max-w-[1500px] px-5 py-9 sm:px-8 lg:px-10 lg:py-12">
        <ClerkLoading><SkeletonWorkspace /></ClerkLoading>
        {userQuery.isPending && <SkeletonWorkspace />}
        {isUnauthorized && <UnauthorizedState />}
        {user && !userQuery.isPending && !isUnauthorized && !publicationId && <NoPublicationState />}
        {user && !userQuery.isPending && !isUnauthorized && publicationId && (
          <>
            <div className="flex flex-col justify-between gap-6 border-b border-[hsl(var(--border))] pb-7 md:flex-row md:items-end">
              <div>
                <SectionKicker>{`Publication operations / ${access?.publicationSlug ?? 'publication'}`}</SectionKicker>
                <h1 className="mt-3 font-display text-5xl font-semibold leading-[.93] tracking-[-.06em] sm:text-7xl" data-testid="text-staff-welcome">The story desk<span className="text-[hsl(var(--brick))]">.</span></h1>
                <p className="mt-4 max-w-2xl font-editorial text-xl leading-tight text-[hsl(var(--muted-foreground))]">Shape the people, places, and moments of Senoia into the next issue.</p>
              </div>
              <div className="flex items-center gap-3 md:pb-1">
                <div className="text-right">
                  <p className="font-meta text-[9px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Signed in as</p>
                  <p className="mt-1 font-ui text-xs font-semibold" data-testid="text-staff-email">{user.email}</p>
                </div>
                <div className="grid size-10 place-items-center border border-[hsl(var(--border))] bg-[hsl(var(--card))]"><Clock3 size={17} className="text-[hsl(var(--brick))]" /></div>
              </div>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-px border border-[hsl(var(--border))] bg-[hsl(var(--border))] sm:grid-cols-4" data-testid="grid-staff-metrics">
              <div className="bg-[hsl(var(--card))] px-4 py-4 sm:px-5"><p className="font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Visible records</p><p className="mt-2 font-display text-3xl font-semibold" data-testid="text-visible-count">{items.length}</p></div>
              <div className="bg-[hsl(var(--card))] px-4 py-4 sm:px-5"><p className="font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Drafts</p><p className="mt-2 font-display text-3xl font-semibold text-[hsl(var(--brick))]" data-testid="text-draft-count">{items.filter((item) => item.status === EditorialStatus.draft).length}</p></div>
              <div className="bg-[hsl(var(--card))] px-4 py-4 sm:px-5"><p className="font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Published</p><p className="mt-2 font-display text-3xl font-semibold text-[hsl(var(--pine-2))]" data-testid="text-published-count">{items.filter((item) => item.status === EditorialStatus.published).length}</p></div>
              <div className="bg-[hsl(var(--card))] px-4 py-4 sm:px-5"><p className="font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Access</p><p className="mt-2 font-display text-3xl font-semibold capitalize" data-testid="text-staff-role">{access?.role || 'Staff'}</p></div>
            </div>
            {feedback && ['editorial', 'events', 'business-listings', 'editions'].includes(activeTab) && <div className="mt-5 flex items-center gap-2 border-l-2 border-[hsl(var(--pine-2))] bg-[hsl(var(--pine-2)/.07)] px-3 py-2 font-ui text-xs text-[hsl(var(--pine-2))]" role="status" data-testid="status-staff-feedback"><Check size={15} /> {feedback}</div>}

            {/* Tab switcher — admin-only tabs nested inside */}
            <div className="mt-7 flex gap-px overflow-x-auto border-b border-[hsl(var(--border))]" role="tablist">
              <button role="tab" aria-selected={activeTab === 'editorial'} onClick={() => { cancelEditor(); setActiveTab('editorial'); }} className={`shrink-0 px-4 pb-3 font-ui text-[10px] font-bold uppercase tracking-[.13em] transition-colors ${activeTab === 'editorial' ? 'border-b-2 border-[hsl(var(--brick))] text-[hsl(var(--brick))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`} data-testid="tab-editorial">Editorial</button>
              <button role="tab" aria-selected={activeTab === 'events'} onClick={() => { cancelEditor(); setActiveTab('events'); }} className={`shrink-0 px-4 pb-3 font-ui text-[10px] font-bold uppercase tracking-[.13em] transition-colors ${activeTab === 'events' ? 'border-b-2 border-[hsl(var(--brick))] text-[hsl(var(--brick))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`} data-testid="tab-events">Events</button>
              <button role="tab" aria-selected={activeTab === 'business-listings'} onClick={() => { cancelEditor(); setActiveTab('business-listings'); }} className={`shrink-0 px-4 pb-3 font-ui text-[10px] font-bold uppercase tracking-[.13em] transition-colors ${activeTab === 'business-listings' ? 'border-b-2 border-[hsl(var(--brick))] text-[hsl(var(--brick))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`} data-testid="tab-business-listings">Listings</button>
              <button role="tab" aria-selected={activeTab === 'editions'} onClick={() => { cancelEditor(); setActiveTab('editions'); }} className={`shrink-0 px-4 pb-3 font-ui text-[10px] font-bold uppercase tracking-[.13em] transition-colors ${activeTab === 'editions' ? 'border-b-2 border-[hsl(var(--brick))] text-[hsl(var(--brick))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`} data-testid="tab-editions">Editions</button>
              {isAdmin && (
                <>
                  <button role="tab" aria-selected={activeTab === 'team'} onClick={() => { cancelEditor(); setActiveTab('team'); }} className={`shrink-0 px-4 pb-3 font-ui text-[10px] font-bold uppercase tracking-[.13em] transition-colors ${activeTab === 'team' ? 'border-b-2 border-[hsl(var(--brick))] text-[hsl(var(--brick))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`} data-testid="tab-team">Team</button>
                  <button role="tab" aria-selected={activeTab === 'nominations'} onClick={() => { cancelEditor(); setActiveTab('nominations'); }} className={`shrink-0 px-4 pb-3 font-ui text-[10px] font-bold uppercase tracking-[.13em] transition-colors ${activeTab === 'nominations' ? 'border-b-2 border-[hsl(var(--brick))] text-[hsl(var(--brick))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`} data-testid="tab-nominations">Nominations</button>
                  <button role="tab" aria-selected={activeTab === 'subscribers'} onClick={() => { cancelEditor(); setActiveTab('subscribers'); }} className={`shrink-0 px-4 pb-3 font-ui text-[10px] font-bold uppercase tracking-[.13em] transition-colors ${activeTab === 'subscribers' ? 'border-b-2 border-[hsl(var(--brick))] text-[hsl(var(--brick))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`} data-testid="tab-subscribers">Subscribers</button>
                  <button role="tab" aria-selected={activeTab === 'homepage'} onClick={() => { cancelEditor(); setActiveTab('homepage'); }} className={`shrink-0 px-4 pb-3 font-ui text-[10px] font-bold uppercase tracking-[.13em] transition-colors ${activeTab === 'homepage' ? 'border-b-2 border-[hsl(var(--brick))] text-[hsl(var(--brick))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`} data-testid="tab-homepage">Homepage</button>
                </>
              )}
            </div>

            {activeTab === 'team' && isAdmin && user && publicationId && (
              <TeamPanel publicationId={publicationId} currentUserId={user.id} />
            )}

            {activeTab === 'nominations' && isAdmin && publicationId && (
              <NominationsPanel publicationId={publicationId} />
            )}

            {activeTab === 'subscribers' && isAdmin && publicationId && (
              <SubscribersPanel publicationId={publicationId} />
            )}

            {activeTab === 'homepage' && isAdmin && publicationId && access?.publicationSlug && (
              <HomepageTab publicationId={publicationId} publicationSlug={access.publicationSlug} />
            )}

            {activeTab === 'events' && publicationId && (
              <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(400px,.74fr)]">
                <section aria-label="Events library" data-testid="section-events-library">
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div><SectionKicker>Events</SectionKicker><h2 className="mt-1 font-display text-3xl font-semibold tracking-[-.04em]">Upcoming &amp; past events</h2></div>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => void listQuery.refetch()} className="inline-flex items-center gap-2 font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--brick))]"><RefreshCw size={13} className={listQuery.isFetching ? 'animate-spin' : ''} /> Refresh</button>
                      <button type="button" onClick={beginCreateEvent} className="inline-flex items-center gap-2 bg-[hsl(var(--primary))] px-3 py-1.5 font-ui text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--primary-foreground))]" data-testid="button-create-event"><FilePlus2 size={13} /> New event</button>
                    </div>
                  </div>
                  {listQuery.isPending && <div className="mt-4 space-y-px border border-[hsl(var(--border))] bg-[hsl(var(--border))]">{[1, 2, 3].map((r) => <div key={r} className="h-28 animate-pulse bg-[hsl(var(--card))]" />)}</div>}
                  {!listQuery.isPending && !listQuery.isError && eventItems.length === 0 && <div className="mt-4"><EmptyList filtered={false} onCreate={beginCreateEvent} /></div>}
                  {!listQuery.isPending && !listQuery.isError && eventItems.length > 0 && <div className="mt-4 overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--border))]" data-testid="list-event-items">{eventItems.map((item) => <ContentRow key={item.id} item={item} selected={item.id === selectedId} onSelect={() => selectItem(item)} onPublish={() => publish(item)} onDelete={() => remove(item)} busy={busy} />)}</div>}
                </section>
                <section aria-label="Event editor" className="lg:sticky lg:top-5" data-testid="section-event-editor">
                  {detailQuery.isPending && selectedId && !isCreating && <div className="min-h-[520px] animate-pulse border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"><div className="h-3 w-24 bg-[hsl(var(--muted))]" /><div className="mt-5 h-10 w-3/4 bg-[hsl(var(--muted))]" /></div>}
                  {(!detailQuery.isPending || isCreating) && <Editor selectedId={selectedId} isCreating={isCreating} item={selectedItem} form={form} setForm={setForm} onCancel={cancelEditor} onSave={save} onPublish={() => selectedItem && publish(selectedItem)} onDelete={() => selectedItem && remove(selectedItem)} saving={busy} error={editorError} publicationId={safePublicationId} />}
                </section>
              </div>
            )}

            {activeTab === 'business-listings' && publicationId && (
              <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(400px,.74fr)]">
                <section aria-label="Business listings library" data-testid="section-listings-library">
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div><SectionKicker>Business Directory</SectionKicker><h2 className="mt-1 font-display text-3xl font-semibold tracking-[-.04em]">Business listings</h2></div>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => void listQuery.refetch()} className="inline-flex items-center gap-2 font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--brick))]"><RefreshCw size={13} className={listQuery.isFetching ? 'animate-spin' : ''} /> Refresh</button>
                      <button type="button" onClick={beginCreateListing} className="inline-flex items-center gap-2 bg-[hsl(var(--primary))] px-3 py-1.5 font-ui text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--primary-foreground))]" data-testid="button-create-listing"><FilePlus2 size={13} /> New listing</button>
                    </div>
                  </div>
                  {listQuery.isPending && <div className="mt-4 space-y-px border border-[hsl(var(--border))] bg-[hsl(var(--border))]">{[1, 2, 3].map((r) => <div key={r} className="h-28 animate-pulse bg-[hsl(var(--card))]" />)}</div>}
                  {!listQuery.isPending && !listQuery.isError && listingItems.length === 0 && <div className="mt-4"><EmptyList filtered={false} onCreate={beginCreateListing} /></div>}
                  {!listQuery.isPending && !listQuery.isError && listingItems.length > 0 && <div className="mt-4 overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--border))]" data-testid="list-listing-items">{listingItems.map((item) => <ContentRow key={item.id} item={item} selected={item.id === selectedId} onSelect={() => selectItem(item)} onPublish={() => publish(item)} onDelete={() => remove(item)} busy={busy} />)}</div>}
                </section>
                <section aria-label="Listing editor" className="lg:sticky lg:top-5" data-testid="section-listing-editor">
                  {detailQuery.isPending && selectedId && !isCreating && <div className="min-h-[520px] animate-pulse border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"><div className="h-3 w-24 bg-[hsl(var(--muted))]" /><div className="mt-5 h-10 w-3/4 bg-[hsl(var(--muted))]" /></div>}
                  {(!detailQuery.isPending || isCreating) && <Editor selectedId={selectedId} isCreating={isCreating} item={selectedItem} form={form} setForm={setForm} onCancel={cancelEditor} onSave={save} onPublish={() => selectedItem && publish(selectedItem)} onDelete={() => selectedItem && remove(selectedItem)} saving={busy} error={editorError} publicationId={safePublicationId} />}
                </section>
              </div>
            )}

            {activeTab === 'editions' && publicationId && (
              <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(400px,.74fr)]">
                <section aria-label="Digital Editions library" data-testid="section-editions-library">
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <SectionKicker>Digital Editions</SectionKicker>
                      <h2 className="mt-1 font-display text-3xl font-semibold tracking-[-.04em]">Issue archive</h2>
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => void listQuery.refetch()} className="inline-flex items-center gap-2 font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--brick))]"><RefreshCw size={13} className={listQuery.isFetching ? 'animate-spin' : ''} /> Refresh</button>
                      <button type="button" onClick={beginCreateEdition} className="inline-flex items-center gap-2 bg-[hsl(var(--primary))] px-3 py-1.5 font-ui text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--primary-foreground))]" data-testid="button-create-edition"><FilePlus2 size={13} /> New Edition</button>
                    </div>
                  </div>
                  {listQuery.isPending && <div className="mt-4 space-y-px border border-[hsl(var(--border))] bg-[hsl(var(--border))]">{[1, 2, 3, 4, 5, 6].map((r) => <div key={r} className="h-16 animate-pulse bg-[hsl(var(--card))]" />)}</div>}
                  {!listQuery.isPending && !listQuery.isError && editionItems.length > 0 && <div className="mt-4 overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--border))]" data-testid="list-edition-items">{editionItems.map((item) => <ContentRow key={item.id} item={item} selected={item.id === selectedId} onSelect={() => selectItem(item)} onPublish={() => publish(item)} onDelete={() => remove(item)} busy={busy} />)}</div>}
                </section>
                <section aria-label="Edition editor" className="lg:sticky lg:top-5" data-testid="section-edition-editor">
                  {(selectedId && !isCreating) || (isCreating && form.contentType === EditorialContentType.digital_edition) ? (
                    <div className="overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                      <div className="border-b border-[hsl(var(--border))] px-5 py-4 sm:px-6">
                        <SectionKicker>Edition editor</SectionKicker>
                        <p className="mt-2 font-ui text-[10px] text-[hsl(var(--muted-foreground))]">{isCreating ? 'Fill in the details below, then save as a draft. Publish once the Issuu embed URL is ready.' : 'Update Issuu embed, description, cover, and headline for this issue.'}</p>
                      </div>
                      <div className="space-y-5 p-5 sm:p-6">
                        {isCreating && (
                          <label className="block">
                            <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Slug <span className="normal-case tracking-normal opacity-60">(must match edition-NN format)</span></span>
                            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="edition-07" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-edition-slug" />
                          </label>
                        )}
                        <label className="block">
                          <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Featured family / person name</span>
                          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="The Johnson Family" className="w-full border-0 border-b border-[hsl(var(--input))] bg-transparent px-0 py-2 font-display text-2xl font-semibold tracking-[-.025em] outline-none placeholder:text-[hsl(var(--muted-foreground)/.6)] focus:border-[hsl(var(--brick))]" data-testid="input-edition-title" />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Publish period <span className="normal-case tracking-normal opacity-60">(e.g. Sept–Oct 2026)</span></span>
                          <input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Sept–Oct 2026" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-edition-date" />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Editorial headline <span className="normal-case tracking-normal opacity-60">(optional — shown in featured reader on homepage &amp; archive)</span></span>
                          <input value={form.editionEditorialTitle} onChange={(e) => setForm({ ...form, editionEditorialTitle: e.target.value })} placeholder="Making Room at the Table" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-display text-sm outline-none focus:border-[hsl(var(--brick))]" data-testid="input-edition-editorial-title" />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Issue description <span className="normal-case tracking-normal opacity-60">(shown on public Editions page)</span></span>
                          <textarea value={form.editionDescription} onChange={(e) => setForm({ ...form, editionDescription: e.target.value })} rows={3} placeholder="Featuring the Brewington family, the Senoia Optimist Club, and a tribute to Ellis Crook…" className="w-full resize-y border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 font-editorial text-base leading-tight outline-none focus:border-[hsl(var(--brick))]" data-testid="textarea-edition-description" />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Issuu Embed URL <span className="normal-case tracking-normal text-[hsl(var(--brick))] opacity-80">(required to publish)</span></span>
                          <input type="url" value={form.issuuEmbedUrl} onChange={(e) => setForm({ ...form, issuuEmbedUrl: e.target.value })} placeholder="https://e.issuu.com/embed.html?d=las-issue-07&u=lifearoundsenoia" className="h-9 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-edition-issuu-url-2" />
                          <span className="mt-1.5 block font-ui text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">In Issuu: open document → Share → Embed → copy the <code>src</code> value. Leave blank to show the placeholder.</span>
                        </label>
                        <CoverPhotoUploader coverMediaId={form.coverMediaId} existingCoverUrl={isCreating ? null : selectedItem?.coverUrl} publicationId={safePublicationId} onChange={(mediaId) => setForm({ ...form, coverMediaId: mediaId })} focalX={form.coverFocalX} focalY={form.coverFocalY} onFocalChange={(x, y) => setForm({ ...form, coverFocalX: x, coverFocalY: y })} zoom={form.coverZoom} onZoomChange={(z) => setForm({ ...form, coverZoom: z })} />
                      </div>
                      {editorError && <div className="mx-5 flex items-start gap-2 border border-[hsl(var(--brick)/.4)] bg-[hsl(var(--brick)/.07)] px-3 py-2.5 font-ui text-xs leading-5 text-[hsl(var(--brick))] sm:mx-6" role="alert"><CircleAlert size={15} className="mt-0.5 shrink-0" /> {editorError}</div>}
                      <div className="flex flex-wrap justify-end gap-2 border-t border-[hsl(var(--border))] px-5 py-4 sm:px-6">
                        {isCreating && <button type="button" onClick={cancelEditor} disabled={busy} className="inline-flex items-center justify-center gap-2 border border-[hsl(var(--border))] px-3.5 py-2.5 font-ui text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--brick))] hover:text-[hsl(var(--brick))] disabled:opacity-50">Cancel</button>}
                        {!isCreating && selectedItem && <button type="button" onClick={() => publish(selectedItem)} disabled={busy} className="inline-flex items-center justify-center gap-2 border border-[hsl(var(--primary))] px-3.5 py-2.5 font-ui text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] disabled:opacity-50" data-testid="button-edition-publish">{selectedItem.status === EditorialStatus.published ? <Undo2 size={14} /> : <Send size={14} />} {selectedItem.status === EditorialStatus.published ? 'Unpublish' : 'Publish'}</button>}
                        <button type="button" onClick={save} disabled={busy} className="inline-flex items-center justify-center gap-2 bg-[hsl(var(--primary))] px-4 py-2.5 font-ui text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--primary-foreground))] transition-colors hover:bg-[hsl(var(--pine-2))] disabled:cursor-wait disabled:opacity-60" data-testid="button-edition-save">{busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {isCreating ? 'Create draft' : 'Save changes'}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-[hsl(var(--border))] p-8 text-center">
                      <p className="font-ui text-xs text-[hsl(var(--muted-foreground))]">Select an edition from the list to edit it, or create a new one.</p>
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'editorial' && (
            <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(400px,.74fr)]">
              <section aria-label="Content library" data-testid="section-content-library">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div><SectionKicker>Content library</SectionKicker><h2 className="mt-1 font-display text-3xl font-semibold tracking-[-.04em]">Stories in motion</h2></div>
                  <button type="button" onClick={() => void listQuery.refetch()} className="inline-flex items-center gap-2 font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--brick))]" data-testid="button-refresh-content"><RefreshCw size={13} className={listQuery.isFetching ? 'animate-spin' : ''} /> Refresh</button>
                </div>
                <FilterBar status={status} contentType={contentType} onStatusChange={(value) => { setStatus(value); setSelectedId(null); setIsCreating(false); }} onTypeChange={(value) => { setContentType(value); setSelectedId(null); setIsCreating(false); }} onCreate={beginCreate} />
                {listQuery.isPending && <div className="mt-4 space-y-px border border-[hsl(var(--border))] bg-[hsl(var(--border))]" data-testid="status-content-loading">{[1, 2, 3, 4].map((row) => <div key={row} className="h-28 animate-pulse bg-[hsl(var(--card))]" />)}</div>}
                {listQuery.isError && <div className="mt-4 border border-[hsl(var(--brick)/.4)] bg-[hsl(var(--card))] p-6" data-testid="state-content-error"><CircleAlert size={20} className="text-[hsl(var(--brick))]" /><p className="mt-3 font-display text-2xl font-semibold">The desk could not be reached.</p><p className="mt-2 font-ui text-xs leading-5 text-[hsl(var(--muted-foreground))]">Your publication context is intact. Try loading the records again.</p><button type="button" onClick={() => void listQuery.refetch()} className="mt-5 inline-flex items-center gap-2 border border-[hsl(var(--primary))] px-3 py-2 font-ui text-[10px] font-bold uppercase tracking-[.12em]" data-testid="button-retry-content"><RefreshCw size={13} /> Try again</button></div>}
                {!listQuery.isPending && !listQuery.isError && editorialItems.length === 0 && <div className="mt-4"><EmptyList filtered={Boolean(status || contentType)} onCreate={beginCreate} /></div>}
                {!listQuery.isPending && !listQuery.isError && editorialItems.length > 0 && <div className="mt-4 overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--border))]" data-testid="list-content-items">{editorialItems.map((item) => <ContentRow key={item.id} item={item} selected={item.id === selectedId} onSelect={() => selectItem(item)} onPublish={() => publish(item)} onDelete={() => remove(item)} busy={busy} />)}</div>}
              </section>
              <section aria-label="Story editor" className="lg:sticky lg:top-5" data-testid="section-content-editor">
                {detailQuery.isPending && selectedId && !isCreating && <div className="min-h-[520px] animate-pulse border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6" data-testid="status-editor-loading"><div className="h-3 w-24 bg-[hsl(var(--muted))]" /><div className="mt-5 h-10 w-3/4 bg-[hsl(var(--muted))]" /><div className="mt-12 h-28 bg-[hsl(var(--muted))]" /><div className="mt-5 h-48 bg-[hsl(var(--muted))]" /></div>}
                {(!detailQuery.isPending || isCreating) && <Editor selectedId={selectedId} isCreating={isCreating} item={selectedItem} form={form} setForm={setForm} onCancel={cancelEditor} onSave={save} onPublish={() => selectedItem && publish(selectedItem)} onDelete={() => selectedItem && remove(selectedItem)} saving={busy} error={editorError} publicationId={safePublicationId} />}
              </section>
            </div>
            )}
          </>
        )}
      </main>
      <footer className="mx-auto flex max-w-[1500px] items-center justify-between border-t border-[hsl(var(--border))] px-5 py-6 sm:px-8 lg:px-10"><span className="font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">LAS / Editorial CMS + Media</span><Link href="/" className="inline-flex items-center gap-2 font-ui text-[10px] uppercase tracking-[.13em] text-[hsl(var(--brick))]" data-testid="link-staff-footer-home">Return to LAS <ArrowRight size={13} /></Link></footer>
    </div>
  );
}
