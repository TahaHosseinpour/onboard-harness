'use client';

import { ArrowSquareOutIcon, CpuIcon, FolderSimpleIcon, GlobeIcon, LaptopIcon, MoonIcon, PencilSimpleIcon, PlugsConnectedIcon, PlusIcon, StarIcon, SunIcon, TrashIcon, type Icon } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/overlays';
import { BlockLabel, EmptyNote, navRow, Row, RowGroup, subNav, Table, TBody, Td, Th, THead, Tr } from '@/components/ui/patterns';
import { Badge, Hint, Input, Label, PathText, Segmented, Switch } from '@/components/ui/primitives';
import { api, ApiError, type Model } from '@/lib/api';
import { openOutside, useBackend } from '@/lib/backend';
import { useUi, type SettingsTab } from '@/lib/store';
import { cn } from '@/lib/utils';

const tabs: { id: SettingsTab; label: string; icon: Icon }[] = [
  { id: 'general', label: 'عمومی', icon: GlobeIcon },
  { id: 'models', label: 'مدل‌ها', icon: CpuIcon },
  { id: 'workspace', label: 'فضای کاری', icon: FolderSimpleIcon },
];

function General() {
  const { theme, setTheme } = useTheme();
  const setIntroOpen = useUi((s) => s.setIntroOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <>
      <BlockLabel>ظاهر</BlockLabel>
      <RowGroup>
        <Row label="حالت نمایش" description="روشن، تیره یا هماهنگ با سیستم">
          <Segmented
            value={mounted ? (theme ?? 'system') : 'system'}
            onChange={setTheme}
            options={[
              { value: 'light', label: 'روشن', icon: <SunIcon /> },
              { value: 'dark', label: 'تیره', icon: <MoonIcon /> },
              { value: 'system', label: 'سیستم', icon: <LaptopIcon /> },
            ]}
          />
        </Row>
      </RowGroup>
      <BlockLabel className="mt-6">راهنما</BlockLabel>
      <RowGroup>
        <Row label="راهنمای شروع" description="آنبورد هارنس چیست، چه کارهایی می‌شود سپرد و چطور فعال می‌شود">
          <Button variant="outline" size="xs" onClick={() => setIntroOpen(true)}>
            دوباره ببین
          </Button>
        </Row>
      </RowGroup>
    </>
  );
}

// Any OpenAI- or Anthropic-compatible endpoint works; these only pre-fill the address.
const presets = [
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { label: 'Anthropic', baseUrl: 'https://api.anthropic.com' },
  { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  { label: 'Ollama (محلی)', baseUrl: 'http://localhost:11434/v1' },
];

function ModelDialog({ editing, open, onOpenChange, onSaved }: { editing: Model | null; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: editing?.name ?? '', base_url: editing?.base_url ?? '', model: editing?.model ?? '', api_key: '', streaming: editing?.streaming ?? true });
  const set = (key: keyof typeof form, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));
  const valid = form.base_url.trim() && form.model.trim();

  const save = async () => {
    try {
      await api.post('/models', { id: editing?.id, ...form, api_key: form.api_key || undefined });
      toast.success(editing ? 'مدل به‌روز شد.' : 'مدل اضافه شد.');
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'ذخیره ممکن نشد.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={editing ? 'ویرایش مدل' : 'تعریف مدل'}
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">انصراف</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button size="sm" disabled={!valid} onClick={save}>ذخیره</Button>
            </DialogClose>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Base URL</Label>
            <Input dir="ltr" className="font-mono" placeholder="https://api.example.com/v1" value={form.base_url} onChange={(e) => set('base_url', e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button key={preset.label} type="button" onClick={() => set('base_url', preset.baseUrl)} className={cn('h-7 rounded-full border px-3 text-xs', form.base_url === preset.baseUrl ? 'border-primary bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-hover')}>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>API Key</Label>
            <Input dir="ltr" type="password" className="font-mono" autoComplete="off" placeholder={editing?.has_key ? 'کلید ذخیره‌شده حفظ می‌شود؛ برای تغییر، کلید جدید را بنویسید' : 'sk-...'} value={form.api_key} onChange={(e) => set('api_key', e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Model Name</Label>
              <Input dir="ltr" className="font-mono" placeholder="gpt-4o-mini" value={form.model} onChange={(e) => set('model', e.target.value)} />
            </div>
            <div>
              <Label>نام نمایشی (اختیاری)</Label>
              <Input placeholder="مثلاً: مدل دقیق" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span>
              نمایش پاسخ کلمه‌به‌کلمه
              <span className="text-muted-foreground block text-xs">اگر سرویس شما با ابزارها خطا می‌دهد، این را خاموش کنید.</span>
            </span>
            <Switch checked={form.streaming} onCheckedChange={(value) => set('streaming', value)} />
          </label>
          <p className="text-muted-foreground text-xs leading-6">کلید در مخزن امن سیستم‌عامل نگه داشته می‌شود، نه در پوشهٔ فضای کاری، و فقط به همین آدرس فرستاده می‌شود.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Models() {
  const models = useBackend((s) => s.models);
  const refresh = useBackend((s) => s.refreshModels);
  // `key` remounts the dialog so its form starts from the model being edited.
  const [dialog, setDialog] = useState<{ open: boolean; editing: Model | null; key: number }>({ open: false, editing: null, key: 0 });
  const openDialog = (editing: Model | null) => setDialog((d) => ({ open: true, editing, key: d.key + 1 }));
  const act = (action: Promise<unknown>) => action.then(refresh).catch((e) => toast.error(e instanceof ApiError ? e.message : 'انجام نشد.'));

  return (
    <>
      <BlockLabel
        action={
          <Button size="xs" onClick={() => openDialog(null)}>
            <PlusIcon /> تعریف مدل
          </Button>
        }
      >
        مدل هر کار را در کادر پیام انتخاب می‌کنید
      </BlockLabel>
      {models.length === 0 ? (
        <EmptyNote icon={<PlugsConnectedIcon />} title="هنوز مدلی تعریف نشده">آدرس سرویس، کلید و نام مدل خودتان را وارد کنید.</EmptyNote>
      ) : (
        <Table>
          <THead>
            <Th>نام</Th>
            <Th>Model Name</Th>
            <Th>Base URL</Th>
            <Th>کلید</Th>
            <Th className="w-px" />
          </THead>
          <TBody>
            {models.map((model) => (
              <Tr key={model.id}>
                <Td className="font-medium whitespace-nowrap">
                  <span className="flex items-center gap-2">
                    {model.name}
                    {model.is_default && <Badge tone="primary">پیش‌فرض</Badge>}
                  </span>
                </Td>
                <Td className="whitespace-nowrap">
                  <span className="ltr-nums font-mono text-[0.8125rem]">{model.model}</span>
                </Td>
                <Td className="text-muted-foreground max-w-64">
                  <PathText path={model.base_url} className="text-[0.8125rem]" />
                </Td>
                <Td className="whitespace-nowrap">{model.base_url.startsWith('demo://') ? <span className="text-muted-foreground">لازم نیست</span> : model.has_key ? <Badge tone="success">ذخیره شده</Badge> : <Badge tone="warning">ندارد</Badge>}</Td>
                <Td>
                  <div className="flex items-center justify-end gap-0.5">
                    <Hint label={model.is_default ? 'مدل پیش‌فرض' : 'پیش‌فرض کن'}>
                      <Button variant="muted" size="icon-xs" aria-label="پیش‌فرض" onClick={() => act(api.post(`/models/${model.id}/default`))}>
                        <StarIcon weight={model.is_default ? 'fill' : 'bold'} className={cn(model.is_default && 'text-primary')} />
                      </Button>
                    </Hint>
                    <Hint label="ویرایش">
                      <Button variant="muted" size="icon-xs" aria-label="ویرایش" onClick={() => openDialog(model)}>
                        <PencilSimpleIcon />
                      </Button>
                    </Hint>
                    <Hint label="حذف">
                      <Button variant="muted" size="icon-xs" aria-label="حذف" onClick={() => act(api.del(`/models/${model.id}`))}>
                        <TrashIcon />
                      </Button>
                    </Hint>
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
      <ModelDialog key={dialog.key} editing={dialog.editing} open={dialog.open} onOpenChange={(open) => setDialog((d) => ({ ...d, open }))} onSaved={refresh} />
    </>
  );
}

function WorkspacePane() {
  const workspace = useBackend((s) => s.workspace);
  const renameWorkspace = useBackend((s) => s.renameWorkspace);
  const [name, setName] = useState(workspace?.name ?? '');
  useEffect(() => setName(workspace?.name ?? ''), [workspace?.name]);

  const rename = async () => {
    try {
      await renameWorkspace(name);
      toast.success('نام فضای کاری عوض شد.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'تغییر نام ممکن نشد.');
    }
  };

  return (
    <>
      <BlockLabel>فضای کاری باز</BlockLabel>
      <RowGroup>
        <Row label="نام" description="فقط نامی که در برنامه می‌بینید عوض می‌شود، نه نام پوشه">
          <Input className="h-8 w-56" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && rename()} />
          <Button size="xs" disabled={!name.trim() || name.trim() === workspace?.name} onClick={rename}>
            ذخیره
          </Button>
        </Row>
        <Row label="پوشه" description={<PathText path={workspace?.path ?? ''} />}>
          <Button variant="outline" size="xs" onClick={() => openOutside(workspace?.path ?? '', toast)}>
            <ArrowSquareOutIcon /> باز کردن پوشه
          </Button>
        </Row>
      </RowGroup>
      <p className="text-muted-foreground mt-3 text-xs leading-6">
        پوشهٔ یک فضای کاری عوض نمی‌شود. برای کار در پوشه‌ای دیگر، از منوی بالای نوار کناری پوشهٔ دیگری را باز کنید. مهارت‌ها، قوانین، حافظه و سابقهٔ کارها داخل پوشهٔ <span className="ltr-nums font-mono">.harness</span> همین فضای کاری است.
      </p>
    </>
  );
}

const panes: Record<SettingsTab, () => React.ReactNode> = { general: General, models: Models, workspace: WorkspacePane };

export default function SettingsPage() {
  const tab = useUi((s) => s.settingsTab);
  const setTab = useUi((s) => s.setSettingsTab);
  const Pane = panes[tab];

  return (
    <>
      <PageHeader title="تنظیمات" />
      <div className="flex min-h-0 flex-1">
        <nav className={subNav}>
          {tabs.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} data-active={tab === item.id} className={navRow}>
              <item.icon weight={tab === item.id ? 'fill' : 'bold'} className={cn(tab === item.id && 'text-primary')} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="scrollbar-minimal min-w-0 flex-1 overflow-y-auto">
          <div className={cn('mx-auto px-6 py-6', tab === 'models' ? 'max-w-5xl' : 'max-w-3xl')}>
            <Pane />
          </div>
        </div>
      </div>
    </>
  );
}
