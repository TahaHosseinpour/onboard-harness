'use client';

import { CircleNotchIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { EmptyNote } from '@/components/ui/patterns';
import { api, ApiError, fileUrl, mediaUrl, type DocumentPreview, type TablePreview } from '@/lib/api';
import { cn, fa } from '@/lib/utils';

function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <CircleNotchIcon className="text-muted-foreground size-6 animate-spin" />
    </div>
  );
}

function Failed({ message }: { message: string }) {
  return <EmptyNote title="نمایش این فایل ممکن نشد">{message}</EmptyNote>;
}

function failure(error: unknown) {
  const status = error instanceof ApiError ? error.status : 0;
  if (status === 413) return 'فایل برای نمایش در برنامه بزرگ است. آن را با برنامهٔ سیستم باز کنید.';
  // The engine answers "no such address" when it is older than this screen: the app was built without rebuilding it.
  if (status === 405 || status === 404) return 'موتور برنامه این نمایش را نمی‌شناسد. اگر برنامه را خودتان ساخته‌اید، موتور را دوباره بسازید (npm run desktop:build -- --engine).';
  if (status === 0) return 'موتور برنامه در دسترس نیست.';
  return `فایل خوانده نشد؛ شاید خراب یا رمزدار باشد. (خطای ${status})`;
}

/** Markdown drawn as a document. Raw HTML inside it is shown as text, never run. */
export function MarkdownView({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('doc-prose', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

/** The file's own bytes, fetched once and released when the viewer closes. */
function useFileUrl(path: string, type: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let made: string | null = null;
    let closed = false;
    setUrl(null);
    setError(null);
    fileUrl(path, type)
      .then((value) => {
        made = value;
        if (closed) URL.revokeObjectURL(value);
        else setUrl(value);
      })
      .catch((e) => setError(failure(e)));
    return () => {
      closed = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [path, type]);
  return { url, error };
}

export function ImageView({ path, type }: { path: string; type: string }) {
  const { url, error } = useFileUrl(path, type);
  if (error) return <Failed message={error} />;
  if (!url) return <Loading />;
  return (
    <div className="scrollbar-minimal bg-secondary/40 flex min-h-0 flex-1 items-center justify-center overflow-auto p-6">
      {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL, not something to optimise */}
      <img src={url} alt={path.split('/').pop() ?? ''} className="max-h-full max-w-full rounded-lg object-contain shadow-sm" />
    </div>
  );
}

export function PdfView({ path }: { path: string }) {
  const { url, error } = useFileUrl(path, 'application/pdf');
  if (error) return <Failed message={error} />;
  if (!url) return <Loading />;
  return <iframe src={url} title={path} className="min-h-0 w-full flex-1 border-0" />;
}

/** Sound or video, played straight from the file so its size does not matter. */
export function MediaView({ path, video }: { path: string; video: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let closed = false;
    setUrl(null);
    setError(null);
    mediaUrl(path)
      .then((value) => !closed && setUrl(value))
      .catch((e) => setError(failure(e)));
    return () => {
      closed = true;
    };
  }, [path]);
  const unplayable = () => setError('این فایل با پخش‌کنندهٔ برنامه پخش نمی‌شود (قالب یا کدک آن پشتیبانی نمی‌شود). آن را با برنامهٔ سیستم باز کنید.');
  if (error) return <Failed message={error} />;
  if (!url) return <Loading />;
  return (
    <div className="bg-secondary/40 flex min-h-0 flex-1 items-center justify-center p-6">
      {video ? (
        <video src={url} controls onError={unplayable} className="max-h-full max-w-full rounded-lg bg-black" />
      ) : (
        <audio src={url} controls onError={unplayable} className="w-full max-w-xl" />
      )}
    </div>
  );
}

/** A Word or PowerPoint file, read by the engine and laid out as a document. */
export function DocumentView({ path }: { path: string }) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setMarkdown(null);
    setError(null);
    api
      .get<DocumentPreview>(`/files/preview?path=${encodeURIComponent(path)}`)
      .then((preview) => setMarkdown(preview.markdown))
      .catch((e) => setError(failure(e)));
  }, [path]);
  if (error) return <Failed message={error} />;
  if (markdown === null) return <Loading />;
  if (!markdown.trim()) return <EmptyNote title="این سند متنی ندارد" />;
  return (
    <div className="scrollbar-minimal min-h-0 flex-1 overflow-y-auto">
      <MarkdownView text={markdown} className="mx-auto max-w-3xl px-8 py-8" />
    </div>
  );
}

/** A spreadsheet as a grid, one sheet at a time. */
export function TableView({ path }: { path: string }) {
  const [sheet, setSheet] = useState<string | null>(null);
  const [table, setTable] = useState<TablePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setSheet(null);
    setTable(null);
  }, [path]);
  useEffect(() => {
    setError(null);
    api
      .get<TablePreview>(`/files/preview?path=${encodeURIComponent(path)}${sheet ? `&sheet=${encodeURIComponent(sheet)}` : ''}`)
      .then(setTable)
      .catch((e) => setError(failure(e)));
  }, [path, sheet]);
  if (error) return <Failed message={error} />;
  if (!table) return <Loading />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scrollbar-minimal min-h-0 flex-1 overflow-auto">
        {table.columns.length === 0 ? (
          <EmptyNote title="این برگه خالی است" />
        ) : (
          <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="bg-secondary text-muted-foreground sticky top-0 z-10 w-12 border-e border-b px-2 py-2 text-center text-xs font-normal">#</th>
                {table.columns.map((column, index) => (
                  <th key={index} className="bg-secondary sticky top-0 z-10 border-e border-b px-3 py-2 text-start font-semibold whitespace-nowrap">
                    <bdi>{column}</bdi>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, r) => (
                <tr key={r} className="hover:bg-hover">
                  <td className="bg-secondary/50 text-muted-foreground border-e border-b px-2 py-1.5 text-center text-xs">{fa(r + 1)}</td>
                  {row.map((cell, c) => (
                    <td key={c} className={cn('max-w-80 truncate border-e border-b px-3 py-1.5 whitespace-nowrap', typeof cell === 'number' && 'text-end tabular-nums')}>
                      <bdi>{typeof cell === 'number' ? cell.toLocaleString('fa-IR', { maximumFractionDigits: 4 }) : cell}</bdi>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex h-11 shrink-0 items-center gap-1 border-t px-3">
        {table.sheets.map((name) => (
          <button
            key={name}
            onClick={() => setSheet(name)}
            className={cn('h-7 rounded-full px-3 text-xs font-medium', name === table.sheet ? 'bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-hover')}
          >
            <bdi>{name}</bdi>
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-muted-foreground text-xs">
          {table.truncated ? `${fa(table.rows.length)} ردیف اول از ${fa(table.total_rows)} ردیف` : `${fa(table.total_rows)} ردیف`}
        </span>
      </div>
    </div>
  );
}
