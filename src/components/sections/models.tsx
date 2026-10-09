'use client';

import { CheckCircleIcon, EyeIcon, EyeSlashIcon, PencilSimpleIcon, PlugsConnectedIcon, PlusIcon, StarIcon, TrashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/overlays';
import { BlockLabel, EmptyNote, Table, TBody, Td, Th, THead, Tr } from '@/components/ui/patterns';
import { Badge, Hint, Input, Label } from '@/components/ui/primitives';
import { useUi, type ModelConfig } from '@/lib/store';
import { cn } from '@/lib/utils';

// Any OpenAI- or Anthropic-compatible endpoint works; these only pre-fill the address.
const presets = [
  { label: 'Anthropic', baseUrl: 'https://api.anthropic.com' },
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  { label: 'Ollama (محلی)', baseUrl: 'http://localhost:11434/v1' },
];

const empty = { name: '', baseUrl: '', apiKey: '', model: '' };

/** Shows only the tail of a key; the full value never leaves the form. */
const maskKey = (key: string) => (key ? `••••••••${key.slice(-4)}` : 'بدون کلید');

function ModelDialog({ editing, open, onOpenChange }: { editing: ModelConfig | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const saveModel = useUi((s) => s.saveModel);
  const [form, setForm] = useState(editing ?? empty);
  const [showKey, setShowKey] = useState(false);
  const [tested, setTested] = useState(false);
  const set = (key: keyof typeof empty, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setTested(false);
  };
  const valid = form.baseUrl.trim() && form.model.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={editing ? 'ویرایش مدل' : 'تعریف مدل'}
        footer={
          <>
            <Button variant="outline" size="sm" disabled={!valid} className="me-auto" onClick={() => setTested(true)}>
              {tested ? <CheckCircleIcon weight="fill" className="text-success" /> : <PlugsConnectedIcon />}
              {tested ? 'اتصال برقرار است' : 'تست اتصال'}
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">انصراف</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                size="sm"
                disabled={!valid}
                onClick={() => {
                  saveModel({ ...form, name: form.name.trim() || form.model.trim(), id: editing?.id });
                  toast.success(editing ? 'مدل به‌روز شد' : 'مدل اضافه شد', { description: form.model });
                }}
              >
                ذخیره
              </Button>
            </DialogClose>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Base URL</Label>
            <Input dir="ltr" className="font-mono" placeholder="https://api.example.com/v1" value={form.baseUrl} onChange={(e) => set('baseUrl', e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => set('baseUrl', preset.baseUrl)}
                  className={cn(
                    'h-7 rounded-full border px-3 text-xs transition-colors',
                    form.baseUrl === preset.baseUrl ? 'border-primary bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-hover',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>API Key</Label>
            <div className="relative">
              <Input
                dir="ltr"
                type={showKey ? 'text' : 'password'}
                className="pe-11 font-mono"
                placeholder="sk-..."
                autoComplete="off"
                value={form.apiKey}
                onChange={(e) => set('apiKey', e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? 'پنهان‌کردن کلید' : 'نمایش کلید'}
                className="text-muted-foreground hover:text-foreground absolute end-3 top-1/2 -translate-y-1/2"
              >
                {showKey ? <EyeSlashIcon className="size-[18px]" /> : <EyeIcon className="size-[18px]" />}
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Model Name</Label>
              <Input dir="ltr" className="font-mono" placeholder="claude-opus-5-5" value={form.model} onChange={(e) => set('model', e.target.value)} />
            </div>
            <div>
              <Label>نام نمایشی (اختیاری)</Label>
              <Input placeholder="مثلاً: مدل دقیق" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
          </div>
          <p className="text-muted-foreground text-xs leading-6">کلید فقط روی همین سیستم نگه داشته می‌شود و به هیچ سروری جز آدرس بالا فرستاده نمی‌شود.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Self-hosted setup: each installation brings its own endpoint, key and model.
 *  Which model runs a task is chosen in the chat composer, not per agent. */
export function Models() {
  const models = useUi((s) => s.models);
  const defaultModelId = useUi((s) => s.defaultModelId);
  const setDefaultModel = useUi((s) => s.setDefaultModel);
  const removeModel = useUi((s) => s.removeModel);
  // `key` remounts the dialog so its form starts from the model being edited.
  const [dialog, setDialog] = useState<{ open: boolean; editing: ModelConfig | null; key: number }>({ open: false, editing: null, key: 0 });
  const openDialog = (editing: ModelConfig | null) => setDialog((d) => ({ open: true, editing, key: d.key + 1 }));

  return (
    <div>
      <BlockLabel
        action={
          <Button size="xs" onClick={() => openDialog(null)}>
            <PlusIcon /> تعریف مدل
          </Button>
        }
      >
        مدل‌های این نصب · انتخاب مدل هر کار در خودِ چت انجام می‌شود
      </BlockLabel>

      {models.length === 0 ? (
        <EmptyNote icon={<PlugsConnectedIcon />} title="هنوز مدلی تعریف نشده">
          برای شروع، آدرس سرویس، کلید و نام مدل خودتان را وارد کنید.
        </EmptyNote>
      ) : (
        <Table>
          <THead>
            <Th>نام</Th>
            <Th>Model Name</Th>
            <Th>Base URL</Th>
            <Th>API Key</Th>
            <Th className="w-px" />
          </THead>
          <TBody>
            {models.map((model) => {
              const isDefault = model.id === defaultModelId;
              return (
                <Tr key={model.id}>
                  <Td className="font-medium whitespace-nowrap">
                    <span className="flex items-center gap-2">
                      {model.name}
                      {isDefault && <Badge tone="primary">پیش‌فرض</Badge>}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <span className="ltr-nums font-mono text-[0.8125rem]">{model.model}</span>
                  </Td>
                  <Td className="text-muted-foreground max-w-64">
                    <span className="ltr-nums block truncate font-mono text-[0.8125rem]">{model.baseUrl}</span>
                  </Td>
                  <Td className="text-muted-foreground whitespace-nowrap">
                    <span className="ltr-nums font-mono text-[0.8125rem]">{maskKey(model.apiKey)}</span>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-0.5">
                      <Hint label={isDefault ? 'مدل پیش‌فرض' : 'پیش‌فرض کن'}>
                        <Button variant="muted" size="icon-xs" aria-label="پیش‌فرض" onClick={() => setDefaultModel(model.id)}>
                          <StarIcon weight={isDefault ? 'fill' : 'bold'} className={cn(isDefault && 'text-primary')} />
                        </Button>
                      </Hint>
                      <Hint label="ویرایش">
                        <Button variant="muted" size="icon-xs" aria-label="ویرایش" onClick={() => openDialog(model)}>
                          <PencilSimpleIcon />
                        </Button>
                      </Hint>
                      <Hint label="حذف">
                        <Button
                          variant="muted"
                          size="icon-xs"
                          aria-label="حذف"
                          disabled={models.length === 1}
                          onClick={() => {
                            removeModel(model.id);
                            toast('مدل حذف شد', { description: model.name });
                          }}
                        >
                          <TrashIcon />
                        </Button>
                      </Hint>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      )}

      <ModelDialog key={dialog.key} editing={dialog.editing} open={dialog.open} onOpenChange={(open) => setDialog((d) => ({ ...d, open }))} />
    </div>
  );
}
