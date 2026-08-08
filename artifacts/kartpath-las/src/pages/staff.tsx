import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, CircleAlert, Clock3, FilePlus2, Loader2, Pencil, Plus, RefreshCw, Save, Send, ShieldCheck, Trash2, Undo2, X } from 'lucide-react';
import { Link } from 'wouter';
import {
  EditorialContentType,
  EditorialStatus,
  getGetContentItemQueryKey,
  getGetCurrentUserQueryKey,
  getListContentItemsQueryKey,
  useCreateContentItem,
  useDeleteContentItem,
  useGetContentItem,
  useGetCurrentUser,
  useListContentItems,
  usePublishContentItem,
  useUpdateContentItem,
} from '@workspace/api-client-react';
import type { ContentItem, CreateContentItem } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { LasMark, SectionKicker } from '@/components/las-brand';

const CONTENT_TYPES = [
  { value: EditorialContentType['featured-family'], label: 'Featured Family', short: 'Family' },
  { value: EditorialContentType['nonprofit-spotlight'], label: 'Nonprofit Spotlight', short: 'Nonprofit' },
  { value: EditorialContentType['young-achiever'], label: 'Young Achiever', short: 'Achiever' },
  { value: EditorialContentType['pet-of-the-month'], label: 'Pet of the Month', short: 'Pet' },
  { value: EditorialContentType['business-listing'], label: 'Business Listing', short: 'Business' },
  { value: EditorialContentType.event, label: 'Event', short: 'Event' },
] as const;

type ContentType = (typeof CONTENT_TYPES)[number]['value'];
type FormState = Omit<CreateContentItem, 'publicationId' | 'details'> & { detailsText: string };

const EMPTY_FORM: FormState = {
  contentType: EditorialContentType['featured-family'],
  slug: '',
  title: '',
  summary: '',
  body: '',
  detailsText: '{}',
  coverMediaId: null,
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
          <span className="hidden font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--sidebar-foreground)/.48)] md:inline">M1 / Manual CMS</span>
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
}) {
  const update = (key: keyof FormState, value: string | null) => setForm({ ...form, [key]: value });
  const hasItem = Boolean(selectedId || isCreating);
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
        <button type="button" onClick={onCancel} className="grid size-8 place-items-center border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--brick))] hover:text-[hsl(var(--brick))]" aria-label="Close editor" data-testid="button-close-editor"><X size={15} /></button>
      </div>
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
        <label className="block">
          <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Standfirst</span>
          <textarea value={form.summary} onChange={(event) => update('summary', event.target.value)} rows={3} placeholder="The short read on why this matters here." className="w-full resize-y border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 font-editorial text-lg leading-tight outline-none focus:border-[hsl(var(--brick))]" data-testid="textarea-content-summary" />
        </label>
        <label className="block">
          <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Story body</span>
          <textarea value={form.body} onChange={(event) => update('body', event.target.value)} rows={9} placeholder="Write the full story here. Plain text is supported in M1." className="w-full resize-y border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 font-editorial text-lg leading-[1.35] outline-none focus:border-[hsl(var(--brick))]" data-testid="textarea-content-body" />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Details JSON</span>
            <textarea value={form.detailsText} onChange={(event) => update('detailsText', event.target.value)} rows={5} placeholder={'{"address":"..."}'} className="w-full resize-y border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 font-meta text-xs leading-5 outline-none focus:border-[hsl(var(--brick))]" data-testid="textarea-content-details" />
            <span className="mt-1.5 block font-ui text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">Use string values for lane-specific facts such as address, date, or contact.</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Cover media ID <span className="normal-case tracking-normal">(optional)</span></span>
            <input value={form.coverMediaId ?? ''} onChange={(event) => update('coverMediaId', event.target.value || null)} placeholder="Media ID from storage" className="h-10 w-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 font-meta text-xs outline-none focus:border-[hsl(var(--brick))]" data-testid="input-content-cover-media" />
            <span className="mt-1.5 block font-ui text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">M1 keeps media selection manual. Leave blank for a text-only record.</span>
          </label>
        </div>
        {error && <div className="flex items-start gap-2 border border-[hsl(var(--brick)/.4)] bg-[hsl(var(--brick)/.07)] px-3 py-2.5 font-ui text-xs leading-5 text-[hsl(var(--brick))]" role="alert" data-testid="status-editor-error"><CircleAlert size={15} className="mt-0.5 shrink-0" /> {error}</div>}
        <div className="flex flex-col-reverse gap-2 border-t border-[hsl(var(--border))] pt-4 sm:flex-row sm:items-center sm:justify-between">
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
    ...(contentType ? { contentType } : {}),
  }), [safePublicationId, status, contentType]);
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
  const selectedItem = detailQuery.data ?? items.find((item) => item.id === selectedId);
  const busy = createMutation.isPending || updateMutation.isPending || publishMutation.isPending || deleteMutation.isPending;

  useEffect(() => {
    if (selectedId && detailQuery.data) {
      const item = detailQuery.data;
      setForm({ contentType: item.contentType, slug: item.slug, title: item.title, summary: item.summary, body: item.body, detailsText: JSON.stringify(item.details ?? {}, null, 2), coverMediaId: item.coverMediaId });
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

  const parseDetails = () => {
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
    const details = parseDetails();
    if (!details || !publicationId) return null;
    if (!form.title.trim() || !form.slug.trim() || !form.summary.trim() || !form.body.trim()) {
      setEditorError('Headline, slug, standfirst, and story body are required.');
      return null;
    }
    return {
      publicationId,
      contentType: form.contentType,
      slug: form.slug.trim(),
      title: form.title.trim(),
      summary: form.summary.trim(),
      body: form.body.trim(),
      details,
      coverMediaId: form.coverMediaId || null,
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
          setFeedback('Changes saved.');
        },
        onError: () => setEditorError('The story could not be updated. Check the fields and try again.'),
      });
    }
  };

  const publish = (item: ContentItem) => {
    if (!publicationId) return;
    const nextStatus = item.status === EditorialStatus.published ? EditorialStatus.draft : EditorialStatus.published;
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
    if (!publicationId || !window.confirm(`Delete “${item.title || 'Untitled story'}”? This cannot be undone.`)) return;
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
            {feedback && <div className="mt-5 flex items-center gap-2 border-l-2 border-[hsl(var(--pine-2))] bg-[hsl(var(--pine-2)/.07)] px-3 py-2 font-ui text-xs text-[hsl(var(--pine-2))]" role="status" data-testid="status-staff-feedback"><Check size={15} /> {feedback}</div>}
            <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(400px,.74fr)]">
              <section aria-label="Content library" data-testid="section-content-library">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div><SectionKicker>Content library</SectionKicker><h2 className="mt-1 font-display text-3xl font-semibold tracking-[-.04em]">Stories in motion</h2></div>
                  <button type="button" onClick={() => void listQuery.refetch()} className="inline-flex items-center gap-2 font-meta text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--brick))]" data-testid="button-refresh-content"><RefreshCw size={13} className={listQuery.isFetching ? 'animate-spin' : ''} /> Refresh</button>
                </div>
                <FilterBar status={status} contentType={contentType} onStatusChange={(value) => { setStatus(value); setSelectedId(null); setIsCreating(false); }} onTypeChange={(value) => { setContentType(value); setSelectedId(null); setIsCreating(false); }} onCreate={beginCreate} />
                {listQuery.isPending && <div className="mt-4 space-y-px border border-[hsl(var(--border))] bg-[hsl(var(--border))]" data-testid="status-content-loading">{[1, 2, 3, 4].map((row) => <div key={row} className="h-28 animate-pulse bg-[hsl(var(--card))]" />)}</div>}
                {listQuery.isError && <div className="mt-4 border border-[hsl(var(--brick)/.4)] bg-[hsl(var(--card))] p-6" data-testid="state-content-error"><CircleAlert size={20} className="text-[hsl(var(--brick))]" /><p className="mt-3 font-display text-2xl font-semibold">The desk could not be reached.</p><p className="mt-2 font-ui text-xs leading-5 text-[hsl(var(--muted-foreground))]">Your publication context is intact. Try loading the records again.</p><button type="button" onClick={() => void listQuery.refetch()} className="mt-5 inline-flex items-center gap-2 border border-[hsl(var(--primary))] px-3 py-2 font-ui text-[10px] font-bold uppercase tracking-[.12em]" data-testid="button-retry-content"><RefreshCw size={13} /> Try again</button></div>}
                {!listQuery.isPending && !listQuery.isError && items.length === 0 && <div className="mt-4"><EmptyList filtered={Boolean(status || contentType)} onCreate={beginCreate} /></div>}
                {!listQuery.isPending && !listQuery.isError && items.length > 0 && <div className="mt-4 overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--border))]" data-testid="list-content-items">{items.map((item) => <ContentRow key={item.id} item={item} selected={item.id === selectedId} onSelect={() => selectItem(item)} onPublish={() => publish(item)} onDelete={() => remove(item)} busy={busy} />)}</div>}
              </section>
              <section aria-label="Story editor" className="lg:sticky lg:top-5" data-testid="section-content-editor">
                {detailQuery.isPending && selectedId && <div className="min-h-[520px] animate-pulse border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6" data-testid="status-editor-loading"><div className="h-3 w-24 bg-[hsl(var(--muted))]" /><div className="mt-5 h-10 w-3/4 bg-[hsl(var(--muted))]" /><div className="mt-12 h-28 bg-[hsl(var(--muted))]" /><div className="mt-5 h-48 bg-[hsl(var(--muted))]" /></div>}
                {!detailQuery.isPending && <Editor selectedId={selectedId} isCreating={isCreating} item={selectedItem} form={form} setForm={setForm} onCancel={cancelEditor} onSave={save} onPublish={() => selectedItem && publish(selectedItem)} onDelete={() => selectedItem && remove(selectedItem)} saving={busy} error={editorError} />}
              </section>
            </div>
          </>
        )}
      </main>
      <footer className="mx-auto flex max-w-[1500px] items-center justify-between border-t border-[hsl(var(--border))] px-5 py-6 sm:px-8 lg:px-10"><span className="font-meta text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">LAS / Manual editorial CMS</span><Link href="/" className="inline-flex items-center gap-2 font-ui text-[10px] uppercase tracking-[.13em] text-[hsl(var(--brick))]" data-testid="link-staff-footer-home">Return to LAS <ArrowRight size={13} /></Link></footer>
    </div>
  );
}