'use client';

import {
  ArrowRightIcon,
  ArrowSquareOutIcon,
  FileAudioIcon,
  FileCsvIcon,
  FileDocIcon,
  FileIcon,
  FilePdfIcon,
  FilePptIcon,
  FileTextIcon,
  FileVideoIcon,
  FileXlsIcon,
  FileZipIcon,
  FloppyDiskIcon,
  FolderSimpleIcon,
  GearFineIcon,
  HardDrivesIcon,
  ImageIcon,
  MagnifyingGlassIcon,
  type Icon,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DocumentView, ImageView, MarkdownView, MediaView, PdfView, TableView } from '@/components/shared/file-viewers';
import { PageHeader } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { EmptyNote, navRow, subNav, Table, TBody, Td, Th, THead, Tr } from '@/components/ui/patterns';
import { Badge, Input, PathText, Segmented, Switch } from '@/components/ui/primitives';
import { api, ApiError, type FileEntry } from '@/lib/api';
import { openOutside, useBackend } from '@/lib/backend';
import { useUi } from '@/lib/store';
import { cn, fa } from '@/lib/utils';

const TEXT = new Set(['md', 'txt', 'csv', 'json', 'yaml', 'yml', 'py', 'js', 'ts', 'html', 'css', 'log', 'xml', 'ini', 'toml', 'sql', 'sh', 'bat', 'tsx', 'jsx']);
const IMAGE: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', jfif: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', avif: 'image/avif', ico: 'image/x-icon', svg: 'image/svg+xml' };
const TABLE = new Set(['xlsx', 'xlsm', 'xls', 'csv']);
const DOCUMENT = new Set(['docx', 'pptx', 'doc', 'ppt']);
const AUDIO = new Set(['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'opus']);
const VIDEO = new Set(['mp4', 'm4v', 'mov', 'webm', 'ogv', 'mkv']);

const kinds: Record<string, { icon: Icon; label: string; color: string }> = {
  md: { icon: FileTextIcon, label: 'متن', color: 'text-info' },
  txt: { icon: FileTextIcon, label: 'متن', color: 'text-muted-foreground' },
  csv: { icon: FileCsvIcon, label: 'جدول CSV', color: 'text-success' },
  xlsx: { icon: FileXlsIcon, label: 'جدول Excel', color: 'text-success' },
  xlsm: { icon: FileXlsIcon, label: 'جدول Excel', color: 'text-success' },
  xls: { icon: FileXlsIcon, label: 'جدول Excel', color: 'text-success' },
  doc: { icon: FileDocIcon, label: 'سند Word', color: 'text-info' },
  ppt: { icon: FilePptIcon, label: 'اسلاید', color: 'text-warning' },
  docx: { icon: FileDocIcon, label: 'سند Word', color: 'text-info' },
  pptx: { icon: FilePptIcon, label: 'اسلاید', color: 'text-warning' },
  pdf: { icon: FilePdfIcon, label: 'PDF', color: 'text-danger' },
  zip: { icon: FileZipIcon, label: 'فایل فشرده', color: 'text-muted-foreground' },
  rar: { icon: FileZipIcon, label: 'فایل فشرده', color: 'text-muted-foreground' },
  '7z': { icon: FileZipIcon, label: 'فایل فشرده', color: 'text-muted-foreground' },
  ...Object.fromEntries([...AUDIO].map((key) => [key, { icon: FileAudioIcon, label: 'صدا', color: 'text-chart-2' }])),
  ...Object.fromEntries([...VIDEO].map((key) => [key, { icon: FileVideoIcon, label: 'ویدیو', color: 'text-chart-2' }])),
  ...Object.fromEntries(Object.keys(IMAGE).map((key) => [key, { icon: ImageIcon, label: 'تصویر', color: 'text-chart-2' }])),
};
const ext = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';
const kindOf = (name: string) => kinds[ext(name)] ?? { icon: FileIcon, label: ext(name).toUpperCase() || 'فایل', color: 'text-muted-foreground' };

function size(bytes: number) {
  if (bytes < 1024) return `${fa(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${fa(Math.round(bytes / 1024))} کیلوبایت`;
  return `${fa(bytes / 1024 / 1024, 1)} مگابایت`;
}
const when = (seconds: number) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'medium', timeStyle: 'short' }).format(seconds * 1000);

/** A text file: an editor that saves back. Markdown opens laid out, with the source one click away. */
function TextFile({ path, rendered, toolbar }: { path: string; rendered: boolean; toolbar: (save: React.ReactNode) => React.ReactNode }) {
  const [content, setContent] = useState<string | null>(null);
  const [saved, setSaved] = useState('');
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    setContent(null);
    setFailed(null);
    api
      .get<{ content: string }>(`/files/content?path=${encodeURIComponent(path)}`)
      .then((file) => {
        setContent(file.content);
        setSaved(file.content);
      })
      .catch((e) => setFailed(e instanceof ApiError && e.status === 413 ? 'این فایل برای باز شدن در برنامه بزرگ است.' : e instanceof ApiError && e.status === 415 ? 'این فایل متنی نیست.' : 'خواندن فایل ممکن نشد.'));
  }, [path]);

  const save = async () => {
    if (content === null) return;
    try {
      await api.put('/files/content', { path, content });
      setSaved(content);
      toast.success('ذخیره شد.');
    } catch {
      toast.error('ذخیره ممکن نشد.');
    }
  };

  return (
    <>
      {toolbar(
        !rendered && (
          <Button size="sm" disabled={content === null || content === saved} onClick={save}>
            <FloppyDiskIcon /> ذخیره
          </Button>
        ),
      )}
      {failed ? (
        <EmptyNote title="این فایل باز نشد">{failed}</EmptyNote>
      ) : rendered ? (
        <div className="scrollbar-minimal min-h-0 flex-1 overflow-y-auto">
          <MarkdownView text={content ?? ''} className="mx-auto max-w-3xl px-8 py-8" />
        </div>
      ) : (
        <textarea
          value={content ?? ''}
          onChange={(e) => setContent(e.target.value)}
          dir="auto"
          spellCheck={false}
          className="scrollbar-minimal min-h-0 flex-1 resize-none bg-transparent px-8 py-6 font-mono text-sm leading-7 outline-none"
        />
      )}
    </>
  );
}

/** One file, shown in the way that suits it: picture, PDF, spreadsheet, document, Markdown or plain text.
 *  It does not matter who made the file - the agent, the user, or another program. */
function FileView({ path, onBack }: { path: string; onBack: () => void }) {
  const root = useBackend((s) => s.workspace?.path ?? '');
  const name = path.split('/').pop() ?? path;
  const kind = ext(name);
  const meta = kindOf(name);
  // Markdown and CSV have two faces: laid out, and as the text behind it.
  const twoFaced = kind === 'md' || kind === 'csv';
  const [source, setSource] = useState(false);
  useEffect(() => setSource(false), [path]);

  const header = (save?: React.ReactNode) => (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
      <Button variant="muted" size="icon-sm" onClick={onBack} aria-label="بازگشت">
        <ArrowRightIcon />
      </Button>
      <meta.icon weight="fill" className={cn('size-5 shrink-0', meta.color)} />
      <PathText path={path} className="flex-1 text-sm" />
      {twoFaced && (
        <Segmented
          value={source ? 'source' : 'view'}
          onChange={(value) => setSource(value === 'source')}
          options={[
            { value: 'view', label: 'نمایش' },
            { value: 'source', label: 'ویرایش متن' },
          ]}
        />
      )}
      <Button variant="outline" size="sm" onClick={() => openOutside(`${root}${path}`, toast)}>
        <ArrowSquareOutIcon /> باز کردن با برنامهٔ سیستم
      </Button>
      {save}
    </div>
  );

  let body: React.ReactNode;
  if (IMAGE[kind]) body = <>{header()}<ImageView path={path} type={IMAGE[kind]} /></>;
  else if (AUDIO.has(kind) || VIDEO.has(kind)) body = <>{header()}<MediaView path={path} video={VIDEO.has(kind)} /></>;
  else if (kind === 'pdf') body = <>{header()}<PdfView path={path} /></>;
  else if (DOCUMENT.has(kind)) body = <>{header()}<DocumentView path={path} /></>;
  else if (TABLE.has(kind) && !source) body = <>{header()}<TableView path={path} /></>;
  else if (TEXT.has(kind)) body = <TextFile path={path} rendered={kind === 'md' && !source} toolbar={header} />;
  else
    body = (
      <>
        {header()}
        <EmptyNote icon={<meta.icon />} title="این نوع فایل داخل برنامه نمایش داده نمی‌شود">
          آن را با «باز کردن با برنامهٔ سیستم» ببینید.
        </EmptyNote>
      </>
    );

  return <div className="flex h-full min-h-0 flex-col">{body}</div>;
}

/** The workspace folder as it is on disk. Harness files (.harness) appear only when asked for. */
export default function FilesPage() {
  const workspace = useBackend((s) => s.workspace);
  const openFile = useUi((s) => s.openFile);
  const setOpenFile = useUi((s) => s.setOpenFile);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [showSystem, setShowSystem] = useState(false);
  const [folder, setFolder] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(() => api.get<FileEntry[]>(`/files?system=${showSystem}`).then(setEntries).catch(() => toast.error('خواندن فایل‌ها ممکن نشد.')), [showSystem]);
  useEffect(() => {
    load();
  }, [load, openFile]);

  const folders = useMemo(() => [...new Set(entries.map((e) => e.folder))].filter((f) => f !== '/').sort(), [entries]);
  const visible = entries.filter((e) => (folder === null || e.folder === folder || e.folder.startsWith(`${folder}/`)) && e.path.includes(query.trim()));

  if (openFile) return <FileView path={openFile} onBack={() => setOpenFile(null)} />;

  return (
    <>
      <PageHeader
        title="فایل‌ها"
        meta={
          <>
            <span>{fa(entries.length)} فایل</span>
          </>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => openOutside(workspace?.path ?? '', toast)}>
            <ArrowSquareOutIcon /> باز کردن پوشه
          </Button>
        }
      />
      <div className="flex min-h-0 flex-1">
        <aside className={subNav}>
          <button onClick={() => setFolder(null)} data-active={folder === null} className={cn(navRow, 'text-foreground')}>
            <HardDrivesIcon weight={folder === null ? 'fill' : 'bold'} className={cn(folder === null && 'text-primary')} />
            <span className="truncate">{workspace?.name}</span>
          </button>
          <div className="border-border/80 ms-[17px] space-y-0.5 border-s ps-1.5">
            {folders.map((path) => {
              const system = path.startsWith('/.harness');
              return (
                <button key={path} onClick={() => setFolder(path)} data-active={folder === path} className={navRow}>
                  {system ? <GearFineIcon className="text-primary" /> : <FolderSimpleIcon weight={folder === path ? 'fill' : 'bold'} className={cn(folder === path && 'text-primary')} />}
                  <bdi className="truncate">{path.slice(1)}</bdi>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="scrollbar-minimal min-w-0 flex-1 overflow-y-auto px-4">
          <div className="flex flex-wrap items-center gap-3 py-4">
            <PathText path={`${workspace?.path ?? ''}${folder ?? ''}`} className="text-muted-foreground flex-1 text-sm" />
            <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-sm">
              <GearFineIcon className={cn('size-4', showSystem && 'text-primary')} />
              فایل‌های سیستمی
              <Switch
                checked={showSystem}
                onCheckedChange={(value) => {
                  setShowSystem(value);
                  if (!value && folder?.startsWith('/.harness')) setFolder(null);
                }}
              />
            </label>
            <div className="relative w-52">
              <MagnifyingGlassIcon className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جست‌وجو در فایل‌ها…" className="h-8 ps-9" />
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyNote icon={<FolderSimpleIcon />} title={entries.length ? 'فایلی با این مشخصات نیست' : 'این فضای کاری هنوز فایلی ندارد'}>
              {entries.length ? null : 'فایل‌های خود را در پوشهٔ فضای کاری بگذارید، یا از ایجنت بخواهید چیزی بسازد.'}
            </EmptyNote>
          ) : (
            <Table className="mb-6">
              <THead>
                <Th>نام</Th>
                <Th>نوع</Th>
                <Th>پوشه</Th>
                <Th>اندازه</Th>
                <Th>آخرین تغییر</Th>
              </THead>
              <TBody>
                {visible.map((entry) => {
                  const meta = kindOf(entry.name);
                  return (
                    <Tr key={entry.path} onClick={() => setOpenFile(entry.path)}>
                      <Td className="min-w-56">
                        <span className="flex items-center gap-2.5 font-medium">
                          <meta.icon weight="fill" className={cn('size-6 shrink-0', entry.system ? 'text-primary' : meta.color)} />
                          <span dir="auto">{entry.name}</span>
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap">{entry.system ? <Badge tone="primary">سیستمی</Badge> : <span className="text-muted-foreground">{meta.label}</span>}</Td>
                      <Td className="text-muted-foreground whitespace-nowrap">
                        <bdi>{entry.folder === '/' ? '—' : entry.folder.replace(/^\//, '')}</bdi>
                      </Td>
                      <Td className="text-muted-foreground whitespace-nowrap">{size(entry.size)}</Td>
                      <Td className="text-muted-foreground whitespace-nowrap">{when(entry.modified)}</Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
}
