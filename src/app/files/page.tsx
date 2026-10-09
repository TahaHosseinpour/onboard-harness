'use client';

import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  BrainIcon,
  ChartBarIcon,
  ClockCounterClockwiseIcon,
  FileDocIcon,
  FilePdfIcon,
  FilePptIcon,
  FileXlsIcon,
  FolderOpenIcon,
  FolderSimpleIcon,
  GearFineIcon,
  HardDrivesIcon,
  ImageIcon,
  LightningIcon,
  ListIcon,
  MagnifyingGlassIcon,
  RobotIcon,
  ShieldCheckIcon,
  SparkleIcon,
  SquaresFourIcon,
  UploadSimpleIcon,
  WrenchIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { SalesColumns, SlideDeck } from '@/components/shared/viewers';
import { PageHeader } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { EmptyNote, MetaDot, navRow, subNav, Table, TBody, Td, Th, THead, Tr } from '@/components/ui/patterns';
import { Badge, Hint, Input, Segmented, Switch } from '@/components/ui/primitives';
import { files, folderPath, folders, systemFiles, systemFolders, versions, workspace, type FileItem, type FileKind, type SystemKind } from '@/lib/mock';
import { useUi } from '@/lib/store';
import { cn, fa } from '@/lib/utils';

// Editors are heavy and browser-only; load them when a file is opened.
const DocEditor = dynamic(() => import('@/components/documents/doc-editor').then((m) => m.DocEditor), { ssr: false });
const SheetEditor = dynamic(() => import('@/components/documents/sheet-editor').then((m) => m.SheetEditor), { ssr: false });

const kindMeta: Record<Exclude<FileKind, 'folder'>, { icon: Icon; label: string; color: string }> = {
  doc: { icon: FileDocIcon, label: 'سند Word', color: 'text-info' },
  sheet: { icon: FileXlsIcon, label: 'جدول Excel', color: 'text-success' },
  slides: { icon: FilePptIcon, label: 'اسلاید', color: 'text-warning' },
  pdf: { icon: FilePdfIcon, label: 'PDF', color: 'text-danger' },
  image: { icon: ImageIcon, label: 'تصویر', color: 'text-chart-2' },
};

const metaOf = (file: FileItem) => kindMeta[file.kind as Exclude<FileKind, 'folder'>];

function PdfViewer({ file }: { file: FileItem }) {
  return (
    <div className="bg-surface scrollbar-minimal h-full overflow-y-auto px-6 py-8">
      {[1, 2].map((page) => (
        <div key={page} className="bg-background shadow-float mx-auto mb-6 aspect-[1/1.414] max-w-[640px] rounded-md border p-12">
          <div className="text-lg font-semibold">{file.name}</div>
          <div className="text-muted-foreground mt-1 text-xs">صفحهٔ {page.toLocaleString('fa-IR')} از ۲</div>
          <div className="mt-8 space-y-3">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="bg-secondary h-2.5 rounded-full" style={{ width: `${62 + ((i * 37 + page * 11) % 38)}%` }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ImageViewer() {
  return (
    <div className="bg-surface flex h-full items-center justify-center p-8">
      <div className="bg-background shadow-float w-full max-w-3xl rounded-lg border p-6">
        <div className="mb-3 text-sm font-medium">نمودار فروش منطقه‌ای · PNG</div>
        <SalesColumns height={340} />
      </div>
    </div>
  );
}

function Versions({ onClose }: { onClose: () => void }) {
  return (
    <aside className="bg-surface/60 flex w-[300px] shrink-0 flex-col border-s">
      <div className="flex h-10 shrink-0 items-center justify-between border-b px-3.5">
        <span className="text-sm font-semibold">تاریخچهٔ نسخه‌ها</span>
        <Button variant="muted" size="icon-xs" onClick={onClose} aria-label="بستن">
          <XIcon />
        </Button>
      </div>
      <ol className="scrollbar-minimal min-h-0 flex-1 overflow-y-auto p-2">
        {versions.map((version) => (
          <li key={version.id} className={cn('group rounded-md px-3 py-2.5', version.current ? 'bg-primary-soft/60' : 'hover:bg-hover')}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{version.label}</span>
              {version.current ? (
                <Badge tone="primary">فعلی</Badge>
              ) : (
                <Button
                  variant="outline"
                  size="xs"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => toast.success(`${version.label} بازگردانی شد`, { description: 'نسخهٔ فعلی به‌عنوان نسخهٔ جدید نگه داشته شد.' })}
                >
                  <ArrowCounterClockwiseIcon /> بازگردانی
                </Button>
              )}
            </div>
            <p className="mt-1 text-xs leading-5">{version.note}</p>
            <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
              <span>{version.by}</span>
              <MetaDot />
              <span>{version.when}</span>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function FileView({ file, onBack }: { file: FileItem; onBack: () => void }) {
  const [showVersions, setShowVersions] = useState(false);
  const meta = metaOf(file);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
        <Hint label="بازگشت به فایل‌ها">
          <Button variant="muted" size="icon-sm" onClick={onBack} aria-label="بازگشت">
            <ArrowRightIcon />
          </Button>
        </Hint>
        <meta.icon weight="fill" className={cn('size-5 shrink-0', meta.color)} />
        <div className="min-w-0 flex-1 truncate text-base font-semibold">{file.name}</div>
        <div className="text-muted-foreground hidden items-center gap-1.5 text-xs lg:flex">
          <span className="ltr-nums">{folderPath[file.folder]}</span>
            <MetaDot />
            <span>ذخیره شد · {file.modified}</span>
        </div>
        <Button variant={showVersions ? 'soft' : 'outline'} size="sm" onClick={() => setShowVersions((v) => !v)}>
          <ClockCounterClockwiseIcon /> نسخه‌ها
        </Button>
        <Button size="sm">
          <SparkleIcon weight="fill" /> از ایجنت بخواه
        </Button>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          {file.kind === 'doc' && <DocEditor />}
          {file.kind === 'sheet' && <SheetEditor />}
          {file.kind === 'slides' && (
            <div className="bg-surface scrollbar-minimal h-full overflow-y-auto p-8">
              <SlideDeck className="mx-auto max-w-4xl" />
            </div>
          )}
          {file.kind === 'pdf' && <PdfViewer file={file} />}
          {file.kind === 'image' && <ImageViewer />}
        </div>
        {showVersions && <Versions onClose={() => setShowVersions(false)} />}
      </div>
    </div>
  );
}

const systemMeta: Record<SystemKind, { icon: Icon; label: string }> = {
  dashboard: { icon: ChartBarIcon, label: 'داشبورد' },
  agent: { icon: RobotIcon, label: 'ایجنت' },
  skill: { icon: WrenchIcon, label: 'مهارت' },
  rule: { icon: ShieldCheckIcon, label: 'قانون' },
  automation: { icon: LightningIcon, label: 'اتوماسیون' },
  memory: { icon: BrainIcon, label: 'دانش' },
};

/** One row of the browser, whether a document the user made or a file the harness keeps for itself. */
type Entry = {
  id: string;
  name: string;
  /** Path of the containing folder, relative to the workspace root. */
  dir: string;
  folder: string;
  typeLabel: string;
  icon: Icon;
  color: string;
  size: string;
  modified: string;
  by: string;
  system: boolean;
  open: () => void;
};

export default function FilesPage() {
  const router = useRouter();
  const openFileId = useUi((s) => s.openFileId);
  const setOpenFile = useUi((s) => s.setOpenFile);
  const [folder, setFolder] = useState<string>('all');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [query, setQuery] = useState('');
  const [showSystem, setShowSystem] = useState(false);

  const openFile = files.find((f) => f.id === openFileId);
  if (openFile) return <FileView file={openFile} onBack={() => setOpenFile(null)} />;

  const entries: Entry[] = [
    ...files.map((file): Entry => {
      const meta = metaOf(file);
      return {
        id: file.id,
        name: file.name,
        dir: folderPath[file.folder],
        folder: file.folder,
        typeLabel: meta.label,
        icon: meta.icon,
        color: meta.color,
        size: file.size,
        modified: file.modified,
        by: file.by,
        system: false,
        open: () => setOpenFile(file.id),
      };
    }),
    ...(showSystem
      ? systemFiles.map((file): Entry => {
          const group = systemFolders.find((f) => f.id === file.kind)!;
          return {
            id: file.id,
            name: file.name,
            dir: group.dir,
            folder: file.kind,
            typeLabel: systemMeta[file.kind].label,
            icon: systemMeta[file.kind].icon,
            color: 'text-primary',
            size: file.size,
            modified: file.modified,
            by: file.by,
            system: true,
            // System files open in the screen that edits them, not in a document editor.
            open: () => router.push(group.href),
          };
        })
      : []),
  ];

  const visible = entries.filter((e) => (folder === 'all' || e.folder === folder) && (e.name + e.dir).includes(query.trim()));
  const currentDir = folder === 'all' ? '' : (folderPath[folder] ?? systemFolders.find((f) => f.id === folder)?.dir ?? '');

  return (
    <>
      <PageHeader
        title="فایل‌ها"
        meta={
          <>
            <HardDrivesIcon className="size-4" />
            <span className="ltr-nums font-mono">{workspace.path}</span>
            <span>· {fa(files.length + systemFiles.length)} فایل</span>
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast('پوشهٔ فضای کاری در Explorer باز می‌شود')}>
              <FolderOpenIcon /> نمایش در Explorer
            </Button>
            <Button size="sm">
              <UploadSimpleIcon /> افزودن فایل
            </Button>
          </>
        }
      />
      <div className="flex min-h-0 flex-1">
        {/* Folder tree of the workspace */}
        <aside className={subNav}>
          <button onClick={() => setFolder('all')} data-active={folder === 'all'} className={cn(navRow, 'text-foreground')}>
            <HardDrivesIcon weight={folder === 'all' ? 'fill' : 'bold'} className={cn(folder === 'all' && 'text-primary')} />
            <span className="truncate">{workspace.name}</span>
            <span className="text-muted-foreground ms-auto text-xs">{fa(entries.length)}</span>
          </button>
          <div className="border-border/80 ms-[17px] space-y-0.5 border-s ps-1.5">
            {folders.map((f) => (
              <button key={f.id} onClick={() => setFolder(f.id)} data-active={folder === f.id} className={navRow}>
                <FolderSimpleIcon weight={folder === f.id ? 'fill' : 'bold'} className={cn(folder === f.id && 'text-primary')} />
                <span className="truncate">{f.name}</span>
                <span className="ms-auto text-xs">{fa(f.count)}</span>
              </button>
            ))}
            {showSystem && (
              <>
                <div className="text-primary/80 flex items-center gap-1.5 px-2.5 pt-3 pb-1 text-xs font-medium">
                  <GearFineIcon className="size-3.5" />
                  <span className="ltr-nums font-mono">.harness</span>
                </div>
                {systemFolders.map((f) => {
                  const SysIcon = systemMeta[f.id].icon;
                  return (
                    <button key={f.id} onClick={() => setFolder(f.id)} data-active={folder === f.id} className={navRow}>
                      <SysIcon weight={folder === f.id ? 'fill' : 'bold'} className="text-primary" />
                      <span className="truncate">{f.name}</span>
                      <span className="ms-auto text-xs">{fa(systemFiles.filter((s) => s.kind === f.id).length)}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </aside>

        {/* Files */}
        <div className="scrollbar-minimal min-w-0 flex-1 overflow-y-auto px-4">
          <div className="flex flex-wrap items-center gap-3 py-4">
            <div className="text-muted-foreground ltr-nums min-w-0 flex-1 truncate text-end font-mono text-sm">
              {workspace.path}
              {currentDir && `\\${currentDir.replaceAll('/', '\\')}`}
            </div>
            <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-sm">
              <GearFineIcon className={cn('size-4', showSystem && 'text-primary')} />
              فایل‌های سیستمی
              <Switch
                checked={showSystem}
                onCheckedChange={(value) => {
                  setShowSystem(value);
                  if (!value && systemFolders.some((f) => f.id === folder)) setFolder('all');
                }}
              />
            </label>
            <div className="relative w-52">
              <MagnifyingGlassIcon className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جست‌وجو در فایل‌ها…" className="h-8 ps-9" />
            </div>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'list', label: '', icon: <ListIcon /> },
                { value: 'grid', label: '', icon: <SquaresFourIcon /> },
              ]}
            />
          </div>

          {visible.length === 0 ? (
            <EmptyNote icon={<FolderSimpleIcon />} title="فایلی پیدا نشد" />
          ) : view === 'list' ? (
            <Table className="mb-6">
              <THead>
                <Th>نام</Th>
                <Th>نوع</Th>
                <Th>پوشه</Th>
                <Th>اندازه</Th>
                <Th>آخرین تغییر</Th>
                <Th>توسط</Th>
              </THead>
              <TBody>
                {visible.map((entry) => (
                  <Tr key={entry.id} onClick={entry.open}>
                    <Td className="min-w-56">
                      <span className="flex items-center gap-2.5 font-medium">
                        {entry.system ? (
                          <span className="bg-primary-soft text-primary flex size-7 shrink-0 items-center justify-center rounded-lg">
                            <entry.icon weight="fill" className="size-4" />
                          </span>
                        ) : (
                          <span className="flex size-7 shrink-0 items-center justify-center">
                            <entry.icon weight="fill" className={cn('size-6', entry.color)} />
                          </span>
                        )}
                        {entry.name}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap">{entry.system ? <Badge tone="primary">{entry.typeLabel}</Badge> : <span className="text-muted-foreground">{entry.typeLabel}</span>}</Td>
                    <Td className="text-muted-foreground whitespace-nowrap">
                      <span className="ltr-nums font-mono text-[0.8125rem]">{entry.dir}</span>
                    </Td>
                    <Td className="text-muted-foreground whitespace-nowrap">{entry.size}</Td>
                    <Td className="text-muted-foreground whitespace-nowrap">{entry.modified}</Td>
                    <Td className="text-muted-foreground whitespace-nowrap">{entry.by}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-6 md:grid-cols-3 xl:grid-cols-4">
              {visible.map((entry) => (
                <button
                  key={entry.id}
                  onClick={entry.open}
                  className={cn('bg-popover overflow-hidden rounded-xl border text-start transition-colors', entry.system ? 'border-primary/30 hover:border-primary/60' : 'hover:border-primary/40')}
                >
                  <div className={cn('flex aspect-[16/10] items-center justify-center border-b', entry.system ? 'bg-primary-soft/60' : 'bg-surface')}>
                    <entry.icon weight="duotone" className={cn('size-10', entry.color)} />
                  </div>
                  <div className="px-3 py-2.5">
                    <div className="truncate text-sm font-medium">{entry.name}</div>
                    <div className="text-muted-foreground mt-0.5 truncate text-xs">
                      {entry.typeLabel} · {entry.modified}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
